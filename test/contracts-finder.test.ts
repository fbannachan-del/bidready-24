import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normaliseTenderSearch, parseContractsFinderFeed } from "../lib/contracts-finder";

const openId = "46f3f42e-86d1-463d-9288-32214b43a608";
const expiredId = "ae350a2d-86c7-4a90-a817-f8b08ac0a773";

function notice(id: string, deadlineDate: string, title = "School Cleaning &amp; Hygiene") {
  return {
    item: {
      id,
      noticeIdentifier: "CA18037",
      title,
      description: "Daily cleaning &amp; periodic deep clean.",
      cpvDescription: "Cleaning services",
      cpvDescriptionExpanded: null,
      publishedDate: "2026-07-01T09:00:00Z",
      deadlineDate,
      valueLow: 100000,
      valueHigh: 250000,
      noticeType: "Contract",
      noticeStatus: "Open",
      isSuitableForSme: true,
      organisationName: "Example Council",
      cpvCodes: "90910000 90919200",
      region: "London",
      regionText: "London",
    },
  };
}

describe("Contracts Finder cleaning feed", () => {
  it("bounds and defaults public search inputs", () => {
    assert.deepEqual(normaliseTenderSearch({ keyword: " ", region: " London ", limit: 500 }), {
      keyword: "cleaning",
      region: "London",
      suitableForSme: false,
      limit: 50,
    });
    assert.equal(normaliseTenderSearch({ limit: -4 }).limit, 1);
  });

  it("normalises source data, removes duplicates and drops expired notices", () => {
    const feed = parseContractsFinderFeed({
      hitCount: 3,
      noticeList: [
        notice(expiredId, "2026-07-11T10:00:00Z"),
        notice(openId, "2026-07-31T17:00:00+01:00"),
        notice(openId, "2026-08-01T17:00:00+01:00", "Duplicate"),
      ],
    }, Date.UTC(2026, 6, 12));

    assert.equal(feed.opportunities.length, 1);
    assert.equal(feed.total, 1);
    assert.equal(feed.opportunities[0].title, "School Cleaning & Hygiene");
    assert.equal(feed.opportunities[0].description, "Daily cleaning & periodic deep clean.");
    assert.deepEqual(feed.opportunities[0].cpvCodes, ["90910000", "90919200"]);
    assert.match(feed.opportunities[0].sourceUrl, new RegExp(openId));
  });

  it("fails closed when the upstream response shape changes", () => {
    assert.throws(() => parseContractsFinderFeed({ hitCount: "many", noticeList: [] }));
    assert.throws(() => parseContractsFinderFeed({ hitCount: 1, noticeList: [{ item: { id: "not-a-guid" } }] }));
  });

  it("post-filters region so Scotland does not keep Any region notices", () => {
    const feed = parseContractsFinderFeed({
      hitCount: 2,
      noticeList: [
        {
          item: {
            ...notice(openId, "2099-07-31T17:00:00Z").item,
            region: "Any",
            regionText: "Any region",
            title: "National framework cleaning",
            description: "UK-wide framework",
            organisationName: "Central Body",
          },
        },
        {
          item: {
            ...notice("56f3f42e-86d1-463d-9288-32214b43a609", "2099-07-31T17:00:00Z").item,
            region: "Scotland",
            regionText: "Scotland",
            title: "Edinburgh school cleaning",
            description: "Daily cleaning across Edinburgh schools",
            organisationName: "City of Edinburgh Council",
          },
        },
      ],
    }, Date.UTC(2026, 6, 12), { region: "Scotland" });

    assert.equal(feed.opportunities.length, 1);
    assert.equal(feed.opportunities[0].region, "Scotland");
    assert.match(feed.opportunities[0].title, /Edinburgh/i);
  });
});
