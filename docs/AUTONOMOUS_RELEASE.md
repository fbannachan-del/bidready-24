# BIDREADY24 Autonomous Release

## Operating model

The release runs tender work from immutable source documents, customer evidence and a receiver-controlled authority mandate. It may interpret and act autonomously, but it never upgrades an unsupported customer claim into a verified fact or hides an unresolved uncertainty.

## Included lifecycle

1. Atomic file validation, hashing, deduplication and extraction for PDF, DOCX, XLS/XLSX, CSV, Markdown and text.
2. Source-fragment storage with page, sheet or section locators.
3. Conservative deterministic analysis plus optional schema-constrained OpenAI analysis.
4. Requirement, question, deadline, attachment and clarification extraction.
5. Customer-intake fact registration and evidence-aware compliance decisions.
6. Go/no-go scoring, prioritised gaps, contract issue spotting and tender amendment comparison.
7. Complete-Pack response structures with unsupported-claim placeholders.
8. Independent deterministic QA, citation verification and receiver assurance output.
9. Policy and delegated-mandate checks for external actions.
10. Buyer clarification dispatch and submission through configured adapters, with receipts and failure records.

## Truth and authority boundaries

- A decision of `unable_to_determine`, `missing` or `customer_verification_required` is a valid autonomous outcome.
- Customer intake is stored as customer-verified evidence, not primary documentary evidence.
- External actions require receiver acknowledgement plus the relevant active mandate permission.
- No clarification is recorded as sent and no bid is recorded as submitted without a successful adapter response.
- A missing adapter results in a queued action or prepared submission package.
- Machine-produced reports remain subject to receiver verification and make no award, compliance or legal guarantee.

## Production configuration

- `OPENAI_API_KEY` enables structured provider-backed extraction; deterministic analysis remains the fallback.
- `OUTBOUND_ACTION_WEBHOOK_URL` connects an authorised buyer-communication adapter.
- `SUBMISSION_WEBHOOK_URL` connects an authorised procurement-portal adapter.
- Adapter secrets are bearer tokens held only in the deployment secret store.
- All schema migrations are additive and repeatable.

## Release gates

- TypeScript compilation
- ESLint
- Production Next.js build
- Data migration idempotency and foreign-key check
- Golden-tender end-to-end pipeline
- Intake, upload, questionnaire and retry-loop adversarial suites
- Browser UX/CX review across desktop and mobile widths
