# Functional Battery — live www.bidready24.com (2026-07-13)

Scripted through the real token-authed APIs (same endpoints the UI calls), on fresh `[TEST]` projects.

| TC-ID | Suite | Status | Evidence |
|---|---|---|---|
| TC-INT-neg-empty | Intake | PASS | `{}` → 400 |
| TC-INT-neg-consent | Intake | PASS | consent=false → 400 |
| TC-INT-neg-email | Intake | PASS | invalid email → 400 |
| TC-INT-neg-shortname | Intake | PASS | 1-char company → 400 |
| TC-INT-neg-missing-req | Intake | PASS | no deadline/service_area → 400 |
| TC-INT-001-valid | Intake | PASS | valid → 200 `action=save` |
| TC-INT-010-idempotent | Intake | PASS | identical resubmit → `action=noop` |
| TC-UPL-050-md-reject | Upload | PASS | `.md` → 400 |
| TC-UPL-051-badsig | Upload | PASS | `.pdf` w/ wrong signature → 400 |
| TC-UPL-052-empty | Upload | PASS | empty file → 400 |
| TC-UPL-053-exe | Upload | PASS | `.exe` → 400 |
| TC-AUT-001-get | Autonomy | PASS | GET 200, profile=unattended |
| TC-AUT-010-persist | Autonomy | PASS | PUT profile=assisted → 200, persisted (POST correctly 405) |
| TC-AUTH-csv-badtoken | Auth | PASS | bad token CSV → 404 |
| TC-AUTH-autonomy-badtoken | Auth | PASS | bad token autonomy → 404 |
| TC-AUTH-run-badtoken | Auth | PASS | bad token run → 404 |
| TC-AUTH-report-badtoken-noleak | Auth | PASS | bad token report → 404, no requirement data leaked |
| TC-XCUT-isolation | Cross-cutting | PASS | distinct projects return independent data |
| TC-RERUN-001-idempotent | Re-run | PASS | identical inputs → `reused:true`, no new run |

## Extraction isolation experiments (the P0 finding)

| Upload (isolated project) | Live result | Same code, plain Node |
|---|---|---|
| PDF only (`ITT-Main.pdf`, 5 pp, valid %PDF) | **500 ANALYSIS_FAILED**, 0 reqs | 5 fragments / 11 reqs |
| XLSX only (`Pricing-Schedule.xlsx`) | **500 ANALYSIS_FAILED**, 0 reqs | 2 fragments / 3 reqs |
| TXT + CSV (`terms.txt`,`sites.csv`) | **500 ANALYSIS_FAILED**, 0 reqs | 2 fragments / 1 req |
| Mixed (PDF+DOCX+XLSX) | succeeded, `fragments:1`, **4 reqs (DOCX only)**, PDF+XLSX dropped silently, all locations "Document", uniform 0.78 | (all three files parse) |

See `TEST_EXECUTION_REPORT_2026-07-13.md` for full analysis and recommended fixes.
