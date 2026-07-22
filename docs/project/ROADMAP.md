# ROADMAP.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> This document describes where FORGE has been, where it is now, and where it
> is going. Status labels are applied strictly:
>
> ✅ **Shipped** — built, validated, CI green, honesty signals in place
> 🔄 **In Progress** — actively being built in the current milestone
> 🗓️ **Planned** — committed future work, not yet started
> 💡 **Exploratory** — possible future direction, not yet committed
>
> ⚠️ Under-claiming is as much a violation as over-claiming. If something is
> built and working, it is marked ✅. If it is partially built, it is marked 🔄
> with an honest description of what is and is not complete.
>
> Verify current milestone status against `PROJECT_STATE.md` and on-disk
> `TECH_DEBT.md` before citing this document externally.

---

## Current Phase

**Phase: AI-Augmented Automation Platform**
**Current Focus: Platform UI — tab-by-tab build-out**

The core pipeline (Crawl → Model → Verify → Generate → Execute → Triage → Heal →
Learn) is operational across three live test targets. The current milestone is
completing the forge-ui platform UI to a production-ready state, followed by
agentic crawl architecture.

---

## Phase 1 — Foundation (Shipped)

The core framework, infrastructure, and pipeline skeleton.

| Capability | Status | Notes |
|---|---|---|
| Playwright + TypeScript stack | ✅ Shipped | Core automation layer |
| SQLite storage via Kysely | ✅ Shipped | App model, run history, healing events |
| GitHub Actions CI/CD | ✅ Shipped | Runs on every push to main |
| BFSStrategy crawl | ✅ Shipped | Traditional multi-page app crawling |
| SPAStrategy crawl | ✅ Shipped | JavaScript navigation detection |
| HybridStrategy crawl | ✅ Shipped | Combined BFS + SPA |
| StrategyDetector auto-selection | ✅ Shipped | No manual strategy config required |
| AuthManager | ✅ Shipped | Per-role auth before crawl |
| ElementClassifier (batched) | ✅ Shipped | Batched at ≤20 elements, 1024 tokens |
| FlowDetector | ✅ Shipped | User journey identification |
| App Model generation | ✅ Shipped | Pages, elements, flows, roles, confidence |
| VerificationRunner | ✅ Shipped | Selector validation against live app |
| SelfCorrectionEngine | ✅ Shipped | Fallback selector strategies on failure |
| Evidence tier scoring | ✅ Shipped | Confidence derived from observation |
| InputHealth Gate | ✅ Shipped | Blocks downstream on low-quality input |
| TestGenerator | ✅ Shipped | POM, spec, fixture generation |
| REST API crawl (ApiSpecCrawler) | ✅ Shipped | Endpoint discovery |
| Run execution via Playwright | ✅ Shipped | Full suite, smoke, area-specific |

---

## Phase 2 — Intelligence Layer (Shipped)

AI-powered triage, healing, and analysis.

| Capability | Status | Notes |
|---|---|---|
| 5-category AI triage classifier | ✅ Shipped | Evidence-gated, 97.4% accuracy* |
| `insufficient-evidence` as first-class outcome | ✅ Shipped | 0% false app-bug rate* |
| Triage evaluation harness | ✅ Shipped | Ground-truth dataset, measurable pass threshold |
| Generation evaluation harness | ✅ Shipped | 100% behavioural pass rate on SauceDemo* |
| Healing evaluation harness | ✅ Shipped | Correctness of selector repair* |
| SmartLocator | ✅ Shipped | Multi-strategy element re-identification |
| HealStore | ✅ Shipped | Healing event persistence with confidence tiers |
| VisionHealer | ✅ Shipped | Visual-similarity healing supplement |
| AdaptiveFixes | ✅ Shipped | Applies approved fixes to test files |
| FlakyPredictor | ✅ Shipped | Risk-scored from historical run data |
| TrendAnalysis | ✅ Shipped | Pass/fail trends across runs |
| CoverageGapEngine | ✅ Shipped | Identifies untested scenarios |
| ReleaseNotesGenerator | ✅ Shipped | Human-readable notes from run data |
| AiBudgetTracker | ✅ Shipped | Live budget tracking via getter |

*Verify current figures against evaluation harness with CC before citing.

---

## Phase 3 — Validation Against Real Apps (Shipped)

End-to-end validation across structurally different applications.

| Capability | Status | Notes |
|---|---|---|
| SauceDemo (MPA) validation | ✅ Shipped | Auth, cart, checkout, edge cases |
| OrangeHRM (SPA) validation | ✅ Shipped | HR management, multi-role, deep nav |
| Restful Booker (REST API) validation | ✅ Shipped | CRUD, endpoint discovery |
| 316 Playwright tests passing | ✅ Shipped | Last known baseline — verify with CC |
| Copyright headers across codebase | ✅ Shipped | AnvilQ header on all .ts/.tsx files |

---

## Phase 4 — Platform UI (In Progress)

The forge-ui control surface — tab by tab, honesty-first.

| Tab / Capability | Status | Notes |
|---|---|---|
| forge-ui package scaffold | ✅ Shipped | React + Express + Tailwind v3 + shadcn/ui |
| Onboard tab | ✅ Shipped | 9 UX fixes, live log panel (TD-UI-011) |
| Crawl tab | ✅ Shipped | Full implementation, TD-UI-002/016/019/020/022 resolved |
| Tests tab | 🔄 In Progress | Design approved (TD-UI-003), build in progress |
| Results tab | 🔵 Stub | Not started — after Tests tab |
| Insights tab | 🔵 Stub | Not started |
| Settings tab | 🔵 Stub | Not started |
| forge-ui production build in CI | ✅ Shipped | Must exit 0 on every push |
| `forge ui` launch command | ✅ Shipped | npm link, forgeUI.bat on Windows |

