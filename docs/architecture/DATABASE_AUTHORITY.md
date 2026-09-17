# Product and Legacy Database Authority

---

Document Authority:
A — Authoritative

Owner:
Architecture Authority

Source of Truth:
ADR-002, ADR-022, ADR-023, `src/core/storage/DatabaseAuthority.ts`, and the
database entry points that select an authority

Refresh Trigger:
Database modes, resolution, migration ceilings, legacy import policy, or
Product workspace scoping changes

Last Verified:
2026-09-16

Verification Baseline:
Certified post-M5 `main` at
`514eaf5f4b0983355de26fc97bd1064271f3a415`, including migrations through
`041_repair_workflow_entry`.

---

Database location is not database authority. A caller establishes an explicit
authority before persistence; the selected mode determines location policy,
migration policy, legacy-import eligibility, Product eligibility, and whether
`DB_URL` may participate.

## Governed modes

Implementation note (2026-09-16): M5 advances the certified SQLite ceiling to
`041_repair_workflow_entry` through the existing authority modes and migration
owner. The narrow immutable association supports the
[Product repair workflow](M5_PRODUCT_REPAIR_WORKFLOW.md). Missing-041 workflow
reads refuse without migration; explicit Product preparation invokes existing
guards for the selected workspace. Post-merge certification proves disposable
native SQLite and separately initialized WASM paths, not selected live storage.

| Mode | Location source | SQLite ceiling | Migration 004 import | Product schema authority | `DB_URL` |
|---|---|---|---|---|---|
| `PRODUCT_WORKSPACE` | Exact selected workspace `<root>/.forge/forge.db` | `041_repair_workflow_entry` | Forbidden; migration name is recorded with a governed no-op body | Yes | Ignored |
| `LEGACY_RUNTIME` | Repository-root `.forge/forge.db`, explicit `DB_PATH`, explicit reporter path, or governed legacy PostgreSQL URL | SQLite: `041_repair_workflow_entry`; PostgreSQL: `020_execution_lifecycle` | Allowed only from the import root captured when authority is established | No, even where compatible tables exist | Allowed |
| `DISPOSABLE_CERTIFICATION` | Required explicit SQLite path | `041_repair_workflow_entry` | Forbidden; migration name is recorded with a governed no-op body | Eligible only so Product repositories can be certified hermetically | Ignored |

Migration ceilings are explicit constants. Adding a migration does not silently
expand any authority; the ceiling must move as part of an approved change.

## M5 support boundary

- Product and disposable-certification SQLite authority supports migrations
  through 041.
- Native SQLite current/historical upgrade, reopen, and replay behavior is
  certified within the M5 fixtures.
- Separately initialized WASM current/historical upgrade, reopen, and replay
  behavior is certified within the M5 fixtures.
- Native SQLite/WAL files are not automatically converted to or interchanged
  with WASM storage.
- Populated pre-037 proposal transition, including populated-036 identity
  backfill, is unsupported; the system does not guess or synthesize it.
- Selected live storage was unavailable during M5 certification and remains
  uncertified.
- Disposable certification is the supported repeatable certification boundary;
  it is not evidence that a selected live store was exercised.

Migration 030 stores Start replay authority on the immutable Execution root.
Pre-030 Executions retain `NULL` key/fingerprint history. Every new Execution
must carry a bounded opaque intent key and lowercase SHA-256 semantic request
fingerprint, unique within `project_id`; no expiry is inferred while the
Execution row is retained.

## Entry-point classification

| Caller | Authority |
|---|---|
| `forge-ui` through `ExecutionContext` | `PRODUCT_WORKSPACE` resolved by selected `appName` |
| `CrawlRunner` through `DatabaseFactory` | `PRODUCT_WORKSPACE` supplied by its `Workspace` |
| current-workspace CLI generation and Product model migration | `PRODUCT_WORKSPACE` supplied by `Workspace` |
| fixture CLI crawl, verify, generate, and refresh | `LEGACY_RUNTIME` |
| `ForgeStreamingReporter`, `results-store`, purge, and migration CLI | `LEGACY_RUNTIME` |
| focused tests and disposable certification factories | `DISPOSABLE_CERTIFICATION` |
| unscoped compatibility calls to `getDb()` or `runMigrations()` | fail-contained as `LEGACY_RUNTIME`; never Product |

## Migration context and Migration 004

`src/core/storage/migrate.ts` supplies every migration with operation-scoped
authority provenance. Dialect-sensitive migrations read that context instead
of `DB_URL`. The context is asynchronous-operation scoped and does not mutate
process environment state.

The historical source of Migration 004 remains unchanged. Product and
disposable providers do not load its cwd-bound module and execute a no-op under
the same ordered migration name. Legacy SQLite loads it only while the current
directory still equals the captured legacy import root; a changed root is an
explicit refusal before the database is opened or migrated.

## Runtime provenance and process containment

An active handle exposes its authority mode, dialect, SQLite path, workspace
root where applicable, migration ceiling, legacy-import policy, Product
eligibility, and `DB_URL` policy. These are runtime control facts and are not
persisted because no durable forensic consumer currently requires a new table.

One process may select only one authority at a time. Re-selecting the identical
authority is idempotent; selecting a different mode, workspace, path, URL, or
legacy import root fails until `closeDb()` clears the handle and provenance.
The UI serial queue remains the current operation-scoped containment. Full
multi-process connection management is a later platform concern.

## Existing history

This model prevents new implicit contamination. It does not delete, reclassify,
or rewrite rows already present in a workspace. Existing history must be
audited read-only and remediated only through a separately approved,
provenance-preserving operation.
