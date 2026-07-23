# FORGE — Complete Project Handover

**Prepared:** 2026-07-20 · **Baseline commit:** `b421a2d` (origin/main, CI green: 520/520 unit, 316 Playwright)
**Repo:** github.com/rkasthuri/forge-framework
**Owner / Architect:** Raj Kasthuri, AnvilQ Technologies LLC

> **Provenance note (read first).** This document was drafted by the project's AI architecture partner from the working session history. It is a faithful orientation map, not a source of truth. The authoritative artifacts are: the repo itself, `TECH_DEBT.md` **on disk** (the copy in any chat/project workspace is stale), and `docs/ADR/`. Where this document and the repo disagree, the repo wins. TD numbers and completion-map colors below should be re-verified against the on-disk ledger before being relied on.

---

## 1. What FORGE Is

FORGE™ is an AI-augmented, app-agnostic, end-to-end test automation platform. It crawls a web application in a real browser, builds a structured model of it, verifies that model against reality, generates runnable Playwright tests from it, executes them, self-heals broken tests, and classifies failures — with AI (Claude API) used for judgment tasks: element naming, flow detection, failure triage.

**The differentiating thesis — and the thing to evaluate it against:**

> Confidence in test-suite health must be earned and traceable, never hardcoded. FORGE must be capable of honestly saying "I don't know."

Most of the last month's work is this thesis being enforced on FORGE's own internals. The project's defining pattern: audits repeatedly found FORGE's own components claiming more than their evidence supported, and each finding produced an architectural law rather than a patch.

**Pipeline (10-phase):** Crawl → Model → Verify → Generate → Execute → Heal → Report (plus Onboard at the front, Triage and Governance planned at the back).

**Stack:** Playwright + TypeScript · Claude API (claude-sonnet-4-5) · Node.js 24 · SQLite via Kysely · GitHub Actions CI · React + Tailwind v3 + shadcn/ui (forge-ui) · Express REST API · local Ollama (parked, candidate for tiered cost routing).

**Reference apps:** SauceDemo (MPA), OrangeHRM (SPA), Restful Booker (REST API). A fourth `models/ultimateqa/` exists on disk outside the reference set.

---

## 2. Working Model (how the project is actually run)

Raj is the decider and architect. Three AI agents execute under review discipline:

| Agent | Role |
|---|---|
| **Aiden** (Claude, chat) | Architecture partner, design authority, brief generator. Reviews every diff before commit. |
| **CC** (Claude Code) | Implements on disk. Stops at checkpoints. Never commits without Aiden's diff review; never pushes without Raj's explicit "Rule-9 GO". |
| **Nova** (ChatGPT) + **Finn** | Independent architectural review at every design fork (Nova) and UX critique (Finn). Consulted regardless of how obvious a decision seems. |

**Standing discipline an evaluator should know exists (and check for):**
- Design before code; audit before fix; evidence before "resolved" (no TD closes without CI proof — real terminal output, never summaries)
- Batch commits by logical milestone; one CI run per milestone; no docs-only pushes
- Nightly EOD audits: honesty sweep + abandoned-code sweep, find-only at night, decide by day
- No hardcoded paths anywhere (runtime resolution only); AnvilQ copyright header on every source file
- External ideas are assayed and rewritten FORGE-native — "adopt the concept, never the content"

---

## 3. The Architectural Laws (docs/ADR/ — the core IP)

These five ADRs are the product's substance. Read them before the code.

