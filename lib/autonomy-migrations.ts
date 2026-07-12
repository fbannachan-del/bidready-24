import type Database from "better-sqlite3";

type SqliteDatabase = Database.Database;

function hasColumn(db: SqliteDatabase, table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).some(
    (item) => item.name === column,
  );
}

function addColumn(db: SqliteDatabase, table: string, definition: string): void {
  const column = definition.trim().split(/\s+/, 1)[0];
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

/**
 * Additive, repeatable migrations for the autonomous bidding data model.
 * Existing MVP tables and rows are deliberately retained so a live database can
 * be upgraded in place.
 */
export function migrateAutonomySchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS autonomy_settings (
      project_id TEXT PRIMARY KEY,
      profile TEXT NOT NULL DEFAULT 'unattended'
        CHECK (profile IN ('assisted', 'autonomous', 'unattended')),
      policy_json TEXT NOT NULL DEFAULT '{}',
      mandate_json TEXT NOT NULL DEFAULT '{}',
      policy_version INTEGER NOT NULL DEFAULT 1,
      mandate_version INTEGER NOT NULL DEFAULT 1,
      receiver_acknowledged_at TEXT,
      receiver_acknowledged_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'full',
      status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
      trigger_type TEXT NOT NULL DEFAULT 'system',
      model TEXT,
      prompt_version TEXT,
      schema_version TEXT NOT NULL DEFAULT '2',
      input_hash TEXT,
      attempt INTEGER NOT NULL DEFAULT 1,
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      stage TEXT,
      metrics_json TEXT NOT NULL DEFAULT '{}',
      error_code TEXT,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (project_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_project_created
      ON analysis_runs(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);

    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_run_id TEXT,
      fragment_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      quote TEXT NOT NULL,
      quote_start INTEGER,
      quote_end INTEGER,
      locator_json TEXT NOT NULL DEFAULT '{}',
      confidence REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
      verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE SET NULL,
      FOREIGN KEY (fragment_id) REFERENCES fragments(id) ON DELETE CASCADE,
      UNIQUE (entity_type, entity_id, fragment_id, quote_start, quote_end)
    );
    CREATE INDEX IF NOT EXISTS idx_citations_entity ON citations(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_citations_project ON citations(project_id);

    CREATE TABLE IF NOT EXISTS evidence_facts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      evidence_id TEXT,
      file_id TEXT,
      subject TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      unit TEXT,
      provenance_class TEXT NOT NULL DEFAULT 'missing'
        CHECK (provenance_class IN (
          'verified_primary', 'verified_customer', 'supported_secondary',
          'inferred', 'unverified_claim', 'missing'
        )),
      verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'verified', 'rejected', 'expired', 'conflicting')),
      source_location TEXT,
      valid_from TEXT,
      valid_until TEXT,
      confidence REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
      supersedes_id TEXT,
      idempotency_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (supersedes_id) REFERENCES evidence_facts(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_facts_idempotency
      ON evidence_facts(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_evidence_facts_lookup
      ON evidence_facts(project_id, subject, fact_key, verification_status);

    CREATE TABLE IF NOT EXISTS compliance_decisions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      requirement_id TEXT NOT NULL,
      analysis_run_id TEXT,
      status TEXT NOT NULL CHECK (status IN (
        'verified_met', 'probably_met', 'partially_met', 'not_met',
        'probably_not_met', 'missing', 'conflicting_evidence',
        'unable_to_determine', 'not_applicable', 'customer_verification_required'
      )),
      decision_method TEXT NOT NULL DEFAULT 'semantic',
      required_value_json TEXT,
      observed_value_json TEXT,
      rationale TEXT NOT NULL,
      assumptions_json TEXT NOT NULL DEFAULT '[]',
      evidence_fact_ids_json TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
      consequence_if_wrong TEXT,
      is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
      decided_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_current
      ON compliance_decisions(requirement_id) WHERE is_current = 1;
    CREATE INDEX IF NOT EXISTS idx_decisions_project ON compliance_decisions(project_id, status);

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      question_id TEXT,
      analysis_run_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'machine_approved', 'superseded', 'submitted', 'rejected')),
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      character_count INTEGER NOT NULL DEFAULT 0,
      claim_manifest_json TEXT NOT NULL DEFAULT '[]',
      assumptions_json TEXT NOT NULL DEFAULT '[]',
      quality_scores_json TEXT NOT NULL DEFAULT '{}',
      approval_reason TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE SET NULL,
      UNIQUE (question_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_responses_project ON responses(project_id, status);

    CREATE TABLE IF NOT EXISTS commitments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      response_id TEXT,
      commitment_type TEXT NOT NULL,
      statement TEXT NOT NULL,
      value_json TEXT,
      authority_source TEXT,
      authority_ref TEXT,
      status TEXT NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed', 'authorised', 'submitted', 'fulfilled', 'breached', 'withdrawn')),
      effective_at TEXT,
      expires_at TEXT,
      idempotency_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_commitments_idempotency
      ON commitments(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_commitments_project ON commitments(project_id, status);

    CREATE TABLE IF NOT EXISTS policy_sets (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'superseded', 'revoked')),
      effective_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (project_id, kind, version)
    );

    CREATE TABLE IF NOT EXISTS policy_rules (
      id TEXT PRIMARY KEY,
      policy_set_id TEXT NOT NULL,
      rule_key TEXT NOT NULL,
      operator TEXT NOT NULL,
      value_json TEXT NOT NULL,
      effect TEXT NOT NULL DEFAULT 'allow'
        CHECK (effect IN ('allow', 'deny', 'warn', 'no_bid', 'clarify')),
      priority INTEGER NOT NULL DEFAULT 100,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (policy_set_id) REFERENCES policy_sets(id) ON DELETE CASCADE,
      UNIQUE (policy_set_id, rule_key)
    );

    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      mandate_type TEXT NOT NULL,
      legal_entity TEXT NOT NULL,
      scope_json TEXT NOT NULL DEFAULT '{}',
      authority_json TEXT NOT NULL DEFAULT '{}',
      authorised_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'expired', 'revoked')),
      effective_at TEXT NOT NULL,
      expires_at TEXT,
      signature_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_mandates_project ON mandates(project_id, mandate_type, status);

    CREATE TABLE IF NOT EXISTS qa_checks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      analysis_run_id TEXT,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      check_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
      severity TEXT NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
      message TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      deterministic INTEGER NOT NULL DEFAULT 1 CHECK (deterministic IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE SET NULL,
      UNIQUE (analysis_run_id, entity_type, entity_id, check_key)
    );
    CREATE INDEX IF NOT EXISTS idx_qa_project ON qa_checks(project_id, status, severity);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      portal TEXT,
      opportunity_ref TEXT,
      lot_ref TEXT,
      status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN (
        'prepared', 'validating', 'ready', 'submitting', 'submitted',
        'confirmed', 'failed', 'withdrawn', 'unknown'
      )),
      mandate_id TEXT,
      manifest_json TEXT NOT NULL DEFAULT '{}',
      receipt_ref TEXT,
      receipt_path TEXT,
      confirmation_json TEXT,
      error_message TEXT,
      submitted_at TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (mandate_id) REFERENCES mandates(id) ON DELETE SET NULL,
      UNIQUE (project_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS submission_artifacts (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      file_id TEXT,
      response_id TEXT,
      role TEXT NOT NULL,
      filename TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      size_bytes INTEGER,
      portal_field TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE SET NULL,
      UNIQUE (submission_id, role, filename, sha256)
    );

    CREATE TABLE IF NOT EXISTS submission_events (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_submission_events_submission
      ON submission_events(submission_id, created_at);
  `);

  // Additive columns keep old reports, admin tools, and exports working unchanged.
  addColumn(db, "fragments", "analysis_run_id TEXT");
  addColumn(db, "fragments", "ordinal INTEGER");
  addColumn(db, "fragments", "locator_type TEXT");
  addColumn(db, "fragments", "locator_json TEXT NOT NULL DEFAULT '{}'");
  addColumn(db, "fragments", "content_hash TEXT");
  addColumn(db, "fragments", "extraction_confidence REAL");

  addColumn(db, "requirements", "analysis_run_id TEXT");
  addColumn(db, "requirements", "requirement_key TEXT");
  addColumn(db, "requirements", "applicability TEXT");
  addColumn(db, "requirements", "condition_text TEXT");
  addColumn(db, "requirements", "required_evidence_json TEXT NOT NULL DEFAULT '[]'");
  addColumn(db, "requirements", "interpretation_json TEXT NOT NULL DEFAULT '{}'");
  addColumn(db, "requirements", "consequence_if_wrong TEXT");

  addColumn(db, "questions", "analysis_run_id TEXT");
  addColumn(db, "questions", "requirement_id TEXT");
  addColumn(db, "questions", "parent_question_id TEXT");
  addColumn(db, "questions", "character_limit INTEGER");
  addColumn(db, "questions", "response_format TEXT");
  addColumn(db, "questions", "status TEXT NOT NULL DEFAULT 'open'");
  addColumn(db, "questions", "confidence REAL NOT NULL DEFAULT 0");

  addColumn(db, "deadlines", "analysis_run_id TEXT");
  addColumn(db, "deadlines", "timezone TEXT");
  addColumn(db, "deadlines", "original_text TEXT");
  addColumn(db, "deadlines", "confidence REAL NOT NULL DEFAULT 0");
  addColumn(db, "deadlines", "is_critical INTEGER NOT NULL DEFAULT 0");

  addColumn(db, "attachments", "analysis_run_id TEXT");
  addColumn(db, "attachments", "requirement_id TEXT");
  addColumn(db, "attachments", "matched_file_id TEXT");
  addColumn(db, "attachments", "signature_required INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "attachments", "completion_checks_json TEXT NOT NULL DEFAULT '{}'");
  addColumn(db, "attachments", "confidence REAL NOT NULL DEFAULT 0");
  addColumn(db, "attachments", "updated_at TEXT");

  addColumn(db, "gaps", "analysis_run_id TEXT");
  addColumn(db, "gaps", "status TEXT NOT NULL DEFAULT 'open'");
  addColumn(db, "gaps", "gap_type TEXT NOT NULL DEFAULT 'evidence'");
  addColumn(db, "gaps", "consequence TEXT");
  addColumn(db, "gaps", "recommended_action TEXT");
  addColumn(db, "gaps", "confidence REAL NOT NULL DEFAULT 0");
  addColumn(db, "gaps", "idempotency_key TEXT");
  addColumn(db, "gaps", "resolved_at TEXT");
  addColumn(db, "gaps", "updated_at TEXT");

  addColumn(db, "clarifications", "analysis_run_id TEXT");
  addColumn(db, "clarifications", "requirement_id TEXT");
  addColumn(db, "clarifications", "status TEXT NOT NULL DEFAULT 'draft'");
  addColumn(db, "clarifications", "risk_level TEXT NOT NULL DEFAULT 'medium'");
  addColumn(db, "clarifications", "send_channel TEXT");
  addColumn(db, "clarifications", "recipient TEXT");
  addColumn(db, "clarifications", "sent_at TEXT");
  addColumn(db, "clarifications", "buyer_response TEXT");
  addColumn(db, "clarifications", "responded_at TEXT");
  addColumn(db, "clarifications", "idempotency_key TEXT");
  addColumn(db, "clarifications", "updated_at TEXT");

  addColumn(db, "audit_events", "analysis_run_id TEXT");
  addColumn(db, "audit_events", "correlation_id TEXT");
  addColumn(db, "audit_events", "severity TEXT NOT NULL DEFAULT 'info'");
  addColumn(db, "audit_events", "previous_hash TEXT");
  addColumn(db, "audit_events", "event_hash TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fragments_run ON fragments(analysis_run_id, ordinal);
    CREATE INDEX IF NOT EXISTS idx_requirements_run ON requirements(analysis_run_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_run_key
      ON requirements(analysis_run_id, requirement_key) WHERE requirement_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_questions_run ON questions(analysis_run_id);
    CREATE INDEX IF NOT EXISTS idx_deadlines_run ON deadlines(analysis_run_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_run ON attachments(analysis_run_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_gaps_idempotency
      ON gaps(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_gaps_status ON gaps(project_id, status, priority);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clarifications_idempotency
      ON clarifications(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_clarifications_status ON clarifications(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_events(project_id, correlation_id);

    INSERT OR IGNORE INTO schema_migrations(version, name)
    VALUES (2, 'autonomous_bidding_data_model');
  `);
}
