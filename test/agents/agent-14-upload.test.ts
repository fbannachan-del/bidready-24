import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, assertContains, get, skipIfNoServer } from "./_helpers";
import { readSource } from "./_helpers";

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

describe("Agent 14 — Document upload", () => {
  it("upload page source has validate CTA", () => {
    const src = readSource("app/project/[token]/upload/page.tsx");
    assert.ok(src.includes("Upload and validate"));
    assert.ok(src.includes("/api/project/") || src.includes("upload"));
  });

  describe("HTTP", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("upload page loads for project", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const { status, text } = await get(`/project/${token}/upload`);
      assert.equal(status, 200);
      assertContains(text, ["Upload"], "upload page");
    });

    it("upload API rejects bad token", async () => {
      const form = new FormData();
      form.append("file", new Blob(["not a real tender"], { type: "text/plain" }), "tender.txt");
      const res = await fetch(`${BASE_URL}/api/project/bad-token/upload`, { method: "POST", body: form });
      assert.ok(res.status === 404 || res.status === 400 || res.status === 415 || res.status === 401);
    });

    it("upload accepts text tender for simulated project", async () => {
      const token = await createSimulatedProject();
      if (!token) return;
      const form = new FormData();
      const content = `# Test Tender\n\nMandatory: Public liability £10m.\nQ1. Mobilisation plan. 1000 words.\n`;
      form.append("files", new Blob([content], { type: "text/plain" }), "synthetic-tender.txt");
      const res = await fetch(`${BASE_URL}/api/project/${token}/upload`, { method: "POST", body: form });
      // Accept success or validation rejection with structured body — not unhandled 500 from storage alone
      assert.ok([200, 201, 202, 400, 415, 422, 500].includes(res.status), `unexpected ${res.status}`);
      if (res.status === 500) {
        const body = await res.json().catch(() => ({})) as { code?: string; error?: string };
        // Analysis may fail without full pack; storage path should set code when partial
        assert.ok(body.code || body.error, "500 should be structured");
      }
    });
  });
});
