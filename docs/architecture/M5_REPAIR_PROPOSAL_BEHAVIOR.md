# M5 Chunk 2 repair proposal behavior

This layer evaluates bounded selector correspondence and may append a
non-authoritative proposal. It does not grant approval or execute a repair.

The frozen contract remains in the [Chunk 0 schemas](../../fixtures/m5-contract/schema/transition-proposal.schema.json)
and [contract verifier](../../scripts/verify-m5-governed-repair-contract.test.ts).
Migration 037 adds the approved separate proposal identity witness described below;
the frozen proposal payload and Chunk 0/1 contracts remain unchanged.

## Entry points and Product reads

[GovernedRepairProposalService](../../src/core/healing/GovernedRepairProposalService.ts)
provides evaluation, proposal append, and exact reread. Callers nominate exact
source and candidate App Model revisions and the existing source Definition
authority. The source Definition authority is evaluation context, not a new
field in the frozen proposal. Reread requires that context again.

Every persistence or replay operation independently reads Product rows within
the same SQLite transaction. Exact-revision reads extend the existing App Model,
Test Definition authority, and route-evidence owners. They do not select the
active model as a substitute. Authentication uses the existing workspace
declaration projection.

Source rebound reuses Chunk 1's two-stage proof: canonical Product Test Set
parsing and fingerprint verification, exact Definition membership and Product
Definition hash, then independent execution-item witness agreement. At least
one exact witness must exist; material disagreement refuses. Internal parse,
materialization, row/payload identity, fingerprint, and Definition membership
failures are typed integrity_mismatch. An internally valid source that lacks
exact historical correspondence or witnesses yields historical_authority_mismatch. This proves
single-row Test Set corruption is detectable, not that coordinated storage
rewrites are impossible or that a unique failed execution has been identified.

## Physical enumeration

[GovernedRepairEligibility](../../src/core/healing/GovernedRepairEligibility.ts)
is a read-only evaluator. Its snapshot is computational input, not a new
persisted authority. The service is the Product-backed proposal entry point for Chunk 2; a pure
evaluation result alone does not establish persisted Product lineage.

- A enumerates physical flow, step, source-page, target-page, and element
  positions. References and the bounded source endpoint must match.
- B expands each A slot across every physical strategy. Click, observed
  grounding, changed non-secret data-test selector, and exact Product support
  authority are required.
- C checks complete page, element, target, flow, role, route, authentication,
  precondition, app-area, and normalized-intent semantics. Production intent
  normalization must succeed. Only the nominated data-test dimension varies.

A candidate element position need not equal the source array position. Product
App Model validation runs first: a malformed model is integrity_mismatch. A
contract-valid model can contain an unresolved slot; that slot does not enter A.

No physical candidates are deduplicated. Duplicate flow/page/strategy locations
can therefore be ambiguous. Extra elements also remain distinct in A/B, but may
fail C because they change complete page semantics. Candidate-set hashing uses
the frozen physical identity fields in deterministic physical-position order.

## Refusals and proposals

Stage 0 checks integrity, historical authority, contract version, then repair
kind. A/B/C map empty sets to candidate_not_found, candidate_not_governed, and
candidate_semantics_unproven respectively. Multiple complete matches yield
candidate_ambiguous. A supplied proposal must bind the sole complete candidate;
its enumerator version, count, hash, and bounded semantics must also agree.
The complete caller candidate endpoint must exactly equal the independently
derived C member even when the caller supplies no proposal. Disagreement is
candidate_not_governed; accepted endpoint fields are never substituted.

The shared precedence includes stale_authority last. Chunk 2 adds no staleness
criterion requiring a human decision, promotion, or execution identity; those
behaviors are outside this layer.

Constructed proposals use the frozen schema, canonical bytes and hash, and
proposed_non_authoritative state. Strict validation rejects unknown and lossy
properties before hashing. Product Test Set and Definition hashes retain their
existing producers. Proposal presence uses an own-property check. An absent
proposal permits generation; a present schema-invalid JSON value (including
false, zero, an empty string, null, arrays, and malformed objects) yields
unsupported_contract_version after higher integrity/historical checks. Unknown
keys are rejected and never stripped. Non-JSON or lossy authority representations
remain integrity failures.

Only repair_proposals and their separate identity witnesses may be appended.
The existing Chunk 1 proposal payload mapping and guards remain in force, with
the reciprocal Migration 037 relational binding described below. Replay rereads Product authority, verifies stored
payload/hash/columns, compares exact governed bytes, and returns without an
UPDATE. A same-identity byte change is an integrity conflict. Once source
internal consistency provides enough deterministic input, candidate inspection
can derive the unchanged proposal identity and prospective governed bytes even
with a pending historical refusal. The service verifies any existing row and
compares those bytes before returning that lower refusal. This inspection cannot
authorize an append or replay: an exact stored proposal with missing history
still refuses historical_authority_mismatch. The caller may
roll back the entire append using the transaction entry point.

