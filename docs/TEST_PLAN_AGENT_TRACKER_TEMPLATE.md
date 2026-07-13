# BIDREADY24 Agent Execution Tracker Template

Use one row per test case execution. Duplicate the table for each agent or use a shared Google Sheet / Airtable.

| TC-ID | Suite | Agent # | Project Token / ID | Pack Used | Run # | Date | Status (PASS/FAIL/BLOCKED) | Citation Verified? (Y/N/Partial + # checked) | Re-run Delta OK? | Notes / Mismatch Details | Screenshot / Link | Follow-up |

**Key columns explained**
- Citation Verified?: For any TC involving report/requirements, record how many requirements you fully cross-checked using the protocol in the main test plan. "Y (12/28)" etc.
- Re-run Delta OK?: Only for re-run TCs. Y/N + brief before→after status example.
- Always attach or link evidence for FAIL or interesting partials.

**Suggested columns for summary dashboard (per agent or per pack)**
- Agent
- Packs completed
- Total citations manually verified (target: high sample + all P0 items)
- Re-run cycles executed
- P0 pass rate
- Blockers / open issues

**Example filled row**
| TC-CIT-001 | 7-Citations | 25 | proj_abc123 / tok_xxx | golden-cleaning-full | 1 | 2026-07-14 | PASS | Y (18/31) — all inspected excerpts exact match | N/A | Insurance req p.7 verbatim perfect. One low-conf scored Q had slightly truncated excerpt but still verifiable. | [link] | None |

**Daily roll-up for 40-agent coordination**
- Total P0 executed / passed
- Total unique citations manually verified across agents
- Re-run cycles completed
- Top issues (link to tickets)

Copy this structure into your tracker. Update the main FUNCTIONAL_TEST_PLAN.md if new TCs or suites are added.