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
2026-09-24

---

This roadmap records completed sequence and approved direction. It does not
prove implementation; use [`PROJECT_STATE.md`](PROJECT_STATE.md), durable
closure receipts, code, tests, and commit-matched CI evidence for that.

## Current phase

**Post-M7 state alignment.**

M1 through M7 are closed. Optional M7 Slice 4 has not started and requires
separate authorization. No next milestone is selected by this document.

## Closed milestones

| Milestone | Certified Product capability | Status |
|---|---|---|
| M1 | Observed app-area intent -> canonical v3 Definition -> Execution -> immutable Result | CLOSED |
| M2 | Immutable ordered Suite revision -> exact historical Execution -> immutable Result | CLOSED |
| M3 | Immutable manual source -> deterministic proposal/refusal -> identity-only Save -> atomic v3 promotion -> Execution -> Result | CLOSED |
| M4 | Immutable Result -> canonical diagnostic evidence -> evidence-gated outcome or refusal -> Product readback | CLOSED |
| M5 | Nonpassing Result -> bounded selector proposal -> explicit human decision -> materialization -> governed rerun -> effectiveness -> disposition -> resume/history | CLOSED |
| M6 | Bounded read-only Canonical Evidence Workspace -> exact historical drill-down -> readiness and context entry | CLOSED |
| M7 | Explicit registered-workspace authority -> preservation and disposable upgrade evidence -> Product-read certification -> Storage Operational Readiness | CLOSED |

M5 remains a human-governed bounded selector-repair Product workflow, not
general autonomous healing. M6 remains read-only, composition-only, and exact-
identity preserving; the full Adaptive Evidence Canvas is not implemented. M7
assesses selected storage and optional cutover eligibility; it does not migrate
or cut over live storage.

## Current capability position

The local single-user Product now has a strong authority spine from Definition
and Suite through immutable Result, M4 diagnostics, the M5 repair lifecycle,
M6 read-only evidence composition, and M7 selected-workspace storage
assessment. M7 certifies the selected SauceDemo migration-025 source on two
independent disposable upgrades through 041 and exact Product reads.

Raw live preservation and cutover remain blocked while writer exclusion is
unresolved. Browser/runtime reliability, broader AI-enabled testing, and the
full Adaptive Evidence Canvas remain partial. Shared-use security is early;
external deployment and distributed operation are deferred.

See [`PROJECT_STATE.md`](PROJECT_STATE.md) for the current capability table,
[`CURRENT_LIMITATIONS.md`](../architecture/CURRENT_LIMITATIONS.md) for hard
boundaries, and
[`POST_M3_PRODUCT_GAP_BOARD.md`](../governance/POST_M3_PRODUCT_GAP_BOARD.md)
for reconciled planning gaps.

## Candidate next tracks - unselected

Open and deferred needs include:

- AI Provider Abstraction / AI Gateway: OpenAI as the intended primary,
  eval-supported local fallback, optional Anthropic/future providers, explicit
  degraded states, routing evals, and budget controls;
- browser and CI reliability: retained browser failures/flakiness, public-app
  coupling, workflow color versus Product decision, and run-history writeback;
- optional M7 Slice 4: separately authorized live-cutover certification only;
- remaining Product evolution: contextual execution history, richer Canonical
  Evidence Workspace navigation, App Model evolution, and broader platform,
  security, and deployment capabilities.

This list is not a new milestone plan. Selection, ordering, and scope require a
new Product decision and approved brief.

## Sequencing principles

1. Preserve canonical evidence and ownership before extending capability.
2. Bind every claim to exact source and evidence.
3. Introduce real Product integration early enough to expose convergence risk.
4. Keep overall Result truth separate from bounded repair effectiveness.
5. Attribute known baseline failures exactly; changed or additional failures
   are regressions.
6. Stop when approved invariants are proven rather than expanding scope.
7. Do not infer live cutover, cloud, shared-user, or autonomous capability from
   disposable or local success.

## Deferred platform track

- external authentication, RBAC, tenant isolation, and secrets;
- cloud persistence, queues, workers, distributed coordination, and recovery;
- supported environment/profile management;
- packaging, upgrades, support boundaries, scheduling, and metering.