## Behavioral evidence

The [eligibility tests](../../scripts/verify-m5-repair-eligibility.test.ts)
exercise physical multiplicity, semantic refusals, strict fields, frozen
proposal correspondence, and multi-failure precedence. The
[proposal persistence tests](../../scripts/verify-m5-repair-proposal-persistence.test.ts)
use migrated disposable Product databases and historical execution-item
witnesses, including native/WASM corruption, replay, commit, rollback, and reopen
checks. They also verify that proposal behavior creates no downstream authority.

## Identity preflight and duplicated metadata

Identity integrity is inspected before lower eligibility refusals using the
independent immutable witness/proposal pair. Generated identity lookup uses the
frozen witness snapshot, never a newly derived source candidate set. Request-owned
governed fields are compared before Product/candidate early returns. No newest
selection or ranking occurs, and persisted proposal JSON never substitutes for
Product reads. Where Product inspection can derive a complete prospective proposal,
exact full-byte comparison still runs with pending lower refusals. An exact identity
alone never permits replay.

For supplied proposals, every duplicated request field must agree: proposal ID,
proposed timestamp, project, contract version, repair kind, source and candidate.
A conflicting ID or timestamp is candidate_not_governed, subject to higher frozen
refusals. Optional fields may be derived only when absent. The request has no
enumerator-version/count/hash override fields; supplying those unknown keys
refuses instead of extending or stripping the request contract.

Reread verifies an available proposal identity first, but a missing proposal does
not short-circuit source validation. Product source internal integrity and
historical rebound still run, and the final refusal follows frozen precedence.

Both supplied and request identity tokens are inspected when they disagree. A
well-formed identity token inside an invalid supplied proposal may locate
persisted integrity evidence; it cannot make that invalid proposal eligible.
Request envelope keys and scalar bindings are validated before SQL reads.

Source-owned bounded fields (app area, routes, preconditions, oracle and excluded
steps) are derived after source internal/correspondence checks, before candidate
early returns. They are compared with available persisted identities even when
A/B/C fails. Authentication identity uses the existing Product projection only
when its content still agrees with the source Definition; changed configuration
does not manufacture a historical authentication hash. These inspection fields
are comparison evidence, never an additional persisted authority representation.

## Proposal identity witness — Migration 037

Every integrity witness must identify the source of its independence.
A witness that is derived solely from, stored only beside, or recomputed
from the object it validates is not independent authority.

The separate immutable `repair_proposal_identity_authorities` row is the source
of independence for proposal integrity. It is captured in the same atomic
acceptance transaction as the proposal; independence here comes from a different
immutable row, not a different timestamp or an external trust root. Reads never
repair either row or recreate the witness from a surviving proposal.

### Candidate-set producer and serialization

`inspectGovernedRepair` in
[`GovernedRepairEligibility.ts`](../../src/core/healing/GovernedRepairEligibility.ts)
is the sole Product candidate-set hash producer. It hashes the ordered complete
Stage-C physical identity array using `canonicalJsonSha256`. Identity fields are
flow, step, source-page, target-page, element and strategy positions, plus selector
kind and value. Position order is preserved; physical duplicates are retained.
Object keys sort by code-unit order, fixed identity keys are ASCII, JSON arrays
retain order, and SHA-256 consumes canonical UTF-8 bytes. This is the frozen
Chunk 0 verifier algorithm, not a new hash scheme. The candidate-set hash and
explicit enumerator version already persist in `repair_proposals`.

Enumerator version is not in the candidate-set hash preimage. It remains in the
frozen proposal and is protected by the independent `proposalHashAtCreation`
snapshot. A separate expected-enumerator witness field is unnecessary. The
witness never recomputes the candidate-set hash from source authority on read.

### Fields and origin

Both variants contain `proposalId`, `originKind`, `proposalHashAtCreation`, and
`identityAuthorityHash`. Generated witnesses additionally contain
`identityAlgorithmVersion` and `expectedCandidateSetHash`. Caller witnesses
reject those generated-only fields. Unknown fields and non-JSON values refuse.
The witness hash follows the existing M5 canonical serialization convention,
omitting only its own hash field from the preimage.

- `proposalId` identifies the immutable pair.
- `originKind` records whether Product generated the ID or the caller supplied it;
  it is never inferred from ID shape or formula equality.
- `proposalHashAtCreation` freezes the accepted proposal bytes through their
  existing authoritative hash, including enumerator version and count.
- `identityAuthorityHash` binds the complete witness representation.
- Generated `identityAlgorithmVersion` selects the unchanged generated-ID formula.
- Generated `expectedCandidateSetHash` freezes the existing producer's output at
  generation. It remains usable when source authority is unavailable.

`identityBasisHash`, `expectedCandidateCount`, and a second enumerator-version
field are excluded: they would duplicate already-bound authority. The proposal
row adds only an `identity_authority_hash` relational binding, outside its frozen
payload. This binds witness bytes independently in the other row, including origin,
and detects a witness edit even if its own hash is recomputed.

