import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, assertContains, get, skipIfNoServer } from "./_helpers";
import { StrictIntakeSchema } from "../../lib/validation/intake";

async function createSimulatedProject(): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ order_type: "preflight" }),
  });
  if (!res.ok) return null;
  const body = await res.json() as { simulated?: boolean; token?: string };
  return body.simulated && body.token ? body.token : null;
}

describe("Agent 13 — Company intake", () => {
  it("strict intake schema rejects incomplete data", () => {
    const bad = StrictIntakeSchema.safeParse({ company_name: "X", bid_deadline: "not-a-date" });
    assert.equal(bad.success, false);
  });

  it("strict intake schema accepts minimal valid payload", () => {
    const good = StrictIntakeSchema.safeParse({
      company_name: "Agent Clean Co",
      sector: "commercial_cleaning",
      bid_deadline: "2026-09-01",
      service_area: "Scotland",
      certifications: ["CHAS"],
      contact_name: "Test Receiver",
      contact_email: "receiver@bidready24.invalid",
      consent: true,
    });
    assert.equal(good.success, true, good.success ? "" : JSON.stringify(good.error));
  });

  describe("HTTP", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("intake page loads for simulated project", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const { status, text } = await get(`/project/${token}/intake`);
      assert.equal(status, 200);
      assertContains(text, ["Save intake", "company"], "intake page");
    });

    it("POST intake rejects invalid token", async () => {
      const res = await fetch(`${BASE_URL}/api/project/bad-token/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company_name: "Agent Clean Co",
          sector: "commercial_cleaning",
          bid_deadline: "2026-09-01",
          service_area: "Scotland",
          consent: true,
        }),
      });
      assert.ok(res.status === 404 || res.status === 400 || res.status === 401);
    });

    it("POST intake saves valid payload", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/project/${token}/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company_name: "Agent Clean Co",
          contact_name: "Test Receiver",
          contact_email: "receiver@bidready24.invalid",
          sector: "commercial_cleaning",
          bid_deadline: "2026-09-01",
          service_area: "Central Scotland",
          certifications: ["CHAS"],
          insurance_levels: "PL £10m",
          consent: true,
        }),
      });
      assert.ok(res.status >= 200 && res.status < 300, `intake status ${res.status} ${await res.text()}`);
    });
  });
});
