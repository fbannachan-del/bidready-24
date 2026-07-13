import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/admin/tests/create-project/route";
import { getDb } from "../lib/db";

const ORIGIN = "http://127.0.0.1:3010";

function request(body: unknown, headers: Record<string, string> = {}) {
  // undici strips the forbidden `origin` header, so simulate a trusted browser
  // request via referer + full fetch-metadata navigation trio (both accepted
  // by isTrustedBrowserPost, matching real browser posts from /admin pages).
  return new NextRequest(`${ORIGIN}/admin/tests/create-project`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      referer: `${ORIGIN}/admin`,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Admin test-project creation route (payment bypass, admin-gated)", () => {
  it("rejects cross-origin posts", async () => {
    const res = await POST(new NextRequest(`${ORIGIN}/admin/tests/create-project`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({}),
    }));
    assert.equal(res.status, 403);
  });

  it("creates a paid zero-value preflight project tagged [TEST]", async () => {
    const res = await POST(request({ order_type: "preflight", label: "route unit" }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.order_type, "preflight");
    assert.equal(body.projects.length, 1);
    const { project_id, token, workspace_path } = body.projects[0];
    assert.ok(project_id.startsWith("proj_"));
    assert.ok(token.length > 20);
    assert.equal(workspace_path, `/project/${token}`);

    const row = getDb().prepare(`SELECT status, amount_pence, company_name, order_type FROM projects WHERE id = ?`).get(project_id) as
      { status: string; amount_pence: number; company_name: string; order_type: string };
    assert.equal(row.status, "paid");
    assert.equal(row.amount_pence, 0);
    assert.equal(row.order_type, "preflight");
    assert.ok(row.company_name.startsWith("[TEST]"));

    const audit = getDb().prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE project_id = ? AND action = 'test_project_created'`).get(project_id) as { n: number };
    assert.equal(audit.n, 1);
  });

  it("supports complete order_type and caps batch size", async () => {
    const res = await POST(request({ order_type: "complete", count: 99 }));
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.order_type, "complete");
    assert.ok(body.projects.length <= 10, `batch capped, got ${body.projects.length}`);
    const row = getDb().prepare(`SELECT order_type, status FROM projects WHERE id = ?`).get(body.projects[0].project_id) as { order_type: string; status: string };
    assert.equal(row.order_type, "complete");
    assert.equal(row.status, "paid");
  });

  it("defaults malformed body to a single preflight project", async () => {
    const res = await POST(request("not-an-object"));
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.projects.length, 1);
  });
});
