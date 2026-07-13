# BIDREADY24 — Functional Test Execution Report
**Target:** https://www.bidready24.com (live production)
**Date:** 2026-07-13
**Executed by:** automated test fleet (fable coordinator + haiku/sonnet/opus agents) per `docs/FUNCTIONAL_TEST_PLAN.md`
**Method:** golden tender packs uploaded to isolated `[TEST]` projects created through a new admin-gated bypass route; real customer API + pipeline exercised; findings adversarially reviewed by a separate opus agent.

---

## 1. Headline

**The core promise — "Every requirement, traced to source" — does not hold on live for PDF or Excel inputs, which are the product's primary tender formats.**

A normal tender upload today produces one of two bad outcomes:

1. **PDF-only or Excel-only upload → hard failure.** The run returns `HTTP 500 · ANALYSIS_FAILED` and zero requirements.
2. **Mixed pack (PDF + Word + Excel) → silent, degraded success.** Only the **Word** file is read. The PDF and Excel are dropped without warning, the run is marked **"succeeded"**, and the report shows **"Source coverage 100%"** over only the handful of surviving requirements.

On a golden pack containing ~20 known requirements across three files, the live run extracted **4 requirements — all from the Word document** — with every citation location shown as a generic **"Document"** (never the "§4.2 · p.7" style the marketing sample promises).

This is the root of the "link backs" pain point: for PDF/Excel content there are currently no real link-backs because that content is never ingested.

Everything **around** the extraction core is in good shape: public site, pricing, legal, auth/token security, intake validation, upload validation, autonomy controls, data isolation, and negative-path handling all passed.

---

## 2. What was tested and how

- Created isolated, zero-value `[TEST]` projects via a new admin-session-gated route (`POST /admin/tests/create-project`) so no Stripe payment or card entry was needed. (Committed as `a7ab5ce`; deployed by you.)
- Built 4 golden tender packs + an evidence pack (`fixtures/golden-packs/`) as real PDF/DOCX/XLSX/CSV/TXT with **known verbatim strings and locations** recorded in per-pack `manifest.json` for objective citation checking.
- Drove the **real customer UI** (intake, file upload, run, report tabs, exports) through the browser, plus scripted the token-authed APIs the UI calls.
- Ran isolation experiments (one file-type per project) to attribute the failure precisely.
- Reproduced the extraction code in plain Node to separate "our code/fixtures" from "the deployed environment".
- Had a separate opus agent adversarially review the root-cause and fix; its corrections are incorporated below.

---

## 3. Findings (by severity)

### 🔴 P0-1 — Silent partial-extraction failure (design defect, confirmed)
`extractTenderPack()` runs the per-file parsers under `Promise.allSettled` (`lib/extraction.ts:74`) and the pipeline treats the run as usable as long as **at least one** fragment survives (`lib/analysis-core.ts:26`). When some files fail to parse, their content is dropped, **the run is still marked `succeeded`**, and nothing in the customer report indicates that files were skipped.

**Evidence:** mixed golden pack (PDF+DOCX+XLSX) → run reported `fragments: 1`, 4 requirements, all from the DOCX; PDF and XLSX contributed nothing; report Overview showed "Source coverage 100%", "Citations recorded 4/4", and no mention of the two dropped files.

**Why it matters:** a customer is told their tender is fully traced when most of it was never read. This is the most damaging bug because it is invisible.

### 🔴 P0-2 — PDF and Excel produce zero content in the deployed server (confirmed symptom; mechanism not fully isolated)
PDF-only and XLSX-only uploads each return `HTTP 500 · ANALYSIS_FAILED` on live. The **same extraction code on the same files works in plain Node** (PDF → 5 fragments/11 requirements; XLSX → 2/3), so the code and the fixtures are fine — the failure is specific to the deployed environment.

**Two candidate causes, currently confounded (server logs needed to separate):**
- **(a) Next server-bundling of the parsers.** `pdf-parse` pulls in `pdfjs-dist` (ESM/workers, known to break when traced into a server bundle); SheetJS does an internal lazy `require('fs')` that a bundler can rewrite ("Cannot access file"). `next.config.ts` had **no `serverExternalPackages`**.
- **(b) Uploaded files not readable at analysis time on the host.** The plain-text path (`txt`+`csv`) also 500'd on live despite using only `node:fs/promises` (which Next never bundles). That points at files being missing/unreadable when the pipeline runs — consistent with ephemeral or per-instance disk on the host (upload runs inline in one invocation; a later `run` call may land on an instance that can't see the file).

**Honest gap:** I could not capture the actual per-file `failure.error` string — it is preserved in code (`lib/analysis-core.ts:27`) and turned into clarifications, but is **not surfaced in the UI**, and I have no access to Render logs. The decisive experiment (a local **production** `next build` + `next start` over the fixtures) could not be run in this environment because background servers are killed between commands. Until that is run, (a) vs (b) is not settled.

### 🔴 P0-3 — Real-AI analysis is not contributing on live (deterministic-only output)
All 4 surviving requirements carry confidence **exactly 0.78**, the deterministic rules value for mandatory-language matches (`lib/deterministic-analysis.ts:146`). Real-AI items would carry the model's own confidences. So the OpenAI pass is adding nothing on live.
**Caveat (per adversarial review):** 0.78 proves the output is *deterministic*; it does **not** prove an AI *fallback* (attempted-and-failed) versus AI simply being disabled/misconfigured (`ENABLE_REAL_AI`, `OPENAI_API_KEY`, or the `gpt-5.6` model string). Check the run's stored `provider`/`model` to distinguish.

