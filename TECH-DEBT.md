# RYQ AI Testing Framework — Tech Debt & Tabled Items

> Running log of things we've deliberately deferred. When something is tabled,
> it gets added here; when it's resolved, it moves to **Resolved** at the bottom
> (with the date and how it was fixed). Refer to this list whenever we have
> capacity to clear debt.

_Last updated: 2026-06-05_

---

## Open

### TD-001 · Live "Last Run" stats not updating during a run
- **Phase:** 3.8.a (Run Tests tab)
- **Tabled:** 2026-06-05
- **Symptom:** The Last Run card shows correct *final* numbers (from `run-history.json`)
  but does not increment in real time while tests execute.
- **How it's supposed to work:** `platform-reporter.ts` emits one `@@RYQ@@` marker
  per finished test (only when `PLATFORM_RUN=1`); `platform-server.ts` streams those
  lines; `platform.js` filters them out of the console and updates the card live.
- **Diagnosis (2026-06-05):** Causes #1 and #2 ruled out on-machine:
  - `platform-reporter.ts` is present in `src/`. ✅
  - Reporter line `['./src/platform-reporter.ts']` is in `playwright.config.ts` reporter array. ✅
  - **Root cause: stdout block-buffering (cause #3).** When Playwright spawns worker
    processes piped to the platform server (non-TTY), Node's child process stdout is
    block-buffered. The `@@RYQ@@` markers accumulate and flush in one burst at
    process exit rather than line-by-line. From the UI this looks like "nothing live,
    then final number appears."
- **Fix options to evaluate:**
  1. Run Playwright programmatically (via `@playwright/test` Node API) inside the
     server process instead of spawning a subprocess — eliminates the pipe entirely;
     reporter fires in-process. Best long-term fix; requires replacing `streamCmd`
     for the test step with a programmatic runner that streams progress events.
  2. Use a named pipe / temp file as a side-channel: reporter writes markers to a
     temp file (or named pipe), server `fs.watch`es it and streams updates to the
     client independently of stdout. Keeps subprocess spawn model.
  3. Intercept stdout with a PTY (pseudo-terminal) using a package like `node-pty`
     to trick the child into line-buffered mode. Adds a native dependency.
  - **Recommended:** Option 1 (programmatic runner) — cleanest, no new dependencies,
    and aligns with Phase 4+ where we need more control over the test lifecycle.
- **Status:** Confirmed root cause. Fix deferred — not blocking (final stats correct).
  Revisit when starting Phase 3.8.b or Phase 4 work.

### TD-002 · Platform runs are headed locally (browser windows pop up)
- **Phase:** 3.8.a
- **Tabled:** 2026-06-05
- **Detail:** Platform-triggered runs inherit `playwright.config.ts` local behavior
  (`headless: false`), matching `run.ts`. During a streamed run this pops browser
  windows. Decision pending: keep headed (consistent with `run.ts`) vs. run the
  platform headless (one-line change — e.g. gate `headless` on a `PLATFORM_RUN`/env flag).
- **Status:** Awaiting decision from Raj.

### TD-003 · CI trend-dashboard always shows 1 run
- **Phase:** CI/CD pipeline (flagged for Phase 6)
- **Tabled:** prior to 2026-06-05 (pre-existing, carried in here for tracking)
- **Detail:** In CI the trend dashboard always shows a single run — Docker path
  mismatch with the cache layer. To revisit in Phase 6 (Deploy Anywhere).
- **Status:** Deferred to Phase 6.

### TD-004 · Generated test backlog needs POM alignment before promotion
- **Phase:** 3.7 (Coverage Gap Generator) / ongoing
- **Tabled:** 2026-06-07
- **Detail:** `src/tests/generated/` contains AI-generated tests with method calls that
  don't exist on the actual Page Object Models — e.g. `inventoryPage.waitForLoad()`,
  `cartPage.waitForLoad()`, `inventoryPage.addItemToCart()`. These were hallucinated
  by the generator and were silently breaking the Stable suite (20 failures) until
  `testIgnore: ['**/api.spec.ts', '**/generated/**']` was added to the chromium and
  webkit projects in `playwright.config.ts` on 2026-06-07.
- **What needs doing before any generated test can be promoted:**
  1. Replace `waitForLoad()` calls with `expect(page).toHaveURL(/inventory/)` +
     `await inventoryPage.pageTitle.waitFor()` or equivalent.
  2. Replace `addItemToCart('item name')` with `addFirstItemToCart()` or add a
     named-item method to the POM.
  3. Verify the full test logic against the actual SauceDemo flow before merging
     to `src/tests/`.
- **Affected files:** all `src/tests/generated/tc0*/` and `src/tests/generated/ec0*/`
  files — 20+ tests confirmed failing.
- **Status:** Backlog excluded from suite via `testIgnore`. Stable suite restored to
  58/58. Individual test fixes deferred — tackle per test when promoting.

_(none yet)_

---

## Resolved

### ~~Generated tests breaking Stable suite~~ — Fixed 2026-06-07
Added `testIgnore: ['**/api.spec.ts', '**/generated/**']` to chromium and webkit
projects in `playwright.config.ts`. Stable suite restored to 58/58 passing.
Root cause: AI-generated tests in `src/tests/generated/` called non-existent POM
methods and were picked up by `testDir` scan. Backlog tracked in TD-004 above.
