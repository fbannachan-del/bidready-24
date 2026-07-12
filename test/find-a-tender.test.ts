import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFindATenderReleases } from "../lib/find-a-tender";

function release(overrides: Record<string, unknown> = {}) {
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
      tenderPeriod: { endDate: "2026-07-17T12:00:00+01:00" },
    },
    ...overrides,
  };
}

describe("Find a Tender cleaning feed", () => {
  it("normalises active cleaning notices and maps UK delivery regions", () => {
    const result = parseFindATenderReleases([release()], {}, Date.UTC(2026, 6, 12));
    assert.equal(result.length, 1);
    assert.equal(result[0].source, "Find a Tender");
    assert.equal(result[0].region, "Scotland");
    assert.equal(result[0].valueHigh, 6400000);
    assert.equal(result[0].reference, "056931-2026");
    assert.match(result[0].sourceUrl, /056931-2026$/);
  });

  it("drops expired, inactive and unrelated notices", () => {
    const expired = release({ tender: { ...release().tender, tenderPeriod: { endDate: "2026-07-11T12:00:00Z" } } });
    const inactive = release({ id: "056932-2026", tender: { ...release().tender, status: "complete" } });
    const unrelated = release({ id: "056933-2026", tender: { ...release().tender, title: "Software services", description: "Cloud hosting", classification: { id: "72000000", description: "IT services" } } });
    assert.deepEqual(parseFindATenderReleases([expired, inactive, unrelated], {}, Date.UTC(2026, 6, 12)), []);
  });

  it("applies keyword, region and SME filters without inventing SME suitability", () => {
    assert.equal(parseFindATenderReleases([release()], { keyword: "outsourced", region: "Scotland" }, Date.UTC(2026, 6, 12)).length, 1);
    assert.equal(parseFindATenderReleases([release()], { keyword: "window" }, Date.UTC(2026, 6, 12)).length, 0);
    assert.equal(parseFindATenderReleases([release()], { suitableForSme: true }, Date.UTC(2026, 6, 12)).length, 0);
  });
});
