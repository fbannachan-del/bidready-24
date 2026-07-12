# Operations Runbook (MVP)

## Starting locally
```bash
cp .env.example .env.local
# edit ADMIN_PASSWORD and test keys
mkdir -p data/uploads
npm run db:migrate
npm run dev
```

## Common tasks
- Create test project: visit /pricing → checkout (simulate) → use returned magic link.
- Review: /admin (set ADMIN_PASSWORD).
- Re-run stub extraction from admin review page.
- Delete project data: manual DB + rm files (future: customer self-serve).

## Failure modes
- Upload fails validation → clear error shown.
- Project in failed state → admin can rerun stages.
- Expired magic link → user must contact support.

## Backup / restore (preview)
- SQLite file: copy data/bidready.db
- Uploads: copy data/uploads

## Incident
- Revoke a token: UPDATE projects SET token_revoked=1 WHERE ...
- Delete customer data: remove from DB + rm -r uploads/<id>
- Log the action in audit.

## Production checklist (before any prod use)
See launch checklist.

**DO NOT** connect production Stripe/email or deploy to customer-facing URL without explicit owner approval.
