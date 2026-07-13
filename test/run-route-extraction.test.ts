import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { POST as runPost } from "../app/api/project/[token]/run/route";
import { createProject } from "../lib/projects";
import { getDb } from "../lib/db";

/**
 * End-to-end contract test: a project whose only file cannot be read must
 * return 422 EXTRACTION_EMPTY with per-file reasons — never an opaque 500.
 * Requires a migrated DB (DATABASE_PATH set by the test runner).
 */
describe("run route — unreadable pack returns 422 with reasons", () => {
  it("responds 422 EXTRACTION_EMPTY listing the failed file", async () => {
    const project = createProject({ order_type: "preflight", amount_pence: 0, company_name: "[TEST] extraction 422" });
    getDb().prepare(`UPDATE projects SET status = 'paid' WHERE id = ?`).run(project.id);
    getDb().prepare(`UPDATE projects SET intake_json = ? WHERE id = ?`).run(
      JSON.stringify({ company_name: "Acme", bid_deadline: "2026-08-14", service_area: "X", contact_name: "A", contact_email: "a@b.com", consent: true }),
      project.id,
    );
    // A file row that points at a non-existent path → extraction fails for every file.
    getDb().prepare(`INSERT INTO files (id, project_id, original_name, stored_path, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      "file_missing_1", project.id, "unreadable.pdf", "/no/such/path/unreadable.pdf", "application/pdf", 10, "hash1",
    );

    const req = new NextRequest(`http://127.0.0.1/api/project/${project.secure_token}/run`, { method: "POST" });
    const res = await runPost(req, { params: Promise.resolve({ token: project.secure_token }) });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.code, "EXTRACTION_EMPTY");
    assert.ok(Array.isArray(body.files) && body.files.length >= 1);
    assert.equal(body.files[0].name, "unreadable.pdf");
    assert.match(String(body.files[0].reason), /ENOENT|no such file/i);

    // The run must be recorded as failed (not silently succeeded).
    const run = getDb().prepare(`SELECT status, error_code FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`).get(project.id) as { status: string; error_code: string };
    assert.equal(run.status, "failed");
    assert.equal(run.error_code, "EXTRACTION_EMPTY");
  });
});
