import crypto from "node:crypto";
import { analyseDeterministically } from "./deterministic-analysis";
import { extractTenderPack, ExtractionEmptyError } from "./extraction";
import { analyseWithOpenAI } from "./openai-analysis";
import { decideGoNoGo, type AutonomyPolicy } from "./autonomy-policy";
import type { UploadedFileRecord } from "./tender-types";

export function analysisFingerprint(files: UploadedFileRecord[], intakeJson: string | null, orderType: string) {
  return crypto.createHash("sha256")
    .update(files.map((file) => `${file.id}:${file.sha256}`).sort().join("|"))
    .update("\0")
    .update(intakeJson ?? "")
    .update("\0")
    .update(orderType)
    .digest("hex");
}

export async function buildAutonomousAnalysis(params: {
  files: UploadedFileRecord[];
  intakeJson: string | null;
  orderType: "preflight" | "complete";
  policy: AutonomyPolicy;
  allowProviderAnalysis?: boolean;
}) {
  const extracted = await extractTenderPack(params.files);
  if (!extracted.fragments.length) {
    // Nothing readable at all — surface the per-file reasons so the API can
    // return an actionable 4xx instead of an opaque 500.
    throw new ExtractionEmptyError(extracted.failures.map((item) => ({ id: item.file.id, name: item.file.original_name, error: item.error })));
  }
  let intake: Record<string, unknown> | null = null;
  try { intake = params.intakeJson ? JSON.parse(params.intakeJson) : null; } catch { intake = null; }
  const deterministic = analyseDeterministically(extracted.fragments, intake, params.orderType);
  let analysis = deterministic;
  const aiEnabled = process.env.ENABLE_REAL_AI === "true" && Boolean(process.env.OPENAI_API_KEY);
  const providerStatus: { attempted: boolean; ok: boolean; provider: string; model: string | null; error?: string } = {
    attempted: false, ok: false, provider: analysis.provider, model: analysis.model,
  };
  if (params.allowProviderAnalysis !== false) {
    providerStatus.attempted = aiEnabled;
    try {
      analysis = await analyseWithOpenAI(extracted.fragments, deterministic);
      providerStatus.provider = analysis.provider;
      providerStatus.model = analysis.model;
      providerStatus.ok = analysis.provider === "openai";
    } catch (error) {
      // Do NOT swallow silently: record the reason so it is diagnosable and
      // visible to the receiver that only deterministic extraction ran.
      const reason = error instanceof Error ? error.message : String(error);
      providerStatus.error = reason;
      console.error("Provider analysis failed; using deterministic output", { name: error instanceof Error ? error.name : "UnknownError", reason });
      analysis.assumptions.push(`The provider-backed analysis was unavailable (${reason}); independently testable deterministic extraction was used.`);
    }
  }
  if (params.orderType === "complete") {
    for (const question of analysis.questions) {
      if (analysis.responses.some((draft) => draft.questionId === question.externalId)) continue;
      const content = `# ${question.identifier}: ${question.text}\n\n## Direct response\n[Insert a concise, verified answer to every part of the question.]\n\n## Delivery method\n[Describe people, process, controls and implementation using authorised commitments only.]\n\n## Evidence and outcomes\n[Insert approved case studies, measures and source-backed outcomes.]\n\n## Governance\n[Describe KPIs, reporting, escalation and continuous improvement.]`;
      analysis.responses.push({ externalId: `response_${question.externalId}`, questionId: question.externalId, title: `${question.identifier} response structure`, content, wordCount: content.split(/\s+/).length, factualSupport: 0, requirementCoverage: 0.35, unsupportedClaims: ["Customer-specific evidence is required"], status: "verification_required" });
    }
  }
  extracted.failures.forEach((failure, index) => analysis.clarifications.push({
    externalId: `extract_failure_${index + 1}`,
    question: `Please provide a readable replacement for ${failure.file.original_name}.`,
    context: `The file could not be analysed: ${failure.error}`,
    documentId: failure.file.id,
    location: `file:${failure.file.original_name}`,
    risk: "high",
    sendStatus: "proposed",
  }));
  const publishedWeight = analysis.questions.reduce((sum, question) => sum + (question.weight ?? 0), 0);
  if (publishedWeight > 0 && ![40, 60, 100].includes(publishedWeight)) {
    const first = analysis.questions[0];
    analysis.clarifications.push({
      externalId: "weighting_reconciliation",
      question: `Please confirm the question weightings; the extracted question-level total is ${publishedWeight}%.`,
      context: "The published question weightings do not reconcile to a recognised quality or overall total.",
      documentId: first?.documentId ?? extracted.fragments[0].fileId,
      location: first?.location ?? extracted.fragments[0].location,
      risk: "medium",
      sendStatus: "proposed",
    });
  }
  const decision = decideGoNoGo(analysis, params.policy);
  return { ...extracted, analysis, decision, providerStatus };
}
