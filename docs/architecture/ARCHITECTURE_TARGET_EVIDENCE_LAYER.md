# FORGE — Target Architecture: The Evidence & Honesty Layer

**Status:** DRAFT v0.2 — for review, NOT signed off
**Author:** Aiden
**Date:** June 2026
**Builds on:** `docs/ARCHITECTURE_NORTH_STAR.md` (thesis + TD-060), audit gaps TD-063..TD-068
**Skeleton:** the existing 10-phase workflow diagram (Crawl → Classify → Verify → Generate → Execute → Heal → Triage → Analyze → Report → Learn)

**v0.2 changes (Raj review):** §2 gains `claimType`, splits confidence/validity into
orthogonal axes, and adds native contradiction relationships; §3 Verify gains a
`behavior-validated` depth and Learn is refined; §4 bug-gate decision locked with a
precision-earned promotion path.

---

## 0. How to read this

This is the *nervous system* the north-star calls for: the layer beneath every
phase so every claim FORGE surfaces is **earned, traceable, and honest about its own
uncertainty**. The 10-phase diagram stays the capability map; this adds the evidence
layer over it.

Open calls are marked **▶ DECISION** inline and collected in §9. This is the paper
design; it then tells us which modules need rewriting vs. which just emit into the
layer (§8).

**Review priority:** §2 (the evidence object) is load-bearing. Everything in §3
derives from its shape.

---

## 1. Purpose & thesis

FORGE's spine is **trust and honesty**, not automation. Generating and maintaining
tests is commoditized; what no tool does reliably is **tell the truth about
test-suite health** — separate a *real app bug* from a *broken test/spec* from
*FORGE's own infrastructure failing*, and say so honestly, **including when it does
not know.**

The job of this layer, in one sentence: **for every claim FORGE surfaces, it can
state where the claim came from, how confident it is and why, and whether it is
allowed to say "I don't know."**

Three honesty rules (from the north-star), elevated to hard constraints:

- **Confidence is earned and traceable** — derived from real signal, never a
  hardcoded literal or default presented as real. (TD-066)
- **"Verified" means verified** — the layer always distinguishes *present* from
  *exercised*. (TD-064, TD-065)
- **A capability is described by what it has demonstrably done, not what it was
  designed to do.** This polices code *and* our own specs — e.g. a Vision Healer
  that exists only against synthetic fixtures is "designed," not "demonstrated."
  (TD-065)

**Non-goals.** Not a rewrite, not new capability. The layer makes *existing*
capability honest.

---

## 2. The evidence object (the core abstraction)

Every stage stops emitting bare output and instead emits **evidence**: a claim plus
everything needed to trust or distrust it.

| Field | Meaning |
|---|---|
| `id` | Stable `EvidenceId`. Required — relationships (below) reference it. |
| `claim` | The assertion — e.g. "element `login.button` is present", "verdict: app-bug", "suite flakiness 18%". |
| `claimType` | `observation` (raw fact) / `inference` (derived guess) / `verdict` (synthesized judgment) / `metric` (aggregate measurement) / `recommendation` (advisory). **Gates act only on `verdict`** — never on a raw observation or inference. |
| `subject` | What the claim is about — element key, test id, run id, endpoint, page. |
| `source` | What produced the claim and how — stage + concrete signal (DOM match / screenshot / status code / spec file / heal attempt / prior-stage status). Provenance, not just a name. |
| `method` / `verificationDepth` | How the claim was established — the **present-vs-exercised** axis. For verification: `existence` / `interacted` / `state-validated` / `behavior-validated`. |
| `derivation` | How `confidence` was computed — named inputs + rule, so the number reconstructs. Never absent. |
| `confidence` | **Axis 1 — truth-likelihood.** Derived value (0..1) + the inputs that produced it. A literal here is a layer violation. (TD-066) |
| `validity` | **Axis 2 — lifecycle.** `draft` (pre-emit, transient) → `unproven` → `validated` / `superseded` / `invalidated`. |
| `freshness` | **Axis 3 — recency.** When the signal was captured + a staleness flag. (TD-067) |
| `relationships` | `supports[]` / `contradicts[]` / `supersedes[]` — `EvidenceId` references. Native contradiction support so Triage reads a graph instead of rebuilding one. |

**The three axes are orthogonal.** A claim can be high-confidence-but-`unproven`,
`validated`-but-low-confidence, or stale-but-`validated`. Never collapse them.

**Lifecycle is driven by the relationship edges (defined transition set):**

- `A supersedes B` ⇒ `B.validity = superseded`. `supersedes` is **acyclic** —
  append-only / temporal; newer supersedes older, never the reverse.
