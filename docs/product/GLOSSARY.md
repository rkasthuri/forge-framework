# GLOSSARY.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> Definitions of FORGE terminology, concepts, abbreviations, and agent names.
> When a term has a specific technical meaning in FORGE that differs from its
> general industry meaning, the FORGE meaning takes precedence here.
> If a term is missing, add it — do not leave it undefined in documentation.

---

## A

**ADR (Architecture Decision Record)**
A dated document capturing a significant architectural decision made during FORGE's
development. Records the context, the options considered, the decision made, and
the reasoning. ADRs are history — they describe what was decided, not necessarily
what is currently implemented. Implementation sections are appended with dates when
a capability ships after the decision.

**Agent / AI Agent**
An AI system that operates within FORGE's collaboration model. Agents have defined
roles, authorities, and constraints. See `AI_CONSTITUTION.md` for the full roster
and rules. In FORGE's agentic architecture (Phase 1b), an agent is specifically an
AI that can plan, act, observe, and decide within a browser or API environment.

**Agentic Crawl**
An in-progress extension of the Crawl phase (Phase 1) in which an AI agent
navigates the application goal-directed rather than following a fixed traversal
strategy. The agent plans steps, executes them in a real browser, observes what
actually happens, and decides whether to continue, backtrack, or escalate.
Distinct from the scripted BFS/SPA/Hybrid strategies.

**AgentMemoryRepository**
The persistence layer for GoalMemory. Stores cross-session agent knowledge so
the agentic crawler does not re-explore paths it has already proven.

