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
