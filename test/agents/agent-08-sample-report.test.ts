import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractInternalHrefs, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 08 — Sample report demo", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("marks output as synthetic demonstration", async () => {
    const { text } = await getOk("/sample-report");
    assertContains(text, [
      "Synthetic demonstration",
      "no customer data",
      "example",
      "Analyse your tender",
    ], "sample-report");
  });

  it("CTA goes to pricing", async () => {
    const { text } = await getOk("/sample-report");
    const hrefs = extractInternalHrefs(text);
    assert.ok(hrefs.some((h) => h.startsWith("/pricing")));
    await getOk("/pricing");
  });
});
