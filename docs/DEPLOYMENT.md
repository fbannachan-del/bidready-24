# Deployment Guide (historical checklist)

> BidReady 24 is now live. Current release configuration is defined by `render.yaml`, `.env.example`, and `AUTONOMOUS_RELEASE.md`.

**IMPORTANT**: Production deployment and connecting live credentials is an explicit owner approval gate.

## Preview (Recommended for validation)
1. Push to GitHub (done).
2. Connect the repo to a Render service (or Vercel/Fly).
3. Set environment variables from `.env.example` (use test Stripe keys).
4. `npm run db:migrate` runs via the startCommand on deploy (see render.yaml).
5. Deploy preview URL (your-service.onrender.com).
6. Test full flow: checkout → project → intake → upload → admin review → report.

Use the included `render.yaml` for easy Blueprint deploy on Render.

## Production (owner approval required first)
- Use the `render.yaml` in the repo root (Render Blueprint).
- Attach a persistent Disk at `/data` for SQLite DB + file uploads (see render.yaml).
- (Recommended later) Switch to managed Postgres + external object storage.
- Set ALL secrets (ADMIN_PASSWORD, Stripe keys, etc.) ONLY via the Render Dashboard Environment variables (never commit).
- For custom domain: After the service is live on Render, go to the service → Custom Domains and add bidready24.com (update DNS as instructed by Render).
- Update APP_URL in env to https://bidready24.com once DNS is live.
- Transactional email, live Stripe, and full legal pages require separate owner sign-off.
- Run full security checklist before real customers.
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
