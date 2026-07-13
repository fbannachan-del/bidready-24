# Fixes Implemented — Extraction Robustness & Honest Reporting
**Branch:** `fix/extraction-robustness`
**Date:** 2026-07-13
**Covers every item in `TEST_EXECUTION_REPORT_2026-07-13.md` (P0-1, P0-2, P0-3, P1-1, P1-2, P2).**

## What changed

### P0-2 — Extraction works in the deployed server
- `next.config.ts`: `serverExternalPackages: ["pdf-parse", "pdfjs-dist", "xlsx", "mammoth"]` so the parsers (and pdfjs) are `require`d at runtime instead of being traced into the server bundle.
- `lib/extraction.ts`: XLSX is now read via buffer — `XLSX.read(await fs.readFile(path), { type: "buffer" })` — removing the dependency on SheetJS's internal lazy `require('fs')` that a bundler can break. Bundler-independent.

### P0-1 / P1-1 — Failures are surfaced, never silent; correct HTTP contract
- `lib/extraction.ts`: new typed `ExtractionEmptyError` (code `EXTRACTION_EMPTY`) carrying per-file `{ id, name, error }`.
- `lib/analysis-core.ts`: throws `ExtractionEmptyError` (with reasons) when nothing is readable.
- `lib/autonomous-pipeline.ts`: records an `extraction-complete` QA check (failed/high when any file is dropped, listing the files), persists an `extraction` summary `{ uploaded, processed, partial, failures[] }` and `providerStatus` in run metrics, tags the failure `EXTRACTION_EMPTY`, and returns `warnings.droppedFiles` on partial success.
- `app/api/project/[token]/run/route.ts` and `.../upload/route.ts`: on `EXTRACTION_EMPTY` return **HTTP 422** with a per-file `files: [{ name, reason }]` list (instead of an opaque 500); the reasons are no longer swallowed.

### P1-2 — Honest source coverage + dropped-files banner
- `components/report/ReportWorkspace.tsx`: new `extraction` prop. When documents were dropped it renders a prominent **red banner** listing them, and the coverage card now shows **document coverage** (`processed/uploaded`, with an "N excluded" note) instead of a misleading "100%".
- `app/project/[token]/report/page.tsx`: passes the extraction summary from the latest succeeded run's metrics.

### P0-3 — AI observability
- `lib/analysis-core.ts`: the OpenAI failure is no longer swallowed by an empty `catch {}` — the reason is logged, added to assumptions, and captured in `providerStatus { attempted, ok, provider, model, error }`.
- The report shows a **"Deterministic extraction only"** banner when the AI pass was expected but did not run (`aiDegraded`). This makes the "is real AI actually running?" question visible rather than hidden. (The underlying cause — `ENABLE_REAL_AI`, `OPENAI_API_KEY`, and whether `OPENAI_MODEL=gpt-5.6` is a valid model — is env config to confirm in Render.)

### P2 — Granular citation locations
- `lib/extraction.ts`: fragments now carry the nearest `Clause`/`Section`/`Part`/`Schedule`/`Annex`/`§`/`Q#` heading, e.g. `p.2 · Section 3`, `Document · Clause 2.2`, instead of a bare `Document`/`p.2`. Improves link-back granularity toward the "§4.2 · p.7" promise.

## Verification performed
- **Production build** (`next build`) succeeds cleanly with all routes compiled and the parsers externalized — no compile/type errors.
- **Type check**: zero new `tsc` errors from these changes.
- **Unit + integration suite**: 100 tests, 99 pass, 0 fail (the 2 non-passing are pre-existing HTTP journey tests that skip without a live server).
- **New regression tests** (5, all passing):
  - `test/extraction-robustness.test.ts` — granular locations; partial failures recorded without throwing; typed `ExtractionEmptyError` with reasons; provider status reported.
  - `test/run-route-extraction.test.ts` — unreadable pack → **422 `EXTRACTION_EMPTY`** with per-file reasons, and the run is recorded as `failed` (not silently succeeded).
- **Plain-Node extraction** over the golden packs still yields PDF 5/11, XLSX 2/3, TXT+CSV 2/1, DOCX 1/4.

## The one step that still needs a real deploy
The in-sandbox environment cannot run the built server (background processes are killed between commands), so the **live confirmation** that PDF/XLSX now extract under the bundled runtime must be done after deploy: upload `fixtures/golden-packs/pack-a-baseline/` to a fresh project and confirm the run yields ~20 requirements across all three files with granular locations. If the plain-text (`txt`/`csv`) path still fails on live after this deploy, the remaining cause is file-persistence on the host (not bundling) — investigate whether `upload` and `run` share storage on the Render instance.
