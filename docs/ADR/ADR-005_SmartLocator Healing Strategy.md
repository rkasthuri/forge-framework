<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-005: SmartLocator Healing Strategy

Date: 2026-06-29
Status: Accepted

## Context

Selectors degrade over time.

Healing is essential for maintaining generated tests.

## Decision

SmartLocator shall maintain ordered selector strategies ranked by confidence.

Lower-confidence strategies shall never displace higher-confidence strategies as primary selectors.

Vision-based healing is the designated final fallback in the hierarchy, but is NOT yet implemented
(Vision Healer is unbuilt — TD-065). Tiers 1–5 (data-test, id, role, css, text) are implemented and
proven; the ordered-strategy no-downgrade promotion logic was evidenced 2026-06-28 (heal join test).

## Confidence Hierarchy

1. data-test
2. id
3. role
4. css
5. text
6. vision  — PLANNED, not yet implemented (Vision Healer is unbuilt; see TD-065)

## Consequences

Positive:

- Stable healing.
- Reduced selector degradation.

Negative:

- Additional promotion logic complexity.