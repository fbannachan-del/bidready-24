# BidReady 24 — Owner Approval Gates (historical)

> Superseded for product operations by the receiver-controlled mandate model in `AUTONOMOUS_RELEASE.md`. Legal, financial-account ownership and corporate-authority decisions still require the accountable owner.

**Per spec §21 and "HUMAN AUTHORITY REQUIRED"**. The agent prepares; owner decides and acts.

## Must Stop and Request Explicit Approval Before:

1. **Brand / Identity**
   - Finalising product name, logo, tagline, visual identity assets for public use.
   - Purchasing or connecting a production domain (bidready24.com or similar).

2. **Legal & Compliance Pages / Claims**
   - Publishing Terms of Service, Privacy Notice, Cookie policy, Refund policy, Data Processing Addendum, Acceptable Use, or any "compliance", "security", or "no-win guarantee" statements.
   - Describing the service as "GDPR compliant", "ISO", or making any regulated claims.

3. **Accounts & Credentials (production)**
   - Creating or connecting any owner-identity accounts: Stripe (live), bank/payouts, email sending domain (Resend/Postmark/etc), Google Analytics/Search Console, domain registrar, hosting production project, payment processor.
   - Entering production keys/secrets (only via platform secret manager).

4. **Spending**
   - Incurring any paid infrastructure, domain, or service charges beyond the pre-approved £150 cap (excluding Stripe fees on real transactions).

5. **Deployment**
   - Deploying the app to a production domain or "live" environment where real customers can pay with real money.
   - Switching from test Stripe keys / test mode to live.

6. **Communications & Marketing**
   - Sending any external outreach, cold emails, LinkedIn, calls, or customer communications to prospects.
   - Publishing testimonials, case studies, named customers, performance stats, "X customers served", or win-rate claims.
   - Activating analytics that track real users beyond basic self-hosted/privacy-first.

7. **Operations & Money**
   - Issuing refunds outside the documented refund policy (after owner-approved policy published).
   - Treating any customer tender response as "approved" or "ready to submit".
   - Auto-submitting or integrating with any procurement portal.

8. **Data Use**
   - Using any customer-uploaded documents or data for training, marketing, product improvement, or anything other than delivering that specific customer's paid service.
   - Sharing customer data with subprocessors beyond what's in the approved privacy notice.

9. **Tender / Submission**
   - Any action that could be interpreted as submitting a bid or response on behalf of a customer.

## How Approvals Work (agent process)
- Agent prepares the artifact (page copy, email draft, Stripe account setup guide, etc.).
- Agent stops, documents what is ready, and asks owner explicitly.
- Owner reviews, edits if needed, approves in writing (or performs the action themselves, e.g. creating Stripe account).
- Only then does agent proceed (e.g. publish the page, run a deploy script with approved secrets, or send the message).

## Current Status (as of this build)
- All legal pages = clearly marked DRAFTS.
- All payments = Stripe test mode only. Checkout button creates test projects.
- No production domain, no live keys, no emails sent.
- No outreach list used.
- Public site can be previewed safely.
- Magic links and admin are dev-only (password via env).

**Owner sign-off required before moving any of the above to production or real use.**

This list is non-exhaustive. When in doubt, stop and ask.
