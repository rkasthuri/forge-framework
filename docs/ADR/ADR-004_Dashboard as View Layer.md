# ADR-004: Dashboard as a View Layer

Date: 2026-06-29
Status: Accepted (not yet implemented)

## Context

FORGE contains multiple systems already producing valuable signals:

- HealStore
- AI Triage
- Flaky Predictor
- Run History
- Trend Analysis

Building a separate reporting model risks duplication.

Note: The Dashboard is not yet implemented (see CLAUDE.md "Not Yet Implemented" and the standing
rule deferring Dashboard work until crawler/verification/modeling foundations are proven). This ADR
records the design decision that will govern the Dashboard WHEN built; nothing is yet built to it.

## Decision

Dashboard shall function as a view layer over existing data sources.

Dashboard shall not maintain an independent reporting model.

## Alternatives Considered

### Dedicated reporting pipeline

Rejected.

Creates duplicate truth and synchronization risk.

## Consequences

Positive:

- Single source of truth.
- Less duplication.
- Consistent drill-down.

Negative:

- Dashboard depends on upstream data quality.