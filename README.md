# BidReady 24

Secure web app that turns a UK public-sector tender pack into a **source-cited compliance preflight**.

**Core promise**: Upload a tender pack. Receive a traceable compliance plan within 24 hours. Every requirement links back to its source. Missing evidence is flagged. Nothing is invented.

- Primary customers: UK commercial-cleaning SMEs (5–100 employees).
- Offers: £149 Tender Preflight | £349 Complete Pack (MVP concierge/manual review).
- Future: recurring only after validation + owner approval.

**Status**: Sellable concierge MVP under active construction. First paid customers treated as validation. Production deployment and real outreach require explicit owner approval.

## Important: Approval Gates

See `docs/APPROVAL_GATES.md`. The agent prepares everything but **must not**:
- Publish legal pages or brand claims
- Connect production payment/email/domain accounts
- Deploy to production
- Send outreach
- Use real customer data beyond service delivery

## Quick Start (Local Dev)

```bash
# 1. Install deps (Node 20+ recommended)
npm install

# 2. Copy env and edit
cp .env.example .env.local
# Set a simple ADMIN_PASSWORD and test Stripe keys (test mode only)

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

## Key Features (MVP)
- Public site with pricing, sample report (synthetic), cleaning-specific landing.
- Stripe test checkout → project creation.
- Magic-link project access (links expire/revocable).
- Structured company intake + consent.
- Secure file uploads (PDF, DOCX, XLSX, CSV, TXT; basic validation + hash).
- Staged pipeline (visible status): ingest → extract → classify → stub requirements/gaps.
- Admin review queue: view source excerpts, edit, approve.
- Customer report with source citations + exports (web, CSV, basic PDF/DOCX).
- Zero-invention: all customer facts start uncertain/missing. Admin must confirm.
- Audit events for important actions.
- Deletion support (customer + auto).

## Architecture & Data
- Next.js App Router, server actions where possible.
- better-sqlite3 (MVP) — see `docs/IMPLEMENTATION_PLAN.md` for Postgres path.
- Explicit pipeline stages in `lib/pipeline/`.
- Versioned schemas (zod + TS).
- Local storage adapter.

See:
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ASSUMPTIONS.md`
- `docs/RISK_REGISTER.md`
- `docs/adr/` (future)
- `docs/runbook.md` (ops)

## Testing & Quality
- Golden fixtures in `fixtures/`
- Manual verification of every extracted item against source in golden tenders.
- `npm run build` must pass.
- End-to-end: pay (test) → upload → admin review → customer report.

## Non-Goals (MVP)
See spec §20. No auto submission, no win guarantees, no recurring yet, no inventing evidence.

## Production Notes
- Secrets only via hosting platform secret manager.
- Preview on Vercel (recommended for Next) or Fly.
- Production deploy + live Stripe + real email = owner approval required.
- Retention: 30 days default for original files post-delivery.

## Contributing / Ops
This is a product repo. Changes should be small, tested, and respect the commercial constraints and approval gates.

## License
Private for now.

---

Built following the master spec for a trustworthy, auditable, no-invention tender preflight service.
