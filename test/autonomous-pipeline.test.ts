import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

test("runs a complete source-cited tender preflight and safely reuses identical input", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bidready-e2e-"));
  process.env.DATABASE_PATH = path.join(root, "bidready.db");
  process.env.UPLOAD_DIR = path.join(root, "uploads");
  process.env.ENABLE_REAL_AI = "false";
  const [{ getDb }, { migrateAutonomySchema }, { createProject, updateProjectIntake }, { runAutonomousPipeline }] = await Promise.all([
    import("../lib/db"), import("../lib/autonomy-migrations"), import("../lib/projects"), import("../lib/autonomous-pipeline"),
  ]);
  const db = getDb();
  db.exec(`
    CREATE TABLE projects (id TEXT PRIMARY KEY, order_type TEXT NOT NULL, amount_pence INTEGER NOT NULL, status TEXT NOT NULL, secure_token TEXT UNIQUE, token_expires_at TEXT, token_revoked INTEGER DEFAULT 0, company_name TEXT, intake_json TEXT, portal TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE files (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, original_name TEXT, stored_path TEXT, mime_type TEXT, size_bytes INTEGER, sha256 TEXT, uploaded_at TEXT DEFAULT (datetime('now')), deleted_at TEXT);
    CREATE TABLE fragments (id TEXT PRIMARY KEY, project_id TEXT, file_id TEXT, page_or_location TEXT, section TEXT, text TEXT, char_start INTEGER, char_end INTEGER, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE requirements (id TEXT PRIMARY KEY, project_id TEXT, type TEXT, title TEXT, verbatim_excerpt TEXT, normalized_requirement TEXT, document_id TEXT, page_or_location TEXT, mandatory INTEGER DEFAULT 1, evaluation_weight REAL, response_limit TEXT, customer_status TEXT DEFAULT 'uncertain', confidence REAL DEFAULT 0, review_required INTEGER DEFAULT 1, matched_evidence_ids TEXT, notes TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE questions (id TEXT PRIMARY KEY, project_id TEXT, identifier TEXT, section TEXT, question_text TEXT, response_type TEXT, word_limit INTEGER, scoring_weight REAL, evaluation_guidance TEXT, source_location TEXT, review_required INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE deadlines (id TEXT PRIMARY KEY, project_id TEXT, label TEXT, datetime TEXT, description TEXT, source_location TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE attachments (id TEXT PRIMARY KEY, project_id TEXT, required_name TEXT, format TEXT, signer TEXT, owner TEXT, status TEXT DEFAULT 'missing', source_location TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE evidence (id TEXT PRIMARY KEY, project_id TEXT, kind TEXT, title TEXT, content TEXT, source_ref TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE gaps (id TEXT PRIMARY KEY, project_id TEXT, description TEXT, priority TEXT, owner TEXT, deadline TEXT, related_requirement_ids TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE clarifications (id TEXT PRIMARY KEY, project_id TEXT, question TEXT, context TEXT, source_location TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE audit_events (id TEXT PRIMARY KEY, project_id TEXT, actor TEXT, action TEXT, entity TEXT, entity_id TEXT, details_json TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now')));
  `);
  migrateAutonomySchema(db);
  const project = createProject({ order_type: "complete", amount_pence: 34900, company_name: "Evidence Cleaning Ltd" });
  updateProjectIntake(project.id, JSON.stringify({ company_name: "Evidence Cleaning Ltd", insurance_levels: "PL £5m / EL £10m", certifications: ["CHAS"], existing_policies: ["Health & Safety"], contact_name: "Receiver", contact_email: "receiver@example.com", bid_deadline: "2026-08-14", service_area: "Anytown", consent: true }), "Evidence Cleaning Ltd");
  const fixturePath = path.resolve("fixtures/golden-tender-01.md");
  const storedPath = path.join(root, "tender.md");
  fs.copyFileSync(fixturePath, storedPath);
  const bytes = fs.readFileSync(storedPath);
  db.prepare(`INSERT INTO files (id, project_id, original_name, stored_path, mime_type, size_bytes, sha256) VALUES ('file_golden', ?, 'golden-tender-01.md', ?, 'text/markdown', ?, ?)`).run(project.id, storedPath, bytes.length, crypto.createHash("sha256").update(bytes).digest("hex"));

  const first = await runAutonomousPipeline(project.id, "test");
  assert.equal(first.status, "succeeded");
  const firstCounts = first as typeof first & Record<string, unknown>;
  assert.ok(Number(firstCounts.requirements) >= 5);
  assert.ok(Number(firstCounts.questions) >= 3);
  assert.ok(Number(firstCounts.deadlines) >= 3);
  assert.ok((db.prepare(`SELECT COUNT(*) count FROM citations WHERE project_id = ? AND verification_status = 'verified'`).get(project.id) as { count: number }).count >= 8);
  assert.equal((db.prepare(`SELECT status FROM compliance_decisions WHERE requirement_id = ?`).get(`${project.id}_requirement_${crypto.createHash("sha256").update("requirement:public liability insurance minimum £10,000,000 (see specification clause 3.1 and form a)." ).digest("hex").slice(0, 12)}`) as { status: string } | undefined)?.status, "not_met");
  assert.ok((db.prepare(`SELECT COUNT(*) count FROM responses WHERE project_id = ?`).get(project.id) as { count: number }).count >= 3);

  const second = await runAutonomousPipeline(project.id, "test");
  assert.equal("reused" in second && second.reused, true);
  assert.equal((db.prepare(`SELECT COUNT(*) count FROM analysis_runs WHERE project_id = ?`).get(project.id) as { count: number }).count, 1);
});
