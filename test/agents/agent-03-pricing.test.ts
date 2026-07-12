import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractInternalHrefs, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 03 — Pricing & plan selection", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("shows both plans with prices and choose CTAs", async () => {
    const { text } = await getOk("/pricing");
    assertContains(text, [
      "Tender Preflight",
      "Complete Pack",
      "£149",
      "£349",
      "Choose",
      "checkout?type=preflight",
      "checkout?type=complete",
      "One tender. No subscription",
    ], "pricing");
    // CTA may be split by icon markup in streamed HTML
    assert.ok(
      (text.includes("Choose Tender Preflight") || (text.includes("Choose") && text.includes("Tender Preflight"))) &&
      (text.includes("Choose Complete Pack") || (text.includes("Choose") && text.includes("Complete Pack"))),
      "pricing plan choose CTAs missing",
    );
  });

  it("legal links from pricing work", async () => {
    const { text } = await getOk("/pricing");
    const hrefs = extractInternalHrefs(text);
    assert.ok(hrefs.some((h) => h.includes("/legal/terms")));
    assert.ok(hrefs.some((h) => h.includes("/legal/refund")));
    await getOk("/legal/terms");
    await getOk("/legal/refund");
  });

  it("checkout entry points accept plan query params", async () => {
    for (const type of ["preflight", "complete"]) {
      const { status, text } = await getOk(`/checkout?type=${type}`);
      assert.equal(status, 200);
      assertContains(text, ["Secure checkout", "Start with one tender"], `checkout ${type}`);
    }
  });
});