**AgentPlanner**
The component responsible for decomposing a high-level goal (e.g. "reach the
checkout page") into a sequence of executable steps for the agentic crawler.

**AI Budget Tracker (`AiBudgetTracker`)**
A utility that tracks Claude API call consumption per run. Uses a getter for
`.remaining` so the live value is always accurate. Budget exhaustion is logged,
not silently ignored.

**AI Layer**
The horizontal service layer that exposes Claude API capabilities to pipeline
stages. Not a pipeline stage itself — it is infrastructure. Used by: Model
(element naming, flow detection), Verify (evidence grounding), Triage (failure
classification), Heal (selector repair reasoning), and Agentic Crawl (planning).

**App Model**
The structured representation of a target application produced by the Model phase
(Phase 2). Contains pages, elements, flows, roles, confidence metadata, and
provenance fields (`observed | inferred`). Persisted to SQLite and as
`models/<appname>/app-model.json`. The authoritative source for all downstream
pipeline stages.

**App-Agnostic**
FORGE works across structurally different web applications without application-
specific hardcoding. The same pipeline, the same strategies, the same AI layer
run against SauceDemo, OrangeHRM, Restful Booker, or any new app — with no
custom code written per application.

**AppType**
A field in the onboarding config that tells FORGE what kind of target it is
crawling. Values: `mpa` (traditional multi-page app), `spa` (single-page app),
`rest-api`, `graphql-api`. Mobile and IoT types are planned.

**ApiSpecCrawler**
The crawler component used for REST API and GraphQL targets. Discovers endpoints,
schemas, and behaviour rather than DOM elements and navigation paths.

**Assertion Confidence**
A score attached to every verified assertion indicating how strongly the evidence
supports the claim. Derived from the evidence tier of the selector or observation
used. Assertion confidence can never exceed prerequisite confidence — dependent
checks cannot be stronger than their evidence chain.

**AuthManager**
The component that handles authentication flows before a crawl begins. Executes
login steps per role using credentials resolved from environment variables.
Never stores credentials — reads them at runtime via `credentialsEnvKey`.

---

## B

**BFSStrategy**
Breadth-first search crawl strategy. Used for traditional multi-page applications
where navigation is primarily through `<a href>` links. Discovered via
`StrategyDetector` — not manually configured.

**Bootstrap Mode**
An in-progress capability that allows FORGE to be pointed at a URL and
automatically detect the app type, auth requirements, and crawl strategy —
then generate the onboarding config file. Eliminates the manual config creation
step for new applications.

**Budget**
See *AI Budget Tracker*. Also refers to the per-app crawl budget defined in
the onboarding config: `maxPages`, `maxDepth`, `aiCalls`.

---

## C

**CC (Claude Code)**
The primary implementation agent. Executes on-disk work from Aiden-approved
briefs. One of two implementation agents (the other being Codex) — only one
is active at any time. Subject to all rules in `AI_CONSTITUTION.md`.

**Checkpoint**
A mandatory stop point during implementation work where the active implementation
agent (CC or Codex) reports back to Raj before continuing. Checkpoints occur
after every scoped step, before every commit, before every push, and whenever
something unexpected is discovered.

**Codex (OpenAI Codex)**
An additional implementation agent. Identical responsibilities and constraints
to CC. May replace CC as the active implementation agent. Only one implementation
agent is active at any time.

**Confidence Decay**
A planned mechanism by which the confidence attached to older observations
decreases over time, eventually requiring re-verification before the observation
can be acted upon as current truth. Guards against stale models being treated as
fresh evidence.

**Contract Drift**
The API equivalent of a broken selector. Occurs when an API endpoint's response
shape, field names, types, or required parameters change. FORGE's self-healing
concept for APIs is detecting and adapting to contract drift rather than
re-locating a DOM element.

**Coverage Gap**
A test scenario that exists in the application model but has no corresponding
test case. Identified by the `CoverageGapEngine` in Phase 8 (Learn).
Logged as entries in the `coverage_gaps` SQLite table.

**CoverageGapEngine**
The component in Phase 8 that analyses the app model against the existing test
suite and identifies what is not being tested.

**credentialsEnvKey**
A field in each role definition within the onboarding config. References the
environment variable name that holds `username:password` credentials for that
role. Credentials are never stored in config files or the database.

---

## D

**data-test attribute**
The highest-confidence selector strategy in FORGE's fallback hierarchy.
An element with a `data-test` attribute (e.g. `data-test="login-button"`)
is the most stable selector because it is explicitly set for testing and
is not changed by visual redesigns.

**Decision Log**
See `DECISION_LOG.md`. A chronological record of significant architectural
decisions with links to the corresponding ADRs.

**Discriminative Competence (ADR-019)**
The second axis of the vocabulary competence boundary. Asks: do the available
observations uniquely support the assertion being made? Even if a detector can
represent a value (Axis 1), it cannot issue a definitive conclusion if competing
causes have not been ruled out. Both axes must be satisfied.

---

## E

**ElementClassifier**
The component that uses the Claude API to assign meaningful names to discovered
UI elements based on their context, role, and surroundings — not just their DOM
label. Batches elements in groups of 20 per AI call to avoid token truncation.

**Engine**
The `src/` directory and everything in it. The headless core of FORGE — pipeline
stages, AI layer, storage, and core utilities. Has no dependency on `forge-ui/`.
Can be run as a CLI tool independently of any UI.

**Engine Boundary**
The architectural rule that `src/` (engine) must never import from `forge-ui/`
(platform UI). `forge-ui/` communicates with the engine exclusively through
`ExecutionContext` and the defined REST API surface.

**Evidence**
Observed, recorded facts about a live application obtained through actual
browser interaction or API calls. The only legitimate basis for assertions,
confidence scores, and triage classifications in FORGE. Inferred or fabricated
evidence is an architectural defect.

**Evidence Gate**
A control point that prevents downstream pipeline stages from proceeding unless
upstream evidence meets a quality threshold. The InputHealth Gate in Phase 3 is
an example. The triage classifier's refusal to classify without sufficient
evidence is another.

**Evidence Tier**
A classification of how strongly a piece of evidence supports an assertion.
Higher tiers correspond to more specific, stable, and uniquely identifying
observations. Used to compute assertion confidence scores.

**ExecutionContext**
The defined bridge between `forge-ui/` and `src/`. All communication from the
UI layer to the engine passes through `ExecutionContext`. It is the only point
of contact between the two boundaries.

---

## F

**Finn**
The UX and product critique agent. Reviews `forge-ui/` changes after CI green.
Provides end-user perspective feedback. Does not block pushes and does not
review engine code. Feedback is logged as TD-UI-* items if actionable.

**FlowDetector**
The component in Phase 2 that identifies user journeys (login, checkout, form
submission, navigation paths) from the crawl graph. Assigns credential
placeholder keys with `_USERNAME` / `_PASSWORD` suffixes for runtime resolution.

**Flaky (triage category)**
A test failure classification meaning the test is non-deterministic — it fails
in some runs and passes in others without a consistent cause. One of the five
evidence-gated triage categories.

**FlakyPredictor**
The component in Phase 8 that risk-scores tests for flakiness based on
historical run data. Produces a flakiness probability per test.

**FORGE**
Framework for Observed, Reasoned, and Grounded Evaluation. An AI-augmented,
app-agnostic end-to-end test automation platform built by Raj Kasthuri under
AnvilQ Technologies LLC.

**forge-framework.db**
The SQLite database file at the repository root. Path resolved at runtime —
never hardcoded. The primary persistent store for all run data, healing events,
AI usage, coverage gaps, trends, and assertions.

**forge-ui**
The platform UI package (`forge-ui/` directory). React + TypeScript + Tailwind
v3 + shadcn/ui + Express REST API. Communicates with the engine via
`ExecutionContext` only. Dark mode. Primary orange: `#E8650A`.

---

## G

**GoalMemory**
The cross-session knowledge store for the agentic crawler. Persists what the
agent learned in previous runs so it does not re-explore proven paths.
Managed by `AgentMemoryRepository`. In progress.

**GREEN**
A capability, tab, feature, or pipeline stage is GREEN when **both** of the
following are true:
1. **Honest** — reports truthfully, surfaces errors, does not fabricate output
2. **Correct** — the underlying behaviour is what it claims to be

GREEN requires both dimensions. One alone is insufficient.

---

## H

**HealStore**
The persistence component for healing events. Records what broke, what strategy
was used to re-locate the element, the confidence tier of the heal, and whether
the healed selector was promoted to primary.

**HybridStrategy**
A crawl strategy that combines BFS and SPA approaches. Used when `StrategyDetector`
finds both real `<a href>` links and JavaScript navigation patterns on the same
application. Auto-detected — not manually configured.

---

## I

**Identity Divergence Detection**
A retired capability (TD-148). The probe fired after auth failure on a pre-auth
login page — every conclusion drew about the app behind it without having observed
it. Retired and renamed "login-surface observer." Observations now carry observed
value + mechanism + non-implications. "Narrower, not weaker."

**Implementation Agent**
The AI agent responsible for writing code, running commands, and making on-disk
changes. Currently either CC (Claude Code) or Codex (OpenAI Codex) — only one
is active at any time. Both are subject to identical rules under `AI_CONSTITUTION.md`.

**`infra-defect` (triage category)**
A test failure classification meaning the failure was caused by infrastructure
instability — timeout, network issue, or environment problem — not by the
application or the test itself.

**InputHealth Gate**
A control in Phase 3 (Verify) that blocks downstream pipeline stages if the
quality of input evidence falls below a threshold. Prevents low-quality model
data from propagating into test generation and execution.

**`insufficient-evidence` (triage category)**
A first-class triage outcome meaning the AI cannot determine the failure cause
with sufficient confidence. Not an error. Not a fallback. The correct answer
when evidence is genuinely insufficient. FORGE is designed to say "I don't know"
rather than fabricate a confident wrong answer.

---

## K

**Kysely**
The TypeScript-first SQL query builder used for all SQLite interactions in FORGE.
Provides type-safe queries without a full ORM abstraction.

---

## L

**Learn (Phase 8)**
The final pipeline stage. Updates the app model and knowledge base from observed
run behaviour. Components: `TrendAnalysis`, `CoverageGapEngine`,
`ReleaseNotesGenerator`, `FlakyPredictor`, `GoalMemory` (in progress).

---

## M

**MPA (Multi-Page Application)**
A traditional web application where navigation is primarily through full page
loads via `<a href>` links. FORGE uses `BFSStrategy` for MPA targets.
Example test target: SauceDemo.

**ModelValidator**
The component in Phase 2 that validates the constructed app model before it is
persisted to SQLite. Ensures required fields are present and provenance is set.

---

## N

**Nova**
The independent architectural reviewer. Uses ChatGPT. Consulted at every design
fork, regardless of how obvious the answer seems. Delivers structured responses:
Assessment / Risks / Recommendation / Decision. Never implements — assesses only.

**"Narrower, not weaker"**
A standing FORGE principle. Retiring a capability that was never evidence-supported
is the honest move, not a regression. A narrower honest claim is stronger than a
broader dishonest one. Originated from the TD-148 identity-divergence retirement.

---

## O

**Observed / Inferred**
Provenance fields attached to app model data. `observed` means the value was
directly witnessed in a live browser or API interaction. `inferred` means it was
derived or assumed. FORGE's honesty principle requires that provenance follows
evidence — never the reverse. `inferred` fields carry lower confidence and must
not be promoted to `observed` without actual verification.

**Onboarding Config**
The per-app configuration file at:
`src/apps/<platform>/<type>/<appname>/onboarding.<appname>.config.ts`
Declares the app name, base URL, app type, roles, and crawl budgets. Created
manually for new apps today; Bootstrap Mode will generate it automatically.

---

## P

**Pipeline**
FORGE's eight-stage processing sequence:
Crawl → Model → Verify → Generate → Execute → Triage → Heal → Learn.
Each stage produces evidence consumed by the next. The pipeline runs as a
continuous improvement loop — Phase 8 feeds back into Phase 2.

**PomGenerator**
The component in Phase 4 that generates Playwright Page Object Model classes
from the verified app model.

**Prerequisite Confidence**
The constraint that assertion confidence cannot exceed the confidence of the
evidence chain that supports it. If a page requires a login to reach, and the
login evidence has a medium confidence tier, then all assertions about that page
are capped at medium confidence.

**Provenance**
The record of how a piece of data was obtained — observed directly, inferred
from other data, or produced by AI reasoning. FORGE requires explicit provenance
on all model data. "Provenance follows evidence, never the reverse" (ADR-015).

---

## R

**Representational Competence (ADR-019)**
The first axis of the vocabulary competence boundary. Asks: can the detector
actually represent the value it is claiming to observe? A detector that cannot
represent a value may not assert it.

**Rule 9**
Raj's explicit push authorisation. A verbal "Go" from Raj in the build chat.
Required before every push. Cannot be issued by Aiden or any implementation
agent. Silence is not authorisation.

---

## S

**SelfCorrectionEngine**
The component in Phase 3 (Verify) that, when a primary selector fails, attempts
fallback strategies before marking an element unverifiable. Works through the
selector fallback hierarchy: `data-test` → `id` → `aria-label` →
`role + text` → `text content`.

**Self-Healing**
The capability by which FORGE detects a broken test selector, re-locates the
element using the fallback hierarchy, and updates the test automatically.
Governed by the healing constraint: a heal may never promote a lower-confidence
strategy over a higher-confidence one.

**SmartLocator**
The component in Phase 7 (Heal) that implements multi-strategy element
re-identification using the selector fallback hierarchy.

**SPA (Single-Page Application)**
A web application where navigation is primarily handled by JavaScript without
full page reloads. React, Vue, Angular, and Next.js apps are typically SPAs.
FORGE uses `SPAStrategy` for SPA targets. Example test target: OrangeHRM.

**SPAStrategy**
The crawl strategy for single-page applications. Detects JavaScript navigation
events and URL changes rather than following `<a href>` links. Auto-detected
by `StrategyDetector`.

**StrategyDetector**
The component that automatically determines which crawl strategy to use
(BFS, SPA, or Hybrid) by analysing the live page. No manual configuration
required.

---

## T

**TD (Technical Debt item)**
A logged, tracked defect, limitation, or deferred decision in FORGE's codebase.
Each TD has a unique ID, priority, description, and (when resolved) a commit hash
and CI confirmation. The on-disk `TECH_DEBT.md` is the single source of truth.
The project-file copy in Claude's context is stale — never cite it for TD status.

**TD-UI-***
Technical debt items specific to the `forge-ui` platform UI. Numbered separately
from engine TDs.

**TestGenerator**
The orchestrating component in Phase 4 (Generate). Coordinates `PomGenerator`,
`SpecGenerator`, and `FixtureGenerator` to produce a complete runnable test suite
from the verified app model.

**Triage**
Phase 6 of the pipeline. AI classification of every test failure into one of
five evidence-gated categories before a human reviews it.
Categories: `app-bug`, `test-defect`, `infra-defect`, `flaky`,
`insufficient-evidence`.

---

## V

**Verification**
Phase 3 of the pipeline. The process of confirming that elements discovered
during crawl are real, selectors are valid, and the app model accurately reflects
the live application. Every verified assertion carries a confidence tier derived
from observed evidence.

**VerificationRunner**
The component that executes verification against each page in the app model.
Coordinates `SelfCorrectionEngine`, evidence tier scoring, and the `InputHealth Gate`.

**Vocabulary Competence Boundary (ADR-019)**
The rule that detectors must declare two contract properties before issuing a
definitive conclusion:
1. **Representational competence** (Axis 1) — can the detector represent this value?
2. **Discriminative competence** (Axis 2) — do observations uniquely support the assertion?
Both axes must be satisfied. A deficiency in either axis requires the detector
to report with reduced confidence or `insufficient-evidence`.

---

## W

**WebUIEnvironment**
The browser-based action environment for the agentic crawler. Provides the
execution surface in which the `AgentPlanner` steps are carried out.

---

## Abbreviations

| Abbreviation | Full term |
|---|---|
| ADR | Architecture Decision Record |
| BFS | Breadth-First Search |
| CC | Claude Code (primary implementation agent) |
| CI | Continuous Integration |
| DOM | Document Object Model |
| MPA | Multi-Page Application |
| ORM | Object-Relational Mapper |
| POM | Page Object Model |
| QE | Quality Engineering |
| SPA | Single-Page Application |
| TD | Technical Debt item |
| tsc | TypeScript Compiler |
| UI | User Interface |
| UX | User Experience |

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
