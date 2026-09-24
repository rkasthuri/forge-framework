# FORGE Current Limitations

---

Document Authority:
A - Authoritative

Owner:
Architecture Authority

Source of Truth:
Current executable repository evidence, accepted ADRs, root `TECH_DEBT.md`,
registered baseline debt, and certified validation

Refresh Trigger:
A local-product constraint, accepted debt fingerprint, compatibility surface,
deployment claim, deferred capability, or migration ceiling changes

Implementation Baseline:
`363cb3800e4022e8c84b3d7ef8244665ef2bc0e7`, the permitted run-history-only
child of certified M7 Product merge
`18762f064a1f2c672a343acd23f82ae1c94f81c1`.

Current Verification Context:
Updated 2026-09-24 after M7 merge and post-merge certification. M7 closed
through merge `18762f064a1f2c672a343acd23f82ae1c94f81c1` with 0 M7 Product
regressions. CI #396's authoritative Product job passed; its overall workflow
failed because Anthropic-backed advisory AI triage was unavailable due
insufficient provider credit. M7 established selected-workspace authority and
assessment, not live cutover. Earlier baseline debt remains historical evidence,
not a fresh live-store measurement.

---

This is the single current limitations register. It separates constraints that
are acceptable for today's local Product from debt and future capability. A
deferred capability is not a Product defect unless a current requirement
depends on it.

All authorized onboarding and repository routing must lead here for current
Product limitations. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) preserves a
dated historical catalog only. It may explain evolution, but it cannot establish
or override current operational truth.

## Accepted local Product constraints

- FORGE is a single-host local Product.
- Product persistence is the selected workspace SQLite database.
- Observation producer ownership, execution control, and service composition
  are process-local.
- Cancellation combines durable local lifecycle intent with process-local
  signalling to the matching execution.
- Canonical execution Start replay is durable and project-scoped: one opaque
  client intent key maps immutably to one accepted Execution and its semantic
  request fingerprint for the lifetime of that Execution row.
- The control plane has process-global registries and service composition.
- Credential material is resolved for one local operation and is never
  Definition, plan, Result, or persisted Observation truth.

These are accepted constraints for the current Product. The detailed authority
and rationale are in
[`LOCAL_PRODUCT_CONSTRAINTS.md`](LOCAL_PRODUCT_CONSTRAINTS.md) and
[`DATABASE_AUTHORITY.md`](DATABASE_AUTHORITY.md).

## Known baseline debt

The offline baseline has two accepted App Model findings. Acceptance makes them
comparable; it does not make the malformed rows valid.

The canonical offline profile therefore has overall status `FAIL`: both
required malformed-model gates fail. Governed comparison classifies those two
failures as exact `BASELINE_DEBT`, with `NEW_REGRESSION = 0`. This is not an
overall baseline pass.

| Gate | Accepted fingerprint | Classification |
|---|---|---|
| Active App Model JSON | `3c75df891801910b9d335109b05b37db867489b3aefe5ffc015fe352c4cfc3ef` | `BASELINE_DEBT` |
| Historical App Model JSON | `10a95e848d17bc97956635ec0ce38b957dbcf3c6b14ff30052cfc579e600cdd1` | `BASELINE_DEBT` |

Any changed fingerprint or additional failing gate is `NEW_REGRESSION`, not
accepted debt. Use the governed comparison procedure in
[`../configuration/ACCEPTED_BASELINE_DEBT.md`](../configuration/ACCEPTED_BASELINE_DEBT.md).

## Legacy and compatibility debt

- Canonical Test Definition v1 remains readable historical provenance. New
  Product execution fails closed rather than fabricating a v2 support seal.
- Legacy Observation files and `ObservationStore` remain read-only
  compatibility. Canonical Product paths neither write them nor use them as
  fallback authority.
- Legacy CLI/CI Run and result handling remains a separate legacy authority and
  is not silently merged with Product Execution, Run, or Result.
- Legacy healing and reporting paths remain outside the canonical Product
  authority spine. M4 diagnostics and the M5 bounded selector-repair workflow
  use their explicit canonical owners.
- Top-level `/api/v1/tests`, `/runs`, `/results`, `/insights`, `/settings`, and
  run-stream routes remain mounted 501 compatibility stubs. They are not
  supported Product contracts; canonical M1-M7 transport is project-scoped.
- Bootstrap evidence and agent memory remain compatibility or experimental
  evidence and are not auto-promoted into canonical Observation authority.
- The retired `src/platform` surface is not a supported Product UI; `forge-ui`
  is canonical.

The exact KEEP / RETIRE NEXT / RETIRE LATER disposition is in
[`TD-ARCH-003-B4_LEGACY_OBSERVATION_RETIREMENT.md`](TD-ARCH-003-B4_LEGACY_OBSERVATION_RETIREMENT.md).

## Not cloud-safe

