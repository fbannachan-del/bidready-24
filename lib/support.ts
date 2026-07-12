import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";

const db = getDb();

export interface SupportRequest {
  id: string;
  name: string;
  email: string;
  project_ref: string | null;
  message: string;
  status: string;
  created_at: string;
}

export function supportIpHash(ip: string) {
  return createHash("sha256").update(`${process.env.SUPPORT_RATE_LIMIT_SALT || "bidready-support"}:${ip}`).digest("hex");
}

export function recentSupportCount(ipHash: string) {
  return (db.prepare(`
    SELECT COUNT(*) AS count FROM support_requests
    WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')
  `).get(ipHash) as { count: number }).count;
}

export function createSupportRequest(input: {
  name: string;
  email: string;
  projectRef?: string;
  message: string;
  ipHash: string;
}) {
  const id = `support_${randomBytes(10).toString("hex")}`;
  db.prepare(`
    INSERT INTO support_requests (id, name, email, project_ref, message, ip_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.email, input.projectRef || null, input.message, input.ipHash);
  return id;
}

export function listSupportRequests(): SupportRequest[] {
  return db.prepare(`
    SELECT id, name, email, project_ref, message, status, created_at
    FROM support_requests ORDER BY created_at DESC LIMIT 20
  `).all() as SupportRequest[];
}
