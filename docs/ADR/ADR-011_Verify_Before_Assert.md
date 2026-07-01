# ADR-011: Verify Before Assert (Generated Tests Assert Only Earned Evidence)

Date: 2026-06-30
Status: Accepted

## Context

FORGE's spec generator emitted assertions derived from the App Model's static
structure without verifying they held against the actual application. This produced
a large class of broken generated tests (TD-064): non-unique-selector strict-mode
violations, unverified navigation expectations, and visibility assertions on
state-gated elements. The root cause is asserting from inference rather than from
earned evidence — the same failure mode FORGE's truth-telling thesis forbids
elsewhere (triage, healing, confidence).

## Decision

Generated tests shall assert or act only on behavior FORGE has directly observed,
verified, or can prove from the App Model with high confidence.

When evidence is insufficient, FORGE shall omit the assertion/action, downgrade it
to a weaker assertion it can prove, or flag the artifact for review.

FORGE shall never silently invent specificity, certainty, or reachability.

When FORGE cannot prove visibility, it shall assert the strongest state it can prove and surface the
limitation to human reviewers (e.g. an inline annotation downgrading toBeVisible to toBeAttached).

## Scope

This principle applies beyond the generator — to selectors, navigation
expectations, healing, flow inference, triage, and future coverage analysis.
Wherever FORGE does not know which thing it means, it must not pretend that it does.
TD-064 (the generator) is the first concrete application.

## Consequences

Positive:
- Generated tests are trustworthy: they assert what FORGE can prove.
- "insufficient-evidence" remains a legitimate, honest outcome, not a defect to hide.
- Consistent with source-of-truth discipline (the App Model carries earned evidence;
  consumers decide behavior from it).

Negative:
- The generator must carry/consume more evidence (cardinality, observed URLs,
  visibility state) rather than guessing — more plumbing.
- Some assertions become weaker (e.g. attached vs visible) or are omitted when
  unprovable — fewer but honest assertions.

## Related Documents
docs/td-064/ (Failure Class Catalogue, Generator Architecture), TECH_DEBT.md (TD-064),
ARCHITECTURE_NORTH_STAR.md (truth-telling thesis).

---
### Corollary (FC-004a): Assertion confidence cannot exceed prerequisite confidence

Generated assertions shall not exceed the confidence of the prerequisites on
which they depend. When a step depends on a prerequisite whose grounding is
uncertain, the dependent assertion must be weakened or omitted to match — never
asserted at full strength.

Applied consistently across the TD-064 failure classes, this yields one
three-valued decision (full / downgraded / omit), driven by dependency
confidence:

- Unverified navigation (prior step inferred; page not proven reached)
  -> OMIT dependent page/element assertions + annotate. Element presence is
     unprovable if arrival is unproven; toBeAttached would be an equal overclaim.
- Single inferred hop (path to page intact, only final hop uncertain)
  -> DOWNGRADE: toBeVisible -> toBeAttached (presence honestly holdable,
     visibility not).
- Hidden element observed at crawl (FC-003)
  -> DOWNGRADE visibility -> toBeAttached.
- Non-unique selector observed at crawl (FC-001)
  -> emit robust repeated-case form (.first() + not.toHaveCount(0)).
- Fully observed / verified prerequisite
  -> FULL assertion (toBeVisible / toHaveURL).

The per-element assertion FORM (FC-001 cardinality, FC-003 observedState) is
orthogonal to and nested beneath this per-dependency capability decision.
---
