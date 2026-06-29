# ADR-001: App Model as the Single Source of Truth

Date: 2026-06-29
Status: Accepted

## Context

FORGE consists of multiple subsystems:

- Discovery
- Classification
- Verification
- Generation
- Healing
- Reporting
- Intelligence

Allowing each subsystem to maintain independent models introduces drift, inconsistent behavior, and duplicate logic.

## Decision

(This records the decision moment; the standing principle lives in ARCHITECTURE_NORTH_STAR.md — this
ADR does not redefine it.)

The App Model shall be the single logical source of truth for the platform.

All downstream systems must consume and improve the App Model rather than maintain parallel representations.

## Alternatives Considered

### Independent subsystem models

Rejected.

Creates multiple sources of truth and long-term divergence.

### Event-sourced architecture

Rejected.

Adds complexity without sufficient benefit at current scale.

## Consequences

Positive:

- Consistent behavior across subsystems.
- Simplified healing and verification.
- Easier dashboard drill-down.
- Reduced duplication.

Negative:

- Requires strong schema governance.
- Risk of App Model becoming overly large.

## Related Documents

ARCHITECTURE_NORTH_STAR.md