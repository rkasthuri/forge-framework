# FORGE — Technical Debt Tracker

Single source of truth for open and resolved tech debt. `CLAUDE.md` points here
rather than duplicating this list — if you find a known-limitations note in
`CLAUDE.md` that isn't reflected here, that's a sign the two have drifted; update
this file and trim `CLAUDE.md` back down to a pointer.

When you find a new issue: add it here with the next available ID, don't fix it
inline unless it's trivial and unambiguously safe. Per the standing rule "design
before patching," anything structural gets a design conversation before code,
even if you could technically patch it in five minutes.

When you resolve one: move it to the Resolved table with the commit hash, don't
just delete the row — the history of what broke and how it got fixed is useful on
its own, especially for spotting repeat patterns (see "Common bug patterns" in
`CLAUDE.md`).

---

## Open

| ID | Description | Priority | Notes |
|---|---|---|---|
| TD-014 | `SPAStrategy.crawl()` only discovers one hop from the start page — visits discovered URLs once, never recurses into links found on those pages. Confirmed pre-existing as of commit `d5cc5a7`, not a regression introduced by session 7 work. Causes OrangeHRM to miss second-hop pages (`recruitment/viewCandidates`, `pim/viewPersonalDetails/empNumber/7`, `performance/searchEvaluatePerformanceReview`); page count varies 18–21 depending on crawl timing. | Medium | Needs a design conversation, not a patch — recursive/multi-hop discovery with a depth budget has real AI-budget and crawl-time tradeoffs that should be decided deliberately. Also logged in `MEMORY.md` (`project_spastrategy_one_hop_limitation.md`). |
| TD-015 | `lockedUser` role auth occasionally fails locally on SauceDemo (`Auth may have failed for role lockedUser`). Not yet triaged — unclear whether this is a framework bug or an actual account lockout state on the live demo site. | Low | Untriaged. Don't assume either cause without checking — could be the live SauceDemo lockedUser account genuinely being in a locked state, unrelated to FORGE. |
| TD-LOW-001 | Repository rename from `e2e-ai-testing-framework` to `forge-framework`, pending before Phase 7. | Low | Flag the right moment for this — do not do it unprompted. Affects local path (`C:\e2e-ai-testing-framework`), remote URL, and anything that hardcodes the repo name. |
| TD-LOW-002 | Firefox is not configured as an execution target. Only Chromium and WebKit exist today; WebKit is deliberately excluded from CI browser installs (local-only) to reduce CI install time. | Low | Deferred — do not add unprompted. When tackled, decide explicitly whether Firefox runs in CI or stays local-only; don't default to "add everywhere" just because WebKit's existing precedent is asymmetric. |
| TD-016 | `FlowDetector.mergeConfigSeeded()` only ever compiles login steps + one trailing `assert-navigation` from a `FlowHint` — it ignores the rest of the hint text. Concretely: `onboarding.saucedemo.config.ts`'s `checkout-happy-path` hint reads "Add item to cart, proceed through checkout to completion," but the compiled flow's steps are just login + assert-navigation to `inventory-html`; no add-to-cart or checkout steps are ever generated. Confirmed 0 of 3 flows in the current SauceDemo model touch `cart-html` at all. Found while investigating TD-013 — not bundled into that fix per the standing "flag scope expansion, don't silently absorb it" rule. | Medium | Needs a design decision: either parse intent out of free-text hints (fragile), or replace/extend `FlowHint` with a structured step list so config authors can declare the full flow, not just the login boilerplate. Affects flow quality on every app that uses `flows:` hints, not just SauceDemo. |
| TD-001 | Live stats not updating in Platform UI during a run — likely stdout buffering. | Low | From original session tracking; not revisited recently, status unconfirmed. |
| TD-002 | Platform UI runs headed locally (not headless). | Low | From original session tracking; may be intentional for local dev visibility — confirm before treating as a bug. |
| TD-003 | CI trend dashboard always shows 1 run — Docker container path mismatch with the cache approach breaks trend persistence across runs. | Low | From original session tracking; unconfirmed whether still reproducing after later CI fixes (Microsoft Playwright Docker image switch, etc.) — verify current behavior before working on it. |

## Design decisions captured (not bugs, but constraints to respect)

These aren't open defects — they're explicit sequencing/architecture calls already
made, included here so they don't get silently violated by future work.

| Topic | Decision |
|---|---|
| Dashboard build order | Do not start Dashboard implementation while TD-014 (or any open verification/crawl correctness issue) remains unresolved. A drill-down dashboard built on unreliable underlying signal surfaces that unreliability as dashboard noise. Resolve foundation issues first. TD-013 resolved — no longer a blocker. |
| Dashboard data architecture | Dashboard must be a view layer on top of existing data (HealStore, flaky predictor scores, AI triage classifications, `run-history.json`/`trends.json`) — not a standalone reporting pipeline with its own data model. Avoids two sources of truth drifting apart. |

