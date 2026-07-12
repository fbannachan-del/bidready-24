import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PIPELINE_STAGES,
  makeIdempotencyKey,
  planNextPipelineAction,
  validateAutonomyProfileTransition,
  type PipelineStage,
  type StageRun,
} from "../../lib/validation/pipeline-control";

const fingerprints = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, `${stage}-v1`])) as Record<PipelineStage, string>;
const completeThrough = (last: PipelineStage): StageRun[] => PIPELINE_STAGES
  .slice(0, PIPELINE_STAGES.indexOf(last) + 1)
  .map((stage) => ({ stage, inputFingerprint: fingerprints[stage], status: "completed", attempt: 1 }));

describe("autonomous pipeline idempotency and recovery", () => {
  it("starts at ingestion and advances one stage at a time", () => {
    assert.equal(planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [] }).action, "run");
    const action = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: completeThrough("ingest") });
    assert.equal(action.action, "run");
    if (action.action === "run") assert.equal(action.stage, "extract");
  });

  it("returns complete when every stage already succeeded for the same input", () => {
    assert.deepEqual(planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: completeThrough("submit") }), { action: "complete" });
  });

  it("generates stable, project-scoped idempotency keys", () => {
    const first = makeIdempotencyKey("p1", "extract", "abc");
    assert.equal(first, makeIdempotencyKey("p1", "extract", "abc"));
    assert.notEqual(first, makeIdempotencyKey("p2", "extract", "abc"));
    assert.notEqual(first, makeIdempotencyKey("p1", "extract", "changed"));
  });

  it("waits for a live lease and recovers an expired lease", () => {
    const base = completeThrough("ingest");
    const running: StageRun = { stage: "extract", inputFingerprint: fingerprints.extract, status: "running", attempt: 1, leaseExpiresAt: "2026-07-12T12:30:00Z" };
    assert.equal(planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [...base, running], now: new Date("2026-07-12T12:00:00Z") }).action, "wait");
    const recovered = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [...base, running], now: new Date("2026-07-12T13:00:00Z") });
    assert.equal(recovered.action, "recover");
    if (recovered.action === "recover") assert.equal(recovered.attempt, 2);
  });

  it("retries recoverable failures but halts at the loop limit", () => {
    const base = completeThrough("ingest");
    const failure: StageRun = { stage: "extract", inputFingerprint: fingerprints.extract, status: "failed", attempt: 2, recoverable: true };
    const retry = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [...base, failure], maxAttempts: 3 });
    assert.equal(retry.action, "retry");
    if (retry.action === "retry") assert.equal(retry.attempt, 3);
    const halt = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [...base, { ...failure, attempt: 3 }], maxAttempts: 3 });
    assert.equal(halt.action, "halt");
  });

  it("never retries a permanent validation failure", () => {
    const failure: StageRun = { stage: "ingest", inputFingerprint: fingerprints.ingest, status: "failed", attempt: 1, recoverable: false };
    assert.equal(planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [failure] }).action, "halt");
  });

  it("reruns a stage whose fingerprint changed instead of reusing stale output", () => {
    const runs = completeThrough("analyse");
    const changed = { ...fingerprints, analyse: "analyse-v2", match_evidence: "match-v2", draft: "draft-v2", validate: "validate-v2", submit: "submit-v2" };
    const action = planNextPipelineAction({ projectId: "p1", inputFingerprints: changed, runs });
    assert.equal(action.action, "run");
    if (action.action === "run") assert.equal(action.stage, "analyse");
  });

  it("supports stopping at a requested stage", () => {
    const action = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: completeThrough("analyse"), targetStage: "analyse" });
    assert.deepEqual(action, { action: "complete" });
  });

  it("does not downgrade an immutable successful run after a duplicate worker fails", () => {
    const runs: StageRun[] = [
      { stage: "ingest", inputFingerprint: fingerprints.ingest, status: "completed", attempt: 1 },
      { stage: "ingest", inputFingerprint: fingerprints.ingest, status: "failed", attempt: 2, recoverable: true },
    ];
    const action = planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs });
    assert.equal(action.action, "run");
    if (action.action === "run") assert.equal(action.stage, "extract");
  });

  it("rejects an invalid retry policy rather than entering an unbounded loop", () => {
    assert.equal(planNextPipelineAction({ projectId: "p1", inputFingerprints: fingerprints, runs: [], maxAttempts: 0 }).action, "halt");
  });
});

describe("autonomy profile transitions", () => {
  it("requires the mandate-bearing autonomous step before unattended mode", () => {
    assert.equal(validateAutonomyProfileTransition("assisted", "unattended"), false);
    assert.equal(validateAutonomyProfileTransition("assisted", "autonomous"), true);
    assert.equal(validateAutonomyProfileTransition("autonomous", "unattended"), true);
  });

  it("does not allow unattended mode to bypass revocation back to assisted", () => {
    assert.equal(validateAutonomyProfileTransition("unattended", "assisted"), false);
    assert.equal(validateAutonomyProfileTransition("unattended", "autonomous"), true);
  });
});
