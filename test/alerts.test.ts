import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("alerts framework", () => {
  const dbPath = join(tmpdir(), `bidready-alerts-${process.pid}-${Date.now()}.db`);
  const uploadDir = join(tmpdir(), `bidready-alerts-up-${process.pid}-${Date.now()}`);
  const runner = join(tmpdir(), `bidready-alerts-runner-${Date.now()}.mjs`);

  before(() => {
    mkdirSync(uploadDir, { recursive: true });
    const migrate = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/migrate.ts"],
      { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_PATH: dbPath, UPLOAD_DIR: uploadDir } },
    );
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
  });

  after(() => {
    for (const path of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`, runner]) {
      try { rmSync(path, { force: true }); } catch { /* */ }
    }
    try { rmSync(uploadDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it("creates tender watches, seeds first pass, notifies on new tenders, and fires project stage alerts", () => {
    const alertsUrl = pathToFileURL(join(root, "lib/alerts.ts")).href;
    const projectsUrl = pathToFileURL(join(root, "lib/projects.ts")).href;
    writeFileSync(runner, `
process.env.DATABASE_PATH = ${JSON.stringify(dbPath)};
process.env.UPLOAD_DIR = ${JSON.stringify(uploadDir)};
const {
  createTenderWatch,
  processTenderWatches,
  upsertProjectAlertSettings,
  notifyProjectStageChange,
  getTenderWatchByManageToken,
  updateTenderWatch,
} = await import(${JSON.stringify(alertsUrl)});
const { createProject, updateProjectStatus } = await import(${JSON.stringify(projectsUrl)});

function must(cond, msg) { if (!cond) throw new Error(msg); }

const watch = createTenderWatch({ email: "watch@example.com", keyword: "cleaning", region: "Scotland" });
must(watch.manage_token, "missing manage token");

const tenderA = {
  id: "t1", reference: "R1", title: "Edinburgh school cleaning", description: "Daily cleaning",
  buyer: "City of Edinburgh Council", region: "Scotland", publishedAt: null, deadlineAt: "2099-01-01T00:00:00Z",
  valueLow: null, valueHigh: null, suitableForSme: true, cpvCodes: ["90910000"], category: "Cleaning",
  status: "Open", source: "Find a Tender", sourceUrl: "https://example.test/1",
};
const tenderB = {
  ...tenderA, id: "t2", reference: "R2", title: "Glasgow office cleaning", sourceUrl: "https://example.test/2",
};

const first = await processTenderWatches([tenderA]);
must(first.seeded >= 1, "expected seed on first pass");
must(first.notified === 0, "first pass must not notify");

const second = await processTenderWatches([tenderA, tenderB]);
must(second.notified >= 1, "second pass must notify new tenders");

const updated = updateTenderWatch(watch.manage_token, { active: false });
must(updated.active === 0, "watch should deactivate");
const reloaded = getTenderWatchByManageToken(watch.manage_token);
must(reloaded.active === 0, "reload active=0");

const project = createProject({ order_type: "preflight", amount_pence: 14900 });
upsertProjectAlertSettings({
  projectId: project.id,
  email: "receiver@example.com",
  stages: ["processing", "ready", "failed"],
  active: true,
});
await notifyProjectStageChange(project.id, "awaiting_files", "processing");
updateProjectStatus(project.id, "ready");

console.log(JSON.stringify({ ok: true, first, second }));
`);
    const result = spawnSync(process.execPath, ["--import", "tsx", runner], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath, UPLOAD_DIR: uploadDir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const line = (result.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).at(-1)!;
    const parsed = JSON.parse(line) as { ok: boolean; first: { notified: number; seeded: number }; second: { notified: number } };
    assert.equal(parsed.ok, true);
    assert.ok(parsed.first.seeded >= 1);
    assert.equal(parsed.first.notified, 0);
    assert.ok(parsed.second.notified >= 1);
  });
});
