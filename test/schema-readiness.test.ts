import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { inspectSchemaReadiness } from "../lib/schema-readiness";

describe("database readiness", () => {
  it("fails closed for an empty database", () => {
    const db = new Database(":memory:");
    try {
      const result = inspectSchemaReadiness(db);
      assert.equal(result.ready, false);
      assert.ok(result.missingTables.includes("projects"));
      assert.ok(result.missingTables.includes("analysis_runs"));
      assert.ok(result.missingTables.includes("support_requests"));
    } finally {
      db.close();
    }
  });

  it("reports required legacy columns separately", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE support_requests (id TEXT PRIMARY KEY);
        CREATE TABLE requirements (id TEXT PRIMARY KEY);
        CREATE TABLE clarifications (id TEXT PRIMARY KEY);
        CREATE TABLE gaps (id TEXT PRIMARY KEY);
      `);
      const result = inspectSchemaReadiness(db);
      assert.equal(result.ready, false);
      assert.ok(result.missingColumns.includes("support_requests.project_ref"));
      assert.ok(result.missingColumns.includes("requirements.analysis_run_id"));
    } finally {
      db.close();
    }
  });
});
