# CODEBASE_MAP.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-21 — sourced from CC directory tree + repo verification -->

> High-level map of the FORGE repository — modules, ownership, dependencies,
> and the boundaries between them.
> For directory-level layout, see REPOSITORY_STRUCTURE.md.
> This document focuses on what each module does and how modules relate.
>
> ⚠️ Exact file names within modules should be verified with CC.
> Module names and responsibilities below are grounded in CC's directory read
> and session history.

---

## 1. The Two Top-Level Boundaries

```
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│           src/                  │   │          forge-ui/               │
│                                 │   │                                  │
│  Engine — headless core         │   │  Platform UI — React + Express   │
│  No dependency on forge-ui/     │   │  Depends on engine via API only  │
│                                 │   │                                  │
│  Owner: Aiden (design)          │   │  Owner: Aiden (design)           │
│         CC/Codex (impl)         │   │         CC/Codex (impl)          │
└─────────────┬───────────────────┘   └──────────────────┬───────────────┘
              │                                          │
              │         ExecutionContext + REST API       │
              └──────────────────────────────────────────┘
                    (only permitted communication channel)
```

**Rule:** `src/` never imports from `forge-ui/`. Violation is an architectural
defect, not a style issue. Enforced in every Aiden diff review.

---

## 2. Engine Modules (`src/`)

### 2.1 `src/core/agent/` — Agentic Crawl

**Status:** 🔄 In progress
**Purpose:** Goal-directed, stateful exploration of target applications.

| Component | Responsibility |
|---|---|
| `AgentPlanner` | Decomposes a high-level goal into executable steps |
| `WebUIEnvironment` | Browser execution surface — where agent steps run |
| `ApiEnvironment` | API execution surface for API-target agents |
| `AgentMemoryRepository` | Persists GoalMemory across sessions to SQLite |

**Dependencies:** `src/core/ai/` (Claude API), `src/core/storage/` (memory persistence), `src/core/crawler/` (strategy execution)

**Key constraint:** Agent may never synthesise or infer paths it has not actually
navigated. Evidence must be real.

---

### 2.2 `src/core/ai/` — AI Layer

**Status:** ✅ Active
**Purpose:** Horizontal service layer. Provides Claude API access to all pipeline stages.

| Component | Responsibility |
|---|---|
| Claude API client | Sends prompts, receives completions, handles retries |
| `AiBudgetTracker` | Tracks token usage per run via getter (`.remaining` is always live) |

**Dependencies:** Anthropic SDK (`@anthropic-ai/sdk`), `.env` for `ANTHROPIC_API_KEY`

**Used by:** Model (element naming, flow detection), Verify (evidence grounding),
Triage (classification), Heal (selector reasoning), Agent (planning)

**Key constraint:** Budget exhaustion is logged, never silently ignored.

---

### 2.3 `src/core/crawler/` — Crawl Strategies

**Status:** ✅ Active (Bootstrap signals under active investigation — TD-162/163)
**Purpose:** Discovers pages, elements, navigation paths, and API endpoints
from the live target application.

| Component | Responsibility |
|---|---|
| `StrategyDetector` | Auto-selects BFS / SPA / Hybrid from live page signals |
| `BFSStrategy` | Breadth-first link traversal for MPA targets |
| `SPAStrategy` | JavaScript navigation detection for SPA targets |
| `HybridStrategy` | Combined BFS + SPA for mixed targets |
| `AuthManager` | Executes per-role auth flows before crawl begins |
| `ApiSpecCrawler` | Discovers REST API and GraphQL endpoints |

**Dependencies:** Playwright (browser automation), `src/core/ai/` (element naming during crawl), `src/core/storage/` (model persistence)

**Known issues:**
- TD-162: StrategyDetector signal counting fault (investigation in progress)
- TD-163: spaDom=1 marker does not discriminate MPA from SPA (investigation in progress)
- TD-014: SPAStrategy single-hop only — no recursive discovery

---

### 2.4 `src/core/healing/` — Self-Healing

