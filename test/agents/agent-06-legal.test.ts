import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractInternalHrefs, getOk, skipIfNoServer } from "./_helpers";

const LEGAL = [
  ["/legal", "Legal"],
  ["/legal/privacy", "Privacy"],
  ["/legal/data", "Data"],
  ["/legal/terms", "Terms"],
  ["/legal/refund", "Refund"],
  ["/legal/acceptable-use", "Acceptable"],
] as const;

describe("Agent 06 — Legal pack", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  for (const [path, keyword] of LEGAL) {
    it(`${path} returns 200 with expected content`, async () => {
      const { status, text } = await getOk(path);
      assert.equal(status, 200);
      assert.ok(text.toLowerCase().includes(keyword.toLowerCase()) || text.includes("Legal"), `${path} missing ${keyword}`);
      assert.ok(text.includes("<h1") || text.includes("page-title") || text.includes("font-serif"), `${path} missing title structure`);
    });
  }

  it("legal index cards link to all documents", async () => {
    const { text } = await getOk("/legal");
    const hrefs = extractInternalHrefs(text);
    for (const path of ["/legal/privacy", "/legal/data", "/legal/terms", "/legal/refund", "/legal/acceptable-use"]) {
      assert.ok(hrefs.some((h) => h.startsWith(path)), `legal index missing ${path}`);
    }
  });

  it("privacy and data pages offer contact for deletion", async () => {
    for (const path of ["/legal/privacy", "/legal/data", "/legal/refund"]) {
      const { text } = await getOk(path);
      assertContains(text, ["/contact"], path);
    }
  });
});
