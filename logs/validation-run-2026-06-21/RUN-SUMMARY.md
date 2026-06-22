# Validation run — 2026-06-21 — evidence record

Full pipeline (crawl/onboard → verify → generate → execute) run against all three
reference apps following the TD-025/TD-029 fixes (commits 41e03f6, dd6b186,
9cef62a). This directory is the archived evidence for the working-tree state that
was reverted after this run — see git history around 2026-06-21 for the revert.

**Disclosure on completeness:** this archive was assembled *after* the session's
conversation context had already been cleared (`/clear`), so the raw console
output of the crawl and generate phases is not recoverable — it was never written
to a log file and is no longer in memory. Everything below is reconstructed from
artifacts that were still on disk: the verify-report JSON files, heal-store.json,
the `git diff` of generated code/models, the new untracked generated spec files,
and the Playwright `test-results/` trace files (gitignored, would have been
overwritten by the next run). If raw crawl/generate stdout is needed later, it
isn't here.

## Verify confidence summary

| App | Elements | Flows | Confidence | Recommendation |
|---|---|---|---|---|
| saucedemo | 103/103 passed | 2/9 passed | **MEDIUM (0.69)** | Review flagged items in app-model.json then re-run verify |
| orangehrm | 36/36 passed (2 required healing) | 1/1 passed | HIGH (1.0) | Model is ready |
| restful-booker | 2/2 passed | 0/0 (no flows defined) | HIGH (1.0) | Model is ready |

Full reports: `verify-reports/{app}-verify-report.json`. Heal events:
`verify-reports/heal-store.json`.

## Headline finding: saucedemo flow regression (likely new TD)

7 of 9 flows failed in `VerificationRunner`, and the corresponding generated specs
also failed under real Playwright execution (19 unique test failures, see
`test-execution-saucedemo.md`). Two distinct failure signatures, both pointing at
post-login navigation/state, not at element selectors themselves (all 103 elements
individually verified fine):

1. **`toHaveURL` mismatches** — tests expect to land on `/inventory-item.html` or
   `/cart.html` after a click-through action, but the page stays on
   `/inventory.html` (or, for login flows, on `https://www.saucedemo.com/` — root,
   not `/inventory.html`). Pattern: click is firing but navigation isn't happening,
   or login isn't completing before the next step runs.
2. **`toBeVisible` mismatches** — `[data-test="inventory-sidebar-link"]` resolves
   but is `hidden` (burger-menu sidebar never opened before the assertion), and
   `[data-test="login-container"]` is reported "element(s) not found" on
   home-page tests (suggesting the page wasn't actually on the login/home view
   when the assertion ran).

Both verify-time errors (`reports/verify/saucedemo-verify-report.json` →
`flowResults`) and Playwright execution-time errors
(`test-execution-saucedemo.md`) agree on which flows broke, which is good
corroboration — this isn't a fluke of one runner.

orangehrm and restful-booker showed no flow regressions. orangehrm did report 2
elements that needed healing (`web-index-php-maintenance-viewMaintenanceModule:confirm`,
`web-index-php-maintenance-purgeEmployee:confirm`, both `css` strategy, healed
selector `null` — worth a second look, see the orangehrm verify report).

## App-model deltas

| App | Pages | Flows |
|---|---|---|
| saucedemo | 4 → 4 (unchanged) | 8 → 9 (+1, new inferred flow) |
| orangehrm | 30 → 30 (unchanged) | 1 → 1 (unchanged) |
| restful-booker | 0 → 0 (unchanged, API model has no "pages") | 3 → 3 (unchanged) |

## Contents of this archive

- `verify-reports/` — full verify-report JSON for all 3 apps + heal-store.json,
  copied from the working tree before revert (these are the authoritative
  structured results — pass/fail per element and flow, with error text, strategy
  used, durations).
- `generated-diffs/` — `git diff` output for each app's `generated/` code
  (page objects, fixtures, API client, the one pre-existing modified spec) plus
  `app-models.diff` for all three `models/*/app-model.json`, captured before
  revert.
- `new-generated-specs-saucedemo/` — the 8 new spec files this run generated for
  saucedemo (`add-to-cart`, `complete-purchase-flow`, `direct-cart-access`,
  `guest-browse-inventory`, `inferred-flow-standardUser-1782073764359`,
  `locked-user-login`, `login-to-inventory`, `view-product-details`) — these were
  untracked and got deleted by the revert, so this is their only remaining copy.
- `test-execution-saucedemo.md` — real assertion error text extracted from each
  failed test's `trace.zip` in `test-results/` (orangehrm and restful-booker had
  no entries in `test-results/` for this run — either their executed specs passed
  cleanly with no retained artifacts, or test execution wasn't run for them this
  pass; not distinguishable from what's on disk).
