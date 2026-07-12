# BIDREADY24 — Risk Register & Mitigations (original MVP baseline)

> This is the original concierge baseline. Current autonomous controls, receiver authority boundaries and release gates are documented in `AUTONOMOUS_RELEASE.md`.

**Date:** 2026-07-12

## High
- **Legal / liability exposure**: Service touches procurement, contracts, eligibility. Incorrect extraction or advice-like language could create claims.
  - Mitigation: Strict zero-invention + source citations. "Not legal/procurement advice" disclaimers everywhere. Legal pages drafts only. Owner + solicitor review before publish. No guarantees.
- **Data breach / privacy incident**: Customer tenders + company evidence (insurance, policies, financials) are sensitive.
  - Mitigation: Encryption in transit/rest (platform). Private storage. Retention policy. Minimal data. Audit logs. Access by magic token only. No PII in logs. Incident plan in runbook.
- **Payment / money handling**: Real money for service.
  - Mitigation: Never touch cards (Stripe hosted). Verified webhooks only. Idempotent. Test mode until approved. Clear refund policy.
- **Unsupported claims / hallucination**: Core promise is "nothing invented".
  - Mitigation: All customer-status start "uncertain/missing". Admin review gate before delivery. Golden fixtures + human verification pass. Deterministic checks.

## Medium
- **Poor extraction quality on real tenders** (complex schedules, tables, appendices, scanned PDFs).
  - Mitigation: Phase 1 is concierge (human fixes everything). Phase 2 adds better parsing + verification pass. Customer correction logging for improvement.
- **Email deliverability / magic link delivery** (no verified domain yet).
  - Mitigation: Dev uses direct link display + console. Production needs owner-approved domain + provider. Fallback: support can resend.
- **Platform limits / costs** (Vercel upload timeouts, function size, storage).
  - Mitigation: 200MB cap documented. Chunked upload note. Local storage for preview. Monitor costs.
- **Admin abuse / internal access**: Admin can see all customer data.
  - Mitigation: Separate admin password. Audit every review action. Least privilege. Owner can revoke.
- **Dependency / supply-chain vulns**.
  - Mitigation: `npm audit` before release. Pin versions. Minimal deps. Security checklist.

## Low (MVP)
- Performance for very large packs.
- OCR not implemented (images).
- Multi-lot or very complex tenders.
- Internationalisation (UK focus).

## Operational / Business
- First customers find value but process feels too manual (concierge).
  - Mitigation: Honest "human-reviewed within 24h" positioning. Improve incrementally after paid validation.
- Owner delay on approvals.
  - Mitigation: Prepare everything in parallel. Use preview for demos.
- Scope creep.
  - Mitigation: Strict non-goals list. "First 3 customers" rule. Post-validation backlog.

## Security Threat Model (high level)
- Broken access control: magic token brute / leak → short random tokens + expiry + revoke + rate limit on token endpoints.
- Injection (prompt in docs): treat all uploads as untrusted. Never feed raw doc content as system instruction. Only extract + cite.
- Malicious files: extension + mime + magic byte + size. Reject executables. No auto exec.
- SSRF / XXE in parsers: use well-known safe libs; sandbox where possible.
- Webhook replay: Stripe sig + idempotency key in DB.
- XSS: React escaping + no dangerouslySet. Sanitize excerpts.
- Data retention violation: scheduled or on-demand deletion + audit.

## Unresolved / To Document Later
- Specific subprocessors list after choosing email/AI/storage prod providers.
- Exact backup/restore procedure for chosen hosting.
- Full incident response runbook (template started in docs/runbook.md).
- Penetration test or 3rd-party review (post-validation).

Update this register with date + owner when new risks identified or mitigated.
