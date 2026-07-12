# BidReady 24 — Assumptions & Decisions Log

**Date:** 2026-07-12  
**Purpose:** Auditable record of important assumptions (per spec §1, §24).

## Product & Commercial
- Name "BidReady 24" used as working title. Final brand/logo/domain requires explicit owner approval (gate).
- Initial vertical: UK commercial cleaning SMEs (5-100 staff). Language/examples tailored; extensible later.
- Pricing: £149 preflight, £349 complete as stated. No changes without approval.
- No recurring, no auto-billing in MVP.
- First 3 paid customers = validation only. No scaling claims or broad marketing.
- Turnaround promise kept as "within 24 hours" with human review; machine draft target <30min but concierge for start.
- No guarantees of eligibility, score, win, or compliance.

## Technical
- SQLite (better-sqlite3) acceptable for concierge MVP and preview. Production will migrate to Postgres; migrations written to be portable.
- Local FS storage for files in dev/preview. Production will use encrypted object storage.
- Magic links (single project access) sufficient for MVP auth. No full user accounts yet.
- No real LLM structured output in initial concierge phase; stub + human review. Real adapter + keys behind owner approval + budget.
- File size limit 200MB / 20 files enforced at app level + platform (Vercel has limits).
- Malware: basic signature + type validation only. Full AV scan noted as future (ClamAV or cloud service).
- OCR: images accepted but text extraction limited; flag for manual.
- PDF generation: pdfkit for reports (page numbers simulated via sections). Real page-accurate refs improved in Phase 2.
- No puppeteer or heavy browser deps for MVP to keep infra cheap/simple.
- Rate limiting: basic in-memory for dev; use Upstash/Redis or platform in prod.
- Webhooks: Stripe signature verification implemented; idempotency via DB.

## Legal / Privacy / Security
- Legal pages are drafts only. Owner + qualified solicitor must review and approve before publishing any claims (especially GDPR, compliance, liability, refunds).
- Data retention: 30 days default for originals after delivery (configurable per project). Audit logs kept longer for business records.
- No claim of "GDPR compliant" in marketing until legal sign-off.
- Subprocessors: documented in privacy draft (Stripe, email provider, AI provider when used, hosting). Model providers: note training/retention policies explicitly when adding.
- No raw card data ever touches app.
- Cross-tenant: enforced by token + org/project scoping (MVP single org per project).
- Audit: every important mutation logged with actor (system, admin, customer via token id).

## Content & Safety
- All generated "facts" about customer company start as uncertain/missing unless directly from intake or evidence uploads.
- Tender extraction uses verbatim excerpts + locations where possible.
- Sample report uses clearly synthetic data.
- Golden fixtures: synthetic UK local authority commercial cleaning tender pack (created by us, not real buyer data).
- No testimonials, logos, win rates, or customer names published without approval.

## Deployment & Ops
- Preview: Vercel (git integration). Production: separate Vercel project or Fly + managed Postgres + object storage.
- Secrets: only via platform secret manager. Never committed.
- No production accounts (Stripe live, domain, email domain, analytics, bank) connected in this build.
- Infra cost cap respected: preview free tier; no paid services activated.

## Risks / Open (see RISK_REGISTER.md)
- Extraction quality for real tenders (tables, schedules, appendices).
- Long PDF / complex docs performance.
- Email deliverability without verified domain.
- Stripe webhook reliability in preview.
- Legal review timeline for launch.

## Reversible Decisions
- Can switch DB, storage adapter, AI provider, email provider easily if abstractions kept clean.
- Can change from concierge (manual) to automated once tests + owner ok.

## Irreversible / High Gate Items (owner approval required)
See APPROVAL_GATES.md and spec §21.

All assumptions logged here. Update when changed with date + rationale.
