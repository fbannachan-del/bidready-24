# Deployment Guide (Preview + Production)

**IMPORTANT**: Production deployment and connecting live credentials is an explicit owner approval gate.

## Preview (Recommended for validation)
1. Push to GitHub (done).
2. Connect the repo to a Vercel project (or Fly.io).
3. Set environment variables from `.env.example` (use test Stripe keys).
4. `npm run db:migrate` is run at build or via a script on first request (current code runs on import).
5. Deploy preview URL.
6. Test full flow: checkout → project → intake → upload → admin review → report.

Vercel is simplest for Next.js (automatic).

## Production (owner approval required first)
- Create separate production Vercel project or Fly app.
- Use managed Postgres (Neon, Fly Postgres, Supabase, etc.) — update `lib/db.ts` or introduce Prisma.
- Object storage: Cloudflare R2 or AWS S3 + signed URLs.
- Transactional email with verified domain (Resend recommended).
- Live Stripe account + webhook endpoint protected.
- Set proper secrets in platform dashboard only.
- Run full security checklist.
- Run `npm run build`, tests, manual golden verification.
- Deploy.
- Only after owner explicitly approves publishing the site and using the domain.

## Environment
All secrets via platform secret manager. Never commit.

## Data migration note
Current: better-sqlite3. For prod:
- Export data or re-ingest.
- Or implement dual DB layer early.

## Monitoring (MVP)
- Vercel logs + function duration.
- Manual review of admin queue and error states.
- Add cost tracking when real AI is enabled.

See also `docs/runbook.md`.
