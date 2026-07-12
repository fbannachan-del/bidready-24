import crypto from "node:crypto";
import { getDb } from "./db";
import { updateProjectStatus } from "./projects";
import {
  appendAuditEvent,
  addCitation,
  failAnalysisRun,
  finishAnalysisRun,
  getAutonomySettings,
  getRunOutputCounts,
  recordComplianceDecision,
  recordQaCheck,
  replaceRunAnalysis,
  saveResponse,
  startAnalysisRun,
  updateAnalysisRun,
  upsertEvidenceFact,
} from "./autonomy";
import { analysisFingerprint, buildAutonomousAnalysis } from "./analysis-core";
import { AutonomyMandateSchema, AutonomyPolicySchema, DEFAULT_MANDATE, DEFAULT_POLICY } from "./autonomy-policy";
import type { UploadedFileRecord } from "./tender-types";
import { dispatchQueuedClarifications } from "./external-actions";
import { submitAutonomously } from "./submission-orchestrator";
import type { ProjectRow } from "./projects";

function legacyStatus(status: string): "met" | "not_met" | "uncertain" | "missing" {
  if (["verified_met", "probably_met"].includes(status)) return "met";
  if (["not_met", "probably_not_met"].includes(status)) return "not_met";
  if (status === "missing") return "missing";
  return "uncertain";
}

