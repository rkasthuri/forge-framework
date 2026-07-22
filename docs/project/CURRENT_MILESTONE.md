# CURRENT_MILESTONE.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-22 — sourced from CC repo verification + on-disk ledger + git state -->

> The active milestone scope, objectives, and completion criteria.
> This document must be updated at the start and end of every milestone.
> Verify against PROJECT_STATE.md and on-disk TECH_DEBT.md before citing.

---

## Active Milestone

**Name:** Bootstrap Signal Integrity + Platform UI Completion
**Phase:** Phase 4 (Platform UI) / Phase 5 (Agentic / Bootstrap)
**Status:** 🔄 In Progress

---

## 1. Context — How We Got Here

The core pipeline (Crawl → Model → Verify → Generate → Execute → Triage → Heal →
Learn) is operational across multiple live test targets. The forge-ui platform UI
has the **Crawl** tab at GREEN; the **Onboard** tab is **RED**, blocked by TD-173
(High): `detectRenderingModel` samples at `domcontentloaded` and can false-floor a
framework-rendered app to `'static-rendered'` (no `'unknown'` path). Correct-and-honest
rule: an area with an open High measurement defect is not GREEN. Work is active on two
parallel fronts:

**Front A — Platform UI (forge-ui):**
The Tests tab (TD-UI-003) design is approved and build is in progress.
Results, Insights, and Settings tabs remain as stubs.

**Front B — Bootstrap Signal Integrity:**
Bootstrap Mode (auto-config from URL) surfaced signal integrity defects during
validation work. TD-162 and TD-163 were logged 2026-07-20; TD-166, TD-167, and
TD-168 were logged 2026-07-21. **TD-162 is now closed** (works-as-designed,
2026-07-21) and **TD-163's refactor landed** (2026-07-22, 0c81b4d/845e513); TD-166,
TD-167, and TD-168 remain flagged investigation-before-fix, alongside the newly
escalated TD-173 (High). This front must not be patched without root cause diagnosis.

Additionally, a standing rule was established 2026-07-20: **no current GREEN
status has been verified for correctness** — all prior scoring was on honesty
alone. GREEN requires both HONEST and CORRECT.

---

## 2. Active Objectives

### Objective 1 — Resolve Bootstrap Signal Integrity Defects

| TD | Description | Gate |
|---|---|---|
| TD-162 | StrategyDetector zero-signal counting fault (Wikipedia realLinks=0 on a 376-link page) | ✅ CLOSED 2026-07-21 — works as designed; realLinks=0 is accurate (375/376 anchors cross-origin; realLinks = same-origin navigable). NOT a counting failure. |
| TD-163 | appType claimed navigation architecture (`'spa'`) from a rendering-only marker (`spaDom=1`) | ✅ Refactor landed 2026-07-22 (0c38a31/0c81b4d/845e513) — ADR-021: emit observed rendering; appType leaves the evidence model. |
| TD-173 | detectRenderingModel can never emit `'unknown'` — floors to `'static-rendered'` with no framework marker; a framework app sampled at `domcontentloaded` pre-hydration is mis-measured as static | 🔴 OPEN (High) — measurement defect; investigate before fix. Blocks Onboard GREEN. |
| TD-166 | authType.value non-deterministic across onboarding runs | Investigate → root cause → design → fix |
| TD-167 | loginUrl can contradict authType in persisted config | Investigate after TD-166 |
| TD-168 | Bootstrap.detect() logs nothing — decisions invisible | ADR likely needed — design first |

**Constraint:** Investigation before fix on the still-open items (TD-166, TD-167,
TD-168, TD-173). No patch on contact. Root cause first, Aiden design sign-off, Nova
if structural.

---

### Objective 2 — Complete forge-ui Tests Tab (TD-UI-003)

| Item | Status |
|---|---|
| Design | ✅ Approved — "Generation Review" surface, not a file browser |
| Nova review | ✅ Complete |
| Finn gaps identified | ✅ Three gaps logged (filter clear state, rollback dependency warnings, generating in-progress state) |
| Build | 🔄 In progress |
| CI green | ⏳ Pending build completion |
| Manual verification | ⏳ Pending CI green |

---

### Objective 3 — Ground-Truth Harness ✅ Complete

| Item | Status |
|---|---|
| Commit | ✅ 6d52a47 (rebased from b6adb5b) + human-attested fixtures (845e513) |
| Aiden diff review | ✅ Complete |
| Rule 9 | ✅ Given 2026-07-21 |
| CI | ✅ Green — on origin (origin/main = 845e513) |

---

### Objective 4 — Resolve TD-064 FC-004a (Generation Validity)

| Item | Status |
|---|---|
| FC-001 | ✅ Resolved |
| FC-002 | ✅ Resolved |
| FC-003 | ✅ Resolved |
| FC-004a | 🔄 Remaining |
| TD-140 (vacuous-green) | 🔄 Related — open |

---

## 3. Out of Scope for This Milestone

The following are parked by design — do not start without Raj's explicit
authorisation:

- Results tab, Insights tab, Settings tab (after Tests tab)
- Multi-model cost routing (gate: TD-080 first)
- Calibration Engine (parked research lane)
- Mobile / IoT surface support
- Governance / approval workflow (Phase 6)

---

## 4. Completion Criteria

This milestone is complete when **all** of the following are true:

```
☑ TD-162 — CLOSED works-as-designed (2026-07-21); no code change needed
☑ TD-163 — Refactor landed + CI green (0c81b4d/845e513, on origin)
□ TD-173 — Root cause identified, fix designed, approved, CI green (open; blocks Onboard GREEN)
□ TD-166 — Root cause identified, fix designed, approved, CI green
□ TD-167 — Resolved or explicitly deferred with documented reason
□ TD-168 — ADR written if structural, fix shipped, CI green
□ TD-UI-003 (Tests tab) — CI green + Raj manual verification complete
☑ b6adb5b — Pushed as 6d52a47, CI green (on origin)
□ TD-064 FC-004a — Resolved, CI green
□ TECH_DEBT.md updated for all resolved TDs (real hashes, not placeholders)
□ GREEN status re-verified for correctness (not just honesty) for any
  capability marked GREEN in this milestone
```

---

## 5. Sequencing Constraints

TD-162/163 are resolved (162 closed WAD 2026-07-21; 163 refactor landed 2026-07-22).
The remaining signal-integrity work follows the same gate:

```
TD-173 / TD-166 / TD-167 / TD-168 investigation
        ↓
Root cause confirmed with evidence
        ↓
Aiden design proposal → Nova review (if structural) → Raj approval
        ↓
Fix implemented → Aiden diff review → Rule 9 → push → CI green
        ↓
TD-167 investigated after TD-166 (may share a root cause)
        ↓
TD-168 (ADR decision → design → fix)
```

Tests tab build runs in parallel and does not block the signal integrity work.

---

## 6. Active Blockers

| Blocker | Blocking what | Owner |
|---|---|---|
| TD-173 (High) — detectRenderingModel false-floor | Onboard tab honest GREEN | Raj + Aiden |
| TD-064 FC-004a not scoped | Generation validity milestone completion | Aiden to scope |

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
