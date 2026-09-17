# FORGE Testing Strategy

---

Document Authority:
B — Operational

Owner:
Quality / Certification Owner

Source of Truth:
Executable test and validation commands, current CI workflow, capability-specific
certification contracts, accepted baseline evidence, and exact run output

Refresh Trigger:
Validation hierarchy, CI gates, certification requirements, baseline policy, or
Product evidence boundaries change

Last Verified:
2026-09-16

---

FORGE validation must establish both correctness and honesty. A passing command
does not support a broader claim than the evidence it exercised, and a workflow
conclusion does not replace the Product decision carried by current-run evidence.

## Standing interpretation rule

> **GREEN WORKFLOW != PRODUCT PASS** when browser or reporting jobs are
> intentionally non-blocking.

A GitHub Actions `SUCCESS` means workflow-blocking steps completed. The
current-run reporting decision separately states `PASS`, `FAIL`, or
`BLOCKED`. A valid `FAIL` can coexist with a successful workflow when every
browser failure is attributed and the reporting evidence is complete. A
`BLOCKED` decision means the evidence cannot support either conclusion and
must fail closed.

See [`CI_PIPELINE.md`](CI_PIPELINE.md) for the executable workflow boundary.

## Permanent milestone gates

Every milestone selects the applicable subset below and records exact commands,
exit codes, counts, and source binding:

1. **Exact source/evidence binding.** Freeze the reviewed source bytes and bind
   every proof, fixture, report, and review finding to that snapshot.
2. **Focused behavioral tests.** Prove the changed contract and its important
   positive, refusal, conflict, replay, and failure paths.
3. **Public and repository authority boundaries.** Exercise the actual public
   entry points and persistence owners, not only isolated helpers.
4. **Canonical regression suite.** Run `npm run test:unit` and report the real
   count for the exact source state.
5. **Type checks.** Run root/core/eval and forge-ui checks whenever their
   boundaries are applicable.
6. **Plain-runtime startup.** When reporter, loader, browser, or runtime
   dependencies change, prove the real CLI/reporter process and browser startup
   outside a test-only loader.
7. **Clean-checkout proof.** Repeat the required focused and integration checks
   from an isolated checkout/worktree with only reviewed source and declared
   dependencies.
8. **Rendered Product journeys.** For Product integration, drive the real HTTP
   and rendered UI controls through the authorized workflow.
9. **Historical storage proof.** Exercise populated upgrades, reopen, replay,
   rollback, and immutable historical readback across every supported storage
   implementation. Record unsupported conversion/backfill boundaries.
10. **Explicit negative paths.** Prove stale, missing, malformed, ambiguous,
    unauthorized, conflicting, pending, cancelled, and later-failure cases as
    applicable.
11. **Independent final-source review.** Review the actual final diff and source
    snapshot after the last correction. Changed source invalidates earlier
    review.
12. **Exact baseline attribution.** Match every accepted browser failure or
    flaky result to retained baseline evidence. Any additional or changed
    signature is a new regression or unresolved finding.
13. **Post-merge certification.** Verify the merge tree, monitor the post-merge
    run, report the actual Product decision, record permitted run-history
    movement, and confirm that no unexpected semantic source moved.

Historical counts are receipts for their exact snapshots, not permanent gates.
For example, M5 closed with 3,206/3,206 canonical tests on its approved source;
future work must report its own observed total.

## Execution hierarchy

Run the smallest discriminating proof first, then broaden:

```text
1. Focused contract or regression tests
2. Root/core/eval TypeScript
3. forge-ui TypeScript when applicable
4. Relevant storage, migration, runtime, HTTP, and browser proofs
5. Canonical unit suite
6. Clean-checkout repetition
7. Independent final-source review
8. PR and post-merge CI interpretation
```

Common repository gates are:

```text
npm run check
npm run test:unit
cd forge-ui && npm run check
npm run validate:baseline -- --profile offline --db <disposable-db>
git diff --check
```

Use current package scripts and capability-specific certification documents;
never copy an old command, count, or database path without verifying it.

## Test and evidence classes

| Class | Purpose | Required interpretation |
|---|---|---|
| Type checks | Compile root/core/eval and UI contracts | Necessary, not behavioral proof |
| Focused unit/contract tests | Isolate changed semantics | Must include negative and replay paths where relevant |
| Canonical unit suite | Detect repository regressions | Count belongs only to the tested snapshot |
| Browser integration | Exercise real app/runtime behavior | External environment and retained baseline debt must be separated |
| Storage/migration proofs | Establish durable authority and history | Use disposable stores unless live certification is explicitly authorized |
| Rendered Product proof | Establish the operator-visible journey | Must use real transport and UI controls |
| Evaluation harness | Measure AI capability correctness | Required before an AI capability is called shipped |
| Independent review | Check final scope, claims, and evidence binding | Must inspect the actual final diff |

## Evaluation harness rule

No AI capability is considered shipped without an evaluation harness that has a
ground-truth dataset, runner, scorer, reporter, pass threshold, and explicit
refusal behavior. Runtime honesty signals establish what the system admits; the
eval establishes whether the measured behavior is correct. Both are required.

## Browser baseline policy

The public-app Playwright suite contains accepted failures and flakiness. Do not
describe it as clean. For each run:

1. retain the exact baseline signatures;
2. classify exact matches separately from source-supported environment/browser
   variants;
3. report `NEW_REGRESSION` and `UNRESOLVED` independently;
4. preserve the actual Product decision even when the workflow is green; and
5. never weaken a test or gate merely to match the baseline.

Third-party demo availability, browser timing, and environment coupling can
change. Attribution requires evidence; “probably flaky” is not a classification.

## Storage safety

Read-only validation must not mutate selected live SQLite storage. When a check
could touch storage, use an explicit disposable database or record the selected
database SHA-256 before and after. Product and disposable-certification
authorities support migrations through 041. Native SQLite and separately
initialized WASM are tested boundaries; native/WASM interchange and populated
pre-037 proposal transition are not certified.

## New test checklist

- The setup reaches the state the test claims to exercise.
- Assertions are grounded in observed or admitted authority.
- Negative paths prove failure behavior rather than only happy-path output.
- Historical/replay tests preserve immutable facts.
- New TypeScript files carry the required copyright header.
- Tests do not rely on the selected live store.
- The narrow focused proof passes before broader gates run.
- Final reports include actual exits, counts, snapshot binding, and limitations.
