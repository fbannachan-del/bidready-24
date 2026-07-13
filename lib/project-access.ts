import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "./db";
import type { ProjectRow } from "./projects";
import { getProjectById, getProjectByToken, getProjectBySecureToken, refreshProjectToken } from "./projects";
import { CUSTOMER_SESSION_COOKIE, accountFromRequest, accountOwnsProject } from "./customer-auth";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "./admin-auth";

const db = getDb();

/** Who is asking: a token holder is always allowed; owners and admins keep access past token expiry. */
export type AccessContext = { accountId: string | null; isAdmin: boolean };

function isAdminSession(adminCookie?: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !adminCookie) return false;
  return verifyAdminSessionToken({ token: adminCookie, password, sessionSecret: process.env.ADMIN_SESSION_SECRET });
}

export function accessContextFromCookies(opts: { customer?: string | null; admin?: string | null }): AccessContext {
  return {
    accountId: accountFromRequest(opts.customer)?.id ?? null,
    isAdmin: isAdminSession(opts.admin),
  };
}

export function accessContextFromRequest(req: NextRequest): AccessContext {
  return accessContextFromCookies({
    customer: req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value,
    admin: req.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  });
}

/**
 * Resolve a project from its secure token for the current requester.
 * - A live (non-expired, non-revoked) token always works — unchanged public behaviour.
 * - A logged-in owner OR an admin session keeps full access even after the token
 *   has expired, and the expiry is slid forward so their link never goes stale.
 * Revoked tokens remain hard-denied for everyone.
 */
export function resolveAccessibleProject(token: string, ctx: AccessContext): ProjectRow | null {
  const live = getProjectByToken(token);
  if (live) return live;
  const owned = getProjectBySecureToken(token);
  if (!owned) return null;
  if (ctx.isAdmin || (ctx.accountId && accountOwnsProject(ctx.accountId, owned.id))) {
    refreshProjectToken(owned.id);
    return getProjectByToken(token) ?? owned;
  }
  return null;
}

export function resolveAccessibleProjectFromRequest(req: NextRequest, token: string): ProjectRow | null {
  return resolveAccessibleProject(token, accessContextFromRequest(req));
}

/** Server-component helper: reads the request cookies and resolves owner/admin access. */
export async function resolveAccessibleProjectForPage(token: string): Promise<ProjectRow | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return resolveAccessibleProject(token, accessContextFromCookies({
    customer: store.get(CUSTOMER_SESSION_COOKIE)?.value,
    admin: store.get(ADMIN_SESSION_COOKIE)?.value,
  }));
}

export type AccessLookupResult =
  | { matched: true; project: ProjectRow }
  | { matched: false };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function intakeContactEmail(project: ProjectRow): string | null {
  if (!project.intake_json) return null;
  try {
    const parsed = JSON.parse(project.intake_json) as { contact_email?: unknown };
    if (typeof parsed.contact_email === "string" && parsed.contact_email.includes("@")) {
      return normalizeEmail(parsed.contact_email);
    }
  } catch {
    // Invalid intake JSON is treated as no contact on file.
  }
  return null;
}

/** Resolve a user-supplied project reference (id or secure token). */
export function resolveProjectRef(projectRef: string): ProjectRow | undefined {
  const ref = projectRef.trim();
  if (!ref || ref.length > 200) return undefined;
  if (ref.startsWith("proj_")) return getProjectById(ref);
  return getProjectByToken(ref);
}

/**
 * Access is granted only when both email and project ref match a live project
 * whose intake contact_email equals the supplied email. Missing intake = no match.
 * Response shape for callers should stay constant regardless of match (anti-enumeration).
 */
export function matchProjectAccess(email: string, projectRef: string): AccessLookupResult {
  const project = resolveProjectRef(projectRef);
  if (!project) return { matched: false };
  const expected = intakeContactEmail(project);
  if (!expected) return { matched: false };
  const supplied = normalizeEmail(email);
  if (!supplied || supplied.length > 320) return { matched: false };
  // Constant-time-ish compare of email digests (lengths already constrained).
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) return { matched: false };
  return { matched: true, project };
}

export function accessRateLimitKey(ip: string) {
  const salt = process.env.SUPPORT_RATE_LIMIT_SALT || process.env.CHECKOUT_SESSION_SECRET || "bidready-access-dev";
  return createHash("sha256").update(`access:${salt}:${ip}`).digest("hex");
}

export function recentAccessRequestCount(ipHash: string): number {
  try {
    return (db.prepare(`
      SELECT COUNT(*) AS count FROM audit_events
      WHERE action = 'access_link_request' AND entity_id = ?
        AND created_at > datetime('now', '-1 hour')
    `).get(ipHash) as { count: number }).count;
  } catch {
    return 0;
  }
}

export function recordAccessRequest(ipHash: string, matched: boolean, projectId: string | null) {
  try {
    db.prepare(`
      INSERT INTO audit_events (id, project_id, actor, action, entity, entity_id, details_json)
      VALUES (?, ?, 'receiver', 'access_link_request', 'access', ?, ?)
    `).run(
      `aud_access_${randomBytes(8).toString("hex")}`,
      projectId,
      ipHash,
      JSON.stringify({ matched, at: new Date().toISOString() }),
    );
  } catch {
    // Audit table may be mid-migration; access still works without the counter.
  }
}

export function projectWorkspacePath(token: string) {
  return `/project/${token}`;
}

/** Whether the API may echo the project link (local/dev only — never in production). */
export function mayRevealAccessLink(): boolean {
  return process.env.NODE_ENV !== "production";
}
