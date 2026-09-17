# FORGE Roadmap

---

Document Authority:
C — Status/Snapshot

Owner:
Product Owner

Source of Truth:
Approved Product direction, durable milestone closure evidence, current
repository behavior, and the Product Gap Board

Refresh Trigger:
Milestone transition, capability completion, approved priority change, or
Product-direction decision

Last Verified:
2026-09-16

---

This roadmap records completed sequence and approved direction. It does not
prove implementation; use [`PROJECT_STATE.md`](PROJECT_STATE.md), durable
closure receipts, code, tests, and commit-matched CI evidence for that.

## Current phase

**Post-M5 state alignment.**

M1 through M5 are closed. No M6 milestone is authorized, and no future Product
goal is selected by this document.

## Closed milestones

| Milestone | Certified Product capability | Status |
|---|---|---|
| M1 | Observed app-area intent -> canonical v3 Definition -> Execution -> immutable Result | CLOSED |
| M2 | Immutable ordered Suite revision -> exact historical Execution -> immutable Result | CLOSED |
| M3 | Immutable manual source -> deterministic proposal/refusal -> identity-only Save -> atomic v3 promotion -> Execution -> Result | CLOSED |
| M4 | Immutable Result -> canonical diagnostic evidence -> evidence-gated outcome or refusal -> Product readback | CLOSED |
| M5 | Nonpassing Result -> bounded selector proposal -> explicit human decision -> materialization -> governed rerun -> effectiveness -> disposition -> resume/history | CLOSED |

M5 is a **human-governed bounded selector-repair Product workflow**. It does not
establish general autonomous healing or general repair across routes, oracles,
actions, credentials, infrastructure, or arbitrary test logic.

## Current capability position

The local single-user Product now has a strong authority spine from Definition
and Suite through immutable Result, M4 diagnostic evidence, and the complete M5
repair lifecycle. Results/reporting integration, the Product operator workflow,
separately tested native/WASM operation, and CI evidence are functional.

Historical-upgrade breadth, selected live-store readiness, browser/runtime
reliability, broader AI-enabled testing, and the Truth Dashboard / Adaptive
Evidence Canvas remain partial. Shared-use security is early. External
deployment and distributed operation are deferred.

See [`PROJECT_STATE.md`](PROJECT_STATE.md) for the current capability table,
[`CURRENT_LIMITATIONS.md`](../architecture/CURRENT_LIMITATIONS.md) for hard
boundaries, and
[`POST_M3_PRODUCT_GAP_BOARD.md`](../governance/POST_M3_PRODUCT_GAP_BOARD.md)
for reconciled planning gaps.

## Unselected future work

Open and deferred needs include:

- broader browser/runtime reliability and baseline cleanup;
- selected live-store certification and broader historical-upgrade coverage;
- operator efficiency, discoverability, and richer evidence navigation;
- continued removal of app-specific assumptions and better completeness
  measurement;
- external authentication, authorization, tenancy, deployment, distributed
  execution, and recovery; and
- research into broader AI testing and controlled learning.

This list is not an M6 plan. Selection, ordering, and scope require a new Product
decision and approved brief.

## Sequencing principles

1. Preserve canonical evidence and ownership before extending capability.
2. Bind every claim to exact source and evidence.
3. Introduce real Product integration early enough to expose convergence risk.
4. Keep overall Result truth separate from bounded repair effectiveness.
5. Attribute known baseline failures exactly; changed or additional failures
   are regressions.
6. Stop when approved invariants are proven rather than expanding scope.
7. Do not infer cloud, shared-user, or autonomous capability from local success.

## Deferred platform track

- external authentication, RBAC, tenant isolation, and secrets;
- cloud persistence, queues, workers, distributed coordination, and recovery;
- supported environment/profile management;
- packaging, upgrades, support boundaries, scheduling, and metering.