**Status:** ✅ Active
**Purpose:** Detects broken test selectors and repairs them automatically.

| Component | Responsibility |
|---|---|
| `SmartLocator` | Re-identifies elements using the selector fallback hierarchy |
| `HealStore` | Persists healing events with confidence tiers to SQLite |
| `VisionHealer` | Visual-similarity-based healing supplement |
| `AdaptiveFixes` | Applies Aiden-approved fixes to test files on disk |

**Dependencies:** Playwright (browser interaction), `src/core/storage/` (HealStore), `src/core/ai/` (reasoning)

**Key constraint:** A heal never promotes a lower-confidence selector over a
higher-confidence one. Healing moves up the hierarchy, never down.

**Selector fallback hierarchy (high → low):**
```
data-test → id → aria-label → role+text → text content
```

---

### 2.5 `src/core/onboarding/` — App Onboarding Pipeline

**Status:** ✅ Active
**Purpose:** Crawl → Model → Verify → Generate for a target application.
This is the primary onboarding workflow.

| Component | Responsibility |
|---|---|
| `cli.ts` | CLI entry point — `crawl / verify / generate / refresh` subcommands |
| `Crawler.ts` | Orchestrates crawl strategies via `StrategyDetector` |
| `ElementClassifier` | AI element naming — batched ≤20 per call, 1024 tokens |
| `FlowDetector` | Identifies user journeys from the crawl graph |
| `ModelValidator` | Validates the app model before persistence |
| `VerificationRunner` | Verifies selectors against the live app |
| `SelfCorrectionEngine` | Fallback selector strategies during verification |
| `generators/PomGenerator` | Generates Playwright Page Object Model classes |
| `generators/SpecGenerator` | Generates Playwright spec files |
| `generators/FixtureGenerator` | Generates role + auth fixtures |

**Dependencies:** Playwright, `src/core/ai/`, `src/core/storage/`, `src/core/crawler/`

**Config resolution:** `src/core/config/appConfig.ts` resolves the per-app
onboarding config from `src/apps/<platform>/<type>/<appname>/onboarding.<appname>.config.ts`

**Known issue — TD-013:** VerificationRunner navigates directly to page URLs
with no prerequisite state setup. Stateful pages (cart, checkout) are visited empty.

---

### 2.6 `src/core/pipeline/` — AI Pipeline Stages

**Status:** ✅ Active (individual scripts — some carry open TDs)
**Purpose:** The post-execution intelligence layer. Processes run results.

| Script | npm command | Responsibility |
|---|---|---|
| `ai-triage.ts` | `npm run triage` | Classifies failures into 5 evidence-gated categories |
| `results-store.ts` | `npm run store` | Persists run results to SQLite |
| `adaptive-fixes.ts` | `npm run fixes` | Applies AI-generated selector fixes |
| `impact-analysis.ts` | `npm run impact` | Identifies tests affected by app changes |
| `nl-test-generator.ts` | `npm run generate` | Generates tests from the app model |
| `trend-analysis.ts` | `npm run trends` | Pass/fail trend analysis (continue-on-error in CI — TD-051) |
| `release-notes.ts` | `npm run release:notes` | Human-readable run notes (continue-on-error in CI — TD-051) |
| `flaky-predictor.ts` | `npm run predict:flaky` | Risk-scores tests for flakiness |
| `coverage-gap.ts` | `npm run coverage:gaps` | Identifies untested scenarios |
| `gap-to-test.ts` | `npm run gaps:generate` | Generates tests to fill gaps |
| `knowledge-query.ts` | `npm run query` | Queries the FORGE knowledge base |
| `notifier.ts` | `npm run notify` | Slack / email run notifications |

**Dependencies:** `src/core/storage/`, `src/core/ai/`, Playwright run output

---

### 2.7 `src/core/storage/` — Database Layer

**Status:** ✅ Active
**Purpose:** All SQLite persistence — schema, migrations, and typed repositories.

| Component | Responsibility |
|---|---|
| `migrate.ts` | Migration runner — applies pending schema changes sequentially |
| `migrations/` | ~15 sequential migration files |
| `repositories/` | ~16 typed Kysely repositories (one per table) |

