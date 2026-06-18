# FORGE — Autonomous Quality Engineering

This file is read automatically by Claude Code at the start of every session in this
repository. It exists so you do not have to re-derive project context, architecture
intent, or standing rules from the code alone. Read this in full before making any
change. If something here conflicts with what you observe in the code, the code is
probably more current — flag the conflict rather than silently trusting either one.

Also read `MEMORY.md` if it exists in the repo root — it is a running log of findings
from past sessions (this project's own persistent memory, separate from this file).
Check it before starting work on the crawler, onboarding pipeline, or verification
runner, since known limitations get logged there rather than fixed reactively.

---

## What FORGE is

FORGE is an AI-augmented, app-agnostic end-to-end test automation framework, built
as a commercial product for enterprise QA teams — not a personal utility or internal
tool. It is being built for eventual demonstration to enterprise clients (Delta, ICE,
Capgemini), so production-grade reliability and clear failure modes matter more than
moving fast.

Tagline: **Autonomous Quality Engineering**

The core idea: point FORGE at any application (web UI, REST/GraphQL API, eventually
mobile/IoT/cloud), and it crawls or introspects that application, builds a structured
model of it (pages, elements, roles, flows, endpoints), verifies that model against
the live app, self-heals broken selectors, and generates runnable Playwright test
suites — then keeps improving the model with every run.

Branding: metallic "F" logo, circuit traces, orange glow. Circular workflow motif:
**Generate → Execute → Heal → Learn**.

---

## Target architecture (full intended system)

This section describes the complete designed system, including pieces not yet built.
Treat this as the map of where FORGE is going, not a claim about what exists today —
see "Current implementation state" below for what is actually in the repo right now.
Do not assume a capability described here is implemented; check the code or ask.

### 1. Onboarding entry point
A new application target enters through the Platform UI's ONBOARD tab. The user
enters app name, base URL, app type, and per-role credentials. This auto-generates
an `onboarding.{appName}.config.ts` file — roles, credentials env keys, loginUrl,
successUrl, and budgets (maxPages, maxDepth, aiCalls) defined per app.

### 2. Crawl / introspection, branched by app type
- **Web UI** (SPA or multi-page): browser-based crawl via Playwright. Authenticates
  per role (resolves credentials from env, navigates to loginUrl, fills the login
  form using config selectors, validates successUrl, saves storage state). Then
  follows links and clicks sidebar/nav items, captures SPA router URL changes
  (Vue/React), respects page and depth budgets.
- **REST / GraphQL API**: fetches the OpenAPI/Swagger spec directly. Parses all
  paths, methods, params, request and response schemas. No browser launched.
- **Mobile / IoT / Cloud**: not yet implemented. Currently writes a stub model.
  Phase 6 roadmap item.

### 3. Element classification (web UI path)
AI classifies inputs, buttons, links, dropdowns on each crawled page. Builds a
multi-strategy selector chain per element — role, text, CSS, data-test — ranked by
confidence, so verification/healing has fallback options if the primary selector
breaks.

### 4. App Model
The output of crawling + classification is a structured JSON document: all pages,
elements, roles, flows, endpoints. Persisted to SQLite (default) or PostgreSQL
(enterprise). This is the source of truth for every downstream step — generation,
verification, healing all read from and write back to this model.

### 5. Verification
- **Element verification**: navigates to every page, confirms each critical element
  is present using its stored selector chain, times each check.
- **Flow verification**: replays each detected flow end-to-end (login, navigate,
  assert URL), validated across multiple roles.
- **Self-healing**: if a selector fails, `SmartLocator` cascades through the
  element's strategy chain. A working selector gets promoted to primary in the
  model. Claude Vision API is the final fallback — identifies the element from a
  screenshot when no strategy in the chain works, budget-controlled per run.
- Output is a confidence score: **HIGH** confidence means proceed to generation;
  **LOW** confidence means review the model, re-crawl, or manually adjust selectors,
  then re-verify before generating anything.

### 6. Generation (only proceeds on HIGH confidence)
- **Page Objects**: one typed class per page, element accessors with full strategy
  chains.
- **Fixtures**: typed test data, credential resolution, schema-matched per role.
- **Spec files**: runnable Playwright tests, one per detected flow, happy and
  negative paths.
- **API client**: typed HTTP client, one method per endpoint, auth handled.

Additional generation entry points feed into the same spec-file output:
- **Natural language**: describe a test in plain English; AI maps it to App Model
  elements and generates a Playwright spec.
- **Coverage gap analysis**: identifies untested pages, flows, element interactions;
  auto-generates specs to fill the gaps.
- **User Stories + Acceptance Criteria**: paste a user story with AC; each AC becomes
  a test case mapped to the App Model.
- **Manual test cases**: paste step/expected-result format; AI converts it to an
  automated Playwright spec.

### 7. Review (human-in-the-loop gate)
All generated artifacts land in a `generated/` subdirectory. A human reviews, edits,
and approves before anything is promoted to `tests/` for inclusion in the main suite.
Generated output never overwrites human-authored files. This is the REVIEW tab in
the Platform UI — Execute / Save / Reviewed / Reject workflow.

### 8. Execution
- Chromium + WebKit: parallel browser execution, headed locally / headless in CI,
  4 workers default, cross-browser coverage. Note: WebKit is currently excluded
  from CI browser installs to reduce CI install time and only runs locally — this
  is a deliberate existing tradeoff, not an oversight. Firefox is not yet
  configured at all (see TD-LOW-002 in `TECH_DEBT.md`).
- API project: Playwright `APIRequestContext`, no browser launched, REST/GraphQL
  assertions against live endpoints.
- GitHub Actions CI: full suite on every push to main, runs inside the Microsoft
  Playwright Docker image, artifacts stored, DB updated.

### 9. Healing and learning loop
Every heal event (SmartLocator promotion or Vision fallback) is persisted to
SQLite/PostgreSQL. Frequency is tracked; a flaky-element predictor flags unstable
elements over time. This closes the loop: healed selectors get written back into
the App Model, the model improves, and the next run starts from a better baseline.
This is the "Generate → Execute → Heal → Learn" cycle the branding refers to —
intended to be continuous, not a one-time pipeline.

### 10. Reporting and intelligence layer
- **Dashboard**: pass rates, healing trends, coverage heatmap, AI cost ROI tracking.
  Must support drill-down, not just summary metrics — a user looking at an overall
  pass rate needs to click through to: which specific tests failed, on which app/
  role/browser, the actual error and screenshot/trace for that failure, whether AI
  triage classified it as a real Bug vs. flake vs. environment issue, and whether
  it's a new failure or a recurring one (cross-referenced against HealStore/flaky
  predictor history). The goal is that someone can go from "pass rate dropped" to
  "here is the specific broken element/flow and why" without leaving the dashboard
  or grepping CI logs. Treat a flat percentage-and-chart view as insufficient —
  the value of the dashboard is in the drill-down path, not the top-level number.

  **Design direction, decided:** Dashboard is a view layer on top of existing data
  — HealStore, the flaky predictor's scores, AI triage classifications, and
  `run-history.json`/`trends.json` — not a standalone reporting pipeline with its
  own data model. These systems already compute the signals a drill-down needs;
  recomputing or duplicating them creates two sources of truth that will drift.
  The synthesis that makes drill-down "intelligent" (e.g. "this element failed,
  triage called it a flake, it's healed 4 times in the last two weeks, the flaky
  predictor already flagged it") only exists if Dashboard reads from the same
  underlying data those other systems already maintain.

  **Sequencing, decided:** do not start Dashboard implementation while there are
  open, logged correctness issues in the verification/crawl layer (see
  `TECH_DEBT.md` — TD-014 remains open; TD-013 was resolved in commit
  9a0ec90). A drill-down dashboard
  built on top of unreliable underlying signal will surface that unreliability as
  dashboard noise, and the cost of redoing dashboard work after a foundational fix
  is higher than the cost of waiting. This follows the standing rule: prove the
  foundation before building platform UI features on top of it.
- **Release notes**: AI-generated from run history, sprint or full view.
- **Coverage report**: gaps identified, priority scored, auto-spec generation
  suggested.
- **NL query ("Ask")**: natural language query over the full test knowledge base.

---

## Current implementation state (as of Session 7)

This is what actually exists in the repo right now. Verify against the code before
relying on this section — it will go stale faster than the architecture above.

**Completed through Phase 5.6** (REVIEW tab / Test Promotion Engine), actively in
proof-testing against three reference apps: SauceDemo (web-ui/SPA), OrangeHRM
(web-ui/SPA, large element counts), Restful Booker (REST API).

**Built and working:**
- Crawler strategy pattern: `AuthManager`, `StrategyDetector` (auto-detects
  bfs/spa/hybrid), `BFSStrategy`, `SPAStrategy`, `HybridStrategy`,
  `SelfCorrectionEngine` (escalates strategy if too few pages found), `PageVisitor`.
- `ElementClassifier` with AI-assisted naming, budget-tracked, batched in chunks of
  20 elements per AI call to avoid response truncation on large pages.
- `SpecGenerator` — generates self-contained tests with prerequisite steps, not bare
  URL assertions.
- `FlowDetector` — generates login/navigation flow steps from crawled auth pages and
  role configs.
- `VerificationRunner` — element and flow verification, self-healing via SmartLocator
  promotion, confidence scoring.
- REVIEW tab (Phase 5.6) — Execute/Save/Reviewed/Reject UI with a quality gate
  requiring passing execution before promotion.
- GitHub Actions CI (`e2e-pipeline.yml`) — full suite on push to main/develop, AI
  triage/RCA, results storage, adaptive-fixes (dry-run), trend analysis, release
  notes, Slack + email notifications. Auto-commits run history back to main.

**Not yet built** (see Target architecture above for what these will eventually do):
Vision Healer fallback in SmartLocator's chain (mentioned in architecture, not yet
wired up to an actual Vision API call), Dashboard, NL query ("Ask"), Coverage Gap
Analysis, User Story + AC → test case generation, Manual Test Case conversion,
Mobile/IoT/Cloud crawling (currently a stub).

