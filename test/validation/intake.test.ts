import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { intakeFingerprint, parseIntakePayload, validateIntakeTransition } from "../../lib/validation/intake";

function validIntake(overrides: Record<string, unknown> = {}) {
  return {
    company_name: "Acme Cleaning Ltd",
    company_website: "https://acme.example",
    companies_house: "12345678",
    sector: "commercial_cleaning",
    bid_deadline: "2026-08-14T12:00:00+01:00",
    portal: "ProContract",
    service_area: "Lot 1 — London",
    certifications: ["CHAS", "ISO 9001"],
    turnover_band: "£1m–£2m",
    insurance_levels: "PL £10m / EL £10m",
    mobilisation_days: "30",
    geographic_coverage: "Greater London",
    existing_policies: ["Health & Safety", "Environmental"],
    contact_name: "Ada Lovelace",
    contact_email: "BIDS@ACME.EXAMPLE",
    contact_phone: "+44 20 0000 0000",
    consent: true,
    ...overrides,
  };
}

describe("strict intake validation", () => {
  it("normalises email and de-duplicates comma-separated lists", () => {
    const result = parseIntakePayload(validIntake({ certifications: " CHAS, ISO 9001,CHAS " }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data.certifications, ["CHAS", "ISO 9001"]);
    assert.equal(result.data.contact_email, "bids@acme.example");
  });

  it("rejects missing consent", () => {
    const result = parseIntakePayload(validIntake({ consent: false }));
    assert.equal(result.ok, false);
  });

  it("rejects unknown fields rather than persisting ungoverned profile data", () => {
    const result = parseIntakePayload(validIntake({ admin: true }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.issues.some((issue) => issue.code === "unrecognized_keys"));
  });

  it("rejects invalid and impossible calendar dates", () => {
    assert.equal(parseIntakePayload(validIntake({ bid_deadline: "soon" })).ok, false);
    assert.equal(parseIntakePayload(validIntake({ bid_deadline: "2026-02-30" })).ok, false);
  });

  it("rejects control characters and oversized fields", () => {
    assert.equal(parseIntakePayload(validIntake({ company_name: "Acme\u0000 Ltd" })).ok, false);
    assert.equal(parseIntakePayload(validIntake({ service_area: "x".repeat(2_001) })).ok, false);
  });

  it("rejects non-object payloads and invalid URLs", () => {
    assert.equal(parseIntakePayload(null).ok, false);
    assert.equal(parseIntakePayload([]).ok, false);
    assert.equal(parseIntakePayload(validIntake({ company_website: "acme.example" })).ok, false);
  });

  it("produces a stable fingerprint independent of object key insertion order", () => {
    const first = parseIntakePayload(validIntake());
    const reversed = Object.fromEntries(Object.entries(validIntake()).reverse());
    const second = parseIntakePayload(reversed);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) assert.equal(first.fingerprint, second.fingerprint);
  });

  it("fingerprints substantive changes differently", () => {
    const first = parseIntakePayload(validIntake());
    const second = parseIntakePayload(validIntake({ insurance_levels: "PL £5m" }));
    assert.equal(first.ok && second.ok, true);
    if (first.ok && second.ok) assert.notEqual(intakeFingerprint(first.data), intakeFingerprint(second.data));
  });
});

describe("repeated intake transitions", () => {
  it("turns an identical resubmission into a no-op", () => {
    assert.deepEqual(validateIntakeTransition({
      projectStatus: "processing",
      incomingFingerprint: "same",
      storedFingerprint: "same",
    }), { allowed: true, action: "noop" });
  });

  it("reruns processing when intake evidence changes", () => {
    assert.deepEqual(validateIntakeTransition({
      projectStatus: "processing",
      incomingFingerprint: "new",
      storedFingerprint: "old",
    }), { allowed: true, action: "save_and_rerun" });
  });

  it("blocks mutation after delivery and during deletion/refund", () => {
    for (const projectStatus of ["delivered", "submitted", "deletion_requested", "refunded"]) {
      const result = validateIntakeTransition({ projectStatus, incomingFingerprint: "new", storedFingerprint: "old" });
      assert.equal(result.allowed, false, projectStatus);
    }
  });
});
