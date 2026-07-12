import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractInternalHrefs, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 09 — Cleaning landing", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("renders cleaning SME value props and CTAs", async () => {
    const { text } = await getOk("/cleaning-tenders");
    assertContains(text, [
      "cleaning",
      "Start a cleaning preflight",
      "Browse all live tenders",
      "/pricing",
      "/cleaning-tenders/jobs",
    ], "cleaning landing");
  });

  it("all CTAs resolve", async () => {
    const { text } = await getOk("/cleaning-tenders");
    const hrefs = extractInternalHrefs(text);
    for (const path of ["/pricing", "/sample-report", "/cleaning-tenders/jobs"]) {
      assert.ok(hrefs.some((h) => h.startsWith(path)), `missing ${path}`);
      await getOk(path.split("?")[0]);
    }
  });
});
