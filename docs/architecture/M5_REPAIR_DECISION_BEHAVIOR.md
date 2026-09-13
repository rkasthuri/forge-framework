# Chunk 3: exact human decisions and supersession

The [decision service](../../src/core/healing/GovernedRepairDecisionService.ts)
uses the frozen Chunk 0 decision and supersession schemas and the existing
migration 036/037 tables. No schema migration is introduced.

A trusted local Product caller supplies the complete, explicit decision: ID,
hash, project, exact proposal ID/hash, complete source and candidate endpoints,
approve/reject value, human actor ID, and decision time. The existing
`repairAuthorityHash` producer owns M5-native hashes. The service neither selects
a human identity nor infers approval. `local_product` records the existing local
mechanism; it is not remote identity authentication or proof of physical human
presence. Model-backed callers must never supply human approval.

There is one immutable terminal decision per proposal. Exact replay returns the
same decision without appending history. Any conflicting second decision,
including a new decision ID, is an integrity refusal. Rejection cannot promote
supersession. Missing decisions cannot be inferred from an authority request.

Decision acceptance commits separately before promotion, as required by the
frozen persistence manifest. Promotion re-reads that committed decision and
revalidates the exact proposal/witness and live Product authority inside one
transaction before inserting supersession. A failed promotion leaves the
accepted decision intact. This slice creates no Definition, Test Set, result,
rerun or UI workflow; later materialization remains outside this boundary.

`GovernedRepairDecisionService.promote` is the sole supported supersession
creation and replay boundary. It owns `BEGIN IMMEDIATE`, the complete fresh
preflight, insertion, COMMIT and rollback. There is no exported insertion
mechanic or caller-owned promotion transaction API.
[`RepairAuthorityRepository`](../../src/core/storage/repositories/RepairAuthorityRepository.ts)
retains `persistSupersessionExact` only as a fail-closed retired entry: every
call throws `SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED` and directs the caller to
the decision service. `persistSupersessionInTransaction` is removed.

The service refuses a supplied Kysely transaction before reading or writing.
On a manually reserved connection, an existing transaction causes
`BEGIN IMMEDIATE` to fail before the service's rollback handler is entered;
promotion never commits or rolls back the caller's transaction. A caller may
commit an explicit decision separately, after which promotion independently
reads and validates the persisted decision. Origin materialization retains its
existing transaction composition, and read-only origin checks compose in the
promotion transaction without exporting a supersession writer.

Both approval and rejection acceptance, exact reread, and supersession replay
require intact available source history and candidate authority. Endpoints bind
specific revisions, not the latest active model. Proposal witness validation and
existing Product hash producers remain authoritative. Missing or corrupt source
authority refuses even when decision bytes match; existing history is retained.
Chronology requires proposal time <= decision time <= promotion time. Timestamps
are audit chronology, not evidence of identity or candidate correspondence.

Input/row/hash conflicts refuse as `integrity_mismatch`; proposal preflight keeps
its frozen refusal precedence. Otherwise missing committed decisions, mismatched
decision correspondence, rejection promotion and chronology failures refuse as
`stale_authority`. Database execution errors propagate after rollback; they are
not converted into semantic success. Disabled foreign keys refuse without repair.

Physical rows are projected through the unchanged frozen logical column mapping.
The decision and supersession inventories are checked before trusting SQL
locators. These checks detect disagreement between stored payload and columns;
they are not independent witnesses against coordinated database rewrite. The
proposal witness retains only its previously documented single-record threat
model. No additional credential or human-authentication authority is introduced.

[Chunk 3 tests](../../scripts/verify-m5-repair-decision.test.ts) use only fixture
human identities and disposable databases, including native and WASM reopen,
terminal rejection, conflicts, corruption, rollback and no downstream writes.
The R1/R2/R3 regressions exercise the retired repository entry and transaction
boundaries directly. Product corruption tests cover both first promotion and
exact replay. Deferred COMMIT failure verifies rollback after authority and
trigger writes have occurred. The older
[persistence](../../scripts/verify-m5-repair-persistence.test.ts) and
[schema-compatibility](../../scripts/verify-m5-repair-schema-compatibility.test.ts)
tests retain their historical SQL/schema and sibling-reader coverage; their
036/037 fixture rows are SQL setup, not supported Product promotion. Those
fixtures cannot authorize promotion without the current Product preflight.