> ⚠️ Verify current tab status against on-disk TECH_DEBT.md before citing.
> The Tests tab build may have progressed since this document was written.

---

## Phase 5 — Agentic Crawl Architecture (In Progress / Planned)

Goal-directed, stateful exploration replacing scripted traversal.

| Capability | Status | Notes |
|---|---|---|
| AgentPlanner | 🔄 In Progress | Goal decomposition into executable steps |
| WebUIEnvironment | 🔄 In Progress | Browser execution surface for agent |
| ApiEnvironment | 🔄 In Progress | API execution surface for agent |
| AgentMemoryRepository | 🔄 In Progress | Cross-session goal memory persistence |
| GoalMemory | 🔄 In Progress | Agent learns across runs, not just within them |
| Supervised mode (default) | 🔄 In Progress | Agent stops for confirmation |
| Autonomous mode (flag-gated) | 🗓️ Planned | Explicit `--autonomous` flag required |
| Prerequisite execution (TD-013 resolution) | 🗓️ Planned | Stateful page setup before verification |
| Confidence decay | 🗓️ Planned | Older observations lose confidence over time |
| Bootstrap Mode | 🔄 In Progress | Auto-config from URL, no manual setup |

> **Gate:** Agentic expansion does not proceed on an untrustworthy evidence layer.
> The honesty floor (Phase 2) must remain solid as Phase 5 builds.

---

## Phase 6 — Governance and Quality Gates (Planned)

Review, approval, and policy layer — the one pipeline stage not yet built.

| Capability | Status | Notes |
|---|---|---|
| Review / Approval workflow | 🗓️ Planned | Human review gate before test promotion |
| Policy engine | 🗓️ Planned | Configurable rules for what gets tested |
| Governance absorbs TD-139 | 🗓️ Planned | See TD-139 in on-disk TECH_DEBT.md |

---

## Phase 7 — Multi-Model Cost Routing (Exploratory)

Tiered AI model selection based on task stakes and cost.

| Capability | Status | Notes |
|---|---|---|
| Local Ollama (CPU) in stack | ✅ Shipped | Present but not wired to production pipeline |
| GLM / Ollama tiered routing | 💡 Exploratory | Lower-cost model for lower-stakes tasks |
| A/B eval on tiered routing | 💡 Exploratory | **Gate: TD-080 fixed first** so eval harness measurement is trustworthy before A/B comparison |

---

## Phase 8 — Dashboard and Reporting (Planned)

Visual run status, trend charts, and insight surfaces.

| Capability | Status | Notes |
|---|---|---|
| Dashboard server | 🗓️ Planned | After pipeline is fully stable |
| forge-ui Results tab | 🗓️ Planned | Data view on existing SQLite data |
| forge-ui Insights tab | 🗓️ Planned | Trend and coverage gap visualisation |
| forge-ui Settings tab | 🗓️ Planned | App config and run configuration |

> **Gate:** Dashboard builds on top of reliable underlying pipeline signal.
> Drill-down dashboard built on unreliable signal surfaces that unreliability
> as dashboard noise. Pipeline stability comes first.

---

## Phase 9 — Calibration Engine (Exploratory)

Ongoing monitoring for honesty drift in AI components.

| Capability | Status | Notes |
|---|---|---|
| Calibration Engine | 💡 Exploratory | Parked research lane — guards against AI honesty drift over time |

---

## Phase 10 — Extended Surface Coverage (Planned)

Same pipeline, different surfaces beyond web UI and REST API.

| Capability | Status | Notes |
|---|---|---|
| Mobile application testing | 🗓️ Planned | Applying pipeline to native/mobile screens |
| IoT device / interface testing | 🗓️ Planned | Extending to device-level interfaces |
| GraphQL API testing | ✅ Shipped | ApiSpecCrawler handles GraphQL |

---

## Sequencing Principles

The roadmap above is not just a feature list. The sequencing reflects deliberate
architectural decisions:

**1. Honesty floor before agentic expansion**
Agentic loops amplify whatever evidence layer sits beneath them. Phase 5
(agentic) does not expand until Phase 2 (intelligence, honesty signals) is solid.

**2. Pipeline stability before dashboard**
A dashboard built on an unstable pipeline surfaces instability as noise.
Phases 1–5 must be stable before Phase 8 begins.

**3. Eval harness before multi-model routing**
TD-080 (eval harness measurement integrity) must be resolved before A/B testing
multi-model routing. An A/B comparison on a broken harness produces meaningless
results.

**4. No capability claimed without demonstrated evidence**
Items marked ✅ Shipped have CI evidence. Items marked 🔄 In Progress have
partial evidence. Items marked 🗓️ Planned have none. The roadmap does not
promote items without evidence.

---

## The Milestone Commitment

When the completion map is honestly GREEN across the full pipeline and the
framework is validated app-agnostic across structurally different web UIs
beyond the current three test applications, Aiden must say exactly:

> *"RAJ, Today your FORGE can handle all the Web Apps built on Popular technology."*

This statement will not be made prematurely. The same evidence bar applies
as for all other resolution claims.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
