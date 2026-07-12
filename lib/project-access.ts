import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";
import type { ProjectRow } from "./projects";
import { getProjectById, getProjectByToken } from "./projects";

const db = getDb();

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
