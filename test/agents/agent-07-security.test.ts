import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractInternalHrefs, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 07 — Security & trust", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("security page states trust model and boundaries", async () => {
    const { text } = await getOk("/security");
    assert.equal((await getOk("/security")).status, 200);
    assertContains(text, ["Security", "privacy", "data"], "security");
    // Should not over-claim certification
    assert.ok(!/ISO\s*27001 certified|SOC\s*2 certified|GDPR certified/i.test(text), "should not invent certifications");
  });

  it("links to privacy and data handling", async () => {
    const { text } = await getOk("/security");
    const hrefs = extractInternalHrefs(text);
    assert.ok(hrefs.some((h) => h.includes("/legal/privacy")));
    assert.ok(hrefs.some((h) => h.includes("/legal/data")));
  });
});
