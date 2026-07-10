<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-002: SQLite + PostgreSQL Database Strategy

Date: 2026-06-29
Status: Accepted

## Context

FORGE targets both local developer usage and enterprise deployments.

Local users require frictionless setup while enterprises require scalable, managed persistence.

## Decision

FORGE shall support:

- SQLite as the default local database.
- PostgreSQL for enterprise deployments.

Kysely shall provide dialect abstraction.

## Alternatives Considered

### PostgreSQL only

Rejected.

Creates unnecessary onboarding friction.

### SQLite only

Rejected.

Insufficient for enterprise scaling requirements.

### NoSQL databases

Rejected.

Relational structure better matches App Model requirements.

## Consequences

Positive:

- Zero-config local onboarding.
- Enterprise scalability.
- Unified query abstraction.

Negative:

- Must maintain multiple dialects.