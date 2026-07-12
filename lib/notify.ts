import { randomBytes } from "node:crypto";
import { getDb } from "./db";

export type AlertKind = "tender_live" | "project_stage" | "project_access" | "generic";

export type DeliverAlertInput = {
  kind: AlertKind | string;
  recipient: string;
  subject: string;
  bodyText: string;
  meta?: Record<string, unknown>;
};

/**
 * Delivers an alert via optional webhook / Resend, always logging a delivery row.
 * Without external providers, delivery is recorded as "logged" (console) so local/dev still works.
 */
export async function deliverAlert(input: DeliverAlertInput): Promise<{ id: string; status: string }> {
  const db = getDb();
  const id = `alert_${randomBytes(10).toString("hex")}`;
  let status = "logged";
  let error: string | null = null;

  // Prefer a dedicated alerts webhook, then support webhook as a shared inbox adapter.
  const webhookUrl = process.env.ALERT_WEBHOOK_URL || process.env.SUPPORT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const endpoint = new URL(webhookUrl);
      if (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:") {
        throw new Error("ALERT_WEBHOOK_HTTPS_REQUIRED");
      }
      const secret = process.env.ALERT_WEBHOOK_SECRET || process.env.SUPPORT_WEBHOOK_SECRET;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(secret ? { authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          type: "bidready24_alert",
          kind: input.kind,
          to: input.recipient,
          subject: input.subject,
          text: input.bodyText,
          meta: input.meta || {},
          created_at: new Date().toISOString(),
        }),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      status = "sent_webhook";
    } catch (err) {
      error = err instanceof Error ? err.message : "webhook_failed";
      status = "failed";
      console.error("[alerts] webhook delivery failed", { name: error });
    }
  }

  // Optional Resend path when configured.
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (resendKey && from && status !== "sent_webhook") {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.recipient],
          subject: input.subject,
          text: input.bodyText,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
      status = "sent_email";
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : "resend_failed";
      status = status === "logged" ? "failed" : status;
      console.error("[alerts] resend delivery failed", { name: error });
    }
  }

  if (status === "logged") {
    console.info("[alerts]", {
      kind: input.kind,
      to: input.recipient,
      subject: input.subject,
      preview: input.bodyText.slice(0, 180),
    });
  }

  try {
    db.prepare(`
      INSERT INTO alert_deliveries (id, channel, kind, recipient, subject, body_text, status, error, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      status.startsWith("sent") ? status : "log",
      input.kind,
      input.recipient,
      input.subject.slice(0, 300),
      input.bodyText.slice(0, 20_000),
      status,
      error,
      input.meta ? JSON.stringify(input.meta) : null,
    );
  } catch (err) {
    // Table may not exist yet mid-migration.
    console.error("[alerts] could not persist delivery row", {
      name: err instanceof Error ? err.name : "UnknownError",
    });
  }

  return { id, status };
}
