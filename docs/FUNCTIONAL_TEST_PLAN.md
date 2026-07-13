# BIDREADY24 Functional Test Plan
**Comprehensive End-to-End Test Plan for Self-Serve Platform**  
**Version:** 1.0  
**Date:** 2026-07-13  
**Audience:** QA team + up to 40 testing agents (human or scripted)  
**Focus:** Functionality only (flows, data correctness, business rules, traceability)  
**Core Promise Under Test:** "Every requirement, traced to source." Nothing is invented. Citations (link backs) are accurate and verifiable. Re-runs correctly incorporate changes and preserve/refresh traceability.

---

## 1. Introduction & Objectives

BIDREADY24 is a fixed-price, self-serve UK public-sector tender preflight platform. Customers:
1. Purchase (Preflight £149 or Complete Pack £349 via Stripe).
2. Receive a private project workspace via secure token link.
3. Complete organisation intake (evidence facts).
4. Upload tender pack + supporting evidence files (PDF, DOCX, XLS/XLSX, CSV, TXT).
5. Trigger autonomous analysis ("Run tender now").
6. Review source-cited results in workspace + detailed report.
7. Iterate (update intake/evidence, re-run), export (CSV + Print/PDF), and use output in their bid process.

**Primary Test Objectives**
- Validate the full self-serve E2E customer journey from landing → payment → project → report → export.
- Prove **zero-invention policy**: All extracted requirements/questions/deadlines/attachments/gaps have explicit, receiver-verifiable sources. Unsupported claims stay marked missing/uncertain.
- **Link backs / Citations are foolproof**: Every requirement must carry accurate `document_id`, `page_or_location`, and `verbatim_excerpt`. Excerpts must be exact contiguous matches in the original uploaded source file(s).
- **Re-runs are reliable**: Adding/changing evidence or documents triggers appropriate re-analysis (new run or correct reuse), updates customer_status correctly, preserves or correctly refreshes citations, produces logical deltas, and always surfaces the *latest succeeded run*.
- All UI flows, state transitions, filters, exports, autonomy controls, and error paths behave as documented and expected.
- No regressions in core areas that are known to have had issues (link backs, re-runs, evidence state transitions, citation fidelity, export completeness).

**Out of Scope (this plan)**
- Performance / load / scale.
- Security penetration (auth, file isolation, token revocation are touched functionally only).
- Visual design / accessibility (beyond functional navigation and data presentation).
- External adapter integrations (clarifications/submission) beyond configuration and queuing.
- Browser/device matrix beyond functional compatibility notes.

---

## 2. Key Functional Areas & Data Model (for Testers)

**High-level entities**
- Project (one tender, order_type = "preflight" | "complete", secure_token)
- Intake (company facts + consent)
- Files (uploaded tender pack + evidence; hashed, validated)
- Analysis Run (idempotent via fingerprint of files + intake + order_type; status, stage, counts)
- Requirements (type, title, normalized_requirement, verbatim_excerpt, document_id, page_or_location, mandatory, evaluation_weight, response_limit, customer_status, confidence, review_required, notes, analysis_run_id)
- Related: questions, deadlines, attachments, gaps, clarifications, responses (complete), fragments, citations, evidence facts, audit events, qa checks
- Autonomy settings (profile, policy, mandate/receiver acknowledgement)

**Important statuses (customer_status examples)**
`verified_met`, `met`, `probably_met`, `partially_met`, `uncertain`, `missing`, `not_met`, `probably_not_met`, `conflicting_evidence`, `unable_to_determine`, `not_applicable`

**Critical fields for link backs**
- `page_or_location` (e.g. "Specification §3.1 · p.7", "p.12", "Sheet: Pricing Q3")
- `document_id` / file reference
- `verbatim_excerpt` (exact quote from source)

**Re-run mechanics (from code)**
- Fingerprint = hash of current non-deleted files + intake_json + order_type.
- Same fingerprint + prior succeeded run → reuses (no new work).
- Different input → new runId, replaceRunAnalysis deletes prior artifacts for that run and inserts fresh (old runs retained for audit/history).
- UI always shows latest succeeded run's data via `getRequirements`.
- "Run again" button always available after intake + files.

**Report workspace (current tabs)**
- Overview: readiness metrics, priority gaps, decision health, source coverage %.
- Compliance matrix: filterable (all/gaps/verify/mandatory/scored/attachment/deadline), accordions with system interp + original source (verbatim + location + confidence + method).
- Receiver assurance: prioritised accuracy checks, verification checklist, no-outcome-guarantee messaging.

