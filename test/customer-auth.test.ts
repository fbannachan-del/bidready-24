import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("customer accounts", () => {
  const dbPath = join(tmpdir(), `bidready-cust-${process.pid}-${Date.now()}.db`);
  const uploadDir = join(tmpdir(), `bidready-cust-up-${process.pid}-${Date.now()}`);
  const runner = join(tmpdir(), `bidready-cust-runner-${Date.now()}.mjs`);

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

  it("issues sessions, blocks unpaid claims, and links paid projects", () => {
    const authUrl = pathToFileURL(join(root, "lib/customer-auth.ts")).href;
    const projectsUrl = pathToFileURL(join(root, "lib/projects.ts")).href;
    writeFileSync(runner, `
process.env.DATABASE_PATH = ${JSON.stringify(dbPath)};
process.env.UPLOAD_DIR = ${JSON.stringify(uploadDir)};
process.env.CUSTOMER_SESSION_SECRET = "test-customer-secret";
const {
  getOrCreateAccount,
  createCustomerSessionToken,
  verifyCustomerSessionToken,
  claimProjectForAccount,
  linkProjectToAccount,
  listAccountProjects,
  projectIsPaidEligible,
} = await import(${JSON.stringify(authUrl)});
const { createProject, updateProjectStatus } = await import(${JSON.stringify(projectsUrl)});

function must(c, m) { if (!c) throw new Error(m); }

const account = getOrCreateAccount("buyer@example.com", "Buyer");
must(account.id.startsWith("acct_"), "account id");

const session = createCustomerSessionToken({ accountId: account.id });
must(verifyCustomerSessionToken(session) === account.id, "session verifies");
must(verifyCustomerSessionToken("tampered") === null, "reject bad session");

const unpaid = createProject({ order_type: "preflight", amount_pence: 14900 });
must(!projectIsPaidEligible(
  (await import(${JSON.stringify(projectsUrl)})).getProjectById(unpaid.id)
), "created shell is unpaid");

const unpaidClaim = claimProjectForAccount(account, unpaid.id);
must(unpaidClaim.ok === false, "cannot claim unpaid");

const paid = createProject({ order_type: "complete", amount_pence: 34900 });
updateProjectStatus(paid.id, "paid");
const paidRow = (await import(${JSON.stringify(projectsUrl)})).getProjectById(paid.id);
must(projectIsPaidEligible(paidRow), "paid eligible");

const claim = claimProjectForAccount(account, paid.secure_token);
must(claim.ok === true, "claim paid token");
must(listAccountProjects(account.id).length === 1, "one project listed");

linkProjectToAccount(paid.id, account.id, "checkout");
must(listAccountProjects(account.id).length === 1, "still one after re-link");

console.log(JSON.stringify({ ok: true, accountId: account.id, projectId: paid.id }));
`);
    const result = spawnSync(process.execPath, ["--import", "tsx", runner], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath, UPLOAD_DIR: uploadDir, CUSTOMER_SESSION_SECRET: "test-customer-secret" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const line = (result.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).at(-1)!;
    assert.equal(JSON.parse(line).ok, true);
  });
});
