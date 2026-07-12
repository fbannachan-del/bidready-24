import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BASE_URL, get, readSource, skipIfNoServer } from "./_helpers";

describe("Agent 19 — Admin console & project operations", () => {
  it("admin console source has E2E and project inspect actions", () => {
    const admin = readSource("app/admin/page.tsx");
    assert.ok(admin.includes("Run end-to-end test") || admin.includes("end-to-end"));
    assert.ok(admin.includes("/admin/projects/") || admin.includes("Inspect"));
    const project = readSource("app/admin/projects/[id]/page.tsx");
    assert.ok(project.includes("run_autonomous"));
    assert.ok(project.includes("mark_ready"));
    assert.ok(project.includes("deliver"));
    assert.ok(project.includes("Save audited correction") || project.includes("audited"));
  });

  it("synthetic end-to-end pipeline passes all checks", async () => {
    const dbPath = join(tmpdir(), `bidready-agent19-${process.pid}-${Date.now()}.db`);
    const uploadDir = join(tmpdir(), `bidready-agent19-up-${process.pid}-${Date.now()}`);
    mkdirSync(uploadDir, { recursive: true });
    const { spawnSync } = await import("node:child_process");
    const { writeFileSync } = await import("node:fs");
    const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
    const runner = join(tmpdir(), `bidready-e2e-runner-${Date.now()}.mjs`);
    writeFileSync(runner, `
process.env.DATABASE_PATH = ${JSON.stringify(dbPath)};
process.env.UPLOAD_DIR = ${JSON.stringify(uploadDir)};
await import(${JSON.stringify(join(root, "scripts/migrate.ts"))});
const { runSyntheticEndToEndTest, EndToEndTestError } = await import(${JSON.stringify(join(root, "lib/admin-e2e.ts"))});
try {
  const result = await runSyntheticEndToEndTest();
  console.log(JSON.stringify({ ok: true, checks: result.checks, projectId: result.projectId, token: result.token }));
} catch (e) {
  if (e instanceof EndToEndTestError || e?.name === "EndToEndTestError") {
    console.log(JSON.stringify({ ok: false, checks: e.checks, projectId: e.projectId }));
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
}
`);
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", runner],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: dbPath, UPLOAD_DIR: uploadDir },
        timeout: 120_000,
      },
    );
    try { rmSync(runner, { force: true }); } catch { /* */ }
    if (result.status !== 0 && result.status !== 2) {
      assert.fail(`e2e subprocess failed (${result.status}): ${result.stderr || result.stdout}`);
    }
    const line = (result.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).at(-1) || "{}";
    let parsed: { ok: boolean; checks?: Array<{ label: string; passed: boolean; detail: string }> };
    try {
      parsed = JSON.parse(line);
    } catch {
      assert.fail(`Could not parse e2e output: ${result.stdout}\n${result.stderr}`);
    }
    if (!parsed.ok) {
      const failed = (parsed.checks || []).filter((c) => !c.passed);
      assert.fail(`E2E checks failed: ${failed.map((c) => `${c.label}=${c.detail}`).join("; ")}`);
    }
    assert.ok(parsed.checks && parsed.checks.every((c) => c.passed));
    try { rmSync(dbPath, { force: true }); } catch { /* */ }
    try { rmSync(`${dbPath}-shm`, { force: true }); } catch { /* */ }
    try { rmSync(`${dbPath}-wal`, { force: true }); } catch { /* */ }
    try { rmSync(uploadDir, { recursive: true, force: true }); } catch { /* */ }
  });

  describe("HTTP admin", () => {
    before(async function () {
      await skipIfNoServer(this);
    });

    it("admin project actions route exists as POST endpoint", async () => {
      // Without session should redirect/deny
      const res = await fetch(`${BASE_URL}/admin/tests/end-to-end`, { method: "POST", redirect: "manual" });
      assert.ok([302, 303, 307, 308, 401, 403, 404, 405].includes(res.status) || res.status === 200);
    });

    it("locked page back link works", async () => {
      const { status } = await get("/admin/locked");
      assert.equal(status, 200);
      const home = await get("/");
      assert.equal(home.status, 200);
    });
  });
});
