import { randomBytes } from "node:crypto";
import { getDb } from "./db";

const db = getDb();

export interface CheckoutProject {
  project_id: string;
  secure_token: string;
  project_status: string;
  payment_status: string;
}

export function recordCheckoutSession(params: {
  projectId: string;
  sessionId: string;
  amountPence: number;
  currency: string;
}) {
  db.prepare(`
    INSERT INTO payments (id, project_id, stripe_checkout_session, amount_pence, currency, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(
    `pay_${randomBytes(10).toString("hex")}`,
    params.projectId,
    params.sessionId,
    params.amountPence,
    params.currency.toUpperCase(),
  );
}

export function fulfilCheckout(params: {
  projectId: string;
  sessionId: string;
  paymentIntent: string | null;
  eventId: string;
  eventType: string;
}) {
  return db.transaction(() => {
    const payment = db.prepare(`
      SELECT project_id, status FROM payments WHERE stripe_checkout_session = ?
    `).get(params.sessionId) as { project_id: string; status: string } | undefined;

    if (!payment || payment.project_id !== params.projectId) {
      throw new Error("Checkout session is not linked to the supplied project");
    }

    if (payment.status !== "paid") {
      db.prepare(`
        UPDATE payments
        SET status = 'paid', stripe_payment_intent = COALESCE(?, stripe_payment_intent), raw_event = ?
        WHERE stripe_checkout_session = ?
      `).run(params.paymentIntent, JSON.stringify({ id: params.eventId, type: params.eventType }), params.sessionId);
      const previous = db.prepare(`SELECT status FROM projects WHERE id = ?`).get(params.projectId) as { status: string } | undefined;
      db.prepare(`
        UPDATE projects SET status = 'paid', updated_at = datetime('now') WHERE id = ?
      `).run(params.projectId);
      db.prepare(`
        INSERT INTO audit_events (id, project_id, actor, action, entity, details_json)
        VALUES (?, ?, 'stripe', 'payment_confirmed', 'payment', ?)
      `).run(
        `aud_${randomBytes(8).toString("hex")}`,
        params.projectId,
        JSON.stringify({ checkout_session: params.sessionId }),
      );
      if (!previous || previous.status !== "paid") {
        void import("./alerts")
          .then(({ notifyProjectStageChange }) => notifyProjectStageChange(params.projectId, previous?.status ?? null, "paid"))
          .catch((error) => console.error("Payment stage alert failed", { name: error instanceof Error ? error.name : "UnknownError" }));
      }
    }
  })();
}

export function markCheckoutFailed(sessionId: string, eventId: string, eventType: string) {
  db.prepare(`
    UPDATE payments SET status = 'failed', raw_event = ?
    WHERE stripe_checkout_session = ? AND status != 'paid'
  `).run(JSON.stringify({ id: eventId, type: eventType }), sessionId);
}

export function getCheckoutProject(sessionId: string): CheckoutProject | undefined {
  return db.prepare(`
    SELECT p.project_id, pr.secure_token, pr.status AS project_status, p.status AS payment_status
    FROM payments p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.stripe_checkout_session = ?
  `).get(sessionId) as CheckoutProject | undefined;
}
