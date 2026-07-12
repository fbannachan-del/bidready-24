import type Database from "better-sqlite3";

const REQUIRED_TABLES = [
  "projects",
  "support_requests",
  "analysis_runs",
  "autonomy_settings",
  "responses",
  "qa_checks",
  "submissions",
] as const;

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  support_requests: ["project_ref", "ip_hash", "updated_at"],
  requirements: ["analysis_run_id", "requirement_key"],
  clarifications: ["analysis_run_id", "status"],
  gaps: ["analysis_run_id", "status"],
};

export type SchemaReadiness = {
  ready: boolean;
  missingTables: string[];
  missingColumns: string[];
};

export function inspectSchemaReadiness(db: Database.Database): SchemaReadiness {
  db.prepare("SELECT 1").get();
  const existingTables = new Set<string>((db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>).map(row => row.name));
  const missingTables: string[] = REQUIRED_TABLES.filter(table => !existingTables.has(table));
  const missingColumns: string[] = [];

  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    if (!existingTables.has(table)) {
      missingTables.push(table);
      continue;
    }
    const columns = new Set((db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(row => row.name));
    for (const column of required) if (!columns.has(column)) missingColumns.push(`${table}.${column}`);
  }

  return {
    ready: missingTables.length === 0 && missingColumns.length === 0,
    missingTables: [...new Set(missingTables)].sort(),
    missingColumns: missingColumns.sort(),
  };
}

export function assertSchemaReady(db: Database.Database): void {
  const result = inspectSchemaReadiness(db);
  if (!result.ready) {
    throw new Error(`Database schema is not ready: missing tables [${result.missingTables.join(", ")}], missing columns [${result.missingColumns.join(", ")}]`);
  }
}
