import { getDb } from "./db";
import { randomBytes } from "node:crypto";
import { Requirement } from "./schemas";

const db = getDb();

export interface ProjectRow {
  id: string;
  order_type: "preflight" | "complete";
  amount_pence: number;
  status: string;
  secure_token: string;
  token_expires_at: string;
  token_revoked: number;
  company_name: string | null;
  tender_title: string | null;
  deadline: string | null;
  portal: string | null;
  intake_json: string | null;
  created_at: string;
  updated_at: string;
}

export type RequirementRow = Omit<Requirement, "notes" | "matched_evidence_ids" | "mandatory" | "review_required"> & {
  notes: string | null;
  matched_evidence_ids: string | null;
  mandatory: number;
  review_required: number;
  project_id: string;
  analysis_run_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function createProject(params: {
  order_type: "preflight" | "complete";
  amount_pence: number;
  company_name?: string;
}) {
  const id = "proj_" + randomBytes(10).toString("hex");
  const token = generateToken();
  const configuredHours = Number(process.env.PROJECT_TOKEN_TTL_HOURS || 168);
  const ttlHours = Number.isFinite(configuredHours) && configuredHours >= 1 && configuredHours <= 24 * 30 ? configuredHours : 168;
  const expires = new Date(Date.now() + 1000 * 60 * 60 * ttlHours).toISOString();

  db.prepare(`
    INSERT INTO projects (id, order_type, amount_pence, status, secure_token, token_expires_at, company_name)
    VALUES (?, ?, ?, 'created', ?, ?, ?)
  `).run(id, params.order_type, params.amount_pence, token, expires, params.company_name ?? null);

  // audit
  db.prepare(`INSERT INTO audit_events (id, project_id, actor, action, entity) VALUES (?, ?, 'system', 'create', 'project')`)
    .run("aud_" + randomBytes(8).toString("hex"), id);

  return { id, secure_token: token };
}

export function getProjectByToken(token: string) {
  return db.prepare(`SELECT * FROM projects WHERE secure_token = ? AND token_revoked = 0 AND julianday(token_expires_at) > julianday('now')`).get(token) as ProjectRow | undefined;
}

export function getProjectById(id: string) {
  return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
}

export function updateProjectStatus(id: string, status: string) {
  db.prepare(`UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
}

export function updateProjectIntake(id: string, intakeJson: string, companyName?: string) {
  db.prepare(`UPDATE projects SET intake_json = ?, company_name = COALESCE(?, company_name), status = 'awaiting_files', updated_at = datetime('now') WHERE id = ?`)
    .run(intakeJson, companyName ?? null, id);
}

export function listProjectsForAdmin() {
  return db.prepare(`SELECT id, order_type, amount_pence, status, company_name, tender_title, deadline, created_at FROM projects ORDER BY created_at DESC LIMIT 100`).all();
}

export function addRequirement(projectId: string, req: Partial<Requirement> & { title: string; normalized_requirement: string }) {
  const id = "req_" + randomBytes(8).toString("hex");
  db.prepare(`
    INSERT INTO requirements (id, project_id, type, title, verbatim_excerpt, normalized_requirement, document_id, page_or_location, mandatory, customer_status, confidence, review_required, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, projectId, req.type ?? "mandatory", req.title, req.verbatim_excerpt ?? null, req.normalized_requirement,
    req.document_id ?? null, req.page_or_location ?? null, req.mandatory ? 1 : 0,
    req.customer_status ?? "uncertain", req.confidence ?? 0.4, req.review_required ? 1 : 0, req.source ?? "stub"
  );
  return id;
}

export function getRequirements(projectId: string): RequirementRow[] {
  const latest = db.prepare(`SELECT id FROM analysis_runs WHERE project_id = ? AND status = 'succeeded' ORDER BY completed_at DESC, rowid DESC LIMIT 1`).get(projectId) as { id?: string } | undefined;
  if (latest?.id) return db.prepare(`SELECT * FROM requirements WHERE project_id = ? AND analysis_run_id = ? ORDER BY created_at`).all(projectId, latest.id) as RequirementRow[];
  return db.prepare(`SELECT * FROM requirements WHERE project_id = ? AND analysis_run_id IS NULL ORDER BY created_at`).all(projectId) as RequirementRow[];
}

export function updateRequirement(id: string, updates: Partial<Requirement>) {
  const keys = Object.keys(updates).filter(k => k !== "id");
  if (keys.length === 0) return;
  const set = keys.map(k => `${k} = ?`).join(", ");
  const values = keys.map(k => updates[k as keyof Requirement]);
  db.prepare(`UPDATE requirements SET ${set}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
}

export function addAudit(projectId: string | null, actor: string, action: string, entity: string, details?: unknown) {
  const id = "aud_" + randomBytes(8).toString("hex");
  db.prepare(`INSERT INTO audit_events (id, project_id, actor, action, entity, details_json) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, actor, action, entity, details ? JSON.stringify(details) : null);
}
