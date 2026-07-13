# Agent 01 Functional Test Results: Homepage, Pricing, Sample Report

**Test Suite:** Suite 1 (Public-facing pages)  
**Date:** 2026-07-13  
**Agent:** Agent 01  
**URL Base:** https://www.bidready24.com

## Summary
- **Total Tests:** 7
- **PASS:** 7
- **FAIL:** 0
- **BROWSER-LANE:** 0
- **BLOCKED:** 0

---

## Test Results

| TC-ID | Status | Evidence (Exact Quotes) | Notes/Follow-up |
|-------|--------|------------------------|-----------------|
| TC-PUB-001 | PASS | Homepage loads. Headline: "Every requirement, traced to source." CTAs: "Start a preflight" (→ /pricing) and "Explore a sample report" (→ /sample-report). Nav links present: "How it works", "What you get", "For cleaning", "Live tenders", "Alerts", "Security", "Pricing", "Account", "Project link", "Sample report", "Contact". | All required nav links and CTAs verified; both CTAs point to correct destinations. |
| TC-PUB-002 | PASS | Zero-invention promise: "Nothing is invented. A fluent answer is not the same as a supported answer." Footer disclaimer: "Outputs require receiver verification. BIDREADY24 does not provide legal, procurement or financial advice, and does not guarantee eligibility, compliance, submission acceptance, scoring or contract award." | Both promise and disclaimer explicitly present. |
| TC-PUB-010 | PASS | Pricing page loads. Tier 1: "Tender Preflight" at "£149" with CTA "Choose Tender Preflight" (→ /checkout?type=preflight). Tier 2: "Complete Pack" at "£349" with CTA "Choose Complete Pack" (→ /checkout?type=complete). Both tiers show detailed deliverables. | Exact prices and tier names match; both CTAs present and functional. |
| TC-PUB-011 | PASS | Preflight tier includes: "Source-cited requirement register, Scored questions, limits and weightings, Deadlines, attachments and signature checks, Prioritised evidence-gap action plan, Buyer clarification question register, Response plan and suggested internal timetable, Web workspace, CSV and print-to-PDF output." Matches homepage promises of compliance register, evidence gaps, action plan, clarification questions, and exports. | Pricing deliverables directly correspond to homepage value statements. |
| TC-PUB-020 | PASS | Sample report renders with requirements, citations, and statuses. Citation examples (3+): (1) "Public liability insurance · £10m minimum" with "Specification §3.1 · p.7"; (2) "CHAS or accepted SSIP equivalent" with "Selection form · Q12 · p.4"; (3) "Enhanced DBS for education-site operatives" with "Safeguarding schedule §5 · p.19"; (4) "Service delivery and quality assurance" with "Quality schedule · Q2 · p.11". Statuses shown: "Uncertain", "Missing", "Evidence found". Readiness metric: "68/100". Evidence gap: "SSIP evidence not supplied". | Citation format consistent (document/section · location pattern). All source references visible. |
| TC-PUB-021 | PASS | All claims on sample report trace to visible sources. Sample report includes disclaimer: "About this sample: every organisation, document, requirement and evidence item shown here is synthetic." No confident claims lack source references; uncertain and missing evidence explicitly flagged. | Synthetic disclaimer present; no invented claims observed. Evidence state clearly marked. |
| TC-APEX | PASS | Apex domain fetch: https://bidready24.com → redirects to https://www.bidready24.com (canonical form confirmed in fetch result). | Redirect working correctly; www canonicalisation verified. |

---

## Observations

- All CTAs are correctly wired and point to expected routes.
- Citation format is consistent across sample report: `Source Document · §Section · p.Page` or `Source · Reference · Page`.
- Pricing page matches homepage messaging on deliverables and value.
- Disclaimer and trust messaging ("Nothing is invented") are prominent on both homepage and pricing.
- Sample report properly flags data as synthetic and marks evidence state (Uncertain/Missing/Evidence found).
- Apex domain correctly redirects to www prefix.

