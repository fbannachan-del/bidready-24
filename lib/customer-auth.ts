import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";
import type { ProjectRow } from "./projects";
import { publicAppUrl } from "./admin-auth";
import { deliverAlert } from "./notify";

export const CUSTOMER_SESSION_COOKIE = "br24_customer_session";
export const CUSTOMER_SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type CustomerAccount = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_login_at: string | null;
};

export type AccountProject = ProjectRow & {
  payment_status?: string | null;
  linked_at?: string;
};

const db = getDb();

export function ensureCustomerTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);

    CREATE TABLE IF NOT EXISTS customer_magic_links (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_customer_magic_account ON customer_magic_links(account_id);

    CREATE TABLE IF NOT EXISTS project_accounts (
      project_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      link_source TEXT NOT NULL DEFAULT 'claim',
      PRIMARY KEY (project_id, account_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_project_accounts_account ON project_accounts(account_id);

    -- Optional owner column on projects for fast lookup
  `);
  try {
    const cols = db.prepare(`PRAGMA table_info(projects)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "owner_account_id")) {
      db.exec(`ALTER TABLE projects ADD COLUMN owner_account_id TEXT`);
    }
  } catch {
    // ignore during early bootstrap
  }
}

try {
  ensureCustomerTables();
} catch {
  // DB may be unavailable at import in some tool paths
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sessionSigningKey() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.CHECKOUT_SESSION_SECRET || "bidready-customer-dev-only";
  return createHash("sha256").update("bidready24:customer-session:v1\0").update(secret).digest();
}

