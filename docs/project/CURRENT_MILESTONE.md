# CURRENT_MILESTONE.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-21 — sourced from CC repo verification + git state -->

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
has two tabs at GREEN (Onboard, Crawl). Work is active on two parallel fronts:

**Front A — Platform UI (forge-ui):**
The Tests tab (TD-UI-003) design is approved and build is in progress.
Results, Insights, and Settings tabs remain as stubs.

**Front B — Bootstrap Signal Integrity:**
Bootstrap Mode (auto-config from URL) surfaced signal integrity defects during
validation work. TD-162, TD-163, TD-166, TD-167, and TD-168 were logged on
2026-07-21. All are flagged investigation-before-fix. This front must not be
patched without root cause diagnosis.

Additionally, a standing rule was established 2026-07-20: **no current GREEN
status has been verified for correctness** — all prior scoring was on honesty
alone. GREEN requires both HONEST and CORRECT.

---

## 2. Active Objectives

### Objective 1 — Resolve Bootstrap Signal Integrity Defects

| TD | Description | Gate |
|---|---|---|
| TD-162 | StrategyDetector zero-signal counting fault | Investigate → root cause → design → fix |
| TD-163 | spaDom=1 discriminates nothing — fires on MPA and SPA identically | Investigate → root cause → design → fix |
| TD-166 | authType.value non-deterministic across onboarding runs | Investigate → root cause → design → fix |
| TD-167 | loginUrl can contradict authType in persisted config | Investigate after TD-166 |
| TD-168 | Bootstrap.detect() logs nothing — decisions invisible | ADR likely needed — design first |

**Constraint:** Investigation before fix on all of the above.
No patch on contact. Root cause first, Aiden design sign-off, Nova if structural.

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

### Objective 3 — Push Ground-Truth Harness (b6adb5b)

| Item | Status |
|---|---|
| Commit | ✅ Local — b6adb5b |
| Aiden diff review | ⏳ Pending |
| Rule 9 | ⏳ Pending |
| CI | ⏳ Pending push |

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
□ TD-162 — Root cause identified, fix designed, approved, CI green
□ TD-163 — Root cause identified, fix designed, approved, CI green
□ TD-166 — Root cause identified, fix designed, approved, CI green
□ TD-167 — Resolved or explicitly deferred with documented reason
□ TD-168 — ADR written if structural, fix shipped, CI green
□ TD-UI-003 (Tests tab) — CI green + Raj manual verification complete
□ b6adb5b — Pushed, CI green
□ TD-064 FC-004a — Resolved, CI green
□ TECH_DEBT.md updated for all resolved TDs (real hashes, not placeholders)
□ GREEN status re-verified for correctness (not just honesty) for any
  capability marked GREEN in this milestone
```

---

## 5. Sequencing Constraints

```
TD-162/163 investigation
        ↓
Root cause confirmed with evidence
        ↓
Aiden design proposal → Nova review (if structural) → Raj approval
        ↓
Fix implemented → Aiden diff review → Rule 9 → push → CI green
        ↓
TD-166/167 (may share root cause with 162/163 — investigate first)
        ↓
TD-168 (ADR decision → design → fix)
```

Tests tab build runs in parallel and does not block the signal integrity work.

---

## 6. Active Blockers

| Blocker | Blocking what | Owner |
|---|---|---|
| TD-162/163 investigation not started | Bootstrap signal integrity fixes | Raj + Aiden |
| b6adb5b not pushed | Ground-truth harness available in CI | Raj (Rule 9 needed) |
| TD-064 FC-004a not scoped | Generation validity milestone completion | Aiden to scope |

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
