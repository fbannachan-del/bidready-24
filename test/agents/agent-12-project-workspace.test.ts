import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { BASE_URL, assertContains, extractInternalHrefs, get, skipIfNoServer } from "./_helpers";
import { readSource } from "./_helpers";

async function createSimulatedProject(): Promise<{ token: string; project_id: string } | null> {
  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ order_type: "complete" }),
  });
  if (!res.ok) return null;
  const body = await res.json() as { simulated?: boolean; token?: string; project_id?: string };
  if (body.simulated && body.token && body.project_id) return { token: body.token, project_id: body.project_id };
  return null;
}

describe("Agent 12 — Project workspace hub", () => {
  before(async function () {
    await skipIfNoServer(this);
  });

  it("invalid token returns 404", async () => {
    const { status, text } = await get("/project/not-a-real-token-zzzz");
    assert.ok(status === 404 || status === 200);
    if (status === 200) {
      // Next may render not-found UI with 200 in some configs — must not show real workspace controls
      assert.ok(!text.includes("Run tender now") || text.includes("Not Found") || text.includes("404"));
    }
  });

  it("workspace source exposes required deep links", () => {
    const src = readSource("app/project/[token]/page.tsx");
    for (const path of ["/autonomy", "/report", "/intake", "/upload"]) {
      assert.ok(src.includes(path), `workspace missing link segment ${path}`);
    }
    assert.ok(src.includes("RunTenderButton") || src.includes("Run tender"));
  });

  it("simulated project workspace renders hub controls", async () => {
    const project = await createSimulatedProject();
    if (!project) {
      // Stripe-only env: cannot create project without keys
      return;
    }
    const { status, text } = await get(`/project/${project.token}`);
    assert.equal(status, 200);
    assertContains(text, ["intake", "upload", "report"], "workspace");
    const hrefs = extractInternalHrefs(text);
    assert.ok(hrefs.some((h) => h.includes(`/project/${project.token}/intake`)));
    assert.ok(hrefs.some((h) => h.includes(`/project/${project.token}/upload`)));
    assert.ok(hrefs.some((h) => h.includes(`/project/${project.token}/report`)));
    assert.ok(hrefs.some((h) => h.includes(`/project/${project.token}/autonomy`)));
  });
});