export function createCustomerSessionToken(params: { accountId: string; now?: number; nonce?: string }) {
  const expiresAt = Math.floor((params.now ?? Date.now()) / 1_000) + CUSTOMER_SESSION_SECONDS;
  const payload = `v1.${params.accountId}.${expiresAt}.${params.nonce ?? randomBytes(12).toString("base64url")}`;
  const sig = createHmac("sha256", sessionSigningKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCustomerSessionToken(token?: string | null, now = Date.now()): string | null {
  if (!token || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [, accountId, expStr, , sig] = parts;
  if (!accountId?.startsWith("acct_") || accountId.length > 80) return null;
  const expiresAt = Number(expStr);
  const nowSec = Math.floor(now / 1_000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSec) return null;
  const payload = parts.slice(0, 4).join(".");
  const expected = createHmac("sha256", sessionSigningKey()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return accountId;
}

export function getAccountById(id: string) {
  ensureCustomerTables();
  return db.prepare(`SELECT * FROM customer_accounts WHERE id = ?`).get(id) as CustomerAccount | undefined;
}

export function getAccountByEmail(email: string) {
  ensureCustomerTables();
  return db.prepare(`SELECT * FROM customer_accounts WHERE email = ?`).get(normalizeEmail(email)) as CustomerAccount | undefined;
}

export function getOrCreateAccount(email: string, name?: string | null): CustomerAccount {
  ensureCustomerTables();
  const normalized = normalizeEmail(email);
  const existing = getAccountByEmail(normalized);
  if (existing) {
    if (name && !existing.name) {
      db.prepare(`UPDATE customer_accounts SET name = ? WHERE id = ?`).run(name.trim().slice(0, 120), existing.id);
      return getAccountById(existing.id)!;
    }
    return existing;
  }
  const id = `acct_${randomBytes(10).toString("hex")}`;
  db.prepare(`INSERT INTO customer_accounts (id, email, name) VALUES (?, ?, ?)`).run(
    id,
    normalized,
    name?.trim().slice(0, 120) || null,
  );
  return getAccountById(id)!;
}

export function requestMagicLogin(email: string, requestUrl: string): { ok: true; devLink?: string } {
  ensureCustomerTables();
  const account = getOrCreateAccount(email);
  const raw = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
  db.prepare(`
    INSERT INTO customer_magic_links (id, account_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(`mlink_${randomBytes(8).toString("hex")}`, account.id, tokenHash, expires);

  const link = publicAppUrl(`/api/account/verify?token=${encodeURIComponent(raw)}`, requestUrl, process.env.APP_URL).href;

  void deliverAlert({
    kind: "project_access",
    recipient: account.email,
    subject: "BIDREADY24: sign in to your account",
    bodyText: [
      "Sign in to your BIDREADY24 account.",
      "",
      `Open this link (valid for 30 minutes):`,
      link,
      "",
      "If you did not request this, you can ignore this message.",
      "Projects still require individual payment — your account only organises paid workspaces you own.",
    ].join("\n"),
    meta: { accountId: account.id, event: "magic_login" },
  });

  return {
    ok: true,
    ...(process.env.NODE_ENV !== "production" ? { devLink: link } : {}),
  };
}

export function consumeMagicLink(rawToken: string): CustomerAccount | null {
  ensureCustomerTables();
  const tokenHash = createHash("sha256").update(rawToken.trim()).digest("hex");
  const row = db.prepare(`
    SELECT * FROM customer_magic_links
    WHERE token_hash = ? AND used_at IS NULL AND julianday(expires_at) > julianday('now')
  `).get(tokenHash) as { id: string; account_id: string } | undefined;
  if (!row) return null;
  db.prepare(`UPDATE customer_magic_links SET used_at = datetime('now') WHERE id = ?`).run(row.id);
  db.prepare(`UPDATE customer_accounts SET last_login_at = datetime('now') WHERE id = ?`).run(row.account_id);
  return getAccountById(row.account_id) || null;
}

export function linkProjectToAccount(projectId: string, accountId: string, source = "claim") {
  ensureCustomerTables();
  db.prepare(`
    INSERT OR IGNORE INTO project_accounts (project_id, account_id, link_source)
    VALUES (?, ?, ?)
  `).run(projectId, accountId, source);
  db.prepare(`
    UPDATE projects SET owner_account_id = COALESCE(owner_account_id, ?) WHERE id = ?
  `).run(accountId, projectId);
}

export function accountOwnsProject(accountId: string, projectId: string): boolean {
  ensureCustomerTables();
  const row = db.prepare(`
    SELECT 1 AS ok FROM project_accounts WHERE account_id = ? AND project_id = ?
    UNION
    SELECT 1 AS ok FROM projects WHERE id = ? AND owner_account_id = ?
  `).get(accountId, projectId, projectId, accountId) as { ok: number } | undefined;
  return Boolean(row);
}

export function listAccountProjects(accountId: string): AccountProject[] {
  ensureCustomerTables();
  return db.prepare(`
    SELECT p.*, pa.linked_at,
      (SELECT status FROM payments WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) AS payment_status
    FROM projects p
    INNER JOIN project_accounts pa ON pa.project_id = p.id
    WHERE pa.account_id = ?
    ORDER BY p.updated_at DESC, p.created_at DESC
    LIMIT 100
  `).all(accountId) as AccountProject[];
}

/**
 * Paid projects only may join an account. Created/unpaid shells stay unlinked
 * until Stripe fulfilment (or simulated paid path) marks them paid+.
 */
export function projectIsPaidEligible(project: ProjectRow): boolean {
  if (["created"].includes(project.status)) {
    // Allow if a paid payment row exists (status may lag).
    const pay = db.prepare(`
      SELECT status FROM payments WHERE project_id = ? AND status = 'paid' LIMIT 1
    `).get(project.id) as { status: string } | undefined;
    return Boolean(pay);
  }
  // Any post-payment operational status is eligible
  return !["created", "refunded"].includes(project.status);
}

export function claimProjectForAccount(account: CustomerAccount, projectRef: string): { ok: true; project: ProjectRow } | { ok: false; error: string } {
  ensureCustomerTables();
  const ref = projectRef.trim();
  // Accept full workspace URLs pasted from email
  const tokenFromUrl = ref.match(/\/project\/([A-Za-z0-9_-]{16,})/)?.[1];
  const lookup = tokenFromUrl || ref;

  let project: ProjectRow | undefined;
  if (lookup.startsWith("proj_")) {
    project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(lookup) as ProjectRow | undefined;
  } else {
    project = db.prepare(`
      SELECT * FROM projects WHERE secure_token = ? AND token_revoked = 0
    `).get(lookup) as ProjectRow | undefined;
  }
  if (!project) return { ok: false, error: "Project not found." };
  if (!projectIsPaidEligible(project)) {
    return { ok: false, error: "This project is not paid yet. Complete checkout first — each project requires payment." };
  }

  if (accountOwnsProject(account.id, project.id)) {
    return { ok: true, project };
  }

  const other = db.prepare(`
    SELECT account_id FROM project_accounts WHERE project_id = ? AND account_id != ? LIMIT 1
  `).get(project.id, account.id) as { account_id: string } | undefined;

  let intakeEmail: string | null = null;
  if (project.intake_json) {
    try {
      const parsed = JSON.parse(project.intake_json) as { contact_email?: string };
      if (typeof parsed.contact_email === "string") intakeEmail = normalizeEmail(parsed.contact_email);
    } catch {
      // ignore
    }
  }

  // Already owned by someone else: only allow if intake email matches this account.
  if (other) {
    if (!intakeEmail || intakeEmail !== account.email) {
      return { ok: false, error: "This project is already linked to another account." };
    }
  }

  // Possession of a paid project token (or matching intake email) is enough to claim.
  linkProjectToAccount(project.id, account.id, "claim");
  return { ok: true, project };
}

export function accountFromRequest(cookieValue?: string | null): CustomerAccount | null {
  const accountId = verifyCustomerSessionToken(cookieValue);
  if (!accountId) return null;
  return getAccountById(accountId) || null;
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: CUSTOMER_SESSION_SECONDS,
    path: "/",
  };
}