**Exports**
- CSV (basic but must include id, type, title, source=page_or_location, status, confidence).
- Print / browser PDF (must render the visible report content faithfully).

---

## 3. Test Data Requirements (Critical for Foolproof Testing)

**Golden / Controlled Tender Packs (prepare these first)**
Create 8–12 synthetic but realistic multi-file tender packs (mix PDF + DOCX + XLSX). Each must have:
- Explicit, unique, searchable strings for every important requirement (e.g. "REQ-PL-001: The Supplier must hold Public Liability Insurance of not less than £10,000,000 (ten million pounds sterling) per occurrence. See Specification clause 4.2 and Form A page 7.").
- Clear section / page / sheet references that match the `page_or_location` you expect the system to extract.
- Mix of:
  - Mandatory pass/fail (insurance, accreditations, DBS, SSIP/CHAS).
  - Scored questions with word limits + weightings (e.g. 1,500 words, 12%).
  - Deadlines and clarification cut-offs.
  - Required attachments list.
  - Ambiguities / internal inconsistencies (to trigger clarification suggestions).
  - Tables (pricing, schedules) — text-extractable.
  - Multiple files (main ITT.pdf + Specification.docx + Pricing Schedule.xlsx + Schedules.pdf).
- "Evidence" companion files or sections (insurance cert text, policy excerpts, CHAS number) that can be uploaded to close gaps.

**Recommended packs**
1. `golden-cleaning-minimal` (based on `fixtures/golden-tender-01.md` + actual files) — baseline.
2. `golden-cleaning-full` — complete with tables, ambiguities.
3. `multi-doc-split` — requirements spread across 4+ files.
4. `large-200p` — simulate 150-250 page pack (or concatenated).
5. `ambiguous-inconsistent` — triggers clarifications.
6. `evidence-rich` — lots of matching facts in intake + uploaded certs.
7. `evidence-poor` — minimal intake + no supporting uploads.
8. `edge-formats` — heavy on XLSX tables, CSV, long text, special chars.
9–12. Variations for re-run deltas (start with poor, then add specific evidence file or update intake with exact insurance text).

**Intake data sets**
- Minimal valid.
- Full with certifications, insurance_levels that should match tender thresholds.
- Conflicting / outdated values.
- Updates between runs.

**Project types**
- Preflight and Complete for every major flow (Complete should surface response structures/drafts where evidence exists).

**How to prepare files for agents**
- Use the golden fixture as source text.
- Export to real .pdf/.docx/.xlsx using tools or Word/Excel (embed page numbers or "§X · p.Y" literally in text).
- Store master copies + per-agent copies if mutation is needed.
- Record for each pack: expected requirement count, specific verbatim strings + their locations, expected high-priority gaps.

---

## 4. Test Environment & Tooling