The generated-ID function now lives in
[`RepairProposalIdentityAuthority.ts`](../../src/core/storage/RepairProposalIdentityAuthority.ts),
with unchanged preimage: project, source endpoint, candidate endpoint, and
candidate-set hash. An explicit request ID or supplied proposal establishes
caller origin at creation. Caller IDs may use the generated ID's lexical form
or another valid frozen ID form. Caller identity does not assert a generated
formula. Requests attempting to reuse the same ID under another origin refuse
`integrity_mismatch`.

### Relational and transaction boundary

[`037_repair_proposal_identity_authority.ts`](../../src/core/storage/migrations/037_repair_proposal_identity_authority.ts)
adds one separate witness table and rebuilds only the proposal table. Reciprocal
composite foreign keys bind `(proposal_id, proposal_hash, identity_authority_hash)`
to `(proposal_id, proposal_hash_at_creation, identity_authority_hash)` in both
directions, with matching unique constraints and `DEFERRABLE INITIALLY DEFERRED`.
No nullable pairing bypass exists. Existing proposal immutable guards are
retained; witness INSERT collision, UPDATE and DELETE guards refuse replacement
and UPSERT mutation. Additional insert checks verify the complete witness and
pair when the second row becomes available.

Database initialization establishes `foreign_keys=ON`; the service verifies it
before `BEGIN IMMEDIATE` and refuses a connection with enforcement disabled.
A failed deferred COMMIT explicitly rolls back. Its outer-transaction entry point
requires FK enforcement already enabled and leaves completion to the caller.
Migration uses the existing atomic coordinator and its rollback boundary.

Existing pre-037 proposals have no reliable origin or generation-time witness.
The migration refuses a populated proposal table without changing rows or
migration history. It never guesses origin, automatically backfills witnesses,
or deletes old proposals. Such a database needs a separately approved transition.
Empty proposal-table upgrades preserve existing unrelated schema and rows.

### Integrity before source rebound

Read the witness, verify its exact representation/hash, read and verify the
proposal, check reciprocal hashes/identity and generated snapshot/formula, then
perform source internal validation and historical rebound. The minimal witness
contains no project lookup field, so the service verifies the workspace pair
inventory before using proposal-owned locator fields; corruption of a locator
cannot hide its pair. This is a read-only integrity scan, not ranking or selection.
Missing one side is an integrity failure. Missing both sides during exact reread
still allows source integrity to outrank the lower missing-proposal refusal.
Exact replay requires valid source/history and returns without changing either row.

### Candidate refusal ordering

After Stage B, both the request declaration and any supplied proposal candidate
must exactly match a governed B endpoint before Stage-C failures are returned.
When both declarations exist, they must also bind the same complete set of
governed physical B positions. Two different B members refuse as
`candidate_not_governed` before semantic failure or ambiguity, even when their
selector or element IDs agree. Identical declarations may cover duplicate
physical positions; those positions remain distinct.
Membership cannot select or deduplicate C. After complete C is computed, supplied
enumerator version/count/hash are checked before returning ambiguity. Thus a
nonmember outranks semantic/ambiguity failures, metadata disagreement outranks
ambiguity, and an exact declaration matching one of multiple C members remains
`candidate_ambiguous`.

### Bounded threat model

The proposal/witness pair is tamper-evident against single-record corruption of
either immutable row. Cross-record disagreement is classified
`integrity_mismatch` without source authority. The snapshots demonstrate record
disagreement; they do not prove true generated origin or candidate-set ground
truth. This is not tamper-proof storage. Coordinated rewriting of both records,
both hashes, and their bindings defeats the bounded model.

## Physical rows and frozen logical authority

Repository reads project persisted SQL values through the named frozen
`REPAIR_AUTHORITY_COLUMNS` mapping in
[RepairAuthorityValidation](../../src/core/storage/RepairAuthorityValidation.ts).
The projection copies owned columns from storage; it never reconstructs their
values from the payload. The exact logical validator still rejects unknown
fields, missing or changed governed columns, invalid hashes, and noncanonical
payload bytes. A physical extension cannot silently become logical authority.

[RepairAuthorityRepository](../../src/core/storage/repositories/RepairAuthorityRepository.ts)
uses that boundary for approval, supersession replay, origin, and rerun reads.
At migration 037, approval verification separately checks the persisted witness
representation and the reciprocal proposal hash binding before correspondence
and origin/source reads. Migration 036 retains its witness-free behavior.
The proposal service and migration authority inspection use the same projection;
their independent witness and source/history checks remain in force.

[Compatibility tests](../../scripts/verify-m5-repair-schema-compatibility.test.ts)
exercise both migration ceilings and engines, existing downstream repository
operations, logical strictness, corruption refusal, and replay without writes.
Synthetic future-column tests prove reader isolation only; they do not certify
an unapproved schema or relax migration schema verification.