**Database:** `forge-framework.db` — SQLite, path resolved at runtime

**ORM:** Kysely (TypeScript-first query builder)

**Core tables:**

| Table | Contents |
|---|---|
| `runs` | Every pipeline run — timestamp, app, trigger source, run ID |
| `heal_events` | Healing history — what broke, fix applied, confidence tier |
| `ai_usage` | Claude API token usage per run |
| `flaky_analysis` | Flakiness scores and history per test |
| `coverage_gaps` | Identified coverage gaps |
| `trends` | Pass/fail trend data across runs |
| `dom_snapshots` | Page DOM snapshots captured during crawl |
| `assertions` | Verified assertions with evidence tier |

**Dependencies:** `better-sqlite3`, Kysely

---

### 2.8 `src/core/triage/` — Triage Taxonomy

**Status:** ✅ Active
**Purpose:** Defines and enforces the 5-category evidence-gated classification system.

| Category | Meaning |
|---|---|
| `app-bug` | Positive evidence the application regressed |
| `test-defect` | Wrong assertion or bad test logic |
| `infra-defect` | Timeout, network, or environment instability |
| `flaky` | Non-deterministic across runs |
| `insufficient-evidence` | Cannot determine — AI refuses to guess |

**Dependencies:** `src/core/ai/` (Claude API for classification), `src/core/storage/`

**Key constraint:** `insufficient-evidence` is a first-class outcome.
The classifier declares its competence boundaries (ADR-019) before issuing
any conclusion.

---

### 2.9 `src/core/evidence/` — Evidence Tier Scoring

**Status:** ✅ Active
**Purpose:** Computes and enforces evidence tiers across the pipeline.
Ensures assertion confidence never exceeds prerequisite confidence.

**Dependencies:** Used by `src/core/onboarding/` (verify phase) and `src/core/triage/`

---

### 2.10 `src/core/identity/` — Login-Surface Observer

**Status:** ✅ Active (formerly identity-divergence detector — retired TD-148)
**Purpose:** Produces scoped, honest observations about the login surface.
Each observation carries: observed value + mechanism (including blind spot) +
non-implications (competing causes not ruled out).

**What was retired:** The identity-divergence detection capability — retired
because it could never satisfy discriminative competence (ADR-019 Axis 2).
"Narrower, not weaker."

---

### 2.11 `src/core/ground-truth/` — Ground-Truth Management

**Status:** ✅ Active (b6adb5b — unpushed harness)
**Purpose:** Manages ground-truth datasets used by evaluation harnesses.

**Dependencies:** `evals/`, `fixtures/ground-truth/`

---

### 2.12 `src/core/workspace/` — Workspace Utilities

**Status:** ✅ Active
**Purpose:** Workspace and file management utilities used across pipeline stages.

---

### 2.13 `src/apps/` — Per-App Configurations and Generated Tests

**Status:** ✅ Active
**Purpose:** Contains the onboarding config and generated test suite for each
target application. This is where app-specific knowledge lives — not in the engine.

| App | Path | Type | Status |
|---|---|---|---|
| SauceDemo | `src/apps/desktop/ui/saucedemo/` | MPA | ✅ Active |
| OrangeHRM | `src/apps/desktop/ui/orangehrm/` | SPA | ✅ Active |
| UltimateQA | `src/apps/desktop/ui/ultimateqa/` | Unknown | ⚠️ Verify status with Raj |
| Restful Booker | `src/apps/desktop/api/restful-booker/` | REST API | ✅ Active |

---

### 2.14 `src/platform/` — DEPRECATED

**Status:** ⛔ Deprecated — do not add to this directory
**Purpose:** Was the original platform UI surface.
Superseded entirely by `forge-ui/`.
Present on disk but receives no new investment.

---

## 3. Platform UI Modules (`forge-ui/`)

### 3.1 `forge-ui/src/pages/` — Tab Pages

