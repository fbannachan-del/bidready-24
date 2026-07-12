import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  assertContains,
  extractInternalHrefs,
  get,
  getOk,
  skipIfNoServer,
} from "./_helpers";

describe("Agent 01 — Marketing home & CTAs", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("loads home with hero and product preview outputs", async () => {
    const { status, text } = await getOk("/");
    assert.equal(status, 200);
    assertContains(text, [
      "Every requirement",
      "traced to source",
      "Start a preflight",
      "Explore a sample report",
      "how-it-works",
      "deliverables",
      "Nothing is invented",
      "Civic Offices Cleaning Contract",
      "Readiness",
    ], "home");
  });

  it("all primary CTAs resolve to expected routes", async () => {
    const { text } = await getOk("/");
    const hrefs = extractInternalHrefs(text);
    for (const expected of ["/pricing", "/sample-report", "/security", "/contact"]) {
      assert.ok(hrefs.some((h) => h === expected || h.startsWith(expected)), `home missing link ${expected}`);
    }
    for (const path of ["/pricing", "/sample-report", "/security", "/contact"]) {
      const r = await get(path);
      assert.ok(r.status >= 200 && r.status < 400, `${path} broken from home CTA`);
    }
  });

  it("how-it-works and deliverables anchors exist", async () => {
    const { text } = await getOk("/");
    assert.match(text, /id=["']how-it-works["']/);
    assert.match(text, /id=["']deliverables["']/);
    assertContains(text, ["Upload the tender pack", "Mandatory requirements", "Evidence gaps"], "home sections");
  });
});
