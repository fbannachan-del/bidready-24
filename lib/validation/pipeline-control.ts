import { createHash } from "node:crypto";

export type AutonomyProfile = "assisted" | "autonomous" | "unattended";

export const PIPELINE_STAGES = [
  "ingest",
  "extract",
  "analyse",
  "match_evidence",
  "draft",
  "validate",
  "submit",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type RunStatus = "running" | "completed" | "failed";

export type StageRun = {
  stage: PipelineStage;
  inputFingerprint: string;
  status: RunStatus;
  attempt: number;
  recoverable?: boolean;
  leaseExpiresAt?: string;
};

export type PipelineAction =
  | { action: "run" | "retry" | "recover"; stage: PipelineStage; idempotencyKey: string; attempt: number }
  | { action: "wait"; stage: PipelineStage }
  | { action: "halt"; stage: PipelineStage; reason: string }
  | { action: "complete" };

export function validateAutonomyProfileTransition(from: AutonomyProfile, to: AutonomyProfile): boolean {
  if (from === to) return true;
  if (from === "assisted") return to === "autonomous";
  if (from === "autonomous") return to === "assisted" || to === "unattended";
  return to === "autonomous";
}

export function makeIdempotencyKey(projectId: string, stage: PipelineStage, inputFingerprint: string): string {
  return createHash("sha256").update(`${projectId}\0${stage}\0${inputFingerprint}`).digest("hex");
}

/**
 * Chooses exactly one next action. Completed work with an unchanged input is
 * skipped, failed work is retried within policy, and stale leases are recovered.
 */
export function planNextPipelineAction(params: {
  projectId: string;
  inputFingerprints: Record<PipelineStage, string>;
  runs: StageRun[];
  targetStage?: PipelineStage;
  maxAttempts?: number;
  now?: Date;
}): PipelineAction {
  const maxAttempts = params.maxAttempts ?? 3;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    return { action: "halt", stage: "ingest", reason: "Maximum attempts must be a positive integer" };
  }
  const targetIndex = params.targetStage ? PIPELINE_STAGES.indexOf(params.targetStage) : PIPELINE_STAGES.length - 1;
  if (targetIndex < 0) return { action: "halt", stage: "ingest", reason: "Unknown target stage" };
  const now = (params.now ?? new Date()).getTime();

  for (const stage of PIPELINE_STAGES.slice(0, targetIndex + 1)) {
    const fingerprint = params.inputFingerprints[stage];
    if (!fingerprint) return { action: "halt", stage, reason: "Missing input fingerprint" };
    const stageRuns = params.runs.filter((run) => run.stage === stage && run.inputFingerprint === fingerprint);
    // A completed run is immutable evidence that this exact input succeeded;
    // a later duplicate worker failure must never downgrade that result.
    if (stageRuns.some((run) => run.status === "completed")) continue;
    const matching = stageRuns.sort((a, b) => b.attempt - a.attempt)[0];
    if (!matching) {
      return { action: "run", stage, idempotencyKey: makeIdempotencyKey(params.projectId, stage, fingerprint), attempt: 1 };
    }
    if (matching.status === "running") {
      const expired = matching.leaseExpiresAt && Date.parse(matching.leaseExpiresAt) <= now;
      if (!expired) return { action: "wait", stage };
      if (matching.attempt >= maxAttempts) return { action: "halt", stage, reason: "Maximum recovery attempts reached" };
      return {
        action: "recover",
        stage,
        idempotencyKey: makeIdempotencyKey(params.projectId, stage, fingerprint),
        attempt: matching.attempt + 1,
      };
    }
    if (!matching.recoverable) return { action: "halt", stage, reason: "Stage failed permanently" };
    if (matching.attempt >= maxAttempts) return { action: "halt", stage, reason: "Maximum retry attempts reached" };
    return {
      action: "retry",
      stage,
      idempotencyKey: makeIdempotencyKey(params.projectId, stage, fingerprint),
      attempt: matching.attempt + 1,
    };
  }
  return { action: "complete" };
}