- Local dev (recommended for most agents): `npm run dev`, fresh DB via migrations, deterministic mode where possible (`forceDeterministic` or `ENABLE_REAL_AI=false`).
- Staging / preview with real OpenAI path for final fidelity (use small controlled packs).
- Admin synthetic E2E endpoint for quick project spin-up (see `app/admin/tests/end-to-end` and `lib/admin-e2e.ts`).
- Stripe test mode or local simulation (when enabled).
- Multiple browser profiles / incognito for parallel agents (token isolation).
- Side-by-side PDF/Word viewers for citation verification.
- Spreadsheet for test execution logging (columns: TC ID, Agent, Run #, Status, Notes, Screenshot links, Citation verification result).
- Access to DB for spot queries if needed (e.g. `SELECT * FROM requirements WHERE project_id = ? AND analysis_run_id = ?`).

**Setup per agent**
- Fresh or reset project per major scenario (or dedicated project per agent for isolation).
- Record project token + ID.
- Have original source files open.

---

## 5. Execution Model for 40 Agents

**Goal**: Achieve high coverage and deep verification of citations + re-runs quickly via parallelism.

**Partitioning suggestion (adjustable)**
- Agents 1–6: Public site, pricing, legal, contact, sample-report, security pages (smoke + functional links/forms).
- Agents 7–12: Checkout, payment simulation/real, success page, project creation, token access, account claim/login flows.
- Agents 13–18: Intake form (all fields, validation, consent, updates, re-intake after run).
- Agents 19–24: Upload (validation, limits, multiple files, mixed types, error cases, append after run).
- Agents 25–32: Core analysis + Report verification (P0) — citation fidelity on golden packs. Each gets 1–2 unique packs. Heavy cross-check work.
- Agents 33–37: Re-runs, iteration, evidence impact, deltas, state transitions, idempotency/fingerprint behavior. Use controlled before/after packs.
- Agents 38–39: Exports (CSV exact match, Print/PDF content & citation presence), autonomy control centre, alerts, mandate effects.
- Agent 40: Cross-cutting, admin flows, synthetic E2E, regression pack, edge/error scenarios, overall sign-off coordination.

**Parallelism tips**
- Each agent owns 1–3 dedicated projects (spin via checkout or admin).
- Shared golden packs (read-only masters) + per-agent working copies.
- Time-boxed execution windows + daily sync.
- Use a shared tracker (Notion/Sheets) with live status.
- For citation verification, agents can pair-review (one extracts, one confirms in source doc).

**Entry criteria for a pack/run**
- Project paid + intake complete + ≥1 valid file uploaded.
- Run completed successfully (or note failure mode).

---

## 6. Test Suites & Priorities

**P0 (Must pass for any release)**: Citation presence & accuracy, basic E2E run produces report with sourced requirements, re-run after evidence change updates statuses without breaking citations, exports contain source data, no invention on poor evidence.

**P1**: All main flows, filters, autonomy, Complete pack extras, error recovery, state machine.

**P2**: Polish, secondary pages, admin convenience, edge formatting.

**Suites** (modular, assignable):
1. Public & Marketing
2. Purchase & Onboarding (Checkout → Project)
3. Intake & Evidence Facts
4. File Upload & Validation
5. Autonomous Run & Processing
6. Report Workspace – Overview & Metrics
7. Report Workspace – Compliance Matrix + Citations (Link Backs) — **heaviest**
8. Report Workspace – Receiver Assurance
9. Re-runs & Iteration — **critical**
10. Exports (CSV + PDF/Print) Fidelity
11. Autonomy Control Centre & Mandate
12. Alerts & Notifications (functional)
13. Account / Login / Claim flows
14. Complete Pack vs Preflight differentiation
15. Error Handling, Recovery, Edge Cases
16. Admin & Synthetic E2E
17. Cross-cutting / Regression / Data Integrity
18. Full E2E Customer Journeys

---

## 7. Detailed Test Cases (Templates + Key Examples)

Use this template for logging:

**TC-ID | Priority | Suite | Title | Preconditions | Steps | Test Data | Expected Results | Verification Method (esp. for citations) | Actual | Pass/Fail | Agent | Notes/Screenshots**

### Suite 1–2: Public + Purchase (quick for early agents)
- TC-PUB-001: Homepage loads, CTAs to pricing/sample work.
- TC-PUB-010: Pricing page shows both tiers with correct deliverables and "Choose" buttons.
- TC-CHK-001 (P0): Select Preflight → checkout → (Stripe test or local sim) → project token created and accessible.
- TC-CHK-005: Complete Pack order_type recorded correctly.
- TC-CHK-020: Payment failure / webhook not firing → project stays inaccessible until confirmed.

### Suite 3: Intake
- TC-INT-001 (P0): Submit minimal valid intake → status → "awaiting_files", company facts stored.
- TC-INT-010: Update intake after first run → re-run incorporates new facts (statuses improve where expected).
- TC-INT-030: Certifications / insurance_levels fields parse as arrays; visible in evidence facts / matching.
- Negative: Missing required fields, bad consent, malformed dates → errors, no status advance.

### Suite 4: Upload
- TC-UPL-001 (P0): Upload valid multi-file pack (PDF+DOCX+XLSX) → success, files listed, hashes stored.
- TC-UPL-010: Append additional evidence file after first run.
- TC-UPL-050: Invalid type (image, zip, md) rejected with clear message.
- TC-UPL-060: Size/count limits enforced (50MB single, 20 files / 200MB).
- TC-UPL-080: Upload after processing → files available for next run.

### Suite 5–8: Run + Report + Citations (Link Backs) — Core
**TC-RPT-001 (P0)**: Happy path run on golden pack → report loads, requirements > 0, sourced % high, readiness score shown.

**TC-CIT-001 (P0 — Link Backs) — Mandatory for every golden pack**
Pre: Project with intake + full golden tender pack uploaded. Run completed.
Steps:
1. Go to project workspace → Open report.
2. Note top-level metrics (Requirements count, Met, Gaps, Verify, Source coverage %).
3. Switch to Compliance matrix tab.
4. For **every** requirement (or statistically significant sample + all P0 items):
   a. Expand details.
   b. Capture: title/normalized, customer_status, confidence, page_or_location, document_id, verbatim_excerpt, notes.
   c. **Citation verification protocol** (side-by-side):
      - Open the exact original source file referenced.
      - Search for the verbatim_excerpt string (exact match, case/punctuation preserved).
      - Confirm it appears as a contiguous substring.
      - Confirm the surrounding context reasonably matches the referenced `page_or_location` / section (e.g. "§4.2 · p.7" points to the right area).
      - If multi-file: confirm correct document.
5. Check Overview priority gaps also show usable source refs.
6. Check Assurance tab "Check citations" number matches sourced count.
7. Export CSV → open and spot-check source column contains page_or_location values.

Expected:
- 100% of inspected requirements have non-empty page_or_location + verbatim_excerpt.
- Excerpts are exact matches in source.
- No requirement presents a confident "met" or specific claim without supporting source + (where applicable) evidence.
- Source coverage % ≥ threshold defined for the pack (e.g. 95%+ for well-structured golden).

**TC-CIT-020**: Citations survive export (CSV has source data; printed PDF shows the source blockquote text).
**TC-CIT-030**: Low confidence / review_required items are flagged and surface in "Verify" filter and assurance.
**TC-CIT-040 (multi-doc)**: Requirements from different files carry correct document_id + location.
**TC-CIT-050 (tables/schedules)**: Requirements extracted from tables carry usable location (Sheet: or p.).

### Suite 9: Re-runs (Critical — make foolproof)
**TC-RERUN-001 (P0)**: Same inputs → reuse (message indicates reused, no new run created or counts identical without change).

**TC-RERUN-010 (P0 — Evidence delta)**:
Pre: Run 1 on evidence-poor golden → record specific requirements with status (e.g. insurance = "uncertain" or "missing"), their citations, readiness.
Steps:
1. Add/upload specific evidence file or update intake with exact matching values (e.g. "Public liability £10m", CHAS cert number).
2. Trigger "Run again with the latest evidence".
3. Wait for completion.
4. Re-inspect the same requirements:
   - customer_status should improve (uncertain/missing → probably_met / verified_met) where evidence now supports.
   - page_or_location + verbatim_excerpt must still be present and accurate (cross-verify again).
   - New/updated notes or matched_evidence visible.
   - Overall readiness score non-decreasing (or explainable).
5. Compare delta: use previous notes or audit if available; confirm added/removed/changed logic fired (if previous run comparison present in audit).
6. Confirm UI metrics update (gaps down, met up).
7. Re-export CSV and confirm latest data.

**TC-RERUN-020**: Add new tender amendment file → re-run detects changes, previousRun comparison audit event, new requirements or updated text appear, citations fresh.
**TC-RERUN-030**: Multiple re-runs (3+). Always latest succeeded is shown. Old runs' data remains queryable in DB but not polluting UI.
**TC-RERUN-040 (idempotency edge)**: Force re-run with identical files/intake after a failed run or partial state → recovers cleanly.
**TC-RERUN-050**: Re-run with no new evidence → statuses/citations stable (no spurious changes).

**Verification for re-runs**:
- Maintain a simple before/after table per tested requirement (title | status1 | status2 | citation same? | excerpt same?).
- Any citation that changes must still be accurate post re-run.

### Suite 10: Exports Fidelity
- TC-EXP-001 (P0): CSV contains all visible requirements with correct source (page_or_location), status, confidence. Row count matches report.
- TC-EXP-010: Print/PDF renders Overview + matrix content (at minimum the accordions expanded or key sections) including source excerpts.
- TC-EXP-020: Export after re-run reflects latest data only.

### Suite 11–12: Autonomy, Alerts, Mandate
- TC-AUT-001: Change profile / policy / accept receiver mandate → persisted, versioned, audit written.
- TC-AUT-020: Mandate required for certain external actions (clarifications marked queued vs draft).
- Functional alert creation / viewing on stage changes.

### Suite 14: Preflight vs Complete
- TC-COMP-001: Complete pack project produces response structures / drafts (where evidence supports) or placeholders.
- Verify Complete shows richer output while preserving all citation discipline.

### Suite 15–17: Errors, Admin, Cross-cutting
- Bad tokens, expired/revoked, concurrent runs, upload during processing, DB integrity after failures.
- Admin synthetic E2E creates project, runs, asserts on citations verified count, etc.
- Data isolation: two projects never leak requirements/files.
- Audit events written for key actions (create, analysis_started/completed, amendment_compared, etc.).

---

## 8. Full End-to-End Scenarios (Assign to dedicated agents or pairs)

1. **New customer happy path – Preflight** (intake → upload golden → run → review report + verify 5+ citations manually → export CSV + PDF → "use in bid").
2. **Iterative evidence closing** (poor start → run → add evidence → re-run x2 → final high readiness).
3. **Complete Pack with response drafts** (same as 1 but Complete; inspect drafts for evidence-bounded content only).
4. **Multi-file complex tender** (split docs, tables, ambiguities → clarifications generated).
5. **Amendment / re-run on live tender** (initial run → buyer adds amendment file → re-upload + re-run → delta visible).
6. **Account + multiple projects** (claim, list, switch).
7. **Error recovery** (bad upload → correct → run; failed run recovery).
8. **Admin / operator synthetic full flow**.

Each E2E must include explicit citation spot-checks (minimum 5–10 per pack) using the verification protocol.

---

## 9. Citation & Re-run Specific Checklists (Print & Use)

**Citation Audit Checklist (per requirement or sample)**
- [ ] page_or_location present and meaningful
- [ ] document_id / file reference present
- [ ] verbatim_excerpt present and non-trivial length
- [ ] Exact contiguous match in source file (copy-paste search)
- [ ] Location reference directionally correct (page/sheet/section)
- [ ] Status consistent with available evidence (no over-claim)
- [ ] Appears in CSV export source column
- [ ] Still correct after re-run

**Re-run Delta Checklist**
- [ ] Fingerprint change detected when inputs changed
- [ ] New run created (or correct reuse message)
- [ ] Previous run comparison audit (added/removed/changed) if applicable
- [ ] Affected requirement statuses updated logically
- [ ] Citations for unchanged items remain identical + accurate
- [ ] New evidence reflected in matched_evidence or notes
- [ ] Metrics (gaps, met, readiness) move in expected direction
- [ ] No duplication or loss of prior requirements in latest view
- [ ] Export reflects the new run only

---

## 10. Pass / Exit Criteria

**Minimum for sign-off on a build**
- All P0 test cases pass (including full citation verification on at least 3 distinct golden packs by multiple agents).
- At least two full re-run iteration cycles pass the delta checklist on controlled data.
- No "invention" failures (confident claims without sources or evidence).
- CSV and report data are consistent.
- All E2E scenarios complete end-to-end at least once.
- Known broken areas (link backs, re-runs) explicitly re-tested and green.

**Stretch**
- 100% of requirements across test packs have verified citations.
- Full coverage of filter states, autonomy profiles, Complete extras.
- Admin synthetic E2E green.

---

## 11. Traceability & Maintenance

- Map executed TCs back to:
  - README key features (source-cited, evidence gaps, action plan, no invention, re-runs, exports).
  - ReportWorkspace UI elements.
  - Pipeline stages (extract, persist, cite, QA citations-complete).
  - Autonomy & mandate.
- Update this plan when UI changes (new tabs, new status values, new export columns) or pipeline changes (new fields in requirements).
- Existing `test/agents/*.test.ts` provide smoke + structural coverage; this plan is the deep functional + human-verified layer.

---

## 12. Appendix: Practical Guidance

**Creating good test tenders (quick recipe)**
1. Start from `fixtures/golden-tender-01.md`.
2. In Word/Excel/PDF authoring tool, create pages with literal "p.7", "§4.2", "Specification clause 3.1".
3. Embed the exact requirement text you want extracted.
4. For evidence: create companion "Company Evidence Pack" with matching insurance text, cert numbers, policy excerpts.
5. Export to the allowed formats.
6. Keep a "source-of-truth" text file or annotated PDF with expected extractions.

**Useful DB queries for investigators (read-only)**
```sql
-- Latest requirements + citations for a project
SELECT r.*, ar.completed_at FROM requirements r
JOIN analysis_runs ar ON r.analysis_run_id = ar.id
WHERE r.project_id = 'proj_xxx' ORDER BY r.created_at;

-- Citation coverage
SELECT COUNT(*) as total, SUM(CASE WHEN page_or_location IS NOT NULL AND verbatim_excerpt IS NOT NULL THEN 1 ELSE 0 END) as sourced
FROM requirements WHERE project_id = ? AND analysis_run_id = (SELECT id FROM analysis_runs ...);

-- Run history
SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY started_at DESC;
```

**When a citation fails verification**
- Log exact mismatch (excerpt vs actual text found).
- Note the analysis provider (deterministic vs OpenAI).
- Check fragments table for the source text.
- Consider whether extraction normalizer or LLM prompt is the root (file a focused bug).

---

**This plan is designed to be foolproof for the areas that matter most: source traceability (link backs) and correct iterative behavior (re-runs).** Execute the citation verification protocol religiously. Use controlled golden data. Record everything.

For questions or to assign suites to the 40 agents, refer to the partition in Section 5 and the shared execution tracker.

---

*End of Functional Test Plan*