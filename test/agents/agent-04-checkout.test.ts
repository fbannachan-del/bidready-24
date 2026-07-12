import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, assertContains, get, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 04 — Checkout & payment handoff", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("checkout page renders CTA and legal links", async () => {
    const { text } = await getOk("/checkout?type=preflight");
    assertContains(text, [
      "Secure checkout",
      "Stripe",
      "/legal/terms",
      "one tender",
    ], "checkout page");
    assert.match(text, /button|Start|Continue|Pay|checkout/i);
  });

  it("POST /api/checkout returns simulated project when allowed, or structured error", async () => {
    const res = await fetch(`${BASE_URL}/api/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_type: "preflight" }),
    });
    const body = await res.json() as Record<string, unknown>;
    if (res.status === 200 && body.simulated) {
      assert.equal(body.ok, true);
      assert.ok(typeof body.token === "string" && String(body.token).length > 10);
      assert.ok(typeof body.project_id === "string");
      // Persist for later agents via env is not possible; re-checkout in those agents.
    } else if (res.status === 503 || res.status === 502) {
      assert.equal(body.ok, false);
      assert.ok(typeof body.error === "string");
    } else if (res.status === 200 && body.url) {
      assert.equal(body.ok, true);
      assert.match(String(body.url), /^https:\/\//);
    } else {
      assert.fail(`Unexpected checkout response ${res.status} ${JSON.stringify(body)}`);
    }
  });

  it("success page is reachable and honest when no session", async () => {
    const { status, text } = await get("/checkout/success");
    assert.ok(status === 200 || status === 307 || status === 308);
    if (status === 200) {
      // Should not invent project access without session
      assert.ok(
        text.includes("Contact") || text.includes("confirm") || text.includes("Payment") || text.includes("waiting") || text.includes("delayed") || text.includes("ready") || text.includes("session"),
        "success page should describe payment confirmation state",
      );
    }
  });

  it("does not expose Stripe secrets in HTML", async () => {
    const { text } = await getOk("/checkout");
    assert.ok(!/sk_live_|sk_test_|whsec_/.test(text));
  });
});