The current architecture does not provide distributed locks or leases, remote
worker identity/attestation, tenant authorization, PostgreSQL Product parity,
durable distributed commands, exactly-once delivery, distributed cancellation,
multi-host recovery, or cloud secret distribution. SQLite workspace authority,
local ownership evidence, and process registries must not be extrapolated into
those claims.

Cloud, multi-tenant, multi-process, distributed-worker, or horizontally scaled
work requires a separately approved architecture decision before Product work.

## Deferred Product capability

The following are future or incomplete capabilities, not defects in the current
certified local Product vertical:

- historical v1 upgrade or deletion;
- Observation correction, supersession, invalidation, conflict sets,
  reconciliation, and retention-event authority;
- acquisition kinds and runtime Observation methods outside the adopted crawl
  slice;
- distributed execution, retries, shards, and cloud workers;
- complete legacy healing/reporting migration;
- broader failure intelligence and Insights beyond the implemented canonical
  diagnostic evidence and bounded selector-repair path;
- automatic healing, repair classes beyond the frozen selector replacement,
  automatic retry/next-repair orchestration, automatic rollback/adoption, and
  remote human authentication;
- general route, oracle, action, credential, infrastructure, or arbitrary
  test-logic repair;
- Product Settings and reusable environment profiles;
- bulk import, scheduling, and cross-project orchestration;
- multi-tenant authorization and cloud secret management;
- mobile and IoT Product support; and
- complete operator remedy coverage for every gap-producing subsystem.

Detailed older feature statements remain in
[`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) as historical snapshot material.
Its resolved or unverified entries are not current capability claims.

## Current canonical path and migration ceiling

The implemented Product path is:

```text
Crawl / admitted manual source
-> Observation and App Model authority / immutable manual source authority
-> Canonical Test Definition v2 or v3
-> optional immutable ordered Suite revision
-> ExecutablePlan v2
-> Execution
-> Run / immutable Result
-> Results Projection
-> canonical M4 diagnostic evidence or refusal
-> M5 bounded selector proposal and explicit human decision
-> canonical repaired Definition/Test Set
-> governed repair rerun
-> immutable effectiveness and explicit disposition
-> M6 read-only Canonical Evidence Workspace / exact historical context
-> M7 selected-workspace Storage Operational Readiness composition
-> project-scoped API / forge-ui
```

For SQLite Product and disposable-certification authorities, the current
migration ceiling is `041_repair_workflow_entry`. Migrations 034-040 retain
canonical diagnostics and the governed proposal/decision, materialization,
rerun, effectiveness and disposition authorities. Migration 041 adds only the
immutable original-Result/proposal association needed for Product resume.
Legacy PostgreSQL remains capped at `020_execution_lifecycle` and is
not Product authority.

The [M5 Product workflow](M5_PRODUCT_REPAIR_WORKFLOW.md) is reachable from
canonical Results. Explicit human approval precedes promotion; explicit human
disposition follows committed comparison. Bounded repair confirmation does not
override an overall failed Result. A stale candidate prevents new approval,
promotion, materialization and rerun, while a valid explicit rejection remains
possible. Historical proposal-only records are not backfilled with guessed
failure associations. Missing/corrupt evidence and unavailable storage refuse.

M7 establishes explicit registered-workspace selection authority, native SQLite
DB/WAL/SHM inspection, logical preservation evidence, two independent
disposable SauceDemo 025-to-041 upgrades, exact historical Product reads, and a
Product-facing Storage Operational Readiness assessment. Migration 027's
populated historical-store correction retains its existing migration identity
and target. `PRESERVED_HISTORICAL_INVALID` is source-bound and remains explicit;
new or changed invalidity is `NEW_REGRESSION` or refusal.

This evidence does not establish live cutover. Raw live preservation and
`cutoverEligibility` remain blocked while writer exclusion is
`ACTIVE_WRITER_UNRESOLVED`; no live migration occurred. Native SQLite and
separately initialized WASM evidence do not establish native-WAL/WASM
interchange. Populated pre-037 proposal transition, including populated-036
identity backfill, remains unsupported.

CI #396's stable Product job passed, while the broader browser evidence retained
failures/flakiness and the overall workflow failed when Anthropic advisory
processing was unavailable for insufficient credit. AI triage did not succeed.
Provider availability is separate from M7 storage correctness and does not make
the browser baseline clean. One earlier local UI timing observation remains
unreproduced and unproven; no new execution result is inferred from its
retention.

The experimental six-agent control-plane concept remains frozen research. It is
not the production development workflow and is not Product runtime authority.

## Safe next work

Product development preserves the local M1-M7 authority spine when
it preserves canonical owners, fail-closed boundaries, and registered debt
comparison. Optional M7 Slice 4 is not started and requires separate
authorization. Candidate future tracks include AI-provider abstraction,
browser/CI reliability, richer evidence navigation, and broader Product or
platform work; this register selects none of them. Work that changes deployment
topology, authority ownership, persistence identity, or legacy retirement
requires its own approved design and architecture review. See
[`POST_M3_PRODUCT_GAP_BOARD.md`](../governance/POST_M3_PRODUCT_GAP_BOARD.md).