- `A contradicts B` and `A` wins on confidence ⇒ `B.validity = invalidated`.
- `A contradicts B` with **no confidence-dominant winner** ⇒ neither is invalidated;
  the unresolved contradiction is itself the signal to `defer` (§4).

**Invariants.**
- A later stage may **add** evidence; it may not assert past its source. Nothing
  downstream upgrades confidence it did not earn.
- **Absence of evidence is evidence** — surfaces as `defer`/`unknown`, never a silent
  default or a zero rendered as a real measurement.

---

## 3. Per-phase evidence contract

For each phase: what it **consumes**, what it **must earn / emit**, and what it is
**forbidden to assert**.

| Phase | Must earn / emit | Forbidden to assert |
|---|---|---|
| **1. Crawl** | Discovery evidence per page/element, tagged with *how* found (nav-link, button-text heuristic, etc.); records which heuristic fired + coverage limits. (TD-068) | That a page is "real/working" — that's Verify. Discovery via English/e-commerce-only heuristics without recording that as a coverage/confidence limit. |
| **2. Classify** | Importance/role labels with source (deterministic rule vs. AI judgment); confidence derived from rule-grounding / agreement. | An AI-named or AI-ranked element presented as ground truth. |
| **3. Verify** | Evidence stamped with `verificationDepth`: `existence` → `interacted` → `state-validated` → `behavior-validated` (business outcome occurred — redirect, token issued, dashboard loaded — not just a state change). A check that can't run because prerequisite state is unmet emits **`indeterminate — prerequisite unmet`**, not a false negative. (TD-013 reframed as honesty.) | "Verified" on existence-only. A failed stateful check reported as "element absent." `behavior-validated` claimed when only `state-validated` was reached. |
| **4. Generate** | Each spec carries an **assertion-strength** signal `none/smoke/shallow/meaningful` — the spec-side of the depth ladder above. Spec ships `validity: unproven`. A `meaningful` spec that only reaches `existence` at runtime is a detectable gap. (TD-064) | A generated spec presented as trustworthy by default. |
| **5. Execute** | Raw results (pass/fail/error/timeout) + **environment fingerprint** + **freshness stamp** on every run. | (Rawest signal.) Must stamp env + freshness so staleness is detectable (the TD-059 class). |
| **6. Heal** | Heal evidence scored on **correctness, not resolvability**, carrying **validation-state** (`synthetic-fixture-only` vs `production-validated`). (TD-065) | Recording a resolved locator as a *successful* heal. Claiming the Vision Healer works when it has only run against fixtures. |
| **7. Triage** | A verdict from the §4 taxonomy with **source incl. spec grounding**, **derived confidence**, and the **contradiction edges** it rested on. No verdict ⇒ `defer`. (TD-063.) | "Bug" without spec grounding. Any verdict above the confidence floor without earned evidence. A silent default in place of `defer`. |
| **8. Analyze** | Trends over runs of comparable freshness/validity; mixed inputs flagged. | Trending over stale or mixed-validity runs without flagging. |
| **9. Report** | Every surfaced number shows earned confidence + freshness + method. `I don't know` is a first-class rendered state. | Rendering a hardcoded/default confidence as real (TD-066). Zero/blank where the honest answer is "no data / indeterminate." |
| **10. Learn** | Consumes `validated` evidence **by default**. **May** consume `defer` evidence for *anomaly detection only* — flaky detection, uncertainty clustering, future human labeling — **never for pattern reinforcement / autonomous behavior**. | Reinforcing patterns from `unproven`/`defer` evidence. Letting deferred evidence shape autonomous decisions. |

---

## 4. Verdict & confidence model (constrained sockets)

Per **lean-(a)** altitude: fix the *slots* and the *derivation contract*; the final
taxonomy table and exact `f()` are downstream designs that plug in.

**Verdict taxonomy — canonical slots** (each earned by specific evidence; the
contradiction graph in §2 is how the non-`app-bug` ones are earned):

- `app-bug` — real defect in the application.
- `test-or-spec-defect` — test/spec is wrong (earned when execution evidence
  contradicts crawl/verify evidence and a heal is validated, etc.).
- `infra-defect` — FORGE's own pipeline/CI/env failed (TD-059 / TD-067 class).
- `flaky` — non-deterministic; insufficient signal to call bug vs. test.
- `defer` — **uncertain, needs a human.** First-class verdict, not a fallback bucket;
  the default outcome of an unresolved contradiction.

