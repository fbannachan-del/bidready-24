# BidReady 24 — Implementation Plan (MVP Concierge)

**Date:** 2026-07-12  
**Status:** Phase 1 in progress — sellable concierge MVP  
**Repo:** https://github.com/fbannachan-del/bidready-24

## Goals (from spec)
- Build a trustworthy paid service for UK commercial-cleaning SMEs.
- Core: Upload tender pack → source-cited compliance preflight.
- Zero invention. Trace everything to source.
- Primary: £149 Tender Preflight (manual review concierge for first customers).
- Secondary: £349 Complete Pack.
- No recurring billing yet.
- Cap pre-validation infra < £150.

## Stack Decisions (boring & supportable)
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4. Server-rendered public pages + server actions/route handlers.
- **DB**: better-sqlite3 (local dev / preview). Schema via numbered .sql migrations executed on startup. Path documented for Postgres switch (Prisma or raw later).
- **Storage**: Local filesystem (`data/uploads/`) with hashes + metadata. Abstracted `StorageAdapter`. Future: S3-compatible (R2/AWS) via signed URLs.
- **Payments**: Stripe hosted Checkout + webhooks (idempotent). Test mode first.
- **Email / Magic links**: Stub (console + in-UI link for dev). Future: Resend or Postmark with verified domain. Tokens: random 32-byte, DB-stored, expiry 7 days, revocable.
- **Document processing**: pdf-parse (PDF), mammoth (DOCX), xlsx (XLSX), pdfkit (PDF gen), docx (DOCX gen).
- **Validation**: zod for all structured inputs/outputs.
- **AI**: Provider-agnostic adapter (`lib/ai/adapter.ts`). MVP = deterministic + mock extractor that produces review-required items only. No real LLM calls until owner provides keys + approves.
- **Jobs / Pipeline**: Explicit stage functions updating DB status. No hidden monolith call. Polling UI for status. In-process for MVP (suitable for <200MB small tenders).
- **Admin**: Simple password-protected area (`ADMIN_PASSWORD` env). Review queue + edit forms. Manual approve + deliver.
- **Auth**: Magic-link project access only (no passwords for customers). Admin separate.
- **Hosting preview/prod**: Vercel (easy git deploy for Next) + docs for Fly.io alternative. Separate envs via Vercel preview + prod projects.
- **Observability (MVP)**: Console + DB logs for costs (stub), status, errors. Add real later.
- **Testing**: Jest (or vitest) + Playwright later. Golden fixtures first.

## Delivery Sequence (per spec)
1. **Phase 0 done**: Inspected workspace (no prior BidReady code; existing Restore Bot is Next.js pattern to follow). Created fresh GitHub repo. Chose stack. Wrote this plan + assumptions + gates + risks.
2. **Phase 1 (current)**: Sellable concierge MVP.
   - Public site + sample + pricing + legal drafts + contact.
   - Stripe checkout → verified payment → project + magic link.
   - Intake form + consent.
   - Uploads (validation + storage + hash).
   - Basic staged "pipeline" (ingest → extract text with locations → stub classify/requirements).
   - Admin queue + review/edit/approve.
   - Customer report view + basic exports (web + CSV + HTML-as-PDF fallback).
   - Manual delivery works end-to-end so first paid orders can be fulfilled by hand.
3. **Phase 2**: Reliable analysis (real extraction with page refs, confidence, verification, full exports, golden tests).
4. **Phase 3**: Preview deploy, tests, owner approvals, prod deploy + outreach prep.

## Key Routes (initial)
Public: / , /cleaning-tenders , /pricing , /sample-report , /security , /legal/* , /contact
Customer: /project/[token] , /project/[token]/intake , /project/[token]/upload , /project/[token]/report
Admin: /admin (protected), /admin/projects , /admin/projects/[id]
API: /api/checkout , /api/webhooks/stripe , /api/project/... , /api/uploads , /api/exports

## Milestones & Verification
- [ ] Public pages render with correct copy, pricing, sample.
- [ ] Checkout creates project only on `payment_intent.succeeded` (or test simulate).
- [ ] Magic link works, expires, one-time use option.
- [ ] Upload validates files, stores safely, shows in project.
- [ ] Admin can see queue, edit a requirement, approve → customer sees report.
- [ ] No fabricated company claims ever shown as "met".
- [ ] Exports downloadable.
- Run `npm run build` clean before any claim of working.

## What Remains Manual (concierge)
- Full text extraction quality (basic today).
- Evidence matching (stub).
- All AI-like items start with `review_required: true`.
- Delivery only after admin explicit approve.
- No auto emails (console for now).
- No real OCR for images (listed as supported later).
- No production payment/email/domain connected.

## Next Safe Steps After This Doc
1. Scaffold DB, types, schemas.
2. Build public marketing pages (copy from spec).
3. Add payment + project creation flow (test mode).
4. Upload + basic report.
5. Admin tools.
6. Golden synthetic tender + verification pass.
7. Push commits frequently with clear messages.
8. Run tests/build at each increment.

## Budget / Infra Notes
- Local dev: free.
- Preview: Vercel hobby free tier sufficient for validation.
- Prod spend gates respected: no production accounts connected yet.
- First 3 customers treated as validation only.

Owner must approve before any real spend, brand final, legal publish, prod deploy, real outreach, or production keys.

## References
- Full spec in user prompt (master prompt sections 1-24).
- ADR will be added in `/docs/adr/`.
