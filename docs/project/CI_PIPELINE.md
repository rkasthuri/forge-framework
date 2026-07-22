# CI_PIPELINE.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-21 — sourced from CC read of e2e-pipeline.yml (453 lines) -->

> CI/CD workflow, quality gates, and pipeline job breakdown.
> Workflow file: `.github/workflows/e2e-pipeline.yml`
> Note: the workflow file is NOT `ci.yml` — it is `e2e-pipeline.yml`.

---

## 1. Overview

The CI pipeline runs on every push to `main`. It has three jobs:

```
Job 1: test          ← Unit + Playwright suite + provenance
       ↓
Job 2: ai-pipeline   ← Triage → store → fixes → trends → notes → notify
       (if: always() — runs even if Job 1 has failures)
       ↓
Job 3: notify        ← Failure notification on main
```

---

## 2. Job 1 — test

**Runner:** Playwright Docker container (`mcr.microsoft.com/playwright:v1.58.0-jammy`)
**Purpose:** Type check, unit tests, Playwright suite, provenance sidecar

### Gate Sequence (in order)

```
1. npm run check          ← tsc --noEmit (root + evals)
                            Must pass — pre-suite gate (TD-096 closed)

2. npm run test:unit      ← 531 tests — must pass
                            Pre-suite gate before Playwright runs

3. Playwright stable suite ← --grep-invert '@slow|@flaky'
                             continue-on-error: true
                             (failures flow to Job 2 for triage, not hard-stop)

4. Provenance sidecar     ← Writes run provenance metadata

5. Upload reports/        ← Run reports uploaded as CI artifact
```

**Important:** The Playwright suite uses `continue-on-error: true`. This means
Job 1 completes even with failing Playwright tests — failures are intentionally
passed to Job 2 for AI triage rather than immediately failing the build.

**What is NOT in CI (local only):**
- `forge-ui/` TypeScript check — local gate only (TD-UI-052)
- WebKit browser — local only to reduce CI install time
- `@slow` and `@flaky` tagged tests — excluded from stable suite

### Run ID

CI mints a canonical run ID at the start of Job 1 (TD-070). Local runs use a
different scheme. This means local and CI run IDs do not match — do not assume
they do.

---

## 3. Job 2 — ai-pipeline

**Runner:** Bare runner (not Playwright container) — by design (TD-053 egress fix)
**Condition:** `if: always()` — runs even when Job 1 has Playwright failures
**Purpose:** AI triage, result storage, adaptive fixes, trends, release notes, notification

### Execution Sequence

```
1. triage              ← npm run triage
                          AI classifies failures from Job 1

2. results-store       ← npm run store
                          Persists run results to SQLite

3. adaptive-fixes      ← npm run fixes
                          Applies AI-generated selector fixes

4. trend-analysis      ← npm run trends
                          continue-on-error: true (TD-051 schema mismatch)

5. release-notes       ← npm run release:notes
                          continue-on-error: true (TD-051 schema mismatch)

6. notifier            ← npm run notify
                          Sends run summary

7. Commit writeback    ← Commits run-history.json back to main

8. PR comment          ← Posts run summary as PR comment

9. Bug gate            ← Informational / non-blocking (TD-078 / ADR-010)
```

**Known issues in Job 2:**
- `trend-analysis` and `release-notes` carry `continue-on-error` — TD-051
  (schema mismatch) is unresolved
- `steps.suite.outputs.label` is referenced at line 395 where it cannot resolve
  (TD-055) — this is a known silent failure

---

## 4. Job 3 — notify

**Condition:** On failure of main branch
**Purpose:** Team notification when the main branch CI fails

---

## 5. Quality Gates Summary

| Gate | Job | Blocks build? | Notes |
|---|---|---|---|
| `npm run check` (tsc) | Job 1 | ✅ Yes | Hard stop if fails |
| `npm run test:unit` | Job 1 | ✅ Yes | Hard stop if fails |
| Playwright stable suite | Job 1 | ❌ No | continue-on-error — flows to triage |
| `forge-ui/` tsc | Local only | N/A | TD-UI-052 — not in CI |
| AI triage | Job 2 | ❌ No | Informational |
| Bug gate | Job 2 | ❌ No | Informational / non-blocking (ADR-010) |

---

## 6. What GREEN Means in CI

A CI run is GREEN for milestone purposes when:

```
□ Job 1: npm run check passes
□ Job 1: npm run test:unit passes (531/0)
□ Job 1: Playwright suite passes (320/0)
□ Job 2: Completes without crash
□ No new test regressions introduced
□ forge-ui production build passes (run locally — not in CI)
```

> **Reminder (standing rule 2026-07-20):** CI GREEN means honest — it does not
> automatically mean correct. Capabilities must be verified for correctness
> via eval harnesses separately.

---

## 7. One CI Run Per Milestone

CI runs cost real API calls and time (Job 2 runs triage, fixes, trends, and
release notes against the Claude API on every push).

**Batch commits by logical milestone.** Never push:
- Docs-only changes in isolation
- Single-file changes that belong to a larger logical unit
- Anything that has not passed `npm run check` locally first

---

## 8. Known CI Issues (Open TDs)

| TD | Description |
|---|---|
| TD-UI-052 | forge-ui tsc not in CI — local-only gate |
| TD-051 | Schema mismatch in trend-analysis and release-notes — continue-on-error workaround |
| TD-055 | steps.suite.outputs.label referenced in Job 2 where it cannot resolve |
| TD-070 | CI mints its own run ID — local runs use a different scheme |
| TD-003 | CI trend dashboard always shows 1 run — Docker path mismatch |
| TD-078 | Bug gate is informational / non-blocking |

---

## 9. Workflow File Reference

```
File:    .github/workflows/e2e-pipeline.yml
Lines:   453
Jobs:    3 (test, ai-pipeline, notify)
Trigger: push to main
```

To read the full workflow: `cat .github/workflows/e2e-pipeline.yml`

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
