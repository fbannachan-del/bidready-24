import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";

const databasePath = join(tmpdir(), `bidready-legacy-migration-${process.pid}-${Date.now()}.db`);

before(() => {
  const legacy = new Database(databasePath);
  legacy.exec(`
    CREATE TABLE support_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT,
      email TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  legacy.close();
});

after(async () => {
  const { closeDb } = await import("../lib/db");
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
});

test("upgrades the legacy support table before creating new indexes", async () => {
  process.env.DATABASE_PATH = databasePath;
  await import("../scripts/migrate");
  const { getDb } = await import("../lib/db");
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(support_requests)`).all() as Array<{ name: string }>;
  assert.ok(columns.some((item) => item.name === "project_ref"));
  assert.ok(columns.some((item) => item.name === "ip_hash"));
  assert.ok(columns.some((item) => item.name === "updated_at"));
  const indexes = db.prepare(`PRAGMA index_list(support_requests)`).all() as Array<{ name: string }>;
  assert.ok(indexes.some((item) => item.name === "idx_support_requests_ip"));
  assert.deepEqual(db.prepare(`PRAGMA foreign_key_check`).all(), []);
});
