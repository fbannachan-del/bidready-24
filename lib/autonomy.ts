import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";

export type AutonomyProfile = "assisted" | "autonomous" | "unattended";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ComplianceStatus =
  | "verified_met" | "probably_met" | "partially_met" | "not_met"
  | "probably_not_met" | "missing" | "conflicting_evidence"
  | "unable_to_determine" | "not_applicable" | "customer_verification_required";
export type SubmissionStatus =
  | "prepared" | "validating" | "ready" | "submitting" | "submitted"
  | "confirmed" | "failed" | "withdrawn" | "unknown";

type JsonObject = Record<string, unknown>;
type Row = Record<string, unknown>;

const db = getDb();

function id(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function json(value: unknown, fallback: unknown = {}): string {
  return JSON.stringify(value === undefined ? fallback : value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

type HydratedSettings = Row & { policy: JsonObject; mandate: JsonObject };

function hydrateSettings(row: Row | undefined): HydratedSettings | null {
  if (!row) return null;
  return {
    ...row,
    policy: parseJson<JsonObject>(row.policy_json, {}),
    mandate: parseJson<JsonObject>(row.mandate_json, {}),
  } as HydratedSettings;
}

export function getAutonomySettings(projectId: string) {
  const row = db.prepare(`SELECT * FROM autonomy_settings WHERE project_id = ?`).get(projectId) as Row | undefined;
  return hydrateSettings(row);
}

export function upsertAutonomySettings(projectId: string, input: {
  profile?: AutonomyProfile;
  policy?: JsonObject;
  mandate?: JsonObject;
  receiverAcknowledgedAt?: string | null;
  receiverAcknowledgedBy?: string | null;
}) {
  const current = getAutonomySettings(projectId);
  const profile = input.profile ?? (current?.profile as AutonomyProfile | undefined) ?? "unattended";
  const policy = input.policy ?? current?.policy ?? {};
  const mandate = input.mandate ?? current?.mandate ?? {};
  const policyVersion = current && input.policy ? Number(current.policy_version) + 1 : Number(current?.policy_version ?? 1);
  const mandateVersion = current && input.mandate ? Number(current.mandate_version) + 1 : Number(current?.mandate_version ?? 1);

  db.prepare(`
    INSERT INTO autonomy_settings (
      project_id, profile, policy_json, mandate_json, policy_version, mandate_version,
      receiver_acknowledged_at, receiver_acknowledged_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      profile = excluded.profile,
      policy_json = excluded.policy_json,
      mandate_json = excluded.mandate_json,
      policy_version = excluded.policy_version,
      mandate_version = excluded.mandate_version,
      receiver_acknowledged_at = excluded.receiver_acknowledged_at,
      receiver_acknowledged_by = excluded.receiver_acknowledged_by,
      updated_at = datetime('now')
  `).run(
    projectId, profile, json(policy), json(mandate), policyVersion, mandateVersion,
    input.receiverAcknowledgedAt === undefined ? current?.receiver_acknowledged_at ?? null : input.receiverAcknowledgedAt,
    input.receiverAcknowledgedBy === undefined ? current?.receiver_acknowledged_by ?? null : input.receiverAcknowledgedBy,
  );
  return getAutonomySettings(projectId);
}

export function startAnalysisRun(input: {
  projectId: string;
  idempotencyKey: string;
  kind?: string;
  triggerType?: string;
  model?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string;
  inputHash?: string | null;
}) {
  const runId = id("run");
  db.prepare(`
    INSERT INTO analysis_runs (
      id, project_id, idempotency_key, kind, status, trigger_type, model,
      prompt_version, schema_version, input_hash, started_at, stage
    ) VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, datetime('now'), 'ingest')
    ON CONFLICT(project_id, idempotency_key) DO NOTHING
  `).run(
    runId, input.projectId, input.idempotencyKey, input.kind ?? "full",
    input.triggerType ?? "system", input.model ?? null, input.promptVersion ?? null,
    input.schemaVersion ?? "2", input.inputHash ?? null,
  );
  return db.prepare(`SELECT * FROM analysis_runs WHERE project_id = ? AND idempotency_key = ?`)
    .get(input.projectId, input.idempotencyKey) as Row;
}

export function updateAnalysisRun(runId: string, input: {
  stage?: string;
  progress?: number;
  metrics?: JsonObject;
}) {
  const progress = input.progress === undefined ? null : Math.max(0, Math.min(100, Math.round(input.progress)));
  db.prepare(`
    UPDATE analysis_runs SET
      stage = COALESCE(?, stage), progress = COALESCE(?, progress),
      metrics_json = COALESCE(?, metrics_json), updated_at = datetime('now')
    WHERE id = ?
  `).run(input.stage ?? null, progress, input.metrics ? json(input.metrics) : null, runId);
  return getAnalysisRun(runId);
}

export function finishAnalysisRun(runId: string, metrics: JsonObject = {}) {
  db.prepare(`
    UPDATE analysis_runs SET status = 'succeeded', progress = 100, stage = 'complete',
      metrics_json = ?, completed_at = datetime('now'), updated_at = datetime('now'),
      error_code = NULL, error_message = NULL
    WHERE id = ?
  `).run(json(metrics), runId);
  return getAnalysisRun(runId);
}

export function failAnalysisRun(runId: string, error: { code?: string; message: string; metrics?: JsonObject }) {
  db.prepare(`
    UPDATE analysis_runs SET status = 'failed', error_code = ?, error_message = ?,
      metrics_json = ?, completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(error.code ?? "analysis_failed", error.message, json(error.metrics), runId);
  return getAnalysisRun(runId);
}

export function getAnalysisRun(runId: string) {
  return db.prepare(`SELECT * FROM analysis_runs WHERE id = ?`).get(runId) as Row | undefined;
}

export function getLatestAnalysisRun(projectId: string) {
  return db.prepare(`SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`)
    .get(projectId) as Row | undefined;
}

export interface AnalysisReplacement {
  fragments?: Array<{
    id?: string; fileId: string; text: string; ordinal?: number; pageOrLocation?: string | null;
    section?: string | null; locatorType?: string | null; locator?: JsonObject;
    contentHash?: string | null; extractionConfidence?: number;
  }>;
  requirements?: Array<{
    id?: string; key?: string | null; type?: "mandatory" | "scored" | "attachment" | "instruction" | "deadline";
    title: string; normalizedRequirement: string; verbatimExcerpt?: string | null; documentId?: string | null;
    pageOrLocation?: string | null; mandatory?: boolean; evaluationWeight?: number | null;
    responseLimit?: string | null; customerStatus?: "met" | "not_met" | "uncertain" | "missing";
    confidence?: number; matchedEvidenceIds?: string[]; notes?: string[]; source?: "extracted" | "admin" | "stub";
    applicability?: string | null; condition?: string | null; requiredEvidence?: unknown[];
    interpretation?: JsonObject; consequenceIfWrong?: string | null;
  }>;
  questions?: Array<{
    id?: string; identifier?: string | null; section?: string | null; questionText: string;
    responseType?: string | null; wordLimit?: number | null; characterLimit?: number | null;
    scoringWeight?: number | null; evaluationGuidance?: string | null; sourceLocation?: string | null;
    responseFormat?: string | null; confidence?: number;
  }>;
  deadlines?: Array<{
    id?: string; label: string; datetime: string; description?: string | null; sourceLocation?: string | null;
    timezone?: string | null; originalText?: string | null; confidence?: number; isCritical?: boolean;
  }>;
  attachments?: Array<{
    id?: string; requiredName?: string | null; format?: string | null; signer?: string | null;
    owner?: string | null; status?: string; sourceLocation?: string | null; signatureRequired?: boolean;
    completionChecks?: JsonObject; confidence?: number;
  }>;
  gaps?: Array<{
    id?: string; idempotencyKey?: string | null; description: string;
    priority: "critical" | "high" | "medium" | "low"; owner?: string | null;
    deadline?: string | null; relatedRequirementIds?: string[]; status?: string; gapType?: string;
    consequence?: string | null; recommendedAction?: string | null; confidence?: number;
  }>;
  clarifications?: Array<{
    id?: string; idempotencyKey?: string | null; question: string; context?: string | null;
    sourceLocation?: string | null; status?: string; riskLevel?: string; sendChannel?: string | null;
    recipient?: string | null;
  }>;
}

/** Replace the derived output for one run atomically, making safe retry possible. */
export function replaceRunAnalysis(runId: string, output: AnalysisReplacement) {
  const run = getAnalysisRun(runId);
  if (!run) throw new Error(`Analysis run not found: ${runId}`);
  const projectId = String(run.project_id);

  const apply = db.transaction(() => {
    db.prepare(`DELETE FROM citations WHERE analysis_run_id = ?`).run(runId);
    for (const table of ["requirements", "questions", "deadlines", "attachments", "gaps", "clarifications", "fragments"]) {
      db.prepare(`DELETE FROM ${table} WHERE analysis_run_id = ?`).run(runId);
    }

    const insertFragment = db.prepare(`
      INSERT INTO fragments (id, project_id, file_id, text, ordinal, page_or_location, section,
        locator_type, locator_json, content_hash, extraction_confidence, analysis_run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of output.fragments ?? []) insertFragment.run(
      item.id ?? id("frag"), projectId, item.fileId, item.text, item.ordinal ?? null,
      item.pageOrLocation ?? null, item.section ?? null, item.locatorType ?? null,
      json(item.locator), item.contentHash ?? null, item.extractionConfidence ?? 0, runId,
    );

    const insertRequirement = db.prepare(`
      INSERT INTO requirements (id, project_id, type, title, verbatim_excerpt, normalized_requirement,
        document_id, page_or_location, mandatory, evaluation_weight, response_limit, customer_status,
        confidence, review_required, matched_evidence_ids, notes, source, analysis_run_id,
        requirement_key, applicability, condition_text, required_evidence_json, interpretation_json,
        consequence_if_wrong)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of output.requirements ?? []) insertRequirement.run(
      item.id ?? id("req"), projectId, item.type ?? "mandatory", item.title,
      item.verbatimExcerpt ?? null, item.normalizedRequirement, item.documentId ?? null,
      item.pageOrLocation ?? null, item.mandatory === false ? 0 : 1,
      item.evaluationWeight ?? null, item.responseLimit ?? null, item.customerStatus ?? "uncertain",
      item.confidence ?? 0, json(item.matchedEvidenceIds, []), json(item.notes, []), item.source ?? "extracted",
      runId, item.key ?? null, item.applicability ?? null, item.condition ?? null,
      json(item.requiredEvidence, []), json(item.interpretation), item.consequenceIfWrong ?? null,
    );

    const insertQuestion = db.prepare(`
      INSERT INTO questions (id, project_id, identifier, section, question_text, response_type,
        word_limit, character_limit, scoring_weight, evaluation_guidance, source_location,
        review_required, analysis_run_id, response_format, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);
    for (const item of output.questions ?? []) insertQuestion.run(
      item.id ?? id("que"), projectId, item.identifier ?? null, item.section ?? null,
      item.questionText, item.responseType ?? null, item.wordLimit ?? null,
      item.characterLimit ?? null, item.scoringWeight ?? null, item.evaluationGuidance ?? null,
      item.sourceLocation ?? null, runId, item.responseFormat ?? null, item.confidence ?? 0,
    );

    const insertDeadline = db.prepare(`
      INSERT INTO deadlines (id, project_id, label, datetime, description, source_location,
        analysis_run_id, timezone, original_text, confidence, is_critical)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of output.deadlines ?? []) insertDeadline.run(
      item.id ?? id("ddl"), projectId, item.label, item.datetime, item.description ?? null,
      item.sourceLocation ?? null, runId, item.timezone ?? null, item.originalText ?? null,
      item.confidence ?? 0, item.isCritical ? 1 : 0,
    );

    const insertAttachment = db.prepare(`
      INSERT INTO attachments (id, project_id, required_name, format, signer, owner, status,
        source_location, analysis_run_id, signature_required, completion_checks_json, confidence, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const item of output.attachments ?? []) insertAttachment.run(
      item.id ?? id("att"), projectId, item.requiredName ?? null, item.format ?? null,
      item.signer ?? null, item.owner ?? null, item.status ?? "missing", item.sourceLocation ?? null,
      runId, item.signatureRequired ? 1 : 0, json(item.completionChecks), item.confidence ?? 0,
    );

    const insertGap = db.prepare(`
      INSERT INTO gaps (id, project_id, description, priority, owner, deadline, related_requirement_ids,
        analysis_run_id, status, gap_type, consequence, recommended_action, confidence,
        idempotency_key, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const item of output.gaps ?? []) insertGap.run(
      item.id ?? id("gap"), projectId, item.description, item.priority, item.owner ?? null,
      item.deadline ?? null, json(item.relatedRequirementIds, []), runId, item.status ?? "open",
      item.gapType ?? "evidence", item.consequence ?? null, item.recommendedAction ?? null,
      item.confidence ?? 0, item.idempotencyKey ?? null,
    );

    const insertClarification = db.prepare(`
      INSERT INTO clarifications (id, project_id, question, context, source_location, analysis_run_id,
        status, risk_level, send_channel, recipient, idempotency_key, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const item of output.clarifications ?? []) insertClarification.run(
      item.id ?? id("clr"), projectId, item.question, item.context ?? null,
      item.sourceLocation ?? null, runId, item.status ?? "draft", item.riskLevel ?? "medium",
      item.sendChannel ?? null, item.recipient ?? null, item.idempotencyKey ?? null,
    );
  });
  apply();
  return getRunOutputCounts(runId);
}

export function getRunOutputCounts(runId: string) {
  const result: Record<string, number> = {};
  for (const table of ["fragments", "requirements", "questions", "deadlines", "attachments", "gaps", "clarifications"]) {
    const row = db.prepare(`SELECT COUNT(*) count FROM ${table} WHERE analysis_run_id = ?`).get(runId) as { count: number };
    result[table] = row.count;
  }
  return result;
}

export function addCitation(input: {
  projectId: string; analysisRunId?: string | null; fragmentId: string;
  entityType: string; entityId: string; quote: string; quoteStart?: number | null;
  quoteEnd?: number | null; locator?: JsonObject; confidence?: number;
  verificationStatus?: "unverified" | "verified" | "rejected";
}) {
  const citationId = id("cit");
  db.prepare(`
    INSERT INTO citations (id, project_id, analysis_run_id, fragment_id, entity_type, entity_id,
      quote, quote_start, quote_end, locator_json, confidence, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id, fragment_id, quote_start, quote_end) DO UPDATE SET
      quote = excluded.quote, locator_json = excluded.locator_json,
      confidence = excluded.confidence, verification_status = excluded.verification_status
  `).run(
    citationId, input.projectId, input.analysisRunId ?? null, input.fragmentId,
    input.entityType, input.entityId, input.quote, input.quoteStart ?? null, input.quoteEnd ?? null,
    json(input.locator), input.confidence ?? 0, input.verificationStatus ?? "unverified",
  );
  return citationId;
}

export function upsertEvidenceFact(input: {
  projectId: string; idempotencyKey: string; evidenceId?: string | null; fileId?: string | null;
  subject: string; factKey: string; value: unknown; unit?: string | null;
  provenanceClass?: "verified_primary" | "verified_customer" | "supported_secondary" | "inferred" | "unverified_claim" | "missing";
  verificationStatus?: "unverified" | "verified" | "rejected" | "expired" | "conflicting";
  sourceLocation?: string | null; validFrom?: string | null; validUntil?: string | null; confidence?: number;
}) {
  const factId = id("fact");
  db.prepare(`
    INSERT INTO evidence_facts (id, project_id, evidence_id, file_id, subject, fact_key, value_json,
      unit, provenance_class, verification_status, source_location, valid_from, valid_until,
      confidence, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET
      evidence_id = excluded.evidence_id, file_id = excluded.file_id, subject = excluded.subject,
      fact_key = excluded.fact_key, value_json = excluded.value_json, unit = excluded.unit,
      provenance_class = excluded.provenance_class, verification_status = excluded.verification_status,
      source_location = excluded.source_location, valid_from = excluded.valid_from,
      valid_until = excluded.valid_until, confidence = excluded.confidence, updated_at = datetime('now')
  `).run(
    factId, input.projectId, input.evidenceId ?? null, input.fileId ?? null, input.subject,
    input.factKey, json(input.value, null), input.unit ?? null, input.provenanceClass ?? "missing",
    input.verificationStatus ?? "unverified", input.sourceLocation ?? null, input.validFrom ?? null,
    input.validUntil ?? null, input.confidence ?? 0, input.idempotencyKey,
  );
  return db.prepare(`SELECT * FROM evidence_facts WHERE project_id = ? AND idempotency_key = ?`)
    .get(input.projectId, input.idempotencyKey) as Row;
}

export function recordComplianceDecision(input: {
  projectId: string; requirementId: string; analysisRunId?: string | null; status: ComplianceStatus;
  decisionMethod?: string; requiredValue?: unknown; observedValue?: unknown; rationale: string;
  assumptions?: unknown[]; evidenceFactIds?: string[]; confidence?: number;
  consequenceIfWrong?: string | null;
}) {
  return db.transaction(() => {
    db.prepare(`UPDATE compliance_decisions SET is_current = 0 WHERE requirement_id = ? AND is_current = 1`)
      .run(input.requirementId);
    const decisionId = id("dec");
    db.prepare(`
      INSERT INTO compliance_decisions (id, project_id, requirement_id, analysis_run_id, status,
        decision_method, required_value_json, observed_value_json, rationale, assumptions_json,
        evidence_fact_ids_json, confidence, consequence_if_wrong)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decisionId, input.projectId, input.requirementId, input.analysisRunId ?? null, input.status,
      input.decisionMethod ?? "semantic", json(input.requiredValue, null), json(input.observedValue, null),
      input.rationale, json(input.assumptions, []), json(input.evidenceFactIds, []),
      input.confidence ?? 0, input.consequenceIfWrong ?? null,
    );
    return decisionId;
  })();
}

export function saveResponse(input: {
  projectId: string; questionId?: string | null; analysisRunId?: string | null; content: string;
  status?: "draft" | "machine_approved" | "superseded" | "submitted" | "rejected";
  claimManifest?: unknown[]; assumptions?: unknown[]; qualityScores?: JsonObject; approvalReason?: string | null;
}) {
  return db.transaction(() => {
    const latest = input.questionId
      ? db.prepare(`SELECT COALESCE(MAX(version), 0) version FROM responses WHERE question_id = ?`).get(input.questionId) as { version: number }
      : { version: 0 };
    if (input.questionId) db.prepare(`UPDATE responses SET status = 'superseded', updated_at = datetime('now') WHERE question_id = ? AND status != 'submitted'`).run(input.questionId);
    const responseId = id("rsp");
    const wordCount = input.content.trim() ? input.content.trim().split(/\s+/).length : 0;
    db.prepare(`
      INSERT INTO responses (id, project_id, question_id, analysis_run_id, version, status, content,
        word_count, character_count, claim_manifest_json, assumptions_json, quality_scores_json,
        approval_reason, approved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'machine_approved' THEN datetime('now') END)
    `).run(
      responseId, input.projectId, input.questionId ?? null, input.analysisRunId ?? null,
      latest.version + 1, input.status ?? "draft", input.content, wordCount, input.content.length,
      json(input.claimManifest, []), json(input.assumptions, []), json(input.qualityScores),
      input.approvalReason ?? null, input.status ?? "draft",
    );
    return responseId;
  })();
}

export function recordQaCheck(input: {
  projectId: string; analysisRunId?: string | null; entityType: string; entityId?: string | null;
  checkKey: string; status: "passed" | "failed" | "warning" | "skipped";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  message: string; details?: JsonObject; deterministic?: boolean;
}) {
  const checkId = id("qa");
  db.prepare(`
    INSERT INTO qa_checks (id, project_id, analysis_run_id, entity_type, entity_id, check_key,
      status, severity, message, details_json, deterministic)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(analysis_run_id, entity_type, entity_id, check_key) DO UPDATE SET
      status = excluded.status, severity = excluded.severity, message = excluded.message,
      details_json = excluded.details_json, deterministic = excluded.deterministic,
      created_at = datetime('now')
  `).run(
    checkId, input.projectId, input.analysisRunId ?? null, input.entityType, input.entityId ?? null,
    input.checkKey, input.status, input.severity ?? "medium", input.message,
    json(input.details), input.deterministic === false ? 0 : 1,
  );
  return checkId;
}

export function createSubmission(input: {
  projectId: string; idempotencyKey: string; portal?: string | null; opportunityRef?: string | null;
  lotRef?: string | null; mandateId?: string | null; manifest?: JsonObject;
}) {
  const submissionId = id("sub");
  db.prepare(`
    INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, lot_ref,
      mandate_id, manifest_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, idempotency_key) DO NOTHING
  `).run(
    submissionId, input.projectId, input.idempotencyKey, input.portal ?? null,
    input.opportunityRef ?? null, input.lotRef ?? null, input.mandateId ?? null, json(input.manifest),
  );
  return db.prepare(`SELECT * FROM submissions WHERE project_id = ? AND idempotency_key = ?`)
    .get(input.projectId, input.idempotencyKey) as Row;
}

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  prepared: ["validating", "withdrawn", "failed"],
  validating: ["ready", "failed", "withdrawn"],
  ready: ["submitting", "withdrawn", "failed"],
  submitting: ["submitted", "unknown", "failed"],
  submitted: ["confirmed", "unknown", "failed"],
  unknown: ["submitted", "confirmed", "failed"],
  confirmed: [], failed: [], withdrawn: [],
};

export function transitionSubmission(submissionId: string, toStatus: SubmissionStatus, input: {
  eventType?: string; details?: JsonObject; receiptRef?: string | null;
  receiptPath?: string | null; confirmation?: JsonObject; errorMessage?: string | null;
} = {}) {
  return db.transaction(() => {
    const current = db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(submissionId) as Row | undefined;
    if (!current) throw new Error(`Submission not found: ${submissionId}`);
    const from = current.status as SubmissionStatus;
    if (from !== toStatus && !transitions[from].includes(toStatus)) {
      throw new Error(`Invalid submission transition: ${from} -> ${toStatus}`);
    }
    db.prepare(`
      UPDATE submissions SET status = ?, receipt_ref = COALESCE(?, receipt_ref),
        receipt_path = COALESCE(?, receipt_path), confirmation_json = COALESCE(?, confirmation_json),
        error_message = COALESCE(?, error_message),
        submitted_at = CASE WHEN ? = 'submitted' THEN datetime('now') ELSE submitted_at END,
        confirmed_at = CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE confirmed_at END,
        updated_at = datetime('now') WHERE id = ?
    `).run(
      toStatus, input.receiptRef ?? null, input.receiptPath ?? null,
      input.confirmation ? json(input.confirmation) : null, input.errorMessage ?? null,
      toStatus, toStatus, submissionId,
    );
    db.prepare(`
      INSERT INTO submission_events (id, submission_id, from_status, to_status, event_type, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id("sev"), submissionId, from, toStatus, input.eventType ?? "status_change", json(input.details));
    return db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(submissionId) as Row;
  })();
}

export function appendAuditEvent(input: {
  projectId?: string | null; analysisRunId?: string | null; actor: string; action: string;
  entity: string; entityId?: string | null; details?: JsonObject; correlationId?: string | null;
  severity?: "critical" | "high" | "medium" | "low" | "info"; ip?: string | null;
}) {
  return db.transaction(() => {
    const previous = input.projectId
      ? db.prepare(`SELECT event_hash FROM audit_events WHERE project_id = ? AND event_hash IS NOT NULL ORDER BY created_at DESC, rowid DESC LIMIT 1`).get(input.projectId) as { event_hash?: string } | undefined
      : undefined;
    const eventId = id("aud");
    const details = json(input.details);
    const previousHash = previous?.event_hash ?? null;
    const eventHash = createHash("sha256").update(json({
      eventId, projectId: input.projectId ?? null, actor: input.actor, action: input.action,
      entity: input.entity, entityId: input.entityId ?? null, details, previousHash,
    })).digest("hex");
    db.prepare(`
      INSERT INTO audit_events (id, project_id, actor, action, entity, entity_id, details_json, ip,
        analysis_run_id, correlation_id, severity, previous_hash, event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId, input.projectId ?? null, input.actor, input.action, input.entity,
      input.entityId ?? null, details, input.ip ?? null, input.analysisRunId ?? null,
      input.correlationId ?? null, input.severity ?? "info", previousHash, eventHash,
    );
    return eventId;
  })();
}

export function getAutonomyDashboard(projectId: string) {
  const settings = getAutonomySettings(projectId);
  const latestRun = getLatestAnalysisRun(projectId);
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM requirements WHERE project_id = ?) requirements,
      (SELECT COUNT(*) FROM questions WHERE project_id = ?) questions,
      (SELECT COUNT(*) FROM attachments WHERE project_id = ?) attachments,
      (SELECT COUNT(*) FROM gaps WHERE project_id = ? AND COALESCE(status, 'open') = 'open') open_gaps,
      (SELECT COUNT(*) FROM gaps WHERE project_id = ? AND priority = 'critical' AND COALESCE(status, 'open') = 'open') critical_gaps,
      (SELECT COUNT(*) FROM clarifications WHERE project_id = ? AND COALESCE(status, 'draft') NOT IN ('resolved', 'cancelled')) open_clarifications,
      (SELECT COUNT(*) FROM responses WHERE project_id = ? AND status = 'machine_approved') approved_responses,
      (SELECT COUNT(*) FROM qa_checks WHERE project_id = ? AND status = 'failed') failed_qa,
      (SELECT COUNT(*) FROM submissions WHERE project_id = ? AND status IN ('submitted', 'confirmed')) submissions
  `).get(projectId, projectId, projectId, projectId, projectId, projectId, projectId, projectId, projectId) as Row;
  return { settings, latestRun, counts };
}
