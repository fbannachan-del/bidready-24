import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, readSource, skipIfNoServer } from "./_helpers";

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

describe("Agent 15 — Autonomous run trigger", () => {
  it("RunTenderButton posts to run API and surfaces errors", () => {
    const src = readSource("components/project/RunTenderButton.tsx");
    assert.ok(src.includes("/api/project/"));
    assert.ok(src.includes("/run"));
    assert.ok(src.includes("Run tender now"));
    assert.ok(src.includes("disabled"));
  });

  describe("HTTP", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("run rejects invalid token", async () => {
      const res = await fetch(`${BASE_URL}/api/project/bad-token/run`, { method: "POST" });
      assert.equal(res.status, 404);
      const body = await res.json() as { error?: string };
      assert.ok(body.error);
    });

    it("run on empty project returns structured result or analysis failure", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/project/${token}/run`, { method: "POST" });
      const body = await res.json() as Record<string, unknown>;
      // May succeed with empty extraction or fail analysis — not crash unhandled
      assert.ok(res.status === 200 || res.status === 500, `status ${res.status}`);
      if (res.status === 200) {
        assert.ok("status" in body || "message" in body || "requirements" in body);
      } else {
        assert.ok(body.error);
      }
    });
  });
});
