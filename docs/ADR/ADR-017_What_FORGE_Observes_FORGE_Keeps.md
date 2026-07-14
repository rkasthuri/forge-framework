<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-017: What FORGE Observes, FORGE Keeps

## Status
Proposed

## Date
2026-07-14

## Principle
> "What FORGE observes, FORGE keeps. A fact established at runtime must reach a
> persisted artifact — you cannot report honest provenance, or prescribe a
> remedy, for evidence you threw away." — Raj / Aiden

This ADR is **upstream of ADR-015 and ADR-016.** ADR-015 (Provenance Follows
Evidence) governs that a document may only *assert* what its evidence supports;
ADR-016 (Map the Gap, Prescribe the Remedy) governs that a flagged gap must
*carry a remedy*. Both presuppose the evidence still exists. This ADR is the
precondition: **if the observation was discarded before it reached a persisted
artifact, honesty and remedy are both impossible.** You cannot be honest about
what you no longer have, and you cannot prescribe a remedy for a gap whose cause
you dropped.

## Context
Triggered by the **TD-UI-041 systemic audit (2026-07-14)** — a read-only 6-cluster
sweep of the whole engine (crawl, classify, enrich, verify, heal, triage,
flaky-scoring, notify, agentic). It found **~40 sites** where FORGE observes,
computes, measures, or diagnoses something at runtime and the evidence does not
survive into a persisted artifact — 10 of them **LIE**-class (a false or
unsubstantiated assertion ships as a result), the rest MUTE (FORGE knows and
cannot tell) or MISSED.

The four honesty bugs fixed this week (TD-UI-028/029/031 and the auth-required
diagnostic) were each a single instance of this one pattern surfacing by
accident. Fixing them one at a time is exactly how the habit stayed invisible.

**The habit is not incidental — it is architectural.** It recurs as four
structural archetypes; these, not the 40 symptoms, are the finding:

1. **A boolean/enum return type eats the reason.** The WHY dies at the type
   boundary, not in the code: `AuthResult.authenticated` is a bare boolean with
   no `reason`/`failedStep`; `isResolvable(): boolean` destroys "why did the
   locator miss" before it can be stored; a 3-state auth outcome has no slot for
   cause. Every diagnostic is unrepresentable by the time the code could record it.
2. **A DB projection is lossier than what the stage computed.** The file artifact
   holds the evidence; the system-of-record omits the column; the next consumer
   cannot see it. `ai_triage` has no `evidence` column (the triage evidence-gate
   does real work upstream, then the proof evaporates); `flaky_analysis` writes
   its `signal_*` columns as `0` while a consumer and aggregator wait to read them.
3. **`console.*` is the only home for a fact FORGE established.** Pervasive — and
   sometimes *contractually mandated* (a policy whose docstring says "log and
   continue" is structurally forbidden from recording its own finding, so the LIE
   is baked into the interface).
4. **Winners-only persistence.** The survivor is kept and the deliberation is
   dropped: rejected classifications, failed heals, sub-threshold Vision calls,
   blocked-goal reasoning. FORGE remembers its conclusion and forgets its evidence.

## Decision
The fix is structural, addressed at the four archetypes — never a per-symptom
patch. For every place FORGE establishes a fact at runtime:

1. **A return type must have room for the reason.** A result that can fail
   carries WHY it failed, not just *that* it failed. Prefer a discriminated
   result (`{ ok: false, reason, detail }`) or an explicit reason field over a
   bare `boolean`/2-3-state enum. A boolean that eats a diagnostic is a defect,
   not a simplification.
2. **A DB projection must carry what the stage computed.** If a stage computes
   `evidence`, `signals`, a rationale, or a cost, the system-of-record has a
   column for it. A DB table that is lossier than the file artifact it mirrors is
   a source-of-truth split (the next consumer reads the lie).
3. **`console.*` is never the only home for a fact FORGE established.** Logging is
   additive, never the system of record. A fact that matters to any downstream
   consumer is persisted to the artifact (model, report, DB) *and* may also be
   logged. "Log and continue" is not a licence to discard.
4. **Persist the deliberation, not only the survivor.** Where FORGE chooses,
   rejects, falls back, or declines, the rejected candidate + the reason are
   recorded alongside the winner — enough that the decision is reconstructable and
   a remedy engine can act on it.

**Honest floor (from ADR-015, restated):** keeping the observation must never
become a licence to *fabricate* one. When FORGE genuinely did not observe a
thing, the artifact says so — an absent reason is recorded as absent, never
back-filled with a plausible value.

## Consequences
1. **Reviews gain a fourth question.** Beyond correct / honest / remedy-bearing:
   *"Does every fact this code establishes reach a persisted artifact — or does it
   die in a boolean, a log line, a lossy table, or a discarded loser?"*
2. **Type and schema changes, not just logic changes.** Satisfying this ADR
   means widening return types and adding DB columns — the fix touches the type
   and persistence boundaries, which is why the habit was invisible: each symptom
   looked like a local logging choice.
3. **The 40 TD-UI-041 sites are remediated by archetype, in the build thread** —
   not as 40 unrelated tickets (which would re-scatter the systemic finding).
   Three were severe enough to split out: TD-UI-042 (notifier false alert,
   CRITICAL), TD-UI-043 (triage evidence dropped at the DB), TD-UI-044 (flaky
   `signal_*` never written).
4. **Provenance and remedy become possible where they were not.** Every LIE-tier
   site becomes truthful; every MUTE-tier gap becomes able to carry an ADR-016
   remedy — because the evidence now survives to be reported on.

## Relationship to ADR-015 and ADR-016
- **ADR-015 (Provenance Follows Evidence)** — a document asserts only what its
  evidence supports. Precondition: the evidence exists. ADR-017 supplies it.
- **ADR-016 (Map the Gap, Prescribe the Remedy)** — a flagged gap carries a
  remedy. Precondition: the gap's cause was observed *and kept*. ADR-017 supplies
  it. The `CrawlDiagnostic` seam (TD-UI-031/040) is ADR-017 applied to one
  subsystem; this ADR generalises it to the whole engine.

## Follow-ups
- **TD-UI-041** — the ~40-site inventory (its body carries the four archetypes +
  LIE/MUTE/MISSED tiers + the navigation-edge trace). Remediated by archetype.
- **TD-UI-042 / 043 / 044** — the three split-out severe findings.
- **TD-UI-040** — crawl diagnostic capture (the `CrawlDiagnostic` seam); an
  ADR-017 instance already scoped.
- **Navigation-edge JOIN** — the single highest-value repair: correlate the BFS
  `edge.toUrl` to the page's already-classified link element by resolved `href`,
  turning `elementId:'navigation'` into a real clicked-element id. Upstream of
  ADR-011.

## Related
ADR-015 (Provenance Follows Evidence), ADR-016 (Map the Gap, Prescribe the
Remedy), ADR-011 (Verify Before Assert), ADR-006 (Truth-Telling and Earned
Evidence), TD-UI-041 (the audit), TD-UI-042/043/044, TD-UI-040, TD-037 (hybrid
edge attribution), TD-063 (triage evidence-gate), TD-110 (unhydrated-page
detection).
