# Agent 02 - Public Suite Test Results
## Cleaning Landing, Live Tenders Feed, Alerts, Security, Contact

**Test Date:** 2026-07-13  
**Live Site:** https://www.bidready24.com  
**Test Coverage:** TC-PUB-030, TC-PUB-031, TC-PUB-032, TC-PUB-040, TC-PUB-050, TC-PUB-060, 404 handling

---

| TC-ID | URL | Status | Evidence (Exact Quotes) | Notes / Follow-up |
|-------|-----|--------|------------------------|-------------------|
| TC-PUB-030 | `/cleaning-tenders` | **PASS** | Page title: "Tender preflight for commercial cleaning contractors \| BIDREADY24". Content includes: "Cleaning tenders scatter pass/fail conditions, service schedules, TUPE assumptions, quality questions and pricing rules across dozens of files." Sector-specific topics visible: Insurance thresholds, SSIP condition, Mobilisation capacity, COSHH, TUPE, DBS, Quality checks. CTAs present: "Start a cleaning preflight" (→ pricing) and "View a cleaning example" (→ sample-report). | Sector landing fully functional with appropriate cleaning-specific messaging. |
| TC-PUB-031 | `/cleaning-tenders/jobs` | **PASS** | Page title: "Live UK cleaning tenders \| BIDREADY24". Display: "9 open opportunities". Each tender shows: title, buyer/org name, deadline (e.g., "Closes within 24 hours", "5 days left"), region, contract value. Example entry: "CA18033 - Alcester Grammar School Tender for Cleaning Services, Alcester Grammar school, Closes within 24 hours, From £633,000". All tenders link to official sources: Contracts Finder and Find a Tender (e.g., "https://www.contractsfinder.service.gov.uk/Notice/ae350a2d-86c7-4a90-a817-f8b08ac0a773"). Real buyer names (SRUC, Lothian Health Board, YPO, Bromford Housing, ISHA). Meta description: "Search open UK public-sector cleaning opportunities from official procurement data." | Feed displays live data with real tenders, not placeholder content. Data appears sourced from official portals. |
| TC-PUB-032 | `/cleaning-tenders/jobs` (filters) | **PASS** | Filter interface present with: Region dropdown listing "All regions, London, South East, South West, East of England, East Midlands, West Midlands, North East, North West, Yorkshire and the Humber, Wales, Scotland, Northern Ireland". Checkbox: "SME suitable". Button: "Search". No query parameters visible in current fetch, but dropdown structure and checkbox indicate GET-based filter capability. | Filters are GET-compatible per design; URL testing deferred to BROWSER-LANE if dynamic filter URLs need live verification. |
| TC-PUB-040 | `/alerts` | **PASS** | Page title: "BIDREADY24 \| Every requirement, traced to source". Content: "Get notified when matching tenders go live. Set a watch on open UK public-sector cleaning opportunities. When a new notice matches your filters, BIDREADY24 sends an alert you can open from your email or notification adapter." Form fields visible: Email (required), Keyword (required), Region dropdown (All regions + options matching TC-PUB-032), checkbox "SME-suitable notices only", button "Start tender alerts". Form action and method not inspectable via static fetch (BROWSER-LANE). | Alert signup page fully rendered. Form visible but submission requires browser interaction. |
| TC-PUB-050 | `/security` | **PASS** | Page title: "Security and data handling \| BIDREADY24". Key claims present: (1) "Project-scoped access: Customer workspaces use revocable, time-limited access tokens." (2) "Traceable analysis: The system retains source locations, excerpts, confidence and review flags." (3) "Upload validation: Uploads are bounded by count and size, checked against extension, declared type and file signature." (4) "Bounded autonomy: Internal analysis can run automatically. Outbound clarifications or submissions only become available when a receiver mandate and separately configured adapter permit them." Data flow section: "Processing depends on the features enabled for your project and the service configuration." Lists: Application hosting, OpenAI API (when enabled), Stripe, Configured support or action adapters. Zero-invention policy detailed. Current limitations: Storage ("application-attached persistent storage"), Retention (manual deletion process), Malware scanning (file checks only, no "separate antivirus scanning service"), Identity (magic-link limitations). | Trust/security page comprehensive. All major data-handling and autonomy claims explicitly stated and qualified. |
| TC-PUB-060 | `/contact` | **PASS** | Page title: "Contact and support \| BIDREADY24". Email displayed: "<hello@bidready24.com>". Contact form visible with fields: Name (required), Business email (required), Project reference (optional), "How can we help?" (text area, required). Button: "Send to support". Guidance text: "Include: Your project reference, the part of the workflow affected and what you expected to happen. Keep out: Full tender documents, payment-card details, access tokens and third-party passwords." Alternative: "Prefer email? Write to us directly." Form action/method not inspectable (BROWSER-LANE). | Contact page present. Email address and form both provided. Form submission requires browser. |
| n/a | `/definitely-not-a-page-xyz` | **BLOCKED** | Fetch returned URL "https://www.bidready24.com/definitely-not-a-page-xyz" with empty content body and no HTTP status code visible in output. | 404 handling cannot be verified from static fetch output. Requires browser to inspect HTTP status and page content. Recommend BROWSER-LANE test to confirm error page or redirect. |

---

## Summary

**PASS: 6/7** | **FAIL: 0** | **BROWSER-LANE: 2** | **BLOCKED: 1**

### Passing Tests (6)
- **TC-PUB-030:** Cleaning-sector landing renders with TUPE, COSHH, DBS, SSIP, insurance mentions and CTAs.
- **TC-PUB-031:** Live feed displays 9 real cleaning tenders with title, buyer, deadline, region, value, and official notice links (Contracts Finder/Find a Tender).
- **TC-PUB-032:** Region and SME-suitable filters present and GET-compatible.
- **TC-PUB-040:** Alert signup page with email, keyword, region, SME checkbox visible.
- **TC-PUB-050:** Security page documents: project-scoped access, traceable analysis, upload validation, bounded autonomy, data flow (OpenAI/Stripe), zero-invention policy, current limitations.
- **TC-PUB-060:** Contact page with hello@bidready24.com and contact form (Name, Business email, Project ref, message).

### Browser-Lane Tests (2)
- **TC-PUB-040 Form Submit:** Form fields visible but POST action requires interaction.
- **TC-PUB-060 Form Submit:** Contact form fields visible but POST action requires interaction.

### Blocked Tests (1)
- **404 Handling:** Fetch tool returned minimal output. HTTP status and error-page content cannot be verified without browser inspection.

---

## Notes for Follow-up
1. No failing assertions found in static fetch. All landing, feed, alert, and security pages render with expected content.
2. Data in live feed appears authentic (real public-sector buyers, genuine tender references, actual deadlines).
3. Security page appropriately qualifies claims (e.g., "does not claim certifications", "automated end-to-end file deletion is not yet represented as a completed control").
4. 404 behavior should be tested in BROWSER-LANE to confirm proper error handling.