**Confidence derivation contract:**
`confidence = f(inputs)`, `inputs ⊆ { grounding ratio, strategy tier, verification
depth, spec-assertion strength, heal validation-state, freshness }`. Each stage
declares its inputs. **No literals.** Shape of `f()` deferred.

**▶ DECISION (confidence formula):** lock `f()` in a follow-on design (draft assumes
follow-on).

**DECISION (bug-gate, TD-063) — LOCKED:** A gate may **block** only on evidence that
is `fresh` + `validated` + `spec-grounded` + `high-confidence` + `claimType: verdict`
+ verdict `app-bug`. Everything else **informs / escalates / defers — never blocks.**
Default today is **informational (red-but-honest), not blocking** (0/4 sampled
verdicts were real app bugs → blocking now would be a false signal, which the thesis
forbids).
*Promotion path:* blocking mode becomes available as configuration once triage
precision is **demonstrated > 95% over N runs**.
*Precondition (dependency):* measuring precision requires a **confirmed-verdict
feedback loop** (human labels or downstream confirmation). That loop is a build item —
blocking is earned when the loop exists **and** the threshold is met, not on elapsed
time.

---

## 5. Freshness & pipeline self-awareness (TD-067)

FORGE must fail honestly about *itself*. Before trusting any per-test verdict, an
**evidence-health pre-flight** asks: are inputs fresh? did every stage actually run?
is any signal stale (the TD-059 stale-`test-results.json` class)? If FORGE cannot
trust its own inputs, the honest verdict for the **whole run** is `infra-defect` /
"I don't know" — it does **not** emit per-test bug verdicts over untrustworthy data.
Exact checks plug into the freshness field (§2).

---

## 6. Source of truth & persistence (TD-060 / TD-057 / TD-058)

Settled in the north-star; restated as the home for evidence:

- The **database** (`RunsTable` etc.) is the **single authoritative** store. Evidence
  objects (incl. their relationship edges) persist and accumulate here.
- `run-history.json` is an **append-only event log** whose only job is to
  **seed/reconstitute the DB** — not a parallel store readers consult.
- **TD-057:** decouple the DB insert from the JSON dedup early-return.
- **TD-058:** CI rebuilds its ephemeral DB by **seeding `RunsTable` from the
  committed `run-history.json`** each run.
- **Dedup** moves to the **DB layer** (UNIQUE constraint), confirmed in TD-058 design.

---

## 7. Gates & surfacing

- **Release signal:** only `fresh + validated + spec-grounded + high-confidence`
  `app-bug` verdicts (§4). Everything else informs, not blocks.
- **How honesty reaches the human:** every surfaced claim carries confidence +
  freshness + method; `defer`/`unknown` and `infra-defect` are rendered explicitly,
  never collapsed into pass/fail.

---

## 8. Migration map — rewrite vs. emit-into-layer

Module-by-module against the stable base. **Not a big-bang rewrite.** The evidence
object (§2) lands first as a stable type; then stages emit into it one at a time;
then gates/report consume it. Foundation before surface.

| Module / area | Change | Why |
|---|---|---|
| Evidence object + types | **New, lands first** | The socket everything else plugs into. |
| `ai-triage.ts` | **Rewrite** | New taxonomy + spec grounding + contradiction-graph reasoning + derived confidence (TD-063). Largest item. |
| Confidence emitters (wherever literals live) | **Rewrite literals → derivation** | TD-066. |
| Generate | **Extend** | Emit assertion-strength + `validity: unproven` (TD-064). |
| Heal (`SmartLocator`/`HealStore`/`VisionHealer`) | **Extend + reconcile** | Correctness + validation-state scoring (TD-065); reconcile the signed-off PHASE4 spec with demonstrated reality (rename "RYQ", label Vision Healer by what it's proven to do). |
| Verify | **Extend** | Emit depth ladder incl. `behavior-validated` + `indeterminate` (TD-013 honesty). |
| Crawl | **Extend** | Record heuristic provenance + coverage limits (TD-068). |
| Evidence-health / freshness pre-flight | **New module** | TD-067. |
| Confirmed-verdict feedback loop | **New (later)** | Precondition for bug-gate blocking mode (§4). |
| Data layer | **Per TD-060/057/058** | §6. |

---

## 9. Open decisions (collected)

1. **Altitude** — proceeding on lean (a). Confirm or override.
2. **Confidence formula `f()`** — lock here or follow-on? (Draft: follow-on.)
3. **Bug-gate (TD-063)** — **LOCKED**: informational/red-but-honest now; blocking
   earned via >95% precision over N runs + a confirmed-verdict feedback loop.

---

*FORGE — Crawl. Model. Verify. Generate. Heal. — now with earned evidence beneath
every claim.*
