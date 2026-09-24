# M7 Closure Receipt

---

Document Authority:
C - Durable Milestone Receipt

Owner:
Product Owner

Source of Truth:
Certified M7 slice commits, merge commits, post-merge Git state, CI #396,
independent reviews, and retained slice certification evidence

Refresh Trigger:
Only correction of a proven receipt error; later work must not rewrite this
milestone's result

Last Verified:
2026-09-24

---

## Closure

| Field | Certified value |
|---|---|
| Milestone | **M7 - Selected Live-Workspace Operational Readiness - CLOSED** |
| Required slices | Slice 0 CLOSED; Slice 1 CLOSED; Slice 2 CLOSED; Slice 3 CLOSED |
| Optional Slice 4 | NOT STARTED; separately authorized only |
| Slice 3 approved Product head | `04f2653bbaab675a2ee8339c4bd960d35267b972` |
| Final M7 Product merge | `18762f064a1f2c672a343acd23f82ae1c94f81c1` |
| Certified current main | `363cb3800e4022e8c84b3d7ef8244665ef2bc0e7` |
| Post-merge CI | #396 - workflow `FAILURE`; authoritative Product job `SUCCESS` |
| Canonical tests in CI #396 | 3,332 total; 3,327 passed; 5 skipped; 0 failed |
| Independent pre-merge review | PASS |
| M7 Product regressions | 0 |

The child of the final Product merge changes only
`reports/run-history.json` with `[skip ci]`; it contains no semantic Product
movement.

## Required slice outcomes

### Slice 0 - selected workspace authority and preservation contract

Selection follows one explicit chain:

```text
appName -> ProjectRegistry -> WorkspaceResolver -> DatabaseAuthority
```

No machine-wide selected-store pointer was introduced. Registry
`workspacePath` remains descriptive metadata rather than storage authority.
The preservation owner binds the selected native SQLite database and its WAL
and SHM sidecars, assesses stability, creates coherent logical preservation
evidence on an authorized disposable path, and fails closed when writer
exclusion is not established.

### Slice 1 - populated migration-027 correction

Migration 027 was corrected for valid populated historical stores while
retaining the same migration identity and target schema. Certification covered
integer identities, values, relationships, `sqlite_sequence`, indexes,
triggers, rollback semantics, and foreign-key safety.

### Slice 2 - historical preservation through migration 041

Two independently created disposable copies of the selected migration-025
source upgraded successfully from 025 to 041. The certified evidence preserves
App Models, Observations, Test Set revisions, Definitions, Executions and their
items/events/locks, Runs, Results, exact historical identity, reopen and
repeated-read stability, Product-owner historical reads, and Canonical Evidence
Workspace composition. Repair history remains `TRUTHFUL_ABSENCE`; no repair
provenance was fabricated.

`PRESERVED_HISTORICAL_INVALID` remains a bounded, source-bound classification.
It means a row was already invalid under the current schema at the exact bound
source state, is hash/identity preserved, remains historical or superseded, is
not current authority, and is surfaced as `integrity_invalid`. It does not mean
valid. New or changed invalidity remains `NEW_REGRESSION` or refusal.

### Slice 3 - Storage Operational Readiness

The Product now exposes:

- `GET /api/v1/projects/:appName/storage-readiness`
- `/application/storage`

The assessment composes, but does not replace, the owners of six dimensions:
`selection`, `preservation`, `integrity`, `upgrade`, `productReads`, and
`cutoverEligibility`. Its aggregate cannot be stronger than the weakest
required dimension. Persisted Windows evidence paths compare deterministically
across Windows and Linux. Current Product source identity is required; stale or
source-mismatched certification is never replayed, and unavailable source
identity returns `503 PRODUCT_SOURCE_IDENTITY_UNAVAILABLE` rather than being
misreported as an unknown project.

For the certified SauceDemo subject, the bound source is migration 025 and its
authoritative bytes were stable during certification. Selection, disposable
integrity, the 025-to-041 upgrade, and Product reads are `READY`; logical
preservation passes. Raw live preservation and cutover eligibility are
`BLOCKED` because external writer exclusion remains
`ACTIVE_WRITER_UNRESOLVED`. The aggregate is therefore `BLOCKED`. That is the
truthful Product outcome, not a failed M7 implementation.

## Explicit non-deliverables

M7 did not perform or authorize:

- live migration or live cutover;
- automatic migration, repair, rollback, or adoption;
- generalized project, deployment, environment, application, or AI health;
- native SQLite/WAL to WASM interchange;
- AI-provider abstraction or AI Gateway work;
- browser-baseline remediation; or
- external authentication, RBAC, tenancy, cloud persistence, distributed
  execution, or production-platform readiness.

Optional Slice 4 is a separate live-cutover certification. It requires its own
Raj authorization and evidence including immutable recovery material, coherent
logical preservation, stable source hashes, resolved writer exclusion,
disposable upgrade and restoration-rehearsal passes, a reviewed operator
procedure, independent review, and an unchanged source immediately before any
cutover. Slice 4 is not required for M7 closure.

## CI interpretation

CI #396 tested the exact M7 merge. Database migrations, canonical unit tests,
root/eval TypeScript, and the stable Playwright Product job completed
successfully. The workflow conclusion was `FAILURE` because Anthropic-backed
advisory AI triage could not complete under the provider's insufficient-credit
condition. AI processing was not successful. That external provider failure is
separate from the independently passing Product gates and is not an M7 storage
regression.

The browser evidence retained 250 passed, 37 flaky, and 29 failed cases. Its
reporting evidence was complete and its Product decision remained `FAIL`; M7
certification did not relabel those cases as passing or claim a clean browser
baseline.