---

## Resolved (Session 7)

| ID | Description | Resolved in | Notes |
|---|---|---|---|
| — | `SPAStrategy.crawl()` never visited `startUrl` itself, and discovered URLs were marked visited during discovery (not just during the visit phase), causing Phase 3 to skip all of them — SauceDemo crawl reported 1-2 pages instead of 8. | This session, prior to commit `0c46e53` | Fixed by visiting `startUrl` first and separating a `candidates` set (used during discovery dedup) from `visited` (used to gate actual page visits). |
| — | `AiBudgetTracker.remaining` was captured by value at construction time and never updated — `consume()`/`isExhausted()` correctly saw the live value via closure, but `.remaining` itself always reported the initial limit, making budget-exhaustion logs misleading. | `48113e8` | Fixed with a `tracker` object + getter so `.remaining` reads live state. |
| — | `ElementClassifier.nameWithAi` sent all unnamed elements on a page in one AI call regardless of count, capped at `maxTokens: 500` — pages with >20-ish elements (e.g. OrangeHRM's `viewEmployeeList` at 77 elements) returned truncated/malformed JSON and silently fell back to generic names. | `48113e8` | Fixed by batching into chunks of 20 elements per AI call, `maxTokens` raised to 1024, with per-batch logging instead of a single silent failure. |
| — | `FlowDetector` emitted the same bare credential placeholder (`{{KEY}}`) for both username and password fill steps. `VerificationRunner.resolveValue` expected `_USERNAME`/`_PASSWORD` suffixes to split the `user:pass` env var — without them, both fields resolved to the raw colon-joined string, login failed silently, and every flow failed at the post-login `assert-navigation` step. | `0c46e53` | Fixed in two locations in `FlowDetector.ts` (the generic input mapper and the explicit username/password step builder) by stripping any existing `_CREDENTIALS` suffix from `credentialsEnvKey` and appending the correct suffix per field. |
| — | `SPAStrategy.discoverViaButtonText` could click "Add to cart" / "Remove" style buttons during exploration — these matched the nav-button text filter (`/cart/i`) but don't navigate, so clicking them only had the side effect of silently mutating app state (populating the cart) during a crawl. | `0c46e53` | Fixed by adding a `MUTATING_TEXT_PATTERNS` exclusion list checked before treating a button as a navigation candidate. Verified safe on both SauceDemo and OrangeHRM — the excluded buttons never produced URL changes anyway, so no legitimate discoveries were lost. |
| — | Self-healing in `VerificationRunner` would promote whichever strategy worked to primary with no confidence-tier check — a low-confidence `text` match could silently displace a reliable `data-test`/`id` strategy, risking model corruption from a loose text match landing on unrelated content (e.g. footer copy). | `0c46e53` | Fixed by adding an `isDowngrade` check: a `text`-type heal is never allowed to displace a `data-test` or `id` primary strategy; logged as a kept-primary event instead of silently promoting. |
| TD-013 | `VerificationRunner` navigated directly to a page's URL with no prerequisite state setup, breaking verification of stateful pages (`cart.html` on SauceDemo has no per-item content until an item is added). | this session | Added `PageDefinition.prerequisites` (reuses the existing `FlowStep`/`executeStep()` execution engine — no new interpreter) compiled from a new app-specific `OnboardingConfig.pagePrerequisites`, executed in `VerificationRunner` right before a page's direct navigation. Failures are recorded to a new, separate `VerificationReport.setupFailures` array — never folded into `elementResults` — and force `confidenceLevel` down from HIGH regardless of the element/flow ratio. Verified live against SauceDemo: happy path passed 103/103 elements incl. all 22 `cart-html` criticals with `setupFailures: []`; induced failure (bad elementId) correctly logged `⚠ Prerequisite step 1 (click) failed`, dropped `elementsTotal` to 81 (no conflated selector failures), populated `setupFailures`, and capped confidence at MEDIUM despite a 1.00 raw ratio. `FlowDetector.mergeConfigSeeded()`'s separate hint-truncation gap (no flow ever reaches `cart-html`) intentionally not bundled — logged as TD-016. |

---

## Resolved (pre-Session 7)

Carried over from the original session tracking doc for continuity — not verified
again during Session 7, listed here for history only.

| ID | Description |
|---|---|
| TD-009 | BFS crawler issue — resolved by the new strategy-pattern crawler architecture (`AuthManager`, `StrategyDetector`, `BFSStrategy`, `SPAStrategy`, `HybridStrategy`, `SelfCorrectionEngine`, `PageVisitor`). |
| TD-011 | API endpoint verification gap in `VerificationRunner` — resolved. |
| TD-012 | ONBOARD tab credential input / auto-config generation — resolved. |
