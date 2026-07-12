# Launch Checklist (historical pre-validation)

> The autonomous production release now uses the gates in `AUTONOMOUS_RELEASE.md`. This checklist is retained as launch history.

Owner approval required at multiple points. This is the agent's preparation list.

## Before any preview with real prospects
- [x] Public pages live with correct copy, pricing, sample, disclaimers.
- [x] Legal pages clearly marked DRAFT.
- [x] Test checkout + project creation + magic link + intake + upload.
- [x] Admin can review, edit, approve, deliver.
- [x] Report visible with citations; CSV export works.
- [x] No fabricated customer facts presented as met.
- [ ] Build passes cleanly.
- [ ] Manual test of golden fixture extraction (when improved).
- [ ] Security basics reviewed (no obvious XSS, access control via tokens).

## Before owner can consider production deploy
- [ ] Owner has approved brand, domain, final name.
- [ ] Owner + solicitor have reviewed and approved all legal pages.
- [ ] Production Stripe live account created by owner.
- [ ] Transactional email domain verified by owner.
- [ ] Real object storage connected (with encryption).
- [ ] Full end-to-end with real (small) tender pack exercised in preview.
- [ ] Preview passed responsive + basic a11y + security scan.
- [ ] Incident, backup, deletion procedures tested.
- [ ] .env and secrets documented for platform.
- [ ] First 30 prospects list prepared (CSV) — not sent.
- [ ] Outreach draft prepared — not sent.

## Hard stops
- No live payment until owner creates/connects account.
- No domain purchase or DNS change without approval.
- No testimonials or performance numbers published.
- No customer data used beyond the paid service.

## Post first 3 customers
Re-evaluate automation investment vs concierge.

Update this file as items complete with dates.
