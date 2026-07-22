# ARCHITECTURAL_PRINCIPLES.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> FORGE's engineering principles. These are standing truths, not decisions.
> ADRs explain why a specific decision was made. This document explains what
> FORGE believes — permanently, not situationally.
>
> If an ADR changes, these principles should rarely need to change.
> If a principle needs to change, that is a fundamental event requiring
> Raj's explicit decision and a dated version increment here.
>
> Read time: 10–15 minutes. Consult frequently.

---

## Index

1. [Observe Before Assert](#1-observe-before-assert)
2. [Evidence Before Confidence](#2-evidence-before-confidence)
3. [Never Invent Specificity](#3-never-invent-specificity)
4. [Provenance Follows Evidence](#4-provenance-follows-evidence)
5. [Honest Write, Honest Read](#5-honest-write-honest-read)
6. [Aggregate to the Weakest Truth](#6-aggregate-to-the-weakest-truth)
7. [Declare Competence Boundaries](#7-declare-competence-boundaries)
8. [GREEN Requires Both Dimensions](#8-green-requires-both-dimensions)
9. [AI Must Be Explainable](#9-ai-must-be-explainable)
10. [Every AI Capability Needs an Eval](#10-every-ai-capability-needs-an-eval)
11. [Honesty Floor Before Agentic Expansion](#11-honesty-floor-before-agentic-expansion)
12. [Narrower Is Stronger Than Dishonest](#12-narrower-is-stronger-than-dishonest)
13. [Design Before Code, Audit Before Fix](#13-design-before-code-audit-before-fix)
14. [The Engine Boundary Is Inviolable](#14-the-engine-boundary-is-inviolable)
15. [Learn from Production, Not Assumptions](#15-learn-from-production-not-assumptions)

---

## Ordering

These principles are ordered intentionally. The earlier principles constrain
the later ones. When two principles appear to conflict, the earlier principle
takes precedence unless an ADR explicitly states otherwise.

The dependency chain runs in one direction:

```
Observe          → you cannot assert what you have not seen
Evidence         → you cannot have confidence without evidence
Competence       → you cannot classify beyond your declared boundaries
Honesty          → you cannot call something GREEN on one dimension alone
Explainability   → you cannot expand AI you cannot audit
Eval             → you cannot trust AI you cannot measure
Honesty floor    → you cannot expand agents on untrustworthy evidence
```

Stated plainly:
- Evidence before confidence
- Confidence before AI conclusions
- AI conclusions before agentic action

Skipping a layer does not make the system faster. It makes it dishonest.

---

## 1. Observe Before Assert

**Principle:** FORGE does not assert anything about an application it has not directly observed in a live session.

- Assertions are earned through real browser or API interaction — not inferred from documentation, prior runs, or assumed structure
- What has not been observed does not exist in the model
- An observation in a prior session is not current observation — it must be re-verified or carried with a decayed confidence
- "We observed X" and "we assume X" are categorically different statements

**Implications:**
Crawl strategies must navigate real pages, not reconstruct from static analysis.
Verification must run against the live app, not against a cached snapshot.
Agents must make evidence real by navigating — not by reasoning about what they would find.

**Related ADRs:** ADR-015

---

## 2. Evidence Before Confidence

**Principle:** Confidence scores are derived from observed evidence — they are never assumed, assigned, or defaulted.

- A high-confidence result requires high-quality evidence — not a well-written prompt
- Confidence cannot be set; it must be earned
- Default confidence is not zero — it is "unknown"
- Assertion confidence can never exceed the confidence of the evidence chain that produced it

**Implications:**
No field in the data model may default to a confident state without evidence.
Prerequisite confidence caps downstream assertion confidence — a page behind a medium-confidence login cannot have high-confidence assertions.
Confidence is a derived property, not an input.

**Related ADRs:** ADR-015, ADR-018

---

## 3. Never Invent Specificity

**Principle:** FORGE does not assert things it cannot verify — a hedged honest answer is always preferable to a confident wrong one.

- "I don't know" is a valid, correct, and sometimes the only honest output
- The system must not fill gaps with plausible-sounding specifics
- This applies equally to: test assertions, triage classifications, model fields, documentation claims, and agent reports
- Invented specificity that happens to be correct is still a violation — it was not earned

**Implications:**
The generator must not produce assertions about values it did not observe.
The triage classifier must not classify when evidence is insufficient — `insufficient-evidence` is the correct output.
Agents must not report "completed" steps they did not execute.
Documentation must not describe capabilities as shipped unless they are.

**Related ADRs:** ADR-011

---

## 4. Provenance Follows Evidence

**Principle:** Every field that carries a claim must carry evidence — provenance is derived from what was observed, never assigned to justify a conclusion.

- `observed` and `inferred` are not style labels — they are categorical distinctions with different trust levels
- Provenance may not be upgraded without re-observation
- A field marked `observed` that was not directly witnessed is a lie in the data model
- Outcome fields must never default to success — zero evidence produces "unknown"

**Implications:**
Every app model field must carry a provenance marker set at the time of observation.
No pipeline stage may promote an `inferred` field to `observed` without actually verifying it.
Run records must distinguish "did not run" from "ran and passed."

**Related ADRs:** ADR-015

---

## 5. Honest Write, Honest Read

**Principle:** A system that writes honest data but reads it incorrectly produces dishonest output — both ends of every data pipeline must be verified.

- Four failure archetypes exist: declared channel with no producer; lossy DB projection; console-as-only-home; winners-only persistence
- An honest write with a blind read is a distinct failure class — the data is there, but nobody can see it
- "An honest observation nobody can read has not finished shipping"
- Verifying the write end is not sufficient — the read end must be verified independently

**Implications:**
Every new data field must be verified read-end, not just write-end.
UI components that display data must be verified against real data — stubs are not green.
Terminal-only output that is not persisted is incomplete shipping.
Failure outcomes must be stored with the same rigour as success outcomes.

**Related ADRs:** ADR-017

---

## 6. Aggregate to the Weakest Truth

**Principle:** When combining outcomes across multiple checks, the aggregate must reflect the weakest individual result — not the strongest, not the average.

- Uncertain outcomes never read as "failed" — they read as uncertain
- No-run outcomes never read as "passed" — they read as unknown
- A single `insufficient-evidence` result in an aggregate must surface, not be absorbed
- The weakest signal is often the most important one

**Implications:**
Summary statistics must not suppress minority signals.
Dashboard and reporting components must carry `insufficient-evidence` counts as first-class metrics.
A pipeline stage with one uncertain result is not "mostly green" — it is partially uncertain.

**Related ADRs:** ADR-018

---

## 7. Declare Competence Boundaries

**Principle:** Every component that makes a claim must declare the limits of what it can observe and what it can distinguish — and must not issue conclusions beyond those limits.

- Two axes must be satisfied before a definitive conclusion: representational competence (can this value be represented?) and discriminative competence (does the evidence uniquely support this conclusion?)
- A gap in either axis requires reduced confidence or `insufficient-evidence`
- Competence boundaries that are not declared are still real — they just become invisible defects
- Discriminative gaps are particularly dangerous because they pass implementation, review, and CI — only audits catch them

**Implications:**
Detectors must be designed with their competence boundaries explicit, not discovered at runtime.
When competing causes cannot be ruled out, the conclusion must say so.
Retiring a detector that cannot satisfy its competence requirements is the correct move.

**Related ADRs:** ADR-019

---

## 8. GREEN Requires Both Dimensions

**Principle:** A capability is GREEN only when it is both honest and correct — truthful reporting and accurate measurement are independent requirements.

- **Honest:** Reports what happened without fabrication, surfaces errors, admits uncertainty
- **Correct:** The underlying behaviour is what it claims to be — the measurement is accurate
- A capability that reports honestly about incorrect behaviour is not GREEN
- A capability that measures correctly but hides errors is not GREEN
- One dimension does not substitute for the other

**Implications:**
Runtime honesty signals (confidence tiers, `insufficient-evidence`) verify the HONEST dimension.
Evaluation harnesses verify the CORRECT dimension.
Both must be in place before a capability is called shipped.
Declaring GREEN on one dimension is a documentation defect.

---

## 9. AI Must Be Explainable

**Principle:** Every AI decision in FORGE carries a reason, a confidence tier, and a traceable evidence source — no silent conclusions.

- A classification without a reason is not a classification — it is a guess with formatting
- Confidence scores without evidence chains are not scores — they are noise
- Every triage result, every heal, every AI-generated assertion must be auditable
- "The AI said so" is not an explanation

**Implications:**
Triage output must include the evidence that produced the classification.
Healing events must log the confidence tier and the strategy used.
AI call inputs and outputs must be persisted — not only the final result.
Agents must report what they did, not what they were asked to do.

---

## 10. Every AI Capability Needs an Eval

**Principle:** No AI capability is considered shipped until a measurable evaluation harness exists with a ground-truth dataset and a defined pass threshold.

- An AI feature without an eval has no CORRECT dimension — it may report honestly about incorrect behaviour, and nobody would know
- Ground-truth datasets are architectural decisions — not implementation details
- Pass thresholds must be stated before the eval is run, not adjusted after
- Evals must be reproducible — the same dataset, the same runner, the same scorer

**Implications:**
Shipping an AI capability without an eval is incomplete shipping — the TD is not resolved.
Ground-truth labels require Aiden sign-off before any label is changed.
Eval results are the gate, not a post-hoc validation.
Multi-model routing A/B testing requires a trustworthy eval harness first.

**Related ADRs:** ADR-019 (competence boundary declarations require verifiable evals)

---

## 11. Honesty Floor Before Agentic Expansion

**Principle:** Agentic capabilities must not be expanded until the evidence layer beneath them is trustworthy — autonomous action on dishonest evidence multiplies the lie.

- Agents amplify whatever honesty layer sits beneath them
- An agent acting confidently on fabricated evidence produces large volumes of confidently wrong output
- Supervised mode is the default for all agentic capabilities — autonomous mode requires explicit enablement
- Each agentic expansion must be gated on the honesty floor being solid, not just present

**Implications:**
New agentic features do not ship before the core pipeline's honesty signals are verified.
Supervised mode is always the default — no agent operates autonomously without explicit configuration.
Agentic loop design always starts with: what evidence does this agent act on, and is that evidence trustworthy?
An agent that cannot say "I don't know" is not safe to expand.

---

## 12. Narrower Is Stronger Than Dishonest

**Principle:** A narrower honest capability is architecturally stronger than a broader dishonest one — retiring an unsupported claim is not a regression.

- Scope that was never evidence-supported was never real capability
- A claim that cannot be demonstrated should not be made
- Reducing a capability to what can actually be proven improves the system — it does not weaken it
- "Narrower, not weaker" applies to detectors, classifiers, generators, and documentation alike

**Implications:**
When a capability cannot satisfy its competence requirements, retire or narrow it — do not paper over the gap.
Documentation that overstates capability is a defect, not a feature.
A smaller, honest scope is always preferable to a larger, dishonest one.
Capability retirements are recorded as deliberate decisions, not silent removals.

**Related ADRs:** ADR-019, TD-148 (identity divergence detector retirement)

---

## 13. Design Before Code, Audit Before Fix

**Principle:** Structural changes are designed and approved before implementation; defects are diagnosed to root cause before they are patched.

- "I could see what was wrong and fixed it" is not an acceptable sequence
- Patches that address symptoms without diagnosing root cause compound into future defects
- Every structural decision is documented before code is written
- An audit that surfaces candidates without acting on them is a night job — decisions are made by day

**Implications:**
No structural code change begins without an Aiden-approved brief.
No defect is patched on contact — investigation first, design second, implementation third.
EOD audits surface findings — they do not make changes.
Nova is consulted on every structural decision, regardless of how obvious the answer seems.

---

## 14. The Engine Boundary Is Inviolable

**Principle:** The engine (`src/`) has no dependency on the platform UI (`forge-ui/`) — FORGE must be runnable as a headless tool independent of any interface.

- `src/` never imports from `forge-ui/`
- `forge-ui/` communicates with the engine exclusively through `ExecutionContext` and the defined API surface
- The UI is a consumer of the engine — not part of it
- Violating this boundary makes FORGE dependent on UI concerns that have nothing to do with test automation

**Implications:**
Every diff review checks for cross-boundary imports — this is a hard block.
New inter-module contracts that cross this boundary require an ADR.
The UI can be replaced, rewritten, or removed without touching the engine.
No business logic lives in routes — routes are transport only.

---

## 15. Learn from Production, Not Assumptions

**Principle:** FORGE updates its understanding of an application from what it actually observes in live runs — not from static documentation, prior assumptions, or stale models.

- The app model is a record of what was observed, not what was expected
- Stale observations decay in confidence — they do not remain authoritative indefinitely
- Production behaviour is the ground truth — everything else is a hypothesis
- Learning that contradicts prior assumptions updates the model; it does not get suppressed

**Implications:**
App models must be refreshed from live runs, not hand-edited to match expectations.
Confidence decay is the mechanism by which stale models are eventually forced to re-verify.
Agent memory stores what was observed — not what was assumed to be true.
A model that has not been refreshed after an application change is a liability.

---

## Principles That Are Never Negotiable

These five cannot be relaxed under any circumstances — not under time pressure,
not for a single exception, not because the answer seems obvious:

| # | Principle | The line |
|---|---|---|
| 3 | Never Invent Specificity | `insufficient-evidence` is always the correct output when evidence is absent |
| 8 | GREEN Requires Both Dimensions | One dimension alone is never sufficient |
| 10 | Every AI Capability Needs an Eval | No eval = not shipped, period |
| 11 | Honesty Floor Before Agentic Expansion | Agents do not expand on untrustworthy evidence |
| 14 | Engine Boundary Is Inviolable | `src/` never imports from `forge-ui/` |

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
