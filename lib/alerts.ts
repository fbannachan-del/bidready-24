import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import type { TenderOpportunity } from "./contracts-finder";
import { publicAppUrl } from "./admin-auth";
import { deliverAlert } from "./notify";

const db = getDb();

/** Project statuses that receivers can subscribe to. */
export const PROJECT_ALERT_STAGES = [
  "paid",
  "awaiting_intake",
  "awaiting_files",
  "processing",
  "review_required",
  "ready",
  "delivered",
  "failed",
] as const;

export type ProjectAlertStage = (typeof PROJECT_ALERT_STAGES)[number];

export const PROJECT_STAGE_LABELS: Record<ProjectAlertStage, string> = {
  paid: "Payment confirmed",
  awaiting_intake: "Intake required",
  awaiting_files: "Ready for tender documents",
  processing: "Analysis running",
  review_required: "Checks flagged for review",
  ready: "Report ready",
  delivered: "Report delivered",
  failed: "Run needs attention",
};

export type TenderWatch = {
  id: string;
  email: string;
  keyword: string;
  region: string;
  sme_only: number;
  active: number;
  manage_token: string;
  created_at: string;
  last_checked_at: string | null;
};

export type ProjectAlertSettings = {
  project_id: string;
  email: string;
  stages_json: string;
  active: number;
  updated_at: string;
};

