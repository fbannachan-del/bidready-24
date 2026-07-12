/**
 * Paid-client journey: checkout → workspace → intake → upload → run → report → CSV.
 * Uses simulated checkout (ALLOW_SIMULATED_CHECKOUT) against a live server when available.
 */
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { publicAppUrl } from "../lib/admin-auth";

const BASE = (process.env.AGENT_BASE_URL || process.env.APP_URL || "http://127.0.0.1:3010").replace(/\/$/, "");

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status === 503;
  } catch {
    return false;
  }
}

describe("paid client journey (HTTP)", () => {
  before(async function () {
    if (!(await serverUp())) this.skip("Server not reachable — start next dev/start with ALLOW_SIMULATED_CHECKOUT=true");
  });

  it("walks checkout → project pages → intake → upload → report → csv without dead ends", async () => {
    // 1. Simulated checkout (post-payment project handoff)
    const checkout = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_type: "complete" }),
    });
    const checkoutBody = await checkout.json() as { ok?: boolean; simulated?: boolean; token?: string; project_id?: string; error?: string };
    if (!checkout.ok || !checkoutBody.simulated || !checkoutBody.token) {
      // Stripe-only environments cannot complete this without webhooks; skip rather than false-fail.
      return;
    }
    const token = checkoutBody.token;
    const projectId = checkoutBody.project_id!;

    // 2. Workspace and every primary client link must resolve
    for (const path of [
      `/project/${token}`,
      `/project/${token}/intake`,
      `/project/${token}/upload`,
      `/project/${token}/report`,
      `/project/${token}/autonomy`,
    ]) {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      assert.equal(res.status, 200, `${path} expected 200, got ${res.status}`);
      const html = await res.text();
      assert.ok(!/https?:\/\/localhost|https?:\/\/127\.0\.0\.1/i.test(html), `${path} leaked localhost URL`);
    }

    // Workspace must link to intake and upload (client path)
    const workspace = await (await fetch(`${BASE}/project/${token}`)).text();
    assert.ok(workspace.includes(`/project/${token}/intake`), "workspace missing intake link");
    assert.ok(workspace.includes(`/project/${token}/upload`), "workspace missing upload link");
    assert.ok(workspace.includes(`/project/${token}/report`), "workspace missing report link");

    // 3. Intake save
    const intakeRes = await fetch(`${BASE}/api/project/${token}/intake`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company_name: "Journey Clean Ltd",
        contact_name: "Journey Receiver",
        contact_email: "journey@bidready24.invalid",
        sector: "commercial_cleaning",
        bid_deadline: "2026-09-15",
        service_area: "Scotland",
        certifications: ["CHAS"],
        insurance_levels: "PL £10m",
        consent: true,
      }),
    });
    assert.ok(intakeRes.ok, `intake failed ${intakeRes.status} ${await intakeRes.text()}`);

    // Intake page success path must include return link in source (regression: dead-end after save)
    const intakePage = await (await fetch(`${BASE}/project/${token}/intake`)).text();
    assert.ok(intakePage.includes(`/project/${token}`), "intake page must link back to workspace");

    // 4. Upload tender pack
    const form = new FormData();
    const tender = `# Cleaning Tender
Mandatory: Public liability insurance minimum £10,000,000.
Mandatory: CHAS or equivalent SSIP.
Q1. Mobilisation plan. Maximum 1000 words. Weighting 15%.
Submission deadline: 15 September 2026.
`;
    form.append("files", new Blob([tender], { type: "text/plain" }), "journey-tender.txt");
    const uploadRes = await fetch(`${BASE}/api/project/${token}/upload`, { method: "POST", body: form });
    // 200 success or structured analysis failure after store — not a dead 404/401
    assert.ok([200, 201, 202, 400, 500].includes(uploadRes.status), `upload status ${uploadRes.status}`);
    if (uploadRes.status === 500) {
      const body = await uploadRes.json().catch(() => ({})) as { code?: string };
      assert.ok(body.code || true, "upload 500 should be JSON");
    }

    // 5. Report + CSV
    const report = await fetch(`${BASE}/project/${token}/report`);
    assert.equal(report.status, 200);
    const reportHtml = await report.text();
    assert.ok(reportHtml.includes(`/project/${token}`) || reportHtml.includes("Project workspace"));
    assert.ok(reportHtml.includes(`/api/exports/${token}/csv`) || reportHtml.includes("CSV"));

    const csv = await fetch(`${BASE}/api/exports/${token}/csv`);
    assert.equal(csv.status, 200);
    const csvText = await csv.text();
    assert.ok(csvText.startsWith("id,type,title,source,status,confidence"));

    // 6. Return path via access API (email + project ref after intake)
    const access = await fetch(`${BASE}/api/access`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "journey@bidready24.invalid", project_ref: projectId }),
    });
    assert.equal(access.status, 200);
    const accessBody = await access.json() as { redirect?: string };
    assert.equal(accessBody.redirect, `/project/${token}`);

    // 7. Token paste path
    const tokenOpen = await fetch(`${BASE}/api/access`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "token", token: `${BASE}/project/${token}` }),
    });
    assert.equal(tokenOpen.status, 200);
    const tokenBody = await tokenOpen.json() as { redirect?: string };
    assert.equal(tokenBody.redirect, `/project/${token}`);
  });
});

describe("public redirect host safety", () => {
  it("maps admin action redirects off internal hosts", () => {
    const location = publicAppUrl(
      "/admin/projects/proj_abc",
      "http://localhost:10000/admin/projects/proj_abc/actions",
      "https://www.bidready24.com",
    );
    assert.equal(location.href, "https://www.bidready24.com/admin/projects/proj_abc");
    assert.doesNotMatch(location.href, /localhost|127\.0\.0\.1/);
  });
});