**Known limitations, logged not yet fixed:**
See `TECH_DEBT.md` at the repo root for the current, authoritative list — it has
IDs, priority, and notes, and gets updated more frequently than this file. Check it
before starting work in any area (crawler, verification, generation), since a
relevant open item there should change how you approach a task even if it wasn't
the thing you were explicitly asked to fix. Do not duplicate its contents here;
if this section and `TECH_DEBT.md` ever disagree, `TECH_DEBT.md` is correct.

---

## Tech stack

TypeScript, Playwright (currently 1.58), Node.js (24), Claude API
(`claude-sonnet-4-5` at last check — confirm current model string in
`src/core/ai/AiClient.ts` since this can change), SQLite (default, via
better-sqlite3) / PostgreSQL (enterprise) via Kysely ORM, GitHub Actions CI with the
Microsoft Playwright Docker image.

Repo: `https://github.com/rkasthuri/e2e-ai-testing-framework`, branch `main`.
Pending rename to `forge-framework` before Phase 7 — flag the right moment for this,
do not do it unprompted.

Local dev: Windows PowerShell, working directory `C:\e2e-ai-testing-framework`.

---

## Standing rules

These apply regardless of how a task is phrased or how much autonomy you've been
given for a session.

1. **Prove the foundation before building platform UI features on top of it.**
   Don't add UI surface area for a capability whose underlying model/crawler/
   verification logic hasn't been proven correct first.
