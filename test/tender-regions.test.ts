import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleaningTenderRegions,
  normaliseRegionLabel,
  opportunityMatchesRegion,
} from "../lib/tender-regions";

describe("tender region normalisation", () => {
  it("maps NUTS, aliases and Scottish localities to canonical labels", () => {
    assert.equal(normaliseRegionLabel("UKM75"), "Scotland");
    assert.equal(normaliseRegionLabel("UKM"), "Scotland");
    assert.equal(normaliseRegionLabel("scotland"), "Scotland");
    assert.equal(normaliseRegionLabel("Edinburgh and the Lothians"), "Scotland");
    assert.equal(normaliseRegionLabel("Any region"), "Location not stated");
    assert.equal(normaliseRegionLabel(""), "Location not stated");
  });

  it("excludes Any region from the filter dropdown", () => {
    assert.ok(cleaningTenderRegions.includes("Scotland"));
    assert.ok(!cleaningTenderRegions.includes("Any region" as never));
  });

  it("does not match unspecified regions for Scotland unless text hints", () => {
    assert.equal(
      opportunityMatchesRegion({ region: "Any region", title: "National cleaning framework", buyer: "CCS" }, "Scotland"),
      false,
    );
    assert.equal(
      opportunityMatchesRegion({
        region: "Location not stated",
        title: "School cleaning",
        description: "Sites across Edinburgh and Glasgow",
        buyer: "Scottish Local Authority",
      }, "Scotland"),
      true,
    );
    assert.equal(
      opportunityMatchesRegion({ region: "Scotland", title: "Estate cleaning" }, "Scotland"),
      true,
    );
  });
});
