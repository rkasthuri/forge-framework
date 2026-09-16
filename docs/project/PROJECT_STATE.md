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
2026-09-16

---

## Certified repository snapshot

| Item | Verified state |
|---|---|
| Certified Product baseline | `514eaf5f4b0983355de26fc97bd1064271f3a415` |
| M5 merge commit | `3e0622d741b23fc688216b717ea4f86e1c53f916` |
| Final M5 CI | #372 — SUCCESS |
| Canonical unit result | 3,206/3,206 PASS |
| Independent M5 review | PASS 22/22 |
| M5 completion regressions | 0 |
| Unresolved M5 Product issues | 0 |
| Canonical UI | `forge-ui` |
| Product topology | Local, single-user, single-host, workspace SQLite |
| Product migration ceiling | `041_repair_workflow_entry` |
| Current milestone | None authorized |

The exact closure binding and accepted limitations are retained in
[`M5_CLOSURE.md`](M5_CLOSURE.md). CI #372 had a successful workflow conclusion
and an evidence-complete Product decision of `FAIL`: 19 browser failures were
all attributed to retained mainline baseline behavior, with 0
`M5_COMPLETION_REGRESSION` and 0 `UNRESOLVED`. A green workflow therefore does
not mean that every Product test passed.

## Closed Product milestones

**M1, M2, M3, M4, and M5 are CLOSED.**

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

## Capability maturity

| Maturity | Current capability |
|---|---|
| **STRONG** | Test Definition/Test Set authority; App Model integration within the certified scope; local execution; M4 diagnostics; bounded selector eligibility, proposal, local human approval, materialization, governed rerun, comparison, effectiveness, disposition, and lifecycle resume/history |
| **FUNCTIONAL** | Results/reporting integration; Product operator workflow; separately tested native and WASM operation; CI/reporting evidence; M3 manual-to-automation; bounded human-governed selector repair |
| **PARTIAL** | Historical-upgrade breadth; selected live-store readiness; browser/runtime reliability; broader AI-enabled testing maturity; Truth Dashboard / Adaptive Evidence Canvas maturity |
| **EARLY** | Shared-use platform and security maturity |
| **DEFERRED** | External deployment, tenancy, distributed execution, and general autonomous repair |

These labels are bounded assessments, not a claim that a whole subsystem is
mature.

## Current limitations

- Selected live storage was unavailable and remains uncertified.
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

Post-M5 documentation/state alignment is the only authorized work represented by
this snapshot. No M6 goal is selected or authorized. Future Product work remains
unselected until Raj approves a scoped brief.
