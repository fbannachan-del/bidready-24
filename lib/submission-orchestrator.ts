import crypto from "node:crypto";
import { getDb } from "./db";
import { addAudit } from "./projects";
import { canPerformExternalAction, type AutonomyMandate, type AutonomyPolicy } from "./autonomy-policy";

export type SubmissionResult = {
  id: string;
  status: "prepared" | "confirmed" | "failed";
  receipt?: string;
  reason?: string;
};

export async function submitAutonomously(params: {
  projectId: string;
  idempotencyKey: string;
  policy: AutonomyPolicy;
  mandate: AutonomyMandate;
  portal: string | null;
  opportunityRef?: string;
  manifest: Record<string, unknown>;
}): Promise<SubmissionResult> {
  const db = getDb();
  const existing = db.prepare(`SELECT id, status, receipt_ref, error_message FROM submissions WHERE project_id = ? AND idempotency_key = ?`).get(params.projectId, params.idempotencyKey) as { id: string; status: string; receipt_ref: string | null; error_message: string | null } | undefined;
  if (existing) return { id: existing.id, status: existing.status === "confirmed" ? "confirmed" : existing.status === "failed" ? "failed" : "prepared", receipt: existing.receipt_ref ?? undefined, reason: existing.error_message ?? undefined };

  const permission = canPerformExternalAction("submit", params.policy, params.mandate);
  const id = `sub_${crypto.randomBytes(10).toString("hex")}`;
  if (!permission.allowed) {
    db.prepare(`INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, status, manifest_json, error_message) VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?)`).run(id, params.projectId, params.idempotencyKey, params.portal, params.opportunityRef ?? null, JSON.stringify(params.manifest), permission.reason);
    addAudit(params.projectId, "system", "submission_prepared", "submission", { submissionId: id, reason: permission.reason });
    return { id, status: "prepared", reason: permission.reason };
  }

  const blocking = db.prepare(`SELECT COUNT(*) AS count FROM qa_checks WHERE project_id = ? AND status = 'failed' AND severity IN ('critical', 'high')`).get(params.projectId) as { count: number };
  if (blocking.count > 0) {
    const reason = `${blocking.count} blocking quality checks must be resolved.`;
    db.prepare(`INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, status, manifest_json, error_message) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)`).run(id, params.projectId, params.idempotencyKey, params.portal, params.opportunityRef ?? null, JSON.stringify(params.manifest), reason);
    return { id, status: "failed", reason };
  }

  const endpoint = process.env.SUBMISSION_WEBHOOK_URL;
  if (!endpoint) {
    const reason = "No procurement portal adapter is configured; a complete immutable submission package has been prepared.";
    db.prepare(`INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, status, manifest_json, error_message) VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?)`).run(id, params.projectId, params.idempotencyKey, params.portal, params.opportunityRef ?? null, JSON.stringify(params.manifest), reason);
    return { id, status: "prepared", reason };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.SUBMISSION_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.SUBMISSION_WEBHOOK_SECRET}` } : {}) },
      body: JSON.stringify({ submissionId: id, projectId: params.projectId, portal: params.portal, opportunityRef: params.opportunityRef, manifest: params.manifest }),
    });
    if (!response.ok) throw new Error(`Portal adapter returned HTTP ${response.status}`);
    const body = await response.json() as { receipt?: string; confirmed?: boolean };
    const receipt = body.receipt || `BR24-${id.slice(-10).toUpperCase()}`;
    const status = body.confirmed ? "confirmed" : "submitted";
    db.prepare(`INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, status, manifest_json, receipt_ref, submitted_at, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), CASE WHEN ? = 'confirmed' THEN datetime('now') END)`).run(id, params.projectId, params.idempotencyKey, params.portal, params.opportunityRef ?? null, status, JSON.stringify(params.manifest), receipt, status);
    addAudit(params.projectId, "system", "submission_sent", "submission", { submissionId: id, receipt, status });
    return { id, status: body.confirmed ? "confirmed" : "prepared", receipt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    db.prepare(`INSERT INTO submissions (id, project_id, idempotency_key, portal, opportunity_ref, status, manifest_json, error_message) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)`).run(id, params.projectId, params.idempotencyKey, params.portal, params.opportunityRef ?? null, JSON.stringify(params.manifest), reason);
    addAudit(params.projectId, "system", "submission_failed", "submission", { submissionId: id, reason });
    return { id, status: "failed", reason };
  }
}
