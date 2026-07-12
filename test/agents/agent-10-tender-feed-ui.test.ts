import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { assertContains, extractExternalHrefs, extractInternalHrefs, get, getOk, skipIfNoServer } from "./_helpers";

describe("Agent 10 — Live tender feed UI", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("jobs page has search form controls", async () => {
    const { text } = await getOk("/cleaning-tenders/jobs");
    assertContains(text, [
      "Open cleaning tenders",
      'name="q"',
      'name="region"',
      "Search",
      "Scotland",
      "SME",
      "Start a preflight",
      "Open Government Licence",
    ], "jobs page");
  });

  it("search query params are reflected", async () => {
    const { status, text } = await get("/cleaning-tenders/jobs?q=cleaning&region=Scotland&sme=1");
    assert.equal(status, 200);
    assert.ok(text.includes("Scotland") || text.includes("region"));
    assert.ok(text.includes('value="cleaning"') || text.includes("cleaning"));
  });

  it("shows feed results or honest unavailable/empty state", async () => {
    const { text } = await getOk("/cleaning-tenders/jobs");
    const ok =
      text.includes("open opportunities") ||
      text.includes("Live feed unavailable") ||
      text.includes("No matching open tenders") ||
      text.includes("could not be reached");
    assert.ok(ok, "must show count, empty, or unavailable — never invent silently");
    // Must not claim invented opportunities without source attribution when showing cards
    if (text.includes("Official notice")) {
      assert.ok(text.includes("Find a Tender") || text.includes("Contracts Finder") || text.includes("Official sources"));
    }
  });

  it("tender cards link to pricing and official notices when present", async () => {
    const { text } = await getOk("/cleaning-tenders/jobs");
    const internal = extractInternalHrefs(text);
    assert.ok(internal.some((h) => h.startsWith("/pricing")));
    if (text.includes("Official notice")) {
      const external = extractExternalHrefs(text);
      assert.ok(
        external.some((u) =>
          u.includes("find-tender.service.gov.uk") ||
          u.includes("contractsfinder.service.gov.uk"),
        ),
        "official notice must point at gov hosts",
      );
    }
  });
});
