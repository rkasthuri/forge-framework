# FORGE Project State

---

Document Authority:
C — Status/Snapshot

Owner:
Milestone Owner

Source of Truth:
Git state, commit-matched CI evidence, executable code and tests, durable
milestone closure records, and root `TECH_DEBT.md`

Refresh Trigger:
A milestone completes or repository, validation, blocker, or strategic-priority
state changes materially

Last Verified:
2026-09-24

---

## Certified repository snapshot

| Item | Verified state |
|---|---|
| Certified Product merge | `18762f064a1f2c672a343acd23f82ae1c94f81c1` |
| Current main | `363cb3800e4022e8c84b3d7ef8244665ef2bc0e7` (run-history-only child) |
| Final M7 CI | #396 - workflow FAILURE; authoritative Product job SUCCESS |
| Canonical unit result | 3,332 total; 3,327 passed; 5 skipped; 0 failed |
| Independent M7 review | PASS |
| M7 Product regressions | 0 |
| Canonical UI | `forge-ui` |
| Product topology | Local, single-user, single-host, workspace SQLite |
| Product migration ceiling | `041_repair_workflow_entry` |
| Current milestone | None authorized; optional M7 Slice 4 not started |

The exact M7 closure binding and boundaries are retained in
[`M7_CLOSURE.md`](M7_CLOSURE.md). CI #396's Product job passed migrations,
canonical unit tests, root/eval TypeScript, and stable Playwright execution.
Its workflow remained red because Anthropic-backed advisory AI triage was
unavailable due insufficient provider credit. AI processing did not succeed;
the external failure is reported separately from Product correctness.

## Closed Product milestones

**M1 through M7 are CLOSED.**

- **M1 CLOSED:** observed application intent becomes a canonical v3 Test
  Definition, executes through Product authority, and produces an immutable
  Result.
- **M2 CLOSED:** immutable ordered Suite revisions reopen and execute by exact
  historical authority.
- **M3 CLOSED:** immutable manual source receives deterministic proposal or
  refusal, identity-only Save, atomic v3 promotion, execution, and Result
  provenance.
- **M4 CLOSED:** immutable Results project canonical evidence-gated diagnostic
  outcomes and explicit refusal without mutating historical Results.
- **M5 CLOSED:** a canonical nonpassing Result can enter a human-governed,
  bounded selector-repair workflow through proposal, decision, materialization,
  governed rerun, effectiveness, disposition, and persisted resume/history.
- **M6 CLOSED:** the bounded Canonical Evidence Workspace composes owner truth
  read-only, preserves exact identity, supports exact historical drill-down, and
  provides readiness/context entry without becoming a second authority.
- **M7 CLOSED:** an explicit registered workspace can be assessed for
  preservation, integrity, disposable upgrade, Product reads, and optional
  cutover eligibility without mutating live storage.

The shared Product path is:

```text
observed or admitted source
-> canonical Definition / immutable Suite authority
-> local Product Execution
-> immutable Result
-> M4 diagnostic evidence or refusal
-> M5 bounded selector-repair proposal
-> explicit human decision
-> canonical repaired Definition/Test Set
-> governed repair rerun
-> immutable effectiveness evidence
-> explicit human disposition
-> Results history/readback
```

Overall Result truth remains distinct from bounded selector effectiveness. A
confirmed selector repair does not turn a later oracle failure into a passing
Result.

M6 reads these owners through a bounded, read-only Canonical Evidence Workspace
and exact historical drill-down. M7 separately composes selected-workspace
storage evidence into six readiness dimensions; it does not mutate the chain or
turn disposable certification into live-cutover authority.

## Capability maturity

| Maturity | Current capability |
|---|---|
| **STRONG** | Test Definition/Test Set authority; App Model integration within the certified scope; local execution; M4 diagnostics; M5 bounded repair lifecycle; M6 exact read-only evidence composition; M7 explicit selected-workspace authority and source-bound readiness composition |
| **FUNCTIONAL** | Results/reporting integration; Product operator workflow; selected SauceDemo disposable 025-to-041 upgrade and Product-read certification; separately tested native and WASM operation; CI/reporting evidence |
| **PARTIAL** | Raw live preservation/cutover readiness; broader historical-upgrade breadth; browser/runtime reliability; broader AI-enabled testing maturity; full Adaptive Evidence Canvas maturity |
| **EARLY** | Shared-use platform and security maturity |
| **DEFERRED** | External deployment, tenancy, distributed execution, and general autonomous repair |

These labels are bounded assessments, not a claim that a whole subsystem is
mature.

## Current limitations

- Selected live-workspace authority and assessment are available. Raw live
  preservation and cutover remain blocked by `ACTIVE_WRITER_UNRESOLVED`; no live
  migration occurred.
- The browser baseline contains known failures and flakiness; exact attribution
  is required for every milestone and post-merge decision.
- Native SQLite and separately initialized WASM stores are supported only
  within their tested boundaries. Seamless native/WASM interchange is not
  established.
- Populated pre-037 proposal transition, including populated-036 identity
  backfill, is unsupported.
- M5 repairs only the frozen selector-replacement class. It does not repair
  routes, oracles, actions, credentials, infrastructure, or arbitrary failures.
- No next repair, rollback, adoption, or follow-up job starts automatically.
- Local operator declarations are not remote authentication. Shared-user RBAC,
  tenancy, cloud persistence, and distributed recovery are not shipped.
- One earlier local UI timing observation remains unreproduced and unproven.

The authoritative register is
[`CURRENT_LIMITATIONS.md`](../architecture/CURRENT_LIMITATIONS.md).

## Current work and next work

M7 closure documentation/state alignment is the only authorized work represented
by this snapshot. Optional Slice 4 and every next Product track remain
unselected until Raj approves a scoped brief.
