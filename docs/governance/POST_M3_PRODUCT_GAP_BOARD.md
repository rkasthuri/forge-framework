# Post-M3 Product Gap Board

## Post-M5 reconciliation — 2026-09-16

M1 through M5 are closed. M5 merged as
`3e0622d741b23fc688216b717ea4f86e1c53f916`; the certified post-merge
`main` state is `514eaf5f4b0983355de26fc97bd1064271f3a415`. The original
post-M3 rows below preserve their decision-time problem statements and evidence.
Their current statuses are reconciled against M4/M5 behavior rather than erased.

| Capability | Current local implementation / remaining boundary |
|---|---|
| Failed Result to candidate/proposal | Exact canonical diagnostic and Definition authority; unique eligible current candidate; missing/ambiguous/unsupported evidence refuses |
| Human decision and materialization | Explicit local approve/reject, promotion and immutable repaired revision through existing owners |
| Governed rerun and comparison | Product resolves full lineage; overall Result remains distinct from bounded effectiveness |
| Final disposition | Explicit human action for committed comparison; no automatic next repair or follow-up job |
| Operator resume/history | Existing Results UI, immutable entry association, stage replay and execution recovery; damaged authority refuses |
| Storage | Additive 041; native and separately initialized WASM disposable current/historical proof; live storage unavailable/uncertified |
| Closure | M5 CLOSED; durable merge/CI/review binding is in [`M5_CLOSURE.md`](../project/M5_CLOSURE.md) |

Owners, repeatable proofs and operator instructions are linked in the
[M5 Product workflow](../architecture/M5_PRODUCT_REPAIR_WORKFLOW.md). Broader
healing classes, automatic repair loops, remote authorization and cloud execution
remain outside this scoped milestone.

---

Document Authority:
A — Authoritative

Owner:
Product Owner

Source of Truth:
Post-M3 deep-audit evidence, certified M1-M5 Product behavior, current code and
tests, durable closure receipts, and approved roadmap decisions

Refresh Trigger:
A gap changes priority, ownership, milestone, dependency, or evidence-backed
status; or a milestone opens or closes

Last Verified:
2026-09-16

---

This began as the planning baseline after M3 and now retains that rationale with
post-M5 status reconciliation. It does not replace root
[`TECH_DEBT.md`](../../TECH_DEBT.md) as the technical-debt ledger, and it does
not prove a capability shipped. Executable evidence and milestone certification
remain required for implementation claims.

## Priority and effort conventions

- **P0:** Product truth discrepancy that blocks an accurate current state.
- **P1:** dependency for whichever Product milestone is selected next.
- **P2:** valuable parallel capability or bounded maintainability work.
- **P3:** deferred platform or future-product work.
- **Effort:** XS (up to 2 days), S (3-5 days), M (1-2 weeks), L (3-5 weeks),
  XL (more than 5 weeks), assuming one focused implementation stream.

## Prioritized board

