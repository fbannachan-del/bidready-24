import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, assertContains, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 05 — Contact & support form", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("contact page shows guidance and form", async () => {
    const { text } = await getOk("/contact");
    assertContains(text, [
      "Contact",
      "support",
      "do not paste",
      "project reference",
    ], "contact page");
  });

  it("rejects invalid payload", async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A", email: "not-an-email", message: "short" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { ok: boolean };
    assert.equal(body.ok, false);
  });

  it("accepts valid support request", async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Agent Test User",
        email: "agent-test@bidready24.invalid",
        project: "proj_agent_test",
        message: "Agent 05 automated test of the contact form path.",
      }),
    });
    const body = await res.json() as { ok: boolean; reference?: string; error?: string };
    assert.ok(res.status === 202 || res.status === 429, `status ${res.status}`);
    if (res.status === 202) {
      assert.equal(body.ok, true);
      assert.ok(body.reference);
    }
  });
});