2. **Design before patching.** If something needs a structural fix, design it
   properly before writing code — don't reach for the fastest local patch. The
   crawler strategy pattern exists because of this principle; resist the urge to
   bolt a one-off fix onto a method whose architecture is the actual problem.
3. **No moving forward with known bugs.** Fix before proceeding to the next task,
   don't stack new work on top of an unresolved issue in the same area.
4. **App-agnostic by design.** Never hardcode app-specific references (selectors,
   internal naming, URLs) into framework internals under `src/core/`. App-specific
   logic belongs in `src/apps/.../onboarding.{appName}.config.ts`, not in the
   crawler, classifier, or generators.
5. **Silent failures are unacceptable.** Any AI budget exhaustion, strategy
   escalation, or verification failure must produce an explicit console log. If
   you find a `catch` block that swallows an error without logging it, that is a
   bug worth flagging even if it wasn't what you were asked to look at.
6. **Self-contained test generation.** Generated specs must include prerequisite
   steps to reach the state they're testing, not bare URL navigation + assertion.
7. **Don't claim something works without showing the evidence.** Run the actual
   command, read the actual output, and show it — don't summarize a result as
   "passing" or "fixed" without the real numbers attached. This applies to git
   diffs too: confirm what's actually in a file before describing what a fix does.