| Gap ID | Priority | Audit severity | Track | Capability / area | Problem statement | Evidence / source | User / Product impact | Dependency | Recommended action | Milestone ownership | Effort | Status | Blocks next milestone? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUDIT-001 | P0 | HIGH | Product | Product positioning | Product copy described an autonomous v1 platform beyond the certified local M1-M3 scope. | Deep audit; `forge-ui/src/components/layout/AppShell.tsx`; public README | Users can mistake a bounded local Product for autonomous or enterprise-ready capability. | Certified M1-M5 scope | Use local, evidence-first positioning and separate shipped Product from research direction. | Truth Alignment | XS / 1 day | RESOLVED | no |
| AUDIT-002 | P0 | HIGH | Product | Primary navigation | Insights, Settings, and Truth Board appeared beside working areas although their routes were placeholders or disconnected. | Deep audit; `forge-ui/src/components/layout/Header.tsx` and routed pages | Navigation promises capability that the Product cannot deliver. | None | Hide placeholders from primary navigation; keep direct routes explicitly labelled Preview / Coming Soon. | Truth Alignment | XS / 1 day | RESOLVED | no |
| AUDIT-003 | P1 | HIGH | Intelligence | Failure triage, healing, Insights | Triage, healing, trends, and related utilities were legacy, evaluation-only, or disconnected from canonical Results. | Deep audit; M4 diagnostic authority; M5 repair owners and closure receipt | M4 now provides bounded canonical diagnostics/refusal and M5 provides bounded selector repair; broader AI triage, general healing, and the full Truth Dashboard remain outside certified scope. | Immutable Result evidence; M4/M5 closure | Preserve M4/M5 authority; treat broader AI triage, general repair, and richer Insights as separate future work. | M4/M5 + unselected future | XL / 6-8 weeks | PARTIALLY_RESOLVED | no |
| AUDIT-004 | P3 | BLOCKER | Platform | External beta security | Local auth/tenant contexts do not establish real authentication, authorization, tenant isolation, or cloud secret boundaries. | Deep audit; accepted local Product constraints | External users or shared deployments would have unsafe authority boundaries. | Separate security and deployment architecture | Design auth, RBAC, tenant isolation, secrets, upgrade, and operational support before external beta. | Deferred | XL / 8+ weeks | DEFERRED | no |
| AUDIT-005 | P2 | HIGH | Crawl | Crawl completeness | General application completeness and “any application” breadth are unproven; frontier measurement and app-specific assumptions remain. | Deep audit; crawl scorecard and current limitations | Users may receive incomplete application coverage without a defensible completeness claim. | Canonical Observation/App Model authority | Define completeness measures, remove app-specific assumptions, and certify additional structurally distinct targets. | Unselected | L / 3-5 weeks | STILL_OPEN | no |
| AUDIT-006 | P0 | MEDIUM | Platform | Legacy API surface | Top-level `/api/v1/tests`, `/runs`, `/results`, `/insights`, `/settings`, and run stream are mounted 501 stubs beside project-scoped canonical routes. | Deep audit; `forge-ui/server/index.ts`; `forge-ui/server/routes/` stubs | Integrators can mistake dead endpoints for supported API contracts. | Consumer inventory before removal | Mark as legacy compatibility stubs now; keep mounted until a separate consumer audit proves removal non-breaking. | Truth Alignment | XS / 1 day | RESOLVED | no |
| AUDIT-007 | P0 | MEDIUM | Product | M3 Add to Suite | Promotion opened the Suite area without carrying the promoted Definition selection. | Deep audit; M3 success UI and Saved Suites workspace | Users had to rediscover context immediately after successful promotion. | Existing canonical candidate read | Carry the explicit Definition ID in navigation state and preselect only its matching canonical candidate; retain explicit Suite Save. | Truth Alignment | XS / 1-2 days | RESOLVED | no |
| AUDIT-008 | P3 | MEDIUM | Platform | Settings / environment profiles | Product Settings, environment profiles, runner configuration, and supported configuration UX are incomplete. | Deep audit; Settings placeholder; local credential workflow | Operators need repository/environment knowledge and cannot manage reusable profiles in Product UI. | Product needs assessment; security model for shared use | Implement only the minimum profile/configuration slice required by a certified Product workflow; defer broader settings. | Deferred | L / 3-5 weeks | DEFERRED | no |
| AUDIT-009 | P2 | MEDIUM | Governance | Architecture pressure | Large files and repeated contract evolution increase convergence and contract-drift risk. | Deep audit; M1-M5 implementation history; code-size findings | Changes become slower to review and integration defects surface late. | Frozen authority contracts; convergence spike | Decompose bounded owners only when touched, starting with high-change integration seams; do not redesign the canonical spine. | Unselected | M / 1-2 weeks per slice | STILL_OPEN | no |
| AUDIT-010 | P0 | HIGH | Governance | Current-state documentation | State, milestone, roadmap, codebase map, limitations, and debt summaries predated milestone closure. | Deep audit; named current-state documents; migrations through 041 | Stale state recurred after M5 even though M1-M5 behavior was certified. | M1-M5 closure evidence | Keep current-state docs bound to durable receipts and exact Git/CI state. | Post-M5 alignment | S / 3-5 days | RESOLVED | no |
| AUDIT-011 | P1 | HIGH | Intelligence | Results diagnostics and provenance | Immutable Results did not project actionable diagnostic evidence and canonical classification/explanation. | Deep audit; M4 diagnostic evidence/classification/presentation/Insights owners | M4 now projects evidence-gated deterministic outcomes or refusal and preserves historical Result authority. | Immutable Result/evidence aggregation; M4 closure | Preserve the canonical M4 projection; richer evidence navigation remains separate UX work. | M4 | L / 4-6 weeks | RESOLVED | no |
| AUDIT-012 | P2 | MEDIUM | Tooling | Setup and validation noise | Global npm/npx shims can be broken and test output is noisy; repository-local launchers work. | Deep audit environment evidence; current build/run guide | Setup failures can be misclassified as Product failures and slow validation. | Existing repository dependencies | Preserve repository-local launcher guidance; reduce test noise and loader/environment differences under a separate brief. | Unselected | S / 3-5 days | STILL_OPEN | no |

