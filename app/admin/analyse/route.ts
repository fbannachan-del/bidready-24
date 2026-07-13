import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isTrustedBrowserPost, publicAppUrl } from "@/lib/admin-auth";
import { createProject } from "@/lib/projects";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin-only: create a live analysis workspace with no payment gate and send
 * the admin straight into it. The route lives under /admin so the proxy enforces
 * a valid admin session; the same-origin browser check mirrors the synthetic
 * end-to-end route. Projects are tagged "[ADMIN]" and audited.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedBrowserPost(request.url, request.headers, process.env.APP_URL)) {
    return new NextResponse("Invalid request origin", { status: 403 });
  }
  const publicOrigin = publicAppUrl("/", request.url, process.env.APP_URL);

  const form = await request.formData().catch(() => null);
  const orderType = form?.get("order_type") === "complete" ? "complete" : "preflight";
  const rawLabel = form?.get("label");
  const label = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim().slice(0, 80) : "Admin analysis";

  const project = createProject({ order_type: orderType, amount_pence: 0, company_name: `[ADMIN] ${label}` });
  const db = getDb();
  // No Stripe: treat as paid so the workspace unlocks intake → upload → run.
  db.prepare(`UPDATE projects SET status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(project.id);
  db.prepare(`
    INSERT INTO audit_events (id, project_id, actor, action, entity, details_json)
    VALUES (?, ?, 'admin', 'admin_analysis_created', 'project', ?)
  `).run(`aud_admin_${crypto.randomBytes(8).toString("hex")}`, project.id, JSON.stringify({ order_type: orderType, label }));

  const destination = new URL(`/project/${project.secure_token}`, publicOrigin);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}
