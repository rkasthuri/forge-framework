<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-019: Vocabulary Competence Boundary

## Status
Proposed

## Date
2026-07-18

## Principle
> "A detector may only produce conclusions its observation vocabulary is competent
> to distinguish." — Nova, second reviewer, Aiden-arbitrated, Raj-confirmed

ADR-015 governs **provenance**: a claim requires evidence.
ADR-019 governs **competence**: the evidence must be capable of *supporting* the
claim. Neither replaces the other — a conclusion needs both an observation (015)
and an observation whose vocabulary can express the distinction being claimed (019).

## The distinction that generated it
The three-state identity-divergence model (TD-UI-027: `divergence-detected` /
`no-divergence-detected` / `inconclusive`) protected against a **failed** observation
collapsing into agreement — a probe that could not run returns `inconclusive`, never
`no-divergence-detected`. It did **not** protect against a **successful-but-incompetent**
observation doing the same.

The old guard asked: *"did the probe run?"* The missing question is: *"was the probe
capable of representing the thing it was asked about?"* A probe can run cleanly, produce
a confident value, and still be answering a question its vocabulary cannot express. That
value compared against a configured value the detector cannot represent yields a
comparison result that looks earned but is not.

## The contract
Every detector owns two things, and **both are part of its public contract, not
implementation detail**:

- **(a) its observation vocabulary** — the set of values it can observe and emit;
- **(b) its competence boundary** — the set of *configured* values it is capable of
  representing well enough to compare against.

A detector that hides its competence boundary invites callers to compare against values
it cannot represent and to treat the result as sound.

## The rule
Any comparison against a configured value **outside the detector's competence boundary
resolves to `inconclusive`**. This is **not a fallback**. It is the only truthful answer:
the detector is not *missing evidence* — it observed cleanly — it is *missing the language
to express the distinction*. `inconclusive` here carries the observed value (the probe saw
something) but declares that the comparison could not be competently made.

## The authority rule
The **detector** is the authority on its own competence — never the comparison layer.
Comparison layers **ask** (`canRepresent(configuredValue)`); they do **not** maintain
their own copies of vocabulary lists. A public array invites callers to read and copy it,
reproducing the list at every call site and letting it drift; a method keeps the boundary
interrogable but not copyable, and does not assume the boundary is a finite enumerable
list. (This is why ADR-019 mandates a `canRepresent`-style predicate over an exported
`supportedVocabulary` array — the two reviews split on this; the method won on the
authority rule.)

## Application policy — audit ON CONTACT, not proactively
Whenever a detector changes, or a consumer performs a comparison, ask: *"can the detector
represent every configured value it will be compared against?"* If multiple detectors are
found with this defect during normal work, a broader audit becomes justified **by
evidence**. Do **not** launch a speculative sweep across all detectors now — that would be
the same unearned-thoroughness the honesty rules reject. The boundary is checked where the
work touches it.

## Worked example — TD-142 (SSO observes as authType `none`)
The authType detector's vocabulary is `{ form-login, none }` (password-field presence). An
SSO / redirect-based login page presents no password field, so the detector observes
`none` — cleanly, confidently. Compared against a configured `sso` (or `oauth`) auth flow,
raw comparison would report `divergence-detected` (`none` ≠ `sso`), and a matching config
would report `no-divergence-detected` — both **unearned**: the detector has no way to
observe or represent `sso`, so it cannot competently confirm *or* deny the distinction.
Under ADR-019 the comparison resolves to `inconclusive`, and the CHECKED/NOT-CHECKED
manifest names the vocabulary limitation so coverage is never over-implied. The capability
to actually detect SSO is a separate milestone (TD-144), gated behind its own evaluation
bar — until then, `inconclusive` is the honest state, a declared limitation, not a defect.

## Named candidate surfaces (NOT scheduled work)
Surfaces to check ON CONTACT when next touched — listed to seed the on-contact check, not
to schedule a sweep:

- **appType** — hybrid / micro-frontend applications outside the SPA/MPA vocabulary the
  detector distinguishes.
- **crawl strategy selection** — the strategy the detector can choose vs. the space of
  real application shapes.
- **element classification** — a combobox must not be confidently emitted as `textbox`
  when the classifier's vocabulary lacks `combobox`; absence of the label is not evidence
  of the simpler type.

## Consequences
- Detectors gain a `canRepresent(configuredValue): boolean` predicate on their contract.
- Comparison layers gate every comparison through the owning detector's `canRepresent`
  before any equality check — a competence miss returns `inconclusive` via a structural
  early return, unreachable-equality, exactly as the null-observation branch does.
- Reports name the competence limitation in their coverage manifest; remedies for a
  competence miss use the "analysis could not be completed / known limitation" tier and
  never imply the configuration was checked and found sound.

## Relationship to other ADRs
- **ADR-015 (Provenance Follows Evidence)** — the sibling. 015: a claim requires evidence.
  019: the evidence must be competent to support the claim. Read together.
- **ADR-016 (Map the Gap, Prescribe the Remedy)** — a competence-`inconclusive` result
  carries a machine-readable remedy naming the limitation and the capability follow-up.
- **ADR-017 (What FORGE Observes, FORGE Keeps)** — unrelated to this law; ADR-019 is a new,
  separately-numbered decision and does not modify ADR-017.