`RESOLVED` means commit-matched milestone evidence establishes the scoped
outcome. `PARTIALLY_RESOLVED` means the certified bounded need is implemented
while the row's broader wording still contains open capability. `STILL_OPEN`,
`SUPERSEDED`, and `DEFERRED` preserve their ordinary meanings; none is a
release claim without executable evidence.

## Milestone outcomes

### M4 — Evidence-Gated Failure Intelligence — CLOSED

**Objective:**

```text
Immutable Result
-> diagnostic evidence projection
-> evidence-gated classification
-> explanation
-> Result detail
-> Insights aggregation
```

M4 resolved the canonical diagnostic and provenance portion of AUDIT-003 and
AUDIT-011 through deterministic evidence-gated outcomes or explicit refusal.
It did not promote the broader legacy/AI triage vocabulary into Product
authority and did not mutate historical Results.

### M5 — Human-Governed Bounded Selector Repair — CLOSED

M5 resolved the bounded selector-repair portion of AUDIT-003 through canonical
eligibility, non-authoritative proposal, explicit local human decision,
materialization, governed rerun, immutable effectiveness, explicit disposition,
and resume/history. General healing, automatic next repair, rollback/adoption,
and other repair classes remain open or deferred rather than silently absorbed.

## Post-M3 engineering process reset

1. **Shared physical contract first.** Core, UI, and certification consume one
   real contract artifact rather than parallel examples.
2. **Convergence spike before parallel implementation.** Prove Core, Product UI,
   transport, persistence, and certification can meet before splitting work.
3. **Three review levels.** Authority-critical changes receive full hostile and
   independent review; Product integration receives focused contract and
   integration review; Product polish uses normal implementation, tests, and
   diff review.
4. **Fixtures define semantics.** Product fixtures specify behavior, ordering,
   refusal, and grounding; the real Product owns opaque IDs, hashes, revisions,
   and derived authority.
5. **Real Product driver early.** Introduce the actual Product path near the
   start of a milestone, not only during final certification.
6. **Stop when frozen invariants are proven.** Do not extend certification into
   speculative micro-hardening that does not protect an approved invariant.

## Current planning view

- **RESOLVED:** AUDIT-001, AUDIT-002, AUDIT-006, AUDIT-007, AUDIT-010,
  AUDIT-011.
- **PARTIALLY_RESOLVED:** AUDIT-003. M4/M5 close the certified diagnostic and
  bounded selector-repair slices; broader AI triage, general healing, and full
  dashboard maturity remain unselected.
- **STILL_OPEN:** AUDIT-005, AUDIT-009, AUDIT-012.
- **DEFERRED:** AUDIT-004 and AUDIT-008.

No open row is assigned to M6. Future milestone ownership is unselected.

Historical M1-M3 closure remains in
[`PRODUCT_TD_LEDGER.md`](PRODUCT_TD_LEDGER.md). This board carries forward open
planning only; it does not reopen certified authority contracts.