function newId(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function ensureAlertTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tender_watches (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      keyword TEXT NOT NULL DEFAULT 'cleaning',
      region TEXT NOT NULL DEFAULT '',
      sme_only INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      manage_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_checked_at TEXT,
      last_notified_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tender_watches_active ON tender_watches(active);
    CREATE INDEX IF NOT EXISTS idx_tender_watches_email ON tender_watches(email);

    CREATE TABLE IF NOT EXISTS tender_watch_seen (
      watch_id TEXT NOT NULL,
      tender_fingerprint TEXT NOT NULL,
      title TEXT,
      source_url TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      notified_at TEXT,
      PRIMARY KEY (watch_id, tender_fingerprint),
      FOREIGN KEY (watch_id) REFERENCES tender_watches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_alert_settings (
      project_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      stages_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      kind TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_alert_deliveries_created ON alert_deliveries(created_at DESC);
  `);
}

// Ensure tables exist even before full migrate re-run on long-lived processes.
try {
  ensureAlertTables();
} catch {
  // DB may not be ready during import in some test paths.
}

export function tenderFingerprint(item: Pick<TenderOpportunity, "id" | "title" | "buyer" | "deadlineAt" | "sourceUrl">) {
  const raw = `${item.id}|${item.title}|${item.buyer}|${item.deadlineAt || ""}|${item.sourceUrl}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function createTenderWatch(input: {
  email: string;
  keyword?: string;
  region?: string;
  smeOnly?: boolean;
}): TenderWatch {
  ensureAlertTables();
  const id = newId("watch");
  const manageToken = randomBytes(24).toString("base64url");
  const email = input.email.trim().toLowerCase();
  const keyword = (input.keyword || "cleaning").trim().slice(0, 100) || "cleaning";
  const region = (input.region || "").trim().slice(0, 80);
  db.prepare(`
    INSERT INTO tender_watches (id, email, keyword, region, sme_only, manage_token)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email, keyword, region, input.smeOnly ? 1 : 0, manageToken);
  return getTenderWatchById(id)!;
}

export function getTenderWatchById(id: string) {
  ensureAlertTables();
  return db.prepare(`SELECT * FROM tender_watches WHERE id = ?`).get(id) as TenderWatch | undefined;
}

export function getTenderWatchByManageToken(token: string) {
  ensureAlertTables();
  return db.prepare(`SELECT * FROM tender_watches WHERE manage_token = ?`).get(token) as TenderWatch | undefined;
}

export function updateTenderWatch(
  manageToken: string,
  patch: { keyword?: string; region?: string; smeOnly?: boolean; active?: boolean },
) {
  ensureAlertTables();
  const existing = getTenderWatchByManageToken(manageToken);
  if (!existing) return null;
  const keyword = patch.keyword !== undefined ? patch.keyword.trim().slice(0, 100) || "cleaning" : existing.keyword;
  const region = patch.region !== undefined ? patch.region.trim().slice(0, 80) : existing.region;
  const sme = patch.smeOnly !== undefined ? (patch.smeOnly ? 1 : 0) : existing.sme_only;
  const active = patch.active !== undefined ? (patch.active ? 1 : 0) : existing.active;
  db.prepare(`
    UPDATE tender_watches SET keyword = ?, region = ?, sme_only = ?, active = ? WHERE manage_token = ?
  `).run(keyword, region, sme, active, manageToken);
  return getTenderWatchByManageToken(manageToken);
}

export function listActiveTenderWatches(): TenderWatch[] {
  ensureAlertTables();
  return db.prepare(`SELECT * FROM tender_watches WHERE active = 1 ORDER BY created_at DESC`).all() as TenderWatch[];
}

export function getProjectAlertSettings(projectId: string): ProjectAlertSettings | undefined {
  ensureAlertTables();
  return db.prepare(`SELECT * FROM project_alert_settings WHERE project_id = ?`).get(projectId) as ProjectAlertSettings | undefined;
}

export function upsertProjectAlertSettings(input: {
  projectId: string;
  email: string;
  stages: string[];
  active?: boolean;
}) {
  ensureAlertTables();
  const stages = [...new Set(input.stages.filter((s): s is ProjectAlertStage => (PROJECT_ALERT_STAGES as readonly string[]).includes(s)))];
  const email = input.email.trim().toLowerCase();
  const active = input.active === false ? 0 : 1;
  const existing = getProjectAlertSettings(input.projectId);
  if (existing) {
    db.prepare(`
      UPDATE project_alert_settings
      SET email = ?, stages_json = ?, active = ?, updated_at = datetime('now')
      WHERE project_id = ?
    `).run(email, JSON.stringify(stages), active, input.projectId);
  } else {
    db.prepare(`
      INSERT INTO project_alert_settings (project_id, email, stages_json, active)
      VALUES (?, ?, ?, ?)
    `).run(input.projectId, email, JSON.stringify(stages), active);
  }
  return getProjectAlertSettings(input.projectId)!;
}

function parseStages(json: string): ProjectAlertStage[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is ProjectAlertStage => typeof s === "string" && (PROJECT_ALERT_STAGES as readonly string[]).includes(s));
  } catch {
    return [];
  }
}

export async function notifyProjectStageChange(projectId: string, fromStatus: string | null, toStatus: string) {
  ensureAlertTables();
  if (!(PROJECT_ALERT_STAGES as readonly string[]).includes(toStatus)) return;
  const settings = getProjectAlertSettings(projectId);
  if (!settings || !settings.active) return;
  const stages = parseStages(settings.stages_json);
  if (!stages.includes(toStatus as ProjectAlertStage)) return;

  const project = db.prepare(`SELECT id, company_name, tender_title, secure_token, status FROM projects WHERE id = ?`).get(projectId) as {
    id: string;
    company_name: string | null;
    tender_title: string | null;
    secure_token: string;
    status: string;
  } | undefined;
  if (!project) return;

  const label = PROJECT_STAGE_LABELS[toStatus as ProjectAlertStage] || toStatus;
  const workspace = publicAppUrl(`/project/${project.secure_token}`, "https://www.bidready24.com", process.env.APP_URL).href;
  const subject = `BIDREADY24: ${label}`;
  const body = [
    `Project stage update`,
    ``,
    `Project: ${project.tender_title || project.company_name || project.id}`,
    `Reference: ${project.id}`,
    `Stage: ${label}${fromStatus ? ` (was ${fromStatus.replaceAll("_", " ")})` : ""}`,
    ``,
    `Open workspace: ${workspace}`,
    ``,
    `Manage stage alerts from your project Alerts page.`,
  ].join("\n");

  await deliverAlert({
    kind: "project_stage",
    recipient: settings.email,
    subject,
    bodyText: body,
    meta: { projectId, fromStatus, toStatus },
  });
}

function opportunityMatchesWatch(item: TenderOpportunity, watch: TenderWatch) {
  const keyword = watch.keyword.toLowerCase();
  const blob = `${item.title} ${item.description} ${item.category}`.toLowerCase();
  if (keyword && keyword !== "cleaning" && !blob.includes(keyword) && !item.title.toLowerCase().includes(keyword)) {
    // Default "cleaning" is already applied by the feed filters.
    if (!blob.includes(keyword)) return false;
  }
  if (watch.region) {
    const region = watch.region.toLowerCase();
    if (!item.region.toLowerCase().includes(region) && !blob.includes(region)) return false;
  }
  if (watch.sme_only && !item.suitableForSme) return false;
  return true;
}

/**
 * For each active tender watch, notify about newly seen matching opportunities.
 * Seeds first-seen fingerprints without notifying on the very first check (avoid alert storm).
 */
export async function processTenderWatches(opportunities: TenderOpportunity[]) {
  ensureAlertTables();
  const watches = listActiveTenderWatches();
  if (!watches.length) return { watches: 0, notified: 0, seeded: 0 };

  let notified = 0;
  let seeded = 0;

  for (const watch of watches) {
    const isFirstCheck = !watch.last_checked_at;
    const matches = opportunities.filter((item) => opportunityMatchesWatch(item, watch));
    const insertSeen = db.prepare(`
      INSERT OR IGNORE INTO tender_watch_seen (watch_id, tender_fingerprint, title, source_url, notified_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const markNotified = db.prepare(`
      UPDATE tender_watch_seen SET notified_at = datetime('now')
      WHERE watch_id = ? AND tender_fingerprint = ? AND notified_at IS NULL
    `);

    const fresh: TenderOpportunity[] = [];
    for (const item of matches) {
      const fp = tenderFingerprint(item);
      const existing = db.prepare(`
        SELECT tender_fingerprint, notified_at FROM tender_watch_seen
        WHERE watch_id = ? AND tender_fingerprint = ?
      `).get(watch.id, fp) as { tender_fingerprint: string; notified_at: string | null } | undefined;

      if (!existing) {
        insertSeen.run(watch.id, fp, item.title, item.sourceUrl, isFirstCheck ? new Date().toISOString() : null);
        if (isFirstCheck) seeded += 1;
        else fresh.push(item);
      } else if (!existing.notified_at && !isFirstCheck) {
        fresh.push(item);
      }
    }

    if (fresh.length > 0) {
      const manageUrl = publicAppUrl(`/alerts/manage?token=${encodeURIComponent(watch.manage_token)}`, "https://www.bidready24.com", process.env.APP_URL).href;
      const lines = fresh.slice(0, 15).map((item, i) =>
        `${i + 1}. ${item.title}\n   Buyer: ${item.buyer}\n   Region: ${item.region}\n   Deadline: ${item.deadlineAt || "Not stated"}\n   ${item.sourceUrl}`,
      );
      const subject = `BIDREADY24: ${fresh.length} new cleaning tender${fresh.length === 1 ? "" : "s"} matching your watch`;
      const body = [
        `New open tenders matched your watch.`,
        ``,
        `Keyword: ${watch.keyword}`,
        `Region: ${watch.region || "Any"}`,
        `SME only: ${watch.sme_only ? "yes" : "no"}`,
        ``,
        ...lines,
        ``,
        `Manage or stop these alerts: ${manageUrl}`,
        `Browse live list: ${publicAppUrl("/cleaning-tenders/jobs", "https://www.bidready24.com", process.env.APP_URL).href}`,
      ].join("\n");

      await deliverAlert({
        kind: "tender_live",
        recipient: watch.email,
        subject,
        bodyText: body,
        meta: { watchId: watch.id, count: fresh.length },
      });

      for (const item of fresh) {
        markNotified.run(watch.id, tenderFingerprint(item));
      }
      notified += fresh.length;
      db.prepare(`UPDATE tender_watches SET last_notified_at = datetime('now') WHERE id = ?`).run(watch.id);
    }

    db.prepare(`UPDATE tender_watches SET last_checked_at = datetime('now') WHERE id = ?`).run(watch.id);
  }

  return { watches: watches.length, notified, seeded };
}
