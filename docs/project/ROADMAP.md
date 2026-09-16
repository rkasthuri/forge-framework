# FORGE Roadmap

---

Document Authority:
C — Status/Snapshot

Owner:
Product Owner

Source of Truth:
Approved product direction, completed milestone evidence, current repository
behavior, and the Post-M3 Product Gap Board

Refresh Trigger:
Milestone transition, capability completion, approved priority change, or
product-direction decision

Last Verified:
2026-08-29

---

This roadmap describes sequence; it does not prove implementation. Use
[`PROJECT_STATE.md`](PROJECT_STATE.md) for the current snapshot and
[`POST_M3_PRODUCT_GAP_BOARD.md`](../governance/POST_M3_PRODUCT_GAP_BOARD.md)
for prioritized gap ownership.

## Current phase

**Post-M3 Product Truth Alignment**

The near-term goal is a coherent, trustworthy local single-user Product. Cloud
and external-user readiness are separate tracks and must not be inferred from
local behavior.

## Closed milestones

| Milestone | Certified Product capability | Status |
|---|---|---|
| M1 | Observed app-area intent -> canonical v3 Definition -> Execution -> immutable Result | Closed |
| M2 | Immutable ordered Sanity Suite revision -> exact historical Execution -> immutable Result | Closed |
| M3 | Immutable manual source -> deterministic proposal/refusal -> identity-only Save -> atomic v3 promotion -> Execution -> Result | Closed |

The closures are bounded. They do not ship general AI authoring, canonical
failure triage, automatic healing, Insights, scheduling, bulk import,
cross-project orchestration, external-user packaging, or cloud/tenant safety.

## Active: Product Truth Alignment

- correct Product positioning and primary navigation;
- label mounted 501 routes as legacy compatibility surfaces;
- refresh post-M3 state, limitations, architecture map, and setup guidance;
- carry the promoted Definition into the explicit Suite draft without changing
  Suite authority;
- establish the authoritative prioritized Gap Board.

No M4 feature code belongs in this phase.

## Proposed M4 — Evidence-Gated Failure Intelligence

**Objective:** turn immutable Result evidence into an honest, actionable Product
diagnostic path.

```text
Immutable Result
-> diagnostic evidence projection
-> evidence-gated classification or refusal
-> explanation
-> Result detail
-> Insights aggregation
```

Dependencies include immutable Result authority, persisted-evidence aggregation,
project scoping, a frozen classification/refusal vocabulary, and an evaluation
harness. M4 explicitly excludes automatic healing and Result mutation.

## M5 — Human-governed bounded selector repair

The local completion working tree integrates canonical failed Result selection,
governed proposal creation, explicit approve/reject, promotion, materialization,
governed rerun, effectiveness comparison and explicit final disposition in the
existing Results UI. Each stage uses its canonical owner and supports persisted
resume; no automatic next repair is initiated. See the
[Product workflow and evidence map](../architecture/M5_PRODUCT_REPAIR_WORKFLOW.md).

This is a checkpoint capability statement, not committed or post-merge closure.
The exact snapshot, full validation, independent review and accepted limitations
are recorded by the local completion checkpoint. Live storage remains
unavailable/uncertified. Broader healing classes, autonomous repair loops and
platform deployment remain outside this milestone.

## Parallel tracks

- Crawl completeness and removal of app-specific assumptions.
- Bounded architecture decomposition at high-change integration seams.
- Tooling/setup diagnostics and reduced validation noise.

These tracks must preserve the certified M1-M3 authority spine and must not
delay M4 unless executable evidence establishes a dependency.

## Deferred platform track

- external authentication, RBAC, tenant isolation, and secrets;
- cloud persistence, queues, workers, distributed coordination, and recovery;
- environment/profile UX beyond a proven Product dependency;
- packaging, upgrades, support boundaries, scheduling, and metering.

## Sequencing principles

1. Shared physical contract first.
2. Convergence spike before parallel Core/UI/Certification implementation.
3. Apply authority-critical, Product-integration, or Product-polish review depth
   according to actual risk.
4. Product fixtures define semantics; real Product owns opaque and derived
   authority.
5. Introduce the real Product driver early.
6. Stop certification when frozen invariants are proven; avoid speculative
   micro-hardening.
