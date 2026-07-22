# Architecture Review Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: Aiden sends this to Nova at every design fork -->
<!-- Rule: Nova is consulted at every design fork, regardless of how obvious the answer seems -->

---

## FORGE Architecture Review Request

**To:** Nova
**From:** Aiden
**Date:** [YYYY-MM-DD]
**Related TD:** [TD-XXX or N/A]
**Related ADR:** [ADR-XXX if one is being written]

---

### What I Am Asking You to Review

[One sentence describing the decision or design being reviewed.
Example: "Whether StrategyDetector signal counting should be fixed in the
detector itself or extracted into a separate SignalAuditor component."]

---

### Current State

[What exists today. Be specific — file names, component names, current behaviour.
Do not assume Nova has context from prior sessions.]

---

### The Problem or Decision

[What problem triggered this review, or what decision must be made.
Include the TD number if this is triggered by a logged defect.
Include what happens if no decision is made (i.e. the cost of inaction).]

---

### Options Considered

**Option A — [Name]**
[Description of the approach.]

Pros:
- [pro]
- [pro]

Cons:
- [con]
- [con]

---

**Option B — [Name]**
[Description of the approach.]

Pros:
- [pro]
- [pro]

Cons:
- [con]
- [con]

---

**Option C — [Name, if applicable]**
[Description or "None — options A and B cover the space."]

---

### My Current Leaning

[Which option Aiden is leaning toward and why.
Being honest about the lean does not bias Nova — it gives Nova something to
challenge. Do not hide the lean in the name of appearing neutral.]

---

### Relevant ADRs and Constraints

[List ADRs that apply to this decision. Quote the decision, not just the number.]

- ADR-015: Provenance follows evidence — never the reverse
- ADR-019: Vocabulary competence boundary — both axes must be satisfied
- [Others as applicable]

**Hard constraints (non-negotiable):**
- Engine boundary: `src/` never imports from `forge-ui/`
- No hardcoded paths
- GREEN requires both HONEST and CORRECT

---

### What I Need From You

Please deliver your response in this format:

```
ASSESSMENT
[What you understand the proposal to be. What assumptions it makes.
What it gets right.]

RISKS
[What could go wrong. What was not considered. What the proposal assumes
that may not hold. Which of the options introduces technical debt.]

RECOMMENDATION
[Which option you would choose and why. Be direct — Raj needs a
recommendation, not a list of tradeoffs he already has.]

DECISION
Deferred to Raj.
[Any open questions Raj should resolve before implementation begins.]
```

---

### Sequencing Note

[Any dependency this decision has on other open work.
Example: "This decision gates TD-162 — we cannot fix the signal counting
until we know whether the fix lives in StrategyDetector or a new component."]
