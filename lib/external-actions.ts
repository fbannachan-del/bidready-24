import { getDb } from "./db";
import { appendAuditEvent } from "./autonomy";
import { canPerformExternalAction, type AutonomyMandate, type AutonomyPolicy } from "./autonomy-policy";

export async function dispatchQueuedClarifications(params: {
  projectId: string;
  policy: AutonomyPolicy;
  mandate: AutonomyMandate;
  portal: string | null;
}) {
  const permission = canPerformExternalAction("clarify", params.policy, params.mandate);
  if (!permission.allowed) return { sent: 0, queued: 0, reason: permission.reason };
  const db = getDb();
  const items = db.prepare(`SELECT id, question, context, source_location FROM clarifications WHERE project_id = ? AND status = 'queued'`).all(params.projectId) as Array<{ id: string; question: string; context: string | null; source_location: string | null }>;
  const endpoint = process.env.OUTBOUND_ACTION_WEBHOOK_URL;
  if (!endpoint || !items.length) return { sent: 0, queued: items.length, reason: endpoint ? "No clarification is queued." : "No outbound buyer-channel adapter is configured." };
  let sent = 0;
  for (const item of items) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...(process.env.OUTBOUND_ACTION_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.OUTBOUND_ACTION_WEBHOOK_SECRET}` } : {}) },
        body: JSON.stringify({ type: "buyer_clarification", projectId: params.projectId, portal: params.portal, clarificationId: item.id, question: item.question, context: item.context, source: item.source_location }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      db.prepare(`UPDATE clarifications SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(item.id);
      appendAuditEvent({ projectId: params.projectId, actor: "system", action: "clarification_sent", entity: "clarification", entityId: item.id, details: { portal: params.portal } });
      sent += 1;
    } catch (error) {
      appendAuditEvent({ projectId: params.projectId, actor: "system", action: "clarification_send_failed", entity: "clarification", entityId: item.id, details: { error: error instanceof Error ? error.message : String(error) }, severity: "high" });
    }
  }
  return { sent, queued: items.length - sent };
}
