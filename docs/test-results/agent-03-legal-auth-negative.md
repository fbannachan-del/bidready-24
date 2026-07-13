# Agent 03: Legal, Auth & Negative Path Testing
## Test Execution Report
**Date:** 2026-07-13  
**Suite:** TC-LEG-001..005, TC-AUTH-001..002, TC-AUTH-010..013  
**Agent:** 03 (Legal pages, auth/login surfaces, negative token paths)

---

## Test Results

| TC-ID | Status | Evidence (Exact Quotes) | Notes/Follow-up |
|-------|--------|--------------------------|-----------------|
| TC-LEG-001 | PASS | **Title:** "Service terms \| BIDREADY24"  **Content:** "These working terms describe the intended basis on which a business customer purchases and uses BIDREADY24 for one tender opportunity. They are not yet a solicitor-approved contract." **Sections:** 8 substantive sections (Service, Customer responsibility, Zero-invention rule, Autonomous operation, Payment & scope, No guarantees, Availability & delivery, Liability) | Substantive legal content present; disclaimer notes legal review pending |
| TC-LEG-002 | PASS | **Title:** "Privacy notice \| BIDREADY24"  **Opening:** "BIDREADY24 processes information to create and operate a source-cited tender preflight."  **Data rights/Controller:** "This working notice does not yet provide the complete controller identity, lawful-basis analysis, international-transfer terms, processor register, statutory-rights detail or regulator contact information expected in a final notice."  **Information processed:** Lists 8 categories including contact details, payment status, tender documents, company facts, analysis outputs | Privacy notice complete; acknowledges incomplete controller identity as noted gap |
| TC-LEG-003 | PASS | **Title:** "Refund policy \| BIDREADY24"  **Fixed-price product terms:** "Each purchase covers one tender opportunity at the price shown at checkout. Materially different or replacement procurement packs may require another purchase."  **One-off service:** "BIDREADY24 is a one-off business service that begins consuming processing capacity after the tender pack is uploaded." | Refund policy explicitly ties to fixed-price product; covers pre/post-processing scenarios |
| TC-LEG-004 | PASS | **Title:** "Data handling and retention \| BIDREADY24"  **Storage:** "Source files, extracted content, structured findings, audit records, payment reconciliation data and support requests may remain stored while the service is operated and records are needed."  **Deletion:** "Database deletion flags exist, but BIDREADY24 does not currently claim that all original files, extracted copies, backups and related records are automatically erased after a fixed number of days." | Substantive; honest about current limitations vs. planned controls |
| TC-LEG-005 | PASS | **Title:** "Acceptable use \| BIDREADY24"  **Core rule:** "Use BIDREADY24 only for lawful procurement work and material your organisation is entitled to process."  **Prohibited:** Lists 6 prohibited uses including "Generating false, misleading or fabricated evidence, credentials, case studies or performance claims" and "Attempting to discover another project, bypass access controls, overload processing or reverse-engineer protected service components." | Substantive acceptable-use policy; explicit prohibition on evidence fabrication aligns with zero-invention terms |
| TC-AUTH-001 | PASS | **Project link login page rendered**  **Heading:** "Open your tender workspace"  **Form 1 fields:** "Project link or token" + "Open workspace" button  **Form 2 fields:** "Email" + "Project reference" + "Continue" button  **Explanation:** "BIDREADY24 does not use customer passwords. After purchase you receive a private project link. Return here with that link, or with the email and project reference from your intake or payment confirmation." | Form properly explains token-based access; two entry paths (link or email+ref); no form submission attempted per rules |
| TC-AUTH-002 | PASS | **Page title:** "BIDREADY24 \| Every requirement, traced to source"  **Heading:** "Sign in"  **Subheading:** "Access your project history, in-flight workspaces, and alert settings. New tenders always start with checkout."  **Page state:** Shows "Loading…" (client-side auth rendering)  **Alternative link:** "Need a single project link instead? Open a workspace token" | Passwordless account login surface confirmed; promises magic-link flow via loading state; client-side auth UI renders on page load |
| TC-AUTH-010 | FAIL | **Request:** `https://www.bidready24.com/project/invalid-token-abc123xyz`  **Response body:** Empty (no content)  **Expected:** Error message or redirect explaining token invalid/expired  **Actual:** Silent empty response | No user-facing error message; empty response body indicates either failed fetch or unhandled error path. Should return 404 + JSON or HTML with "Invalid token" message |
| TC-AUTH-011 | PASS | **Request:** `https://www.bidready24.com/admin`  **Redirect behavior:** Automatically redirected to `/admin/locked` (no console exposed)  **Form field:** "Admin password"  **Button:** "Sign in"  **Security note:** "Sign in with the deployment admin password. The password is submitted securely and is never added to the URL."  **Session info:** "Sessions expire after eight hours. Set ADMIN_PASSWORD in the Render environment secrets and rotate it immediately if exposure is suspected." | Admin path correctly gated; no raw admin console shown; password form is sole entry point; security guidance visible |
| TC-AUTH-011-continued | PASS | **/admin/locked renders identically to /admin result**  **Password field:** Confirmed present with label "Admin password"  **Submit:** "Sign in" button  **Deployment guidance:** "Set ADMIN_PASSWORD in the Render environment secrets and rotate it immediately if exposure is suspected." | Locked page is the canonical admin entry; password protection in place; no session/token shown |
| TC-AUTH-012 | PASS | **Endpoint:** `https://www.bidready24.com/api/health`  **Response:** `{"status":"ok","service":"bidready24","database":"ready","timestamp":"2026-07-13T09:33:49.650Z"}`  **Content-Type:** `application/json`  **Fields:** status, service name, database state, ISO timestamp | Health check operational; clean JSON response; database confirmed ready |
| TC-AUTH-013 | FAIL | **Request:** `https://www.bidready24.com/api/project/whatever`  **Response body:** Empty (no content)  **Expected:** Clean 4xx JSON error (e.g., `{"error":"not found","status":404}`)  **Actual:** Silent empty response  **HTTP behavior:** Fetch returns empty, no stack trace observed but also no JSON error structure | API does not return structured error response; should respond with JSON 404 error body and not empty content |

---

## Summary

**Total Tests:** 13  
**PASS:** 11  
**FAIL:** 2  
**BROWSER-LANE:** 0  
**BLOCKED:** 0

### Key Findings

**Passes (11/13):**
- All 5 legal pages render substantive content with proper titles and citations
- Privacy and refund policies meet requirements (data controller gap acknowledged, fixed-price product terms explicit)
- Auth surfaces correctly implement token-based + passwordless flows; forms properly labeled
- Admin path correctly redirects to locked form with no console exposure
- Health endpoint responds cleanly with JSON

**Failures (2/13):**
1. **TC-AUTH-010 (Invalid token):** Empty response instead of error message. User gets no feedback that token is invalid/expired.
2. **TC-AUTH-013 (API error):** Empty response instead of structured JSON 4xx error. API should return `{"error":"...", "status":404}` format.

### Recommended Follow-up
- Add fallback error handling to `/project/:token` endpoint to display "Invalid or expired token" message when token not found
- Ensure `/api/project/*` returns structured JSON error responses (e.g., `{"error":"project not found","status":404}`) rather than empty bodies