export async function runAutonomousPipeline(
  projectId: string,
  triggerType = "system",
  options: { forceDeterministic?: boolean; suppressExternalActions?: boolean } = {},
) {
  const db = getDb();
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId) as ProjectRow | undefined;
  if (!project) throw new Error("Project not found");
  const files = db.prepare(`SELECT id, project_id, original_name, stored_path, mime_type, sha256 FROM files WHERE project_id = ? AND deleted_at IS NULL ORDER BY uploaded_at`).all(projectId) as UploadedFileRecord[];
  if (!files.length) throw new Error("Upload at least one supported tender document before running analysis.");

  const stored = getAutonomySettings(projectId);
  const policy = AutonomyPolicySchema.parse({ ...DEFAULT_POLICY, ...(stored?.policy ?? {}) });
  const mandate = AutonomyMandateSchema.parse({ ...DEFAULT_MANDATE, ...(stored?.mandate ?? {}) });
  const fingerprint = analysisFingerprint(files, project.intake_json, project.order_type);
  const previousRun = db.prepare(`SELECT id FROM analysis_runs WHERE project_id = ? AND status = 'succeeded' ORDER BY completed_at DESC, rowid DESC LIMIT 1`).get(projectId) as { id?: string } | undefined;
  const previousRequirements = previousRun?.id ? db.prepare(`SELECT requirement_key, normalized_requirement FROM requirements WHERE analysis_run_id = ?`).all(previousRun.id) as Array<{ requirement_key: string | null; normalized_requirement: string }> : [];
  let key = `full:${fingerprint}`;
  const model = options.forceDeterministic ? "rules-v1" : process.env.ENABLE_REAL_AI === "true" ? process.env.OPENAI_MODEL || "gpt-5.6" : "rules-v1";
  let run = startAnalysisRun({ projectId, idempotencyKey: key, triggerType, model, promptVersion: "autonomous-v1", inputHash: fingerprint });
  if (run.status === "succeeded") {
    return { run_id: run.id, status: "succeeded", reused: true, ...getRunOutputCounts(String(run.id)) };
  }
  if (run.status === "failed" || run.status === "cancelled") {
    key = `${key}:retry:${Date.now()}`;
    run = startAnalysisRun({ projectId, idempotencyKey: key, triggerType, model, promptVersion: "autonomous-v1", inputHash: fingerprint });
  }
  const runId = String(run.id);
  updateProjectStatus(projectId, "processing");
  appendAuditEvent({ projectId, analysisRunId: runId, actor: "system", action: "analysis_started", entity: "analysis_run", entityId: runId, details: { triggerType, fingerprint } });

  try {
    updateAnalysisRun(runId, { stage: "extract", progress: 12 });
    const output = await buildAutonomousAnalysis({ files, intakeJson: project.intake_json, orderType: project.order_type, policy, allowProviderAnalysis: !options.forceDeterministic });
    updateAnalysisRun(runId, { stage: "persist", progress: 66, metrics: { provider: output.analysis.provider, model: output.analysis.model } });

    const reqId = (externalId: string) => `${projectId}_${externalId}`;
    const questionId = (externalId: string) => `${projectId}_${externalId}`;
    const fragments = output.fragments.map((fragment, ordinal) => ({
      id: fragment.id, fileId: fragment.fileId, text: fragment.text, ordinal,
      pageOrLocation: fragment.location, locatorType: fragment.location.startsWith("p.") ? "page" : fragment.location.startsWith("Sheet:") ? "cell_range" : "section",
      locator: { document: fragment.documentName, location: fragment.location, charStart: fragment.charStart, charEnd: fragment.charEnd },
      contentHash: crypto.createHash("sha256").update(fragment.text).digest("hex"), extractionConfidence: 1,
    }));
    const requirements = output.analysis.requirements.map((item) => ({
      id: reqId(item.externalId), key: item.externalId, type: item.type, title: item.title,
      normalizedRequirement: item.normalizedRequirement, verbatimExcerpt: item.verbatimExcerpt,
      documentId: item.documentId, pageOrLocation: item.location, mandatory: item.mandatory,
      evaluationWeight: item.evaluationWeight, responseLimit: item.responseLimit,
      customerStatus: legacyStatus(item.status), confidence: item.confidence, matchedEvidenceIds: item.evidenceRefs,
      notes: [item.rationale, ...item.assumptions], source: "extracted" as const,
      interpretation: { selected: item.normalizedRequirement, assumptions: item.assumptions, autonomousStatus: item.status },
      consequenceIfWrong: item.mandatory ? "The bid may be rejected or scored down if this interpretation is incorrect." : "The response may lose evaluation marks if this interpretation is incorrect.",
    }));
    const questions = output.analysis.questions.map((item) => ({
      id: questionId(item.externalId), identifier: item.identifier, section: item.section, questionText: item.text,
      responseType: "narrative", wordLimit: item.wordLimit, scoringWeight: item.weight,
      evaluationGuidance: item.evaluationGuidance, sourceLocation: `${item.documentId} · ${item.location}`,
      confidence: 0.85,
    }));
    const gaps = output.analysis.requirements.filter((item) => !["verified_met", "probably_met", "not_applicable"].includes(item.status)).map((item) => ({
      id: `${projectId}_gap_${item.externalId}`, idempotencyKey: `${runId}:${item.externalId}`,
      description: `${item.title}: ${item.rationale}`,
      priority: (item.mandatory && ["not_met", "missing"].includes(item.status) ? "critical" : item.mandatory ? "high" : "medium") as "critical" | "high" | "medium",
      relatedRequirementIds: [reqId(item.externalId)], gapType: "evidence", consequence: item.mandatory ? "Potential eligibility or pass/fail failure." : "Potential loss of evaluation marks.",
      recommendedAction: item.status === "missing" ? "Provide current primary evidence or confirm the requirement cannot be met." : "Check the cited tender source and supporting customer evidence.", confidence: item.confidence,
    }));

    replaceRunAnalysis(runId, {
      fragments,
      requirements,
      questions,
      deadlines: output.analysis.deadlines.map((item) => ({ id: `${projectId}_${item.externalId}`, label: item.label, datetime: item.value, description: item.description, sourceLocation: `${item.documentId} · ${item.location}`, originalText: item.value, confidence: item.confidence, isCritical: /submission|clarification|site visit/i.test(item.label) })),
      attachments: output.analysis.attachments.map((item) => ({ id: `${projectId}_${item.externalId}`, requiredName: item.name, format: item.format, signer: item.signer, status: item.status, sourceLocation: `${item.documentId} · ${item.location}`, signatureRequired: Boolean(item.signer), confidence: 0.85 })),
      gaps,
      clarifications: output.analysis.clarifications.map((item) => ({ id: `${projectId}_${item.externalId}`, idempotencyKey: `${runId}:${item.externalId}`, question: item.question, context: item.context, sourceLocation: `${item.documentId} · ${item.location}`, status: policy.sendClarifications && mandate.canSendClarifications ? "queued" : "draft", riskLevel: item.risk, sendChannel: project.portal ? "portal" : null })),
    });

    try {
      const intake = project.intake_json ? JSON.parse(project.intake_json) as Record<string, unknown> : {};
      for (const [factKey, value] of Object.entries(intake)) {
        if (/contact|consent|email|phone/i.test(factKey) || value === "" || value == null) continue;
        upsertEvidenceFact({ projectId, idempotencyKey: `intake:${factKey}:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12)}`, subject: project.company_name || "Customer", factKey, value, provenanceClass: "verified_customer", verificationStatus: "verified", sourceLocation: "Customer intake", confidence: 0.8 });
      }
    } catch {
      // Invalid legacy intake remains visible as a QA issue; analysis itself can continue.
    }

    if (previousRun?.id) {
      const previous = new Map(previousRequirements.map((item) => [item.requirement_key || item.normalized_requirement.toLowerCase(), item.normalized_requirement]));
      const current = new Map(output.analysis.requirements.map((item) => [item.externalId, item.normalizedRequirement]));
      const added = [...current.keys()].filter((key) => !previous.has(key));
      const removed = [...previous.keys()].filter((key) => !current.has(key));
      const changed = [...current.keys()].filter((key) => previous.has(key) && previous.get(key) !== current.get(key));
      appendAuditEvent({ projectId, analysisRunId: runId, actor: "system", action: "tender_amendment_compared", entity: "analysis_run", entityId: runId, details: { previousRunId: previousRun.id, added, removed, changed } });
    }

    const cite = (entityType: string, entityId: string, documentId: string, location: string, quote: string, confidence: number) => {
      const fragment = output.fragments.find((candidate) => candidate.fileId === documentId && candidate.location === location && candidate.text.toLowerCase().includes(quote.trim().toLowerCase()));
      if (!fragment) return;
      const start = fragment.text.toLowerCase().indexOf(quote.trim().toLowerCase());
      addCitation({ projectId, analysisRunId: runId, fragmentId: fragment.id, entityType, entityId, quote: fragment.text.slice(start, start + quote.trim().length), quoteStart: start, quoteEnd: start + quote.trim().length, locator: { document: fragment.documentName, location }, confidence, verificationStatus: "verified" });
    };
    output.analysis.requirements.forEach((item) => cite("requirement", reqId(item.externalId), item.documentId, item.location, item.verbatimExcerpt, item.confidence));
    output.analysis.questions.forEach((item) => cite("question", questionId(item.externalId), item.documentId, item.location, item.text, 0.85));
    output.analysis.deadlines.forEach((item) => cite("deadline", `${projectId}_${item.externalId}`, item.documentId, item.location, item.value, item.confidence));
    output.analysis.attachments.forEach((item) => cite("attachment", `${projectId}_${item.externalId}`, item.documentId, item.location, item.name, 0.85));

    for (const item of output.analysis.requirements) {
      recordComplianceDecision({ projectId, requirementId: reqId(item.externalId), analysisRunId: runId, status: item.status, decisionMethod: item.status === "not_met" ? "deterministic_threshold" : "source_and_evidence_match", rationale: item.rationale, assumptions: item.assumptions, evidenceFactIds: item.evidenceRefs, confidence: item.confidence, consequenceIfWrong: item.mandatory ? "Potential bid rejection" : "Potential score reduction" });
    }
    for (const draft of output.analysis.responses) {
      saveResponse({ projectId, questionId: questionId(draft.questionId), analysisRunId: runId, content: draft.content, status: draft.status === "approved" ? "machine_approved" : "draft", claimManifest: [], assumptions: draft.unsupportedClaims, qualityScores: { factualSupport: draft.factualSupport, requirementCoverage: draft.requirementCoverage }, approvalReason: draft.status === "approved" ? "All machine approval gates passed." : null });
    }
    for (const check of output.analysis.qa) {
      recordQaCheck({ projectId, analysisRunId: runId, entityType: "analysis", entityId: runId, checkKey: check.code, status: check.status === "pass" ? "passed" : check.status === "warn" ? "warning" : "failed", severity: check.blocking ? "critical" : check.status === "warn" ? "medium" : "info", message: check.label, details: { details: check.details, blocking: check.blocking } });
    }
    recordQaCheck({ projectId, analysisRunId: runId, entityType: "analysis", entityId: runId, checkKey: "go-no-go", status: output.decision.decision === "no_bid" ? "failed" : output.decision.decision === "proceed" ? "passed" : "warning", severity: output.decision.decision === "no_bid" ? "critical" : "medium", message: `${output.decision.decision.replaceAll("_", " ")} (${output.decision.score}/100)`, details: output.decision });

    const counts = getRunOutputCounts(runId);
    const clarifications = options.suppressExternalActions
      ? { sent: 0, queued: 0, reason: "External actions are disabled for the synthetic end-to-end test." }
      : await dispatchQueuedClarifications({ projectId, policy, mandate, portal: project.portal ?? null });
    const submission = !options.suppressExternalActions && project.order_type === "complete" && (policy.completePortal || policy.submitBid)
      ? await submitAutonomously({ projectId, idempotencyKey: `submission:${fingerprint}`, policy, mandate, portal: project.portal ?? null, manifest: { analysisRunId: runId, inputFingerprint: fingerprint, fileHashes: files.map((file) => ({ id: file.id, name: file.original_name, sha256: file.sha256 })), counts, decision: output.decision } })
      : null;
    finishAnalysisRun(runId, { ...counts, provider: output.analysis.provider, model: output.analysis.model, decision: output.decision.decision, score: output.decision.score, extractionFailures: output.failures.length });
    updateProjectStatus(projectId, "ready");
    appendAuditEvent({ projectId, analysisRunId: runId, actor: "system", action: "analysis_completed", entity: "analysis_run", entityId: runId, details: { ...counts, decision: output.decision } });
    return { run_id: runId, status: "succeeded", decision: output.decision, ...counts, responses: output.analysis.responses.length, qa: output.analysis.qa.length, clarifications, submission };
  } catch (error) {
    const diagnosticClass = error instanceof Error ? error.name : "UnknownError";
    const message = "Tender analysis failed before completion.";
    failAnalysisRun(runId, { code: "ANALYSIS_FAILED", message, metrics: { diagnosticClass } });
    updateProjectStatus(projectId, "failed");
    appendAuditEvent({ projectId, analysisRunId: runId, actor: "system", action: "analysis_failed", entity: "analysis_run", entityId: runId, details: { code: "ANALYSIS_FAILED", diagnosticClass }, severity: "high" });
    throw error;
  }
}