| Page | Tab | Status |
|---|---|---|
| `OnboardPage.tsx` | Onboard | ✅ GREEN |
| `CrawlPage.tsx` | Crawl | ✅ GREEN |
| `TestsPage.tsx` | Tests | 🔄 In progress (TD-UI-003) |
| `ResultsPage.tsx` | Results | 🔵 Stub |
| `InsightsPage.tsx` | Insights | 🔵 Stub — "Coming soon" (TD-UI-062) |
| `SettingsPage.tsx` | Settings | 🔵 Stub |

---

### 3.2 `forge-ui/src/lib/` — UI Utilities

| Utility | Responsibility |
|---|---|
| `ExecutionContext` | The bridge between forge-ui and the engine |
| `ProjectSession` | Session storage fallback for project state across navigation |
| `buildProjectRoute` | URL-param-aware route builder for project navigation |

---

### 3.3 `forge-ui/server/` — Express REST API

**Purpose:** Transport layer only. Routes receive a request, call an
`ExecutionContext` method or service, and return a response.
No business logic. No direct database access.

| File | Status | Notes |
|---|---|---|
| `routes/` | ✅ Active | Per-tab route handlers |
| `insights.ts` | ⚠️ 501 stub | TD-UI-062 — no real implementation |

---

## 4. Supporting Modules

### 4.1 `scripts/` — Unit Test Suite

~60 `verify-*.test.ts` files.
531 tests covering pipeline scripts, storage repositories, and utilities.
Run via Node.js built-in test runner: `npm run test:unit`.

### 4.2 `evals/` — AI Evaluation Harnesses

| Harness | What it measures |
|---|---|
| `triage/` | 5-category triage classification accuracy |
| `generation/` | Generated spec behavioural correctness |
| `healing/` | Selector repair correctness |
| `vision/` | VisionHealer accuracy |

### 4.3 `docs/ADR/` — Architecture Decision Records

20 ADRs (ADR-001 through ADR-020). Dated history of structural decisions.
ADRs are not current-state docs — they record what was decided.
See `DECISION_LOG.md` for summaries.

### 4.4 `models/` — Generated App Models

Runtime output of the onboarding pipeline.
One `app-model.json` per target application.
Not committed — generated on demand.

### 4.5 `fixtures/ground-truth/` — Eval Datasets

Labelled ground-truth datasets used by `evals/` harnesses.

---

## 5. Module Dependency Map

```
forge-ui/pages
    └── forge-ui/lib/ExecutionContext
            └── forge-ui/server/routes
                    └── src/core/onboarding/ (via ExecutionContext)
                    └── src/core/pipeline/   (via ExecutionContext)

src/core/onboarding/
    ├── src/core/ai/          (element naming, flow detection)
    ├── src/core/crawler/     (strategy execution)
    ├── src/core/storage/     (model persistence)
    └── src/core/evidence/    (confidence scoring)

src/core/pipeline/
    ├── src/core/ai/          (triage, generation, analysis)
    ├── src/core/storage/     (results, healing, gaps)
    └── src/core/healing/     (adaptive fixes)

src/core/agent/
    ├── src/core/ai/          (planning)
    ├── src/core/crawler/     (strategy execution)
    └── src/core/storage/     (goal memory)

scripts/ (tests)
    └── src/core/* (imports engine modules for unit testing)

evals/
    └── src/core/triage/      (triage eval)
    └── src/core/onboarding/  (generation eval)
    └── src/core/healing/     (healing eval)
```

---

## 6. Ownership Summary

| Module | Design owner | Implementation |
|---|---|---|
| All `src/` modules | Aiden | CC or Codex (active agent) |
| All `forge-ui/` | Aiden | CC or Codex (active agent) |
| ADRs | Aiden | Written by Aiden after Nova review |
| `TECH_DEBT.md` | Raj | Updated by implementation agent + Aiden review |
| `evals/` harnesses | Aiden | CC or Codex |
| `docs/` (this set) | Aiden | Aiden only |
| `src/apps/<appname>/` | Raj (scope) | Generated by FORGE + CC for config |

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
