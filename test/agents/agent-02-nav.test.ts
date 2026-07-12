import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  assertContains,
  extractInternalHrefs,
  getOk,
  HEADER_NAV,
  readSource,
  skipIfNoServer,
} from "./_helpers";

describe("Agent 02 — Global navigation (header / footer / mobile)", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("header source declares full primary nav + CTAs", () => {
    const src = readSource("components/site/SiteHeader.tsx");
    for (const [label, href] of HEADER_NAV) {
      assert.ok(src.includes(label), `header missing label ${label}`);
      assert.ok(src.includes(href), `header missing href ${href}`);
    }
    assertContains(src, ["Sample report", "Start a preflight", "Open navigation", "Mobile navigation", "/contact"], "header");
  });

  it("footer source declares product, trust, company links", () => {
    const src = readSource("components/site/SiteFooter.tsx");
    const expected = [
      "/#how-it-works", "/#deliverables", "/pricing", "/sample-report",
      "/security", "/legal/privacy", "/legal/data", "/legal/acceptable-use",
      "/cleaning-tenders", "/contact", "/legal/terms", "/legal/refund",
    ];
    for (const href of expected) {
      assert.ok(src.includes(href), `footer missing ${href}`);
    }
  });

  it("rendered pages expose logo home and footer legal links", async () => {
    const { text } = await getOk("/");
    const hrefs = extractInternalHrefs(text);
    assert.ok(hrefs.includes("/") || text.includes('href="/"') || text.includes("BIDREADY24"), "logo/home present");
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/refund", "/contact", "/pricing"]) {
      assert.ok(hrefs.some((h) => h.startsWith(path)), `rendered footer missing ${path}`);
    }
  });

  it("every static header/footer path returns success", async () => {
    const paths = [
      "/", "/pricing", "/cleaning-tenders", "/cleaning-tenders/jobs",
      "/security", "/sample-report", "/contact",
      "/legal/privacy", "/legal/data", "/legal/acceptable-use", "/legal/terms", "/legal/refund",
    ];
    for (const path of paths) {
      const { status } = await getOk(path);
      assert.ok(status === 200 || status === 307 || status === 308, `${path} status ${status}`);
    }
  });
});
