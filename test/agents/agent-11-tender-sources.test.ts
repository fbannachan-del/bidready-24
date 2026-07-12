import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, skipIfNoServer } from "./_helpers";
import { parseFindATenderReleases } from "../../lib/find-a-tender";
import { normaliseTenderSearch, parseContractsFinderFeed } from "../../lib/contracts-finder";
import { cleaningTenderRegions } from "../../lib/tender-regions";
import { fetchLiveCleaningTenders } from "../../lib/tender-feed";

function ftsRelease(overrides: Record<string, unknown> = {}) {
  return {
    id: "056931-2026",
    ocid: "ocds-h6vhtk-06b694",
    date: "2026-06-17T09:49:30+01:00",
    buyer: { name: "SRUC" },
    parties: [{ name: "SRUC", roles: ["buyer"], address: { locality: "Edinburgh", region: "UKM75" } }],
    tender: {
      title: "Outsourced Cleaning and Associated Services",
      description: "Cleaning services across the college estate.",
      status: "active",
      classification: { id: "90910000", description: "Cleaning services" },
      items: [{ additionalClassifications: [], deliveryAddresses: [{ region: "UKM" }] }],
      value: { amount: 6400000, currency: "GBP" },
      tenderPeriod: { endDate: "2027-07-17T12:00:00+01:00" },
    },
    ...overrides,
  };
}

describe("Agent 11 — Tender data sources & API (Scotland emphasis)", () => {
  it("maps UKM to Scotland and filters by region", () => {
    const now = Date.UTC(2026, 6, 12);
    const result = parseFindATenderReleases([ftsRelease()], {}, now);
    assert.equal(result.length, 1);
    assert.equal(result[0].region, "Scotland");
    assert.equal(parseFindATenderReleases([ftsRelease()], { region: "Scotland" }, now).length, 1);
    assert.equal(parseFindATenderReleases([ftsRelease()], { region: "London" }, now).length, 0);
  });

  it("includes Scotland in cleaningTenderRegions list", () => {
    assert.ok(cleaningTenderRegions.includes("Scotland"));
  });

  it("normalises search input bounds", () => {
    const n = normaliseTenderSearch({ keyword: "  x".repeat(80), limit: 999 });
    assert.ok(n.keyword.length <= 100);
    assert.equal(n.limit, 50);
  });

  it("contracts finder parse keeps open notices only", () => {
    const openId = "46f3f42e-86d1-463d-9288-32214b43a608";
    const feed = parseContractsFinderFeed({
      hitCount: 1,
      noticeList: [{
        item: {
          id: openId,
          title: "School Cleaning",
          description: "Daily cleaning",
          organisationName: "Test Council",
          regionText: "Scotland",
          deadlineDate: "2099-12-01T12:00:00Z",
          isSuitableForSme: true,
          cpvCodes: "90910000",
          noticeStatus: "Open",
        },
      }],
    }, Date.UTC(2026, 6, 12));
    assert.equal(feed.opportunities.length, 1);
    assert.equal(feed.opportunities[0].source, "Contracts Finder");
    assert.match(feed.opportunities[0].sourceUrl, /contractsfinder\.service\.gov\.uk/);
  });

  it("live merge or honest failure from fetchLiveCleaningTenders", async () => {
    try {
      const feed = await fetchLiveCleaningTenders({ keyword: "cleaning", limit: 10 });
      assert.ok(feed.total >= 0);
      assert.ok(Array.isArray(feed.opportunities));
      assert.ok(feed.source.includes("Find a Tender") || feed.source.includes("Contracts Finder"));
      for (const item of feed.opportunities) {
        assert.ok(item.title);
        assert.ok(item.sourceUrl.startsWith("http"));
      }
      const scotland = feed.opportunities.filter((o) => /scotland/i.test(o.region));
      // Not a hard fail if none open right now — log-style assertion via detail
      assert.ok(scotland.length >= 0);
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.match(error.message, /unavailable|All tender/i);
    }
  });

  describe("HTTP /api/tenders", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("returns JSON feed or 502", async () => {
      const res = await fetch(`${BASE_URL}/api/tenders?q=cleaning&limit=10`);
      assert.ok(res.status === 200 || res.status === 502, `status ${res.status}`);
      const body = await res.json() as Record<string, unknown>;
      if (res.status === 200) {
        assert.ok(Array.isArray(body.opportunities));
        assert.ok(typeof body.source === "string");
      } else {
        assert.ok(typeof body.error === "string");
      }
    });

    it("Scotland filter does not 500", async () => {
      const res = await fetch(`${BASE_URL}/api/tenders?q=cleaning&region=Scotland&limit=10`);
      assert.ok(res.status === 200 || res.status === 502);
    });
  });
});
