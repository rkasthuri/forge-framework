<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-003: Human Review Gate Before Promotion

Date: 2026-06-29
Status: Accepted

## Context

AI-generated artifacts may contain inaccuracies, poor assumptions, or unsafe behavior.

Enterprise customers require governance and auditability.

## Decision

All generated artifacts shall require human review prior to promotion into maintained test suites.

Generated artifacts shall never overwrite human-authored code.

## Alternatives Considered

### Fully autonomous promotion

Rejected.

Insufficient reliability for enterprise environments.

## Consequences

Positive:

- Increased trust.
- Improved governance.
- Reduced accidental regressions.

Negative:

- Additional review effort.