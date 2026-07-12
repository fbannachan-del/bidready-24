import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const databasePath = join(tmpdir(), `bidready-autonomy-${process.pid}-${Date.now()}.db`);
let store: typeof import("../lib/autonomy");
let database: ReturnType<typeof import("../lib/db").getDb>;
const projectId = "proj_data_test";

before(async () => {
  process.env.DATABASE_PATH = databasePath;
  await import("../scripts/migrate");
  const databaseModule = await import("../lib/db");
  database = databaseModule.getDb();
  store = await import("../lib/autonomy");
  database.prepare(`
    INSERT INTO projects (id, order_type, amount_pence, secure_token, token_expires_at)
    VALUES (?, 'complete', 34900, ?, datetime('now', '+7 days'))
  `).run(projectId, `token-${process.pid}`);
});

after(async () => {
  const { closeDb } = await import("../lib/db");
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
});

describe("autonomous data store", () => {
  it("is idempotent for settings, analysis runs, and replacement output", () => {
    store.upsertAutonomySettings(projectId, {
      profile: "unattended",
      policy: { submit: true },
      mandate: { legalEntity: "Example Cleaning Ltd" },
    });
    store.upsertAutonomySettings(projectId, { policy: { submit: false } });
    const settings = store.getAutonomySettings(projectId);
    assert.equal(settings?.profile, "unattended");
    assert.deepEqual(settings?.mandate, { legalEntity: "Example Cleaning Ltd" });
    assert.equal(settings?.policy_version, 2);

    const first = store.startAnalysisRun({ projectId, idempotencyKey: "pack-sha:v1" });
    const duplicate = store.startAnalysisRun({ projectId, idempotencyKey: "pack-sha:v1" });
    assert.equal(first.id, duplicate.id);

    const output = {
      requirements: [{
        key: "insurance.public_liability",
        title: "Public liability insurance",
        normalizedRequirement: "Hold public liability insurance of at least £10m.",
        confidence: 0.94,
      }],
      questions: [{ identifier: "Q1", questionText: "Describe mobilisation.", wordLimit: 500 }],
      deadlines: [{ label: "Submission", datetime: "2026-08-14T12:00:00Z", isCritical: true }],
      attachments: [{ requiredName: "Form of tender", signatureRequired: true }],
      gaps: [{ description: "Insurance evidence missing", priority: "critical" as const }],
      clarifications: [{ question: "Please confirm the applicable insurance threshold." }],
    };
    store.replaceRunAnalysis(String(first.id), output);
    const replaced = store.replaceRunAnalysis(String(first.id), output);
    assert.deepEqual(replaced, {
      fragments: 0, requirements: 1, questions: 1, deadlines: 1,
      attachments: 1, gaps: 1, clarifications: 1,
    });
  });

  it("keeps exactly one current compliance decision", () => {
    const requirement = database.prepare(`SELECT id FROM requirements WHERE project_id = ? LIMIT 1`)
      .get(projectId) as { id: string };
    store.recordComplianceDecision({
      projectId, requirementId: requirement.id, status: "unable_to_determine",
      rationale: "No customer evidence supplied.",
    });
    store.recordComplianceDecision({
      projectId, requirementId: requirement.id, status: "verified_met",
      rationale: "A current primary certificate was matched.",
    });
    const rows = database.prepare(`SELECT status, is_current FROM compliance_decisions WHERE requirement_id = ? ORDER BY decided_at, rowid`)
      .all(requirement.id) as Array<{ status: string; is_current: number }>;
    assert.equal(rows.length, 2);
    assert.equal(rows.filter((row) => row.is_current === 1).length, 1);
    assert.equal(rows.at(-1)?.status, "verified_met");
  });

  it("guards submission state transitions and records valid transitions", () => {
    const submission = store.createSubmission({
      projectId, idempotencyKey: "portal:opp-1:lot-1", portal: "Test portal",
    });
    assert.throws(
      () => store.transitionSubmission(String(submission.id), "confirmed"),
      /Invalid submission transition/,
    );
    store.transitionSubmission(String(submission.id), "validating");
    store.transitionSubmission(String(submission.id), "ready");
    store.transitionSubmission(String(submission.id), "submitting");
    store.transitionSubmission(String(submission.id), "submitted");
    const confirmed = store.transitionSubmission(String(submission.id), "confirmed", { receiptRef: "receipt-1" });
    assert.equal(confirmed.status, "confirmed");
    assert.equal(confirmed.receipt_ref, "receipt-1");
    const eventCount = database.prepare(`SELECT COUNT(*) count FROM submission_events WHERE submission_id = ?`)
      .get(submission.id) as { count: number };
    assert.equal(eventCount.count, 5);
  });

  it("retains referential integrity", () => {
    assert.deepEqual(database.prepare(`PRAGMA foreign_key_check`).all(), []);
  });
});
