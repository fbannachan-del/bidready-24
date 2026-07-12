import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "./db";
import { createProject, updateProjectIntake } from "./projects";
import { runAutonomousPipeline } from "./autonomous-pipeline";

const SYNTHETIC_TENDER = `# SYNTHETIC BIDREADY24 END-TO-END TENDER

Title: Provision of Commercial Cleaning Services 2026-2029
Reference: TEST/CLEAN/2026/001
Buyer: Synthetic Borough Council
Portal: Test portal — no connection
Submission deadline: 14 August 2026 at 12:00 noon
Clarification deadline: 31 July 2026 at 17:00

## Mandatory requirements
1. Public liability insurance minimum £10,000,000.
2. Employers' liability insurance minimum £10,000,000.
3. Current CHAS or equivalent SSIP accreditation.
4. Enhanced DBS checks for operatives assigned to education sites.
5. Method statements for each building type must accompany the tender.

## Scored quality questions
Q1. Mobilisation plan. Maximum 1,000 words. Weighting 15%.
Q2. Quality assurance and KPI management. Maximum 1,200 words. Weighting 12%.
Q3. Environmental and sustainability measures. Maximum 800 words. Weighting 8%.

## Required attachments
- Insurance certificates
- CHAS or equivalent certificate
- Safeguarding and DBS policy
- Health and safety policy
- Completed pricing schedule

## Mandatory site visit
Attend on 22 July 2026. Register by 18 July 2026.

This document is synthetic test data. It is not a real procurement opportunity and must never be sent externally.
`;

export type EndToEndCheck = { label: string; passed: boolean; detail: string };

export class EndToEndTestError extends Error {
  constructor(public projectId: string, public checks: EndToEndCheck[]) {
    super("The synthetic end-to-end test did not pass every assertion.");
    this.name = "EndToEndTestError";
  }
}

export async function runSyntheticEndToEndTest() {
  const db = getDb();
  const project = createProject({ order_type: "complete", amount_pence: 0, company_name: "BIDREADY24 System Test" });
  updateProjectIntake(project.id, JSON.stringify({
    company_name: "BIDREADY24 System Test",
    contact_name: "Synthetic Receiver",
    contact_email: "synthetic-test@bidready24.invalid",
    insurance_levels: "Public liability £5m; employers' liability £10m",
    certifications: ["CHAS"],
    existing_policies: ["Health and safety", "Safeguarding"],
    bid_deadline: "2026-08-14",
    service_area: "Synthetic Borough",
    consent: true,
  }), "BIDREADY24 System Test");
  db.prepare(`UPDATE projects SET tender_title = ?, buyer_name = ?, portal = ?, deadline = ?, updated_at = datetime('now') WHERE id = ?`).run(
    "[SYSTEM TEST] Synthetic Council Cleaning Tender",
    "Synthetic Borough Council",
    "Test only — outbound disabled",
    "2026-08-14T12:00:00.000Z",
    project.id,
  );

  const uploadRoot = process.env.UPLOAD_DIR || "./data/uploads";
  const projectDir = path.join(/*turbopackIgnore: true*/ uploadRoot, project.id);
  await mkdir(projectDir, { recursive: true });
  const fileId = `file_e2e_${crypto.randomBytes(8).toString("hex")}`;
  const storedPath = path.join(/*turbopackIgnore: true*/ projectDir, `${fileId}.md`);
  const bytes = Buffer.from(SYNTHETIC_TENDER, "utf8");
  await writeFile(storedPath, bytes, { flag: "wx" });
  db.prepare(`INSERT INTO files (id, project_id, original_name, stored_path, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    fileId,
    project.id,
    "synthetic-e2e-tender.md",
    storedPath,
    "text/markdown",
    bytes.length,
    crypto.createHash("sha256").update(bytes).digest("hex"),
  );

  const result = await runAutonomousPipeline(project.id, "admin_e2e_test", {
    forceDeterministic: true,
    suppressExternalActions: true,
  });
  const counts = result as typeof result & Record<string, unknown>;
  const clarificationResult = "clarifications" in result ? result.clarifications : null;
  const submissionResult = "submission" in result ? result.submission : undefined;
  const citations = (db.prepare(`SELECT COUNT(*) AS count FROM citations WHERE project_id = ? AND verification_status = 'verified'`).get(project.id) as { count: number }).count;
  const responses = (db.prepare(`SELECT COUNT(*) AS count FROM responses WHERE project_id = ?`).get(project.id) as { count: number }).count;
  const failedQa = (db.prepare(`SELECT COUNT(*) AS count FROM qa_checks WHERE project_id = ? AND status = 'failed' AND severity IN ('critical', 'high')`).get(project.id) as { count: number }).count;
  const storedProject = db.prepare(`SELECT status FROM projects WHERE id = ?`).get(project.id) as { status: string };

  const checks: EndToEndCheck[] = [
    { label: "Pipeline", passed: result.status === "succeeded", detail: String(result.status) },
    { label: "Requirements", passed: Number(counts.requirements) >= 5, detail: String(counts.requirements ?? 0) },
    { label: "Scored questions", passed: Number(counts.questions) >= 3, detail: String(counts.questions ?? 0) },
    { label: "Critical dates", passed: Number(counts.deadlines) >= 2, detail: String(counts.deadlines ?? 0) },
    { label: "Verified citations", passed: citations >= 8, detail: String(citations) },
    { label: "Response structures", passed: responses >= 3, detail: String(responses) },
    { label: "Persisted report", passed: storedProject.status === "ready", detail: storedProject.status },
    { label: "External actions", passed: clarificationResult?.sent === 0 && submissionResult === null, detail: "suppressed" },
    { label: "Blocking-gap detection", passed: failedQa >= 1, detail: `${failedQa} detected` },
  ];

  db.prepare(`INSERT INTO audit_events (id, project_id, actor, action, entity, entity_id, details_json) VALUES (?, ?, 'admin', ?, 'system_test', ?, ?)`).run(
    `aud_e2e_${crypto.randomBytes(8).toString("hex")}`,
    project.id,
    checks.every((check) => check.passed) ? "admin_e2e_test_passed" : "admin_e2e_test_failed",
    String(result.run_id),
    JSON.stringify({ checks, stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET), providerConfigured: Boolean(process.env.OPENAI_API_KEY) }),
  );

  if (checks.some((check) => !check.passed)) throw new EndToEndTestError(project.id, checks);
  return { projectId: project.id, token: project.secure_token, runId: String(result.run_id), checks };
}
