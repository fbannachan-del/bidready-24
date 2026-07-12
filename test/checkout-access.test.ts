import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createCheckoutAccessToken, verifyCheckoutAccessToken } from "../lib/checkout-access";

describe("checkout browser binding", () => {
  const previous = process.env.CHECKOUT_SESSION_SECRET;

  before(() => { process.env.CHECKOUT_SESSION_SECRET = "test-checkout-session-signing-secret"; });
  after(() => {
    if (previous === undefined) delete process.env.CHECKOUT_SESSION_SECRET;
    else process.env.CHECKOUT_SESSION_SECRET = previous;
  });

  it("accepts only the session that created the signed browser token", () => {
    const token = createCheckoutAccessToken("cs_test_owner");
    assert.equal(verifyCheckoutAccessToken(token, "cs_test_owner"), true);
    assert.equal(verifyCheckoutAccessToken(token, "cs_test_attacker"), false);
  });

  it("rejects missing, malformed and tampered tokens", () => {
    const token = createCheckoutAccessToken("cs_test_owner");
    assert.equal(verifyCheckoutAccessToken(undefined, "cs_test_owner"), false);
    assert.equal(verifyCheckoutAccessToken("bad", "cs_test_owner"), false);
    assert.equal(verifyCheckoutAccessToken(`${token}x`, "cs_test_owner"), false);
  });
});
