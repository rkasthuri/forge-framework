# Technical Debt Summary

---

Document Authority:
C — Status/Snapshot

Owner:
Technical Debt Owner

Source of Truth:
Root `TECH_DEBT.md`, current Product limitations, and the reconciled Product
Gap Board

Refresh Trigger:
An active high-priority debt item, current limitation, or Product gap changes
status

Last Verified:
2026-09-16

---

This file is a routing summary, not a second debt ledger. Root
[`TECH_DEBT.md`](../../TECH_DEBT.md) is the only authority for TD identity,
priority, and evidence-backed closure.

## Post-M5 current view

M1 through M5 are closed. M5 closes a human-governed bounded selector-repair
workflow; it does not bulk-close legacy, platform, general-AI, general-healing,
or deployment debt.

| Area | Current focus |
|---|---|
| TEST | TD-185 — retained browser failures/flakiness and the unreproduced UI timing observation |
| CI/TOOLING | TD-186 through TD-188 — detached-HEAD run-history writeback, workflow/Product decision communication, and runtime/loader environment differences |
| RUNTIME/STORAGE | TD-189 — selected live-store certification, native/WASM interchange, and populated pre-037 transition |
| UI/UX | TD-190 — operator efficiency, discoverability, and richer canonical evidence navigation |
| PLATFORM | External auth, RBAC, tenancy, cloud persistence, distributed execution, and recovery remain deferred Product gaps |
| R&D | The experimental six-agent control-plane concept is frozen and non-production |

The authoritative limits are in
[`CURRENT_LIMITATIONS.md`](../architecture/CURRENT_LIMITATIONS.md). The
historical post-M3 rationale and post-M5 status reconciliation are in
[`POST_M3_PRODUCT_GAP_BOARD.md`](../governance/POST_M3_PRODUCT_GAP_BOARD.md).

## Product-gap status

- **RESOLVED:** AUDIT-001, AUDIT-002, AUDIT-006, AUDIT-007, AUDIT-010,
  AUDIT-011.
- **PARTIALLY_RESOLVED:** AUDIT-003; M4/M5 close canonical diagnostics and
  bounded selector repair, while broader AI triage, general healing, and full
  dashboard maturity remain outside certified scope.
- **STILL_OPEN:** AUDIT-005, AUDIT-009, AUDIT-012.
- **DEFERRED:** AUDIT-004, AUDIT-008.

No open row is an M6 commitment. Future milestone ownership is unselected.

## Status discipline

A TD is resolved only when the root ledger records the required implementation
and CI evidence. A Product Gap Board status does not satisfy that rule. Preserve
historical rows and distinguish legacy architecture debt from canonical Product
debt before changing status.