### 🟠 P1-1 — `500 ANALYSIS_FAILED` is the wrong contract for "no readable content"
"We couldn't read any of your files" is an input condition and should be a **4xx (422)** with the per-file reasons, not an opaque 500. Both route handlers additionally **discard `error.message`** (`app/api/project/[token]/run/route.ts:17`, `.../upload/route.ts:57`), which is exactly the detail needed to diagnose P0-2 in production.

### 🟠 P1-2 — "Source coverage 100%" metric is misleading in the failure state
Coverage is computed as `sourced / survivingRequirements` (`components/.../ReportWorkspace` ~line 205), so it reads ~100% even when 2 of 3 files were dropped. It must be measured against **uploaded files / expected content**, with dropped files shown explicitly.

### 🟡 P2 — DOCX citations lack granular location
Even on the path that works, DOCX requirements get location `"Document"` by design (`lib/extraction.ts:46`) rather than a clause/section, so they don't match the "§/p." granularity the marketing sample implies.

---

## 4. What passed (works well)

| Area | Result |
|---|---|
| Public site: home, pricing (£149 / £349), sample report, how-it-works, deliverables | PASS — CTAs, both tiers, sample citations all render |
| Cleaning landing, live tender feed (9 real tenders w/ buyer/deadline/region), alerts, security, contact | PASS |
| Legal pages (terms, privacy, refund, data, acceptable-use) | PASS — substantive content |
| Apex → www canonical redirect | PASS |
| Auth/security: `/admin` → locked; bad project token → 404 no data leak; `/api/*` bad token → 404 | PASS |
| Intake validation: empty / consent=false / bad email / 1-char company / missing required → 400; valid → 200; identical resubmit → `noop` | PASS (7/7) |
| Upload validation: `.md`, `.exe`, bad-signature `.pdf`, empty file → 400 | PASS (4/4) |
| Autonomy control centre: GET settings 200; PUT profile→assisted persists | PASS |
| Re-run idempotency: identical inputs → `reused: true`, no duplicate run | PASS |
| Data isolation: distinct projects return independent data | PASS |
| Admin console + synthetic E2E projects present and readable | PASS |
| New admin bypass route: admin-gated, same-origin-checked, cross-origin → 403, batch-capped | PASS (4/4 unit tests) |

Blocked by the extraction bug (could not be meaningfully executed on live): deep citation-exactness verification across packs, evidence-delta re-run transitions (poor→evidence), Complete-vs-Preflight response drafting, multi-doc `document_id` correctness, table/sheet extraction. These are ready to run the moment extraction is fixed — the golden packs and manifests are built for exactly this.

---

## 5. Recommended fixes (prioritized)

1. **Fix the silent-partial-success design (P0-1).** When `extractionFailures > 0`, do **not** report a clean `succeeded`: introduce a `partial`/degraded status, list the dropped files in the report, and stop rendering "100% source coverage" when files were skipped.
2. **Make extraction robust to the deployment (P0-2).** Applied as candidate fixes (uncommitted, pending your go-ahead):
   - `next.config.ts`: `serverExternalPackages: ["pdf-parse", "pdfjs-dist", "xlsx", "mammoth"]`.
   - `lib/extraction.ts`: read XLSX via buffer — `XLSX.read(await fs.readFile(path), { type: "buffer" })` — bundler-independent.
   - **Then verify with a local production `next build` + `next start` over `fixtures/golden-packs/`** (the experiment this sandbox couldn't run). If txt/csv still fails there, the cause is file-persistence, not bundling — investigate the host's disk model and whether `run` and `upload` share storage.
3. **Return 4xx with per-file reasons on total extraction failure, and stop swallowing `error.message` (P1-1).**
4. **Recompute source-coverage against uploaded files (P1-2).**
5. **Confirm the AI path (P0-3):** check the run's stored `provider`/`model`; verify `ENABLE_REAL_AI`, `OPENAI_API_KEY`, and that `OPENAI_MODEL=gpt-5.6` is a real model.
6. Add granular DOCX locations where feasible (P2).

---

## 6. Exit-criteria assessment (vs. plan §10)

| Criterion | Status |
|---|---|
| All P0 test cases pass incl. citation verification on ≥3 golden packs | ❌ Not met — extraction blocks citation verification for PDF/XLSX |
| ≥2 full re-run iteration cycles pass the delta checklist | ⚠️ Partial — idempotent reuse verified; evidence-delta blocked |
| No "invention" failures | ✅ Not met with invention — the system correctly stays "missing/uncertain"; the failure mode is *omission*, not invention |
| CSV and report data consistent | ✅ Consistent (both reflect the same degraded 4-requirement run) |
| All E2E scenarios complete at least once | ❌ Not met — E2E depends on extraction |
| Known broken areas (link backs) re-tested and green | ❌ Re-tested and **red** — this run localizes the cause |

**Release recommendation: do not ship customer-facing PDF/Excel tenders until P0-1 and P0-2 are fixed and re-verified.** The surrounding platform is solid; the defect is concentrated in the extraction/analysis core and its silent-failure handling.

---

## 7. Artifacts
- `docs/test-results/agent-01-public-home-pricing-sample.md`, `agent-02-*`, `agent-03-legal-auth-negative.md` — public/auth suite results
- `docs/test-results/functional-battery-results.md` — intake/upload/autonomy/isolation/negative-token battery
- `docs/test-results/evidence/live-extraction-findings.json` — raw isolation + local-vs-live comparison
- `fixtures/golden-packs/` — golden packs + manifests + intake datasets, ready for post-fix re-run
- Candidate fixes (uncommitted): `next.config.ts`, `lib/extraction.ts`

*Adversarial review by a separate opus agent corrected the initial hypothesis: the load-bearing bug is the silent partial-success design (not bundling per se); the txt/csv 500 cannot be a bundling issue; xlsx is pure-JS (not native); and "100% coverage" is computed over survivors. Those corrections are reflected above.*
