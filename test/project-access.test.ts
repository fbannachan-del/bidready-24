import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("project access matching", () => {
  const dbPath = join(tmpdir(), `bidready-access-${process.pid}-${Date.now()}.db`);
  const uploadDir = join(tmpdir(), `bidready-access-up-${process.pid}-${Date.now()}`);
  const runner = join(tmpdir(), `bidready-access-runner-${Date.now()}.mjs`);

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

  it("matches only when email and project ref agree with intake", () => {
    const projectsUrl = pathToFileURL(join(root, "lib/projects.ts")).href;
    const accessUrl = pathToFileURL(join(root, "lib/project-access.ts")).href;
    writeFileSync(runner, `
process.env.DATABASE_PATH = ${JSON.stringify(dbPath)};
process.env.UPLOAD_DIR = ${JSON.stringify(uploadDir)};
const { createProject, updateProjectIntake } = await import(${JSON.stringify(projectsUrl)});
const { matchProjectAccess } = await import(${JSON.stringify(accessUrl)});
const project = createProject({ order_type: "preflight", amount_pence: 14900 });
updateProjectIntake(project.id, JSON.stringify({
  company_name: "Access Test Co",
  contact_name: "Receiver",
  contact_email: "receiver@example.com",
  sector: "commercial_cleaning",
  bid_deadline: "2026-09-01",
  service_area: "Scotland",
  consent: true,
}), "Access Test Co");
const good = matchProjectAccess("receiver@example.com", project.id);
const badEmail = matchProjectAccess("other@example.com", project.id);
const badRef = matchProjectAccess("receiver@example.com", "proj_doesnotexist");
console.log(JSON.stringify({
  good: good.matched,
  token: good.matched ? good.project.secure_token : null,
  badEmail: badEmail.matched,
  badRef: badRef.matched,
}));
`);
    const result = spawnSync(process.execPath, ["--import", "tsx", runner], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath, UPLOAD_DIR: uploadDir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const line = (result.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).at(-1)!;
    const parsed = JSON.parse(line) as { good: boolean; badEmail: boolean; badRef: boolean; token: string | null };
    assert.equal(parsed.good, true);
    assert.ok(parsed.token);
    assert.equal(parsed.badEmail, false);
    assert.equal(parsed.badRef, false);
  });
});
