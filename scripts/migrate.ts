import { getDb } from "../lib/db";

const db = getDb();

console.log("Running migrations...");

// Core tables for MVP concierge

db.exec(`
  -- Projects / Orders
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    order_type TEXT NOT NULL CHECK (order_type IN ('preflight', 'complete')),
    amount_pence INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
      'created', 'paid', 'awaiting_intake', 'awaiting_files', 'processing',
      'review_required', 'ready', 'delivered', 'failed', 'refunded', 'deletion_requested'
    )),
    secure_token TEXT NOT NULL UNIQUE,
    token_expires_at TEXT NOT NULL,
    token_revoked INTEGER NOT NULL DEFAULT 0,
    buyer_name TEXT,
    tender_title TEXT,
    deadline TEXT,
    portal TEXT,
    company_name TEXT,
    company_website TEXT,
    companies_house TEXT,
    intake_json TEXT,           -- structured questionnaire answers
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    delivered_at TEXT,
    retention_days INTEGER DEFAULT 30
  );

  CREATE INDEX IF NOT EXISTS idx_projects_token ON projects(secure_token);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

  -- Payments (Stripe)
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    stripe_payment_intent TEXT,
    stripe_checkout_session TEXT,
    amount_pence INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    raw_event TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);

  -- Uploaded files (immutable originals)
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    page_count INTEGER,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);

  -- Extracted text fragments with provenance (for citations)
  CREATE TABLE IF NOT EXISTS fragments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    page_or_location TEXT,      -- "p.3", "Section 4.2", "Sheet: Pricing!B12"
    section TEXT,
    text TEXT NOT NULL,
    char_start INTEGER,
    char_end INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_fragments_project ON fragments(project_id);

  -- Structured requirements (versioned schema v1)
  CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mandatory', 'scored', 'attachment', 'instruction', 'deadline')),
    title TEXT NOT NULL,
    verbatim_excerpt TEXT,
    normalized_requirement TEXT NOT NULL,
    document_id TEXT,           -- file id or name
    page_or_location TEXT,
    mandatory INTEGER NOT NULL DEFAULT 1,
    evaluation_weight REAL,
    response_limit TEXT,
    customer_status TEXT NOT NULL DEFAULT 'uncertain' CHECK (customer_status IN ('met', 'not_met', 'uncertain', 'missing')),
    confidence REAL NOT NULL DEFAULT 0.0,
    review_required INTEGER NOT NULL DEFAULT 1,
    matched_evidence_ids TEXT,  -- JSON array
    notes TEXT,                 -- JSON array of notes
    source TEXT,                -- 'extracted' | 'admin' | 'stub'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);

  -- Questions
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    identifier TEXT,
    section TEXT,
    question_text TEXT NOT NULL,
    response_type TEXT,
    word_limit INTEGER,
    scoring_weight REAL,
    evaluation_guidance TEXT,
    source_location TEXT,
    review_required INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_questions_project ON questions(project_id);

  -- Deadlines
  CREATE TABLE IF NOT EXISTS deadlines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    datetime TEXT NOT NULL,
    description TEXT,
    source_location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Attachments register
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    required_name TEXT,
    format TEXT,
    signer TEXT,
    owner TEXT,
    status TEXT DEFAULT 'missing',
    source_location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Evidence (from intake + evidence uploads)
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,         -- 'intake' | 'file' | 'admin'
    title TEXT,
    content TEXT,
    source_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Gaps (actionable)
  CREATE TABLE IF NOT EXISTS gaps (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    owner TEXT,
    deadline TEXT,
    related_requirement_ids TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Clarification questions (for buyer)
  CREATE TABLE IF NOT EXISTS clarifications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    question TEXT NOT NULL,
    context TEXT,
    source_location TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Admin reviews / decisions
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    actor TEXT NOT NULL,        -- 'admin' or id
    action TEXT NOT NULL,       -- 'edit', 'approve', 'reject', 'mark_uncertain', 'deliver'
    target_type TEXT,
    target_id TEXT,
    before_json TEXT,
    after_json TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Exports / deliveries
  CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,         -- 'pdf' | 'csv' | 'xlsx' | 'docx' | 'html'
    file_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Audit log (who/what changed important things)
  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Simple support / contact log (abuse protected)
  CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log("Migrations complete.");

// Lightweight migration for future schema versions can be added here as IF NOT EXISTS + ALTERs
