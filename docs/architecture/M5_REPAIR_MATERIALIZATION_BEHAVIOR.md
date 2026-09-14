# M5 Chunk 4: approved selector repair materialization

This contract specifies the existing frozen selector-repair materializer, using
[Chunk 0 contracts](../../fixtures/m5-contract/manifest.json), the
[canonical v3 producer](../../src/core/test-design/TestDefinitionContract.ts),
[historical Definition hash owner](../../src/core/execution/HistoricalDefinitionAuthorityResolver.ts),
and [Chunk 3 approval boundary](M5_REPAIR_DECISION_BEHAVIOR.md).

1. **Input authority.** Materialization requires an exact committed supersession
   envelope, its separately committed explicit human approval, the exact
   proposal and independent proposal-identity witness, source Definition/Test
   Set and historical execution-item witness, both exact App Model revisions,
   sealed M2 support, governed routes and declared authentication expectation.
   The caller supplies the existing repair request plus exact supersession,
   generation ID, repair-origin ID and materialization time. No generated output
   or selector supplied by a caller is authoritative.
2. **Outputs.** One canonical v3 Test Set containing exactly one canonical v3
   Definition, plus the already defined reciprocal RepairRevisionLink. No new
   authority object or persistence schema is needed.
3. **Immutability.** Source Test Set/Definition, observations, models, support,
   Execution/Run/Result, diagnostic, Suite, proposal, witness, decision and
   supersession remain unchanged. Only new Test Set, origin and generation
   lifecycle rows are appended in the materialization transaction.
4. **Definition transformation.** Re-normalize the exact approved candidate
   through normalizeDiscoveredIntentV1, then generateCanonicalFlowTestSetV3.
   Compare the entire result against the source using the frozen Chunk 0
   semantic projection: only bounded selector, derived IDs, audit timestamp,
   revision and exact candidate support provenance may differ. Route, oracle,
   subject, target, action-kind, authentication, app area, order, exclusions and
   all other semantics remain equal. No hand-edited Definition is accepted.
5. **Membership.** Frozen canonical v3 owns one flow Definition. Its canonical
   membership and action/order semantics remain intact. The Test Set identity
   remains the existing producer's project identity; revision allocation uses
   the repository's project-wide latest revision plus one, not source plus one.
6. **Identity and hashing.** Existing canonical v3 generation owns Definition
   identity. HistoricalDefinitionAuthorityResolver owns Definition content hash;
   materializeCanonicalTestSet owns Test Set fingerprint. Existing M5 canonical
   hashing applies only to RepairRevisionLink and its frozen transform preimage
   (materializerVersion, proposalHash, supersessionAuthorityHash,
   sourceDefinitionAuthority, resultingDefinitionAuthority).
7. **Commit order.** Approval and supersession must already be committed before
   the repository acquires BEGIN IMMEDIATE. The repository validates all inputs
   and live authority, generates output, inserts reciprocal Test Set/origin and
   generation events, and commits once. Any exception or deferred COMMIT failure
   rolls back the entire materialization. Caller-owned transactions cannot
   combine approval and materialization; no insertion-only capability is exported.
8. **Replay.** Exact existing origin/supersession identity returns the same
   persisted output without allocating a revision or creating events. Replay
   performs the same live source/proposal/candidate preflight and deterministic
   output reconstruction using the persisted revision. Explicit conflicting
   origin/generation/time values refuse; latest row selection cannot authorize
   replay. An unavailable source after materialization still refuses reread.
9. **Conflict.** Corrupt payload/column/hash bindings, conflicting origin,
   generation identity, reciprocal row, output or lineage fail closed. No
   overwrite, best-effort correction or alternative revision is produced.
10. **Missing/stale authority.** Missing or inconsistent history, rejected or
    missing approval, wrong source/candidate/proposal/witness/selector, changed
    routes/authentication, or invalid chronology refuse. Exact inactive App
    Model revisions remain eligible; current active selection is not authority.
    Input and stored integrity failures precede lower eligibility refusals;
    live proposal preflight preserves its existing refusal precedence and actual
    observed Stage A/B/C counts without replacing them with empty counts.
11. **Provenance.** The existing immutable reciprocal origin binds source and
    result row/identity/revision/Product hashes, proposal, decision, supersession,
    materializer version and transformation. Output support references the exact
    approved candidate. Proposal and execution-item witnesses retain their
    previously frozen independent admission and single-row corruption threat
    models; another row/hash/time alone is not independent evidence against a
    coordinated rewrite. No new threat-model or human authentication claim exists.
12. **Scope.** No Suite materialization, execution/rerun, before/after comparison,
    UI, confidence/ranking, LLM choice/approval, generalized healing, credentials,
    historical mutation or control-plane change. Ordinary generation/manual
    APIs retain active-model requirements. Legacy insertion-only origin APIs
    cannot bypass this guarded materialization boundary; historical SQL fixture
    and exact source/witness validation coverage remains explicit.

Validation uses disposable native and WASM databases, including reopen, rollback,
replay, stale/missing/tampered authority, exact semantic comparison and supported
repository bypass probes. Unavailable live storage is reported as unavailable,
not certified by disposable migration results.
