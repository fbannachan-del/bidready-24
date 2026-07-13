import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isTrustedBrowserPost } from "@/lib/admin-auth";
import { createProject } from "@/lib/projects";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const MAX_PROJECTS_PER_CALL = 10;

/**
 * Admin-only helper for functional testing: creates zero-value projects that
 * behave as paid, without touching Stripe. Route lives under /admin so the
 * proxy enforces a valid admin session; the same-origin browser check below
 * mirrors the synthetic end-to-end test route.
 *
 * Projects are tagged "[TEST]" in company_name and audited as
 * test_project_created so they are easy to identify and clean up.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedBrowserPost(request.url, request.headers, process.env.APP_URL)) {
    return new NextResponse("Invalid request origin", { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as {
    order_type?: string;
    count?: number;
    label?: string;
  };
  const order_type = body.order_type === "complete" ? "complete" : "preflight";
  const requested = Number.isFinite(body.count) ? Math.floor(Number(body.count)) : 1;
  const count = Math.min(Math.max(requested, 1), MAX_PROJECTS_PER_CALL);
  const label = typeof body.label === "string" && body.label.trim()
    ? body.label.trim().slice(0, 80)
    : "Functional test";

  const db = getDb();
  const markPaid = db.prepare(`UPDATE projects SET status = 'paid', updated_at = datetime('now') WHERE id = ?`);
  const audit = db.prepare(`
    INSERT INTO audit_events (id, project_id, actor, action, entity, details_json)
    VALUES (?, ?, 'admin', 'test_project_created', 'project', ?)
  `);

  const projects: Array<{ project_id: string; token: string; workspace_path: string }> = [];
  for (let i = 0; i < count; i += 1) {
    const project = createProject({
      order_type,
      amount_pence: 0,
      company_name: `[TEST] ${label}`,
    });
    markPaid.run(project.id);
    audit.run(
      `aud_test_${crypto.randomBytes(8).toString("hex")}`,
      project.id,
      JSON.stringify({ order_type, label, source: "admin_test_project_route" }),
    );
    projects.push({
      project_id: project.id,
      token: project.secure_token,
      workspace_path: `/project/${project.secure_token}`,
    });
  }

  const response = NextResponse.json({ ok: true, order_type, projects });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
