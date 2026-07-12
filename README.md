# BidReady 24

Web application that turns a UK public-sector tender pack into a **source-cited compliance preflight**.

**Core promise**: Upload a tender pack. Receive an autonomous, traceable compliance plan. Every requirement links back to its source. Missing evidence and uncertainty are explicit. Unsupported customer claims are never presented as verified facts.

- Primary customers: UK commercial-cleaning SMEs (5–100 employees).
- Offers: £149 Tender Preflight | £349 Complete Pack.
- Future: recurring only after validation + owner approval.

**Status**: Autonomous release with receiver-controlled operating policies and delegated mandates.

## Authority model

The autonomous release uses receiver-controlled policies and explicit delegated mandates. External clarification, commitment, signature and submission actions are blocked unless the receiver has acknowledged responsibility and granted the specific authority. Successful dispatch or submission is never recorded without an adapter receipt.

## Quick Start (Local Dev)

```bash
# 1. Install deps (Node 20+ recommended)
npm install

# 2. Copy env and edit
cp .env.example .env.local
# Set a strong ADMIN_PASSWORD and Stripe test keys for local integration testing

# 3. Create data dirs
mkdir -p data/uploads

# 4. Run migrations (creates sqlite schema)
npm run db:migrate

# 5. (Optional) seed sample data
npm run db:seed

# 6. Start
npm run dev
```

Visit http://localhost:3000

Admin: /admin (use the ADMIN_PASSWORD)

## Key Features
- Public site with pricing, sample report (synthetic), cleaning-specific landing.
- Stripe hosted Checkout with signature-verified, idempotent webhook fulfilment; explicit local simulation is available only when enabled.
- Magic-link project access (links expire/revocable).
- Structured company intake + consent.
- Secure file uploads (PDF, DOCX, XLSX, CSV, TXT; basic validation + hash).
- Idempotent autonomous pipeline: ingest → extract → analyse → match evidence → draft → validate → prepare/submit.
- Real PDF, DOCX, XLS/XLSX, CSV, Markdown and text extraction with immutable file hashes.
- Structured requirements, questions, deadlines, attachments, gaps, clarification drafts, response structures and QA decisions.
- Customer evidence facts and expanded compliance outcomes with source citations.
- Receiver autonomy control centre for assisted, autonomous and unattended operation.
- Delegated mandate checks for clarifications, commitments, signing and submission.
- Autonomous go/no-go decisions, contract issue spotting, amendment comparison, evidence-grounded response scaffolds and submission manifests.
- Machine-produced receiver assurance report and CSV exports.
- Audit events for autonomous runs, decisions and external actions; the expanded autonomy store includes hash-chain support, but not every legacy write path is claimed to be chained.
- Manual deletion-request handling while the complete automated lifecycle control is built and tested.

## Architecture & Data
- Next.js App Router, server actions where possible.
- better-sqlite3 (MVP) — see `docs/IMPLEMENTATION_PLAN.md` for Postgres path.
- Explicit, retry-safe pipeline stages in `lib/autonomous-pipeline.ts` and `lib/validation/pipeline-control.ts`.
- Versioned schemas (zod + TS).
- Application-attached persistent storage. See the live security and data-handling pages for current limitations.

See:
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ASSUMPTIONS.md`
- `docs/RISK_REGISTER.md`
- `docs/adr/` (future)
- `docs/runbook.md` (ops)

## Testing & Quality
- Golden fixtures in `fixtures/`.
- Adversarial intake, upload, conditional-questionnaire, retry-loop, data-integrity and full-pipeline tests.
- `npm test`, `npm run lint` and `npm run build` must pass.
- End-to-end: create project → intake → upload → autonomous analysis → cited report → immutable submission package.

## External action adapters

BidReady 24 prepares all buyer-facing actions autonomously. Sending clarifications and submitting to procurement portals require customer-authorised adapters configured through `OUTBOUND_ACTION_WEBHOOK_URL` and `SUBMISSION_WEBHOOK_URL`. If an adapter is unavailable, the system records a queued clarification or immutable prepared submission; it never claims an external action succeeded without a receipt.

## Production Notes
- Secrets only via hosting platform secret manager.
- Render Blueprint deployment with persistent disk and health checks.
- Hosted Checkout and external adapters fail closed when production credentials are absent.
- No fixed automatic file-deletion promise is made until physical source removal, extracted-copy handling, retries and audit receipts are implemented end to end.

## Contributing / Ops
This is a production product repo. Changes should be scoped, tested, auditable and consistent with the receiver authority model.

## License
Private for now.

---

Built following the master spec for a trustworthy, auditable, no-invention tender preflight service.