8. **Flag scope expansion, don't silently absorb it.** If investigating one bug
   surfaces an unrelated one, say so explicitly and ask before fixing it in the
   same commit. Don't bundle unrelated fixes into one change without calling it
   out.
9. **Don't push to remote without confirming what it triggers.** This repo's CI
   pipeline does more than run tests — it hits live external sites, spends real
   Claude API budget, can send Slack/email notifications, and auto-commits run
   history back to main. Confirm this is understood before pushing, especially
   late in a session when nobody may be watching the run.

---

## Common bug patterns already hit in this codebase

Worth knowing before debugging something that looks new — it may be a repeat of one
of these:

- **Stale closures vs. live object properties.** A budget tracker or similar stateful
  object that captures a value by reference at construction time but exposes a plain
  property (not a getter) will silently report stale data forever, even while its
  own methods see the live value correctly. If you see a logged value that never
  changes across iterations where it obviously should, check for this.
- **Credential placeholder suffix mismatches.** Flow generation and flow execution
  must agree on the exact placeholder format for username/password. If one side
  produces `{{KEY}}` and the other expects `{{KEY_USERNAME}}` / `{{KEY_PASSWORD}}`,
  or if `credentialsEnvKey` already includes a suffix like `_CREDENTIALS` that gets
  double-appended, login will fail silently (empty string resolves, form submits
  empty, page redirects back to login) rather than throwing a clear error.
- **AI calls with unbounded input batch size.** Sending all unnamed/unclassified
  elements from a page in a single AI call works fine until a page has enough
  elements that the response gets truncated or returns malformed JSON. Batch in
  fixed-size chunks (20 has worked well) rather than raising `maxTokens` alone.
- **Click-based SPA discovery accidentally mutating app state.** A nav-button-text
  matcher that's too broad (e.g. matching on `/cart/i`) can match action buttons
  like "Add to cart" that aren't navigation at all — clicking them during crawl
  exploration silently changes app state (e.g. populates a cart) as a side effect
  with no benefit, since they were never going to produce a new URL to discover.
- **Self-healing displacing better selectors.** A healing routine that promotes
  whatever strategy worked to the top of the chain, without checking confidence
  tiers, can let a brittle low-confidence match (e.g. `text=` selector) overwrite a
  reliable one (e.g. `data-test` or `id`). Guard promotions: never let a lower-tier
  strategy type displace a higher-tier one as primary.

---

## When you're not sure

If a task description implies a capability from the Target Architecture section that
you can't find implemented in the code, say so rather than assuming it exists or
silently building a minimal version of it. If a fix you're making touches an area
with an open, logged limitation (check `MEMORY.md`), mention the connection rather
than treating the area as a blank slate.
