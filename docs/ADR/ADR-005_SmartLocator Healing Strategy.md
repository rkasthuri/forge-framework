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

Vision-based healing is the designated final fallback in the hierarchy. At the time this ADR was
written, Vision-based healing was not yet implemented (TD-065); it has since shipped — see
## Implementation (2026-06-19) below. Tiers 1–5 (data-test, id, role, css, text) are implemented and
proven; the ordered-strategy no-downgrade promotion logic was evidenced 2026-06-28 (heal join test).

## Confidence Hierarchy

1. data-test
2. id
3. role
4. css
5. text
6. vision  — implemented 2026-06-19 (see ## Implementation below); real aiCall @ 0.8 confidence, wired as final fallback in SmartLocator.resolve()

## Consequences

Positive:

- Stable healing.
- Reduced selector degradation.

Negative:

- Additional promotion logic complexity.

## Implementation (2026-06-19)

The VisionHealer subsystem is fully implemented, unit-tested, and wired live into
`SmartLocator.resolve()` as the final healing escalation after the ordered strategy
chain. It issues a real model call via `aiCall()` (src/core/healing/VisionHealer.ts)
under a 0.8 confidence threshold (VISION_CONFIDENCE_THRESHOLD), with graceful
degradation when no API key is present (returns confidence 0, does not throw) and a
per-run budget (VISION_HEAL_BUDGET, default 5). This ADR's decision was Accepted
pre-implementation; this section records that the implementation subsequently landed
and matches the decision. Current truth is also recorded in MEMORY.md.