| ADR | Law | One-line meaning |
|---|---|---|
| **ADR-015** | Provenance Follows Evidence | A document may only assert provenance its evidence supports. Outcome fields never default to success; zero evidence → "unknown." Make lies unrepresentable (type errors), don't defend against them. |
| **ADR-017** | What FORGE Observes, FORGE Keeps | An honest write with a blind read is a distinct failure class (declared channels with no producer, lossy projections, winners-only persistence). |
| **ADR-018** | Aggregate to the Weakest Truth | A composed verdict is never stronger than its weakest constituent. Uncertain ≠ failed; no-run ≠ passed. |
| **ADR-019** | Vocabulary Competence Boundary (amended twice) | A detector may only produce conclusions its observations can support. **Axis 1:** can it represent the value? **Axis 2:** does the observation uniquely support the conclusion, or do competing causes produce the same reading? Plus the prerequisite: is the observation even taken from a context that can evidence the conclusion domain? |
| **ADR-020** | Evidence-Derived Confidence | Confidence is derived from the strength and boundary of evidence, never assigned as a literal. Asymmetry: positive evidence ≠ absence of evidence. `high` is unreachable from a single pre-auth sample. Every grade carries `source` + `reason` + blind spot. |

**How they relate:** 015 asks *does the claim have evidence?* → 019 asks *does the evidence support THIS claim over rivals?* → 020 asks *how strongly may it be held?*

---

## 4. Decision History — the calls that shaped the product

These are the judgment calls an evaluator (or interviewer) should understand. Each is documented in ADRs, the ledger, and commit messages.

**4.1 The identity-divergence arc (the defining week).** A probe was built to detect, on crawl auth failure, whether the target app's identity had diverged from its onboarded configuration (TD-UI-027). Successive audits found: a detector answering outside its vocabulary (TD-142 → ADR-019 axis 1); an observation that couldn't distinguish competing causes (TD-146 → ADR-019 axis 2); and finally that the probe only ever observes a **pre-auth login page** while every conclusion was about the **application behind it** — "it observed the door, described the room." A proposed pre-auth fence would have made every signal permanently inconclusive, proving the comparison never belonged in that execution context. **The capability was retired, not gated** (Option 0): what ships now is a login-surface *observer* — each observation carries its value, its mechanism (including the method's blind spot), and its observation boundary (what it does NOT indicate) — and concludes nothing. Net −241 lines. "Narrower, not weaker — the original capability was never evidence-supported."

**4.2 Evidence-derived confidence (ADR-020).** An audit found `confidence: 'high'` literals stamped unconditionally across Bootstrap detectors — including on values chosen precisely *because no evidence existed* (a zero-signal page falling back to bfs, graded high). A full sweep found the defect spanned two subsystems while four other producers (heal, verification, flow, triage) already derived confidence correctly. Result: ADR-020, six Bootstrap sites + ModuleClassifier converted, `high` made unreachable from single pre-auth samples, and test suites that had *asserted the defective values* corrected openly (TD-160: a test asserting a wrong value makes the wrong value load-bearing).

**4.3 The correctness ruling (2026-07-20, standing rule).** Manual verification found two measurement defects (§6). Raj ruled:

> **An area is GREEN only when it is CORRECT and HONEST. Correctness first, honesty always. A wrong answer honestly labelled is still a wrong answer.**

This is retroactive: every previously-scored area was scored on honesty alone. Under the new bar, **zero areas are confirmed GREEN today** — three are provisional pending correctness verification. This ruling is the single most important context for reading the completion map.

**4.4 The positive pattern (TD-159).** The audits also found what *works*: triage (an explicit representable `insufficient-evidence` verdict; ambiguous evidence routes there, never to a definitive category; confidence capped by input health) and heal (accepts a heal only after re-running the caller's real assertion against the healed target — direct verification, not proxy). Extracted heuristic: **every component should either verify directly, or preserve uncertainty explicitly.** These two are the reference implementations for future detector design.

---

## 5. Current State — Completion Map (as of 2026-07-20, new GREEN rule applied)

🟢 correct+honest verified · 🟡 honesty-verified, correctness unverifiable · 🔴 blocking defects · 🔵 in progress / partial · 🟠 not started

| Area | Status | Why |
|---|---|---|
| Onboard / Bootstrap | 🔴 | Honesty verified live (see §6) — but TD-162/163 are measurement defects, blocking under the correctness rule |
| Crawl-API | 🟡 | Honesty-scored green previously; correctness never verified (no ground truth) |
| Classify | 🟡 | Same; TD-163's over-matching risk is adjacent |
| App Model | 🟡 | Same |
| Crawl-UI | 🔴 | Output-signal integrity gaps |
| Flow Detection | 🔴 | TD-081 grounding-bypass |
| Verify | 🔴 | Signal gaps; presence-only assertions noted |
| Generate | 🔴 | **The one genuine capability gap** — TD-064 (FC catalogue resolved; residual R2 assertion-strength design-stage). TD-140 vacuous-green ✅ RESOLVED 2026-07-23 (`185af42` — refused → skip/could-not-verify). |
| Execute | 🔴 | TD-145 reporter status semantics (first-attempt vs eventual outcome undeclared) |
| Heal | 🔴 | TD-UI-063 HealReporter un-wired |
| Triage / Honesty Floor | 🔴 | TD-UI-029 CRITICAL (though the verdict logic itself audited CLEAN) |
| Agentic Layer | 🔵 | Phase 3 (goal auto-discovery) shipped |
| **forge-ui** — Onboard / Crawl / Tests tabs | 🟢 live | Real API data: detection with grades+reasons, crawl diagnostics panel, Monaco viewer on generated tests |
| **forge-ui** — Run / Results / Insights / Settings | 🔵 | Honest "coming soon" stubs |
| Governance (Review/Approval + Policy) | 🟠 | The one missing pipeline stage (per Nova); absorbs TD-139 |
| Packaging / Installer · Onboarding Tutorial | 🟠 | Bucket 1 |
| Buckets 2–3 (Evidence Explorer, Mobile, IoT, Calibration…) | 🟠 | Parked by design |

**src/platform** is deprecated: off the canonical launch path (`forgeUI.bat` → forge-ui only) but still independently launchable via npm scripts. Retirement (TD-UI-062) is gated on forge-ui's remaining tabs subsuming it.

---

## 6. What Was Just Verified — and the Two Live Defects

Raj manually verified Onboard at `b421a2d` across three live sites (SauceDemo, OrangeHRM, Wikipedia) via the standalone CLI path. **Honesty verified end-to-end:** the ADR-020 §2 asymmetry confirmed live (Wikipedia authType → `none`/`low`/`default-fallback` with the correct reason — TD-164, deliberately logged as a positive result); the login-surface observation panel rendered all three observations with mechanisms and boundaries and no verdict.

The same session found two **measurement** defects — visible only because ADR-020's new `reason` strings print actual counts:

| TD | Defect | Evidence |
|---|---|---|
| **TD-162** (High) | StrategyDetector counts zero signals where they demonstrably exist, then grades the wrong answer `evidence-matched` | Wikipedia, same page, same run: appType saw `links=376`; crawlStrategy saw `realLinks=0` → concluded `spa` for a classic MPA. Strategy observes *later* (+2s) yet reports *fewer* signals — rules out hydration timing; the counting itself is wrong |
| **TD-163** (Medium) | appType's SPA marker doesn't discriminate | `spaDom=1` fires identically on SauceDemo (an MPA) and OrangeHRM (a real SPA) — a marker satisfied by structurally opposite apps separates nothing. Test D1 currently *hardens* this mapping (TD-160 pattern) |

Both are quality defects honestly reported — the grading layer is behaving correctly around broken measurements. Both are investigation-before-fix.

---

## 7. The Structural Gap — No Ground Truth

**The most consequential finding of the 2026-07-20 deep audit:** no expected-value fixture exists anywhere in the repo. FORGE's correctness has never been auditable because there is no answer key. Cross-producer contradictions (how TD-162/163 were caught) only surface errors where two producers observe the same thing; a single producer consistently wrong is invisible.

**Agreed path (next work, ahead of the TD-162 fix):** per-reference-app ground-truth fixtures — human-verified expected values, each with a `basis` field stating *why* it's known (e.g. SauceDemo: `appType: mpa`, basis: full page reload on login, no client-side router) — plus a harness comparing detection output against them. This makes TD-162/163 *provable* fixes and makes Onboard's green demonstrable rather than argued. Known limits, stated upfront: fixtures only cover apps with keys; live sites drift (fixtures carry dates); derived grades aren't checkable this way, only their inputs.

---

## 8. Open Work — Priority Order

1. **Ground-truth fixtures + harness** (3 reference apps + Wikipedia) — unblocks correctness auditing everywhere
2. **TD-162** StrategyDetector counting (investigate → design → fix, provable against fixtures)
3. **TD-163** appType SPA-marker discrimination (same discipline)
4. **TD-064** Generate validity — CRITICAL, the genuine capability gap, largest cluster
5. **forge-ui** Run/Results/Insights/Settings tabs (real content) → then src/platform retirement (TD-UI-062)
6. **Governance** stage (Review/Approval + Policy)
7. **Packaging / Installer / Tutorial**

**Notable open TDs beyond those:** TD-145 (reporter vs pipeline status contradiction on retried runs), TD-152 (SPA-aware settling for the observation probe — hold released), TD-154 (credential provenance opacity), TD-155 (guest authOutcome conflation), TD-158's remaining scope (agent-env `high` literals unconverted — audit finding A2), TD-161 (ModuleClassifier `high` ceiling question), TD-UI-064 follow-ons, two never-reconciled `authOutcome` vocabularies (audit finding B1), and the deep audit's stated coverage gaps (~91 confidence sites not exhaustively enumerated; pipeline subsystems not audited as subsystems; ~200-row ledger reconciliation pending). The on-disk `TECH_DEBT.md` (~165 rows) is authoritative; roughly ten ledger rows are currently staged uncommitted, riding the next milestone.

**Deferred by design:** agentic-loop expansion (gated on honesty floor + proven agentic crawl), multi-model cost routing (gated on TD-080 eval-harness fix), Calibration Engine (research lane), mobile/IoT (roadmap only).

---

## 9. Evaluating FORGE — a suggested reading order

1. `docs/ADR/` — the five laws (§3). This is the product's substance.
2. `TECH_DEBT.md` on disk — the real state, including the GREEN rule and the resolved history with commit hashes.
3. The identity-divergence arc in git history (`fb320c1`, `d7df555`, `1840999`) — capability retirement done honestly.
4. `LoginSurfaceObservation.ts` + the forge-ui `CrawlDiagnostics` component — the observation/mechanism/boundary pattern, engine-owns-text/UI-renders-verbatim.
5. The ADR-020 commit (`c5abf7d`/`b421a2d`) — derived confidence, including the openly-corrected test assertions.
6. Reference implementations of the positive pattern: heal (`SmartLocator.deriveHealConfidence`), verification (`computeConfidence`), flow (`deriveFlowConfidence`), triage (`ai-triage.ts`).
7. Then the defects: TD-162/163 with the session evidence in the ledger.

**Fair questions to press on:** Is the honesty machinery proportionate to the product's maturity? Is Generate (the real capability gap) under-invested relative to the honesty work? Does the medium-confidence ceiling read as precision or hedging to a real operator? Is the three-agent process reproducible by a team, or personal to this setup?

---

## 10. Honest Self-Assessment (what this project would say about itself)

**Strengths:** an articulated, enforced epistemic contract most tools lack; a decision history showing capability *retired* when unsupported (rare); defects found by the project's own tooling (the provenance strings caught TD-162/163); a positive design pattern extracted, not just defect rules; disciplined evidence-gated process.

**Weaknesses, stated plainly:** zero areas correctness-verified today; no ground truth existed until now; the two CLEAN-audited surfaces are clean on three specific questions, not warranted defect-free; Generate — the capability users most care about — has the least investment; the honesty thesis is ahead of the measurement quality it reports on; coverage gaps in the audits are named but real.

**The one-sentence pitch the evidence supports:** *FORGE is a test-automation platform whose defining feature is that it cannot claim more than it knows — demonstrated not by marketing but by its own audit trail catching and retiring its own unsupported capabilities.*

---

*Prepared by Aiden (Claude) for Raj Kasthuri. Verify against the repo at `b421a2d` and the on-disk TECH_DEBT.md before external use.*
