import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const databasePath = join(tmpdir(), `bidready-payments-${process.pid}-${Date.now()}.db`);
let database: ReturnType<typeof import("../lib/db").getDb>;
let project: { id: string; secure_token: string };
let payments: typeof import("../lib/payments");

before(async () => {
  process.env.DATABASE_PATH = databasePath;
  await import("../scripts/migrate");
  const databaseModule = await import("../lib/db");
  const projects = await import("../lib/projects");
  payments = await import("../lib/payments");
  database = databaseModule.getDb();
  project = projects.createProject({ order_type: "preflight", amount_pence: 14900 });
});

after(async () => {
  const { closeDb } = await import("../lib/db");
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
});

describe("payment fulfilment", () => {
  it("releases project access only after an idempotent verified fulfilment", () => {
    payments.recordCheckoutSession({
      projectId: project.id,
      sessionId: "cs_test_verified",
      amountPence: 14900,
      currency: "GBP",
    });
    assert.equal(payments.getCheckoutProject("cs_test_verified")?.payment_status, "pending");

    const event = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    payments.fulfilCheckout({
      projectId: project.id,
      sessionId: "cs_test_verified",
      paymentIntent: "pi_verified",
      rawEvent: event,
    });
    payments.fulfilCheckout({
      projectId: project.id,
      sessionId: "cs_test_verified",
      paymentIntent: "pi_verified",
      rawEvent: event,
    });

    const checkout = payments.getCheckoutProject("cs_test_verified");
    assert.equal(checkout?.payment_status, "paid");
    assert.equal(checkout?.project_status, "paid");
    assert.equal(checkout?.secure_token, project.secure_token);
    const count = database.prepare(`SELECT COUNT(*) AS count FROM audit_events WHERE project_id = ? AND action = 'payment_confirmed'`).get(project.id) as { count: number };
    assert.equal(count.count, 1);
  });

  it("fails closed for an unlinked project and never downgrades paid state", () => {
    assert.throws(() => payments.fulfilCheckout({
      projectId: "proj_attacker",
      sessionId: "cs_test_verified",
      paymentIntent: "pi_attacker",
      rawEvent: "{}",
    }), /not linked/);
    payments.markCheckoutFailed("cs_test_verified", "expired");
    assert.equal(payments.getCheckoutProject("cs_test_verified")?.payment_status, "paid");
  });

  it("enforces one database record per Stripe session", () => {
    assert.throws(() => payments.recordCheckoutSession({
      projectId: project.id,
      sessionId: "cs_test_verified",
      amountPence: 14900,
      currency: "GBP",
    }), /UNIQUE/);
  });
});
