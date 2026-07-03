# FORGE — Autonomous Quality Engineering

This file is automatically loaded by Claude Code at the start of every session.

Its purpose is to define how work should be performed inside this repository. Read this file completely before making any changes.

If instructions in this file conflict with the observed codebase, do not silently choose one source. Surface the conflict explicitly.

Also read the following files before starting non-trivial work:

* `MEMORY.md` — historical findings, known behaviors, prior decisions.
* `TECH_DEBT.md` — current limitations, open issues, and priorities.
* `docs/ARCHITECTURE_NORTH_STAR.md` — architectural principles and long-term design.
* `docs/PRODUCT_VISION.md` — product goals, branding, roadmap, and market context.
* `docs/ADR/` — accepted architectural decisions and rationale.

---

# What FORGE Is

FORGE is an AI-augmented, app-agnostic, enterprise-grade Quality Engineering platform.

Tagline:

**Autonomous Quality Engineering**

FORGE discovers applications, models them, verifies them, generates tests, executes them, heals failures, and continuously learns from execution history.

The platform is intended for enterprise customers and demonstrations. Reliability, truthfulness, explicit failure modes, and maintainability are more important than speed.

---

# Instruction Priority

When instructions conflict, obey in this order:

1. Explicit user request.
2. Observable repository code and tests.
3. Standing Rules in this file.
4. `MEMORY.md`
5. Architecture documentation.
6. Product Vision documentation.

Never silently resolve conflicts. Explicitly surface them.

---

# Current Implementation State

Before using any capability, verify it exists in code.

Current proof-testing targets:

* SauceDemo
* OrangeHRM
* Restful Booker

Implemented:

* Crawler Strategy Pattern
* Authentication Management
* Element Classification
* Flow Detection
* Verification Runner
* Smart Locator Healing (strategy-chain + Vision escalation; correctness-verified via post-heal assertion re-run — TD-065 Tiers 1+2, at the POM action layer; spec-body assertion healing deferred — TD-094)
* Vision Healer (real Claude Vision aiCall, 0.8 confidence threshold; invoked by SmartLocator as the heal escalation)
* Spec Generation
* Review / Promotion Workflow
* CI Pipeline with AI Triage
* Run History / Trend Analysis

Not Yet Implemented:

* Dashboard
* NL Query ("Ask")
* Coverage Gap Analysis
* User Story → Test Generation
* Manual Test Conversion
* Mobile / IoT / Cloud Crawling

Do not assume architectural capabilities exist simply because they are documented.

Verify first.

---

# System Pipeline

FORGE follows this lifecycle:

ONBOARD
→ CRAWL / INTROSPECT
→ CLASSIFY
→ APP MODEL
→ VERIFY
→ GENERATE
→ REVIEW
→ EXECUTE
→ HEAL
→ REPORT

The App Model is the system source of truth.

All downstream systems should consume and improve this model rather than creating parallel representations.

---

# Standing Rules

## 1. Prove foundations before building UI.

Do not build platform features on top of unreliable crawler, verification, or modeling behavior.

---

## 2. Design before patching.

Prefer structural fixes over local patches.

Avoid one-off solutions that bypass existing architecture.

---

## 3. No known bugs beneath new work.

Do not stack work on top of unresolved defects in the same area.

Fix or explicitly defer first.

---

## 4. App-agnostic by design.

Never hardcode application-specific behavior inside framework internals.

Application-specific logic belongs only in onboarding configuration.

---

## 5. Silent failures are unacceptable.

Every failure, escalation, budget exhaustion, or degraded mode must be explicitly logged.

Errors must never be swallowed.

---

## 6. Generated tests must be self-contained.

Generated tests must include prerequisite steps and setup required to reach the tested state.

---

## 7. Evidence over claims.

Never state:

* "fixed"
* "working"
* "passing"

without executable evidence.

Run commands.
Inspect outputs.
Present results.

---

## 8. Flag scope expansion.

Do not silently absorb unrelated work.

Surface newly discovered issues separately.

---

## 9. Confirm before pushing.

Repository CI triggers:

* live external systems
* Claude API usage
* Slack notifications
* email notifications
* automated commits

Ensure consequences are understood before pushing.

---

# Think Before Coding

Before implementation:

* State assumptions explicitly.
* Surface tradeoffs.
* Consider alternative designs.
* Push back on unnecessary complexity.
* Ask questions when requirements are ambiguous.
* Prefer simple solutions when they satisfy requirements.

Never silently guess.

---

# Decision Framework

Before changing code ask:

1. Is this a symptom or root cause?
2. Does an abstraction already exist?
3. Will this remain app-agnostic?
4. Does this create another source of truth?
5. Can this fail silently?
6. How will success be proven?

Prefer architectural improvements over tactical patches.

Avoid speculative abstractions.

---

# Source-of-Truth Discipline

Before introducing new storage, state, or computation:

* Does this duplicate existing information?
* Can an existing subsystem provide this information?
* Will multiple sources drift?

Prefer extending existing systems over creating new ones.

---

# Surgical Changes

When modifying code:

* Change only what is necessary.
* Match existing style and architecture.
* Avoid unrelated refactors.
* Remove only dead code introduced by your changes.
* Keep commits cohesive and focused.

Every changed line should trace directly to the requested work.

---

# Standard Workflow

For non-trivial work:

1. Read relevant code.
2. Review `MEMORY.md`.
3. Review `TECH_DEBT.md`.
4. Identify root cause.
5. Propose design.
6. Implement incrementally.
7. Execute verification commands.
8. Present evidence.
9. Identify side effects and risks.

---

# Common Failure Patterns

Common historical failures include:

* stale closures vs live state
* credential placeholder mismatches
* oversized AI batches causing truncation
* SPA crawl actions mutating application state
* healing routines promoting weaker selectors
* named functions inside `page.evaluate()` failing under `tsx`

Review `MEMORY.md` and historical findings before assuming a problem is new.

---

# Tech Stack

* TypeScript
* Playwright
* Node.js
* Claude API
* SQLite / PostgreSQL
* Kysely ORM
* GitHub Actions

Repository:

https://github.com/rkasthuri/forge-framework

Current branch:

`main`

Pending future rename:

`forge-framework`

Local development:

Windows PowerShell

---

# When Unsure

If you cannot find a documented capability in code:

* say so
* verify assumptions
* ask for clarification

Never invent missing functionality.
