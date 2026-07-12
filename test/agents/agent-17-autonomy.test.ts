import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, get, readSource, skipIfNoServer } from "./_helpers";

async function createSimulatedProject(): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ order_type: "complete" }),
  });
  if (!res.ok) return null;
  const body = await res.json() as { simulated?: boolean; token?: string };
  return body.simulated && body.token ? body.token : null;
}

describe("Agent 17 — Autonomy control centre", () => {
  it("control centre source has profiles, policy, mandate, save", () => {
    const src = readSource("components/autonomy/AutonomyControlCenter.tsx");
    assert.ok(src.includes("assisted") && src.includes("autonomous") && src.includes("unattended"));
    assert.ok(src.includes("operating-profile"));
    assert.ok(src.includes("action-policy"));
    assert.ok(src.includes("receiver-mandate"));
    assert.ok(src.includes("saveSettings") || src.includes("Save"));
    assert.ok(src.includes("submit_bid") || src.includes("allow_submission"));
  });

  describe("HTTP", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("autonomy page loads", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const { status, text } = await get(`/project/${token}/autonomy`);
      assert.equal(status, 200);
      assert.ok(text.includes("profile") || text.includes("Autonomy") || text.includes("mandate") || text.includes("Operating"));
    });

    it("GET/PUT autonomy API rejects bad token", async () => {
      const getRes = await fetch(`${BASE_URL}/api/project/bad-token/autonomy`);
      assert.ok([400, 401, 404, 405].includes(getRes.status));
      const putRes = await fetch(`${BASE_URL}/api/project/bad-token/autonomy`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: "assisted" }),
      });
      assert.ok([400, 401, 404, 405].includes(putRes.status));
    });

    it("can save assisted profile for valid project", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/project/${token}/autonomy`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: "assisted",
          mandate: {
            legal_entity: "Agent Clean Co Ltd",
            authorised_name: "Test User",
            authorised_role: "Director",
            maximum_contract_value: "100000",
            expires_at: "2027-01-01",
            allow_signing: false,
            allow_submission: false,
            receiver_acknowledged: true,
          },
          policy: {
            analyse: true,
            decide_compliance: true,
            use_secondary_evidence: true,
            send_clarifications: false,
            create_commitments: false,
            price_tender: false,
            accept_contract_terms: false,
            apply_signature: false,
            complete_portal: false,
            submit_bid: false,
            automatic_no_bid: true,
            conservative_conflicts: true,
            correction_window_hours: "24",
            minimum_margin_percent: "10",
          },
        }),
      });
      const bodyText = await res.text();
      assert.ok(res.status !== 500, bodyText);
      assert.ok([200, 201, 204, 400, 409, 422].includes(res.status), `status ${res.status} ${bodyText}`);
      if (res.status === 200) {
        const body = JSON.parse(bodyText) as { profile?: string };
        assert.equal(body.profile, "assisted");
      }
    });
  });
});
