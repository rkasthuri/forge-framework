# ADR-007: App-Agnostic Framework Design

Date: 2026-06-29
Status: Accepted

## Context

FORGE is intended to onboard arbitrary applications.

Hardcoded application behavior threatens maintainability.

## Decision

Framework internals shall remain completely application agnostic.

Application-specific behavior belongs exclusively within onboarding configuration.

Framework code shall never contain:

- hardcoded URLs
- app-specific selectors
- application names

## Consequences

Positive:

- Greater extensibility.
- Reduced maintenance burden.

Negative:

- Requires stronger onboarding configuration.