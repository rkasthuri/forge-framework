# Human-governed bounded selector repair Product workflow

This contract integrates the frozen [proposal](../../src/core/healing/GovernedRepairProposalService.ts), [decision](../../src/core/healing/GovernedRepairDecisionService.ts), [materialization](../../src/core/healing/GovernedRepairMaterializationService.ts), [execution](../../src/core/execution/ExecutionService.ts), [comparison](../../src/core/healing/GovernedRepairComparisonService.ts), and [disposition](../../src/core/healing/GovernedRepairDispositionService.ts) owners. It introduces no new repair class or autonomous healing.

**Status:** M5 is CLOSED. Merge
`3e0622d741b23fc688216b717ea4f86e1c53f916` and post-merge `main`
`514eaf5f4b0983355de26fc97bd1064271f3a415` were certified by CI #372
with 0 M5 completion regressions and 0 unresolved M5 Product issues. See the
[durable closure receipt](../project/M5_CLOSURE.md).

## A. Entry

An existing canonical Result identifies the exact failed Execution/Run/item and diagnostic. Product reads revalidate accepted historical Definition authority and require the existing targeted-selector failure predicate. A later-oracle-only original failure is not an eligible selector-repair source. Diagnostics remain observed evidence, never human-attested truth.

The proposal does not retain the selected original Result; the rerun binding retains it only after execution acceptance. Additive migration 041 therefore introduces a narrow immutable entry association owned by [RepairAuthorityRepository](../../src/core/storage/repositories/RepairAuthorityRepository.ts). It binds original evidence, source Definition authority, exact proposal request/time, and proposal identity/hash. It stores no status, decision, verdict, or adopted-version pointer. Proposal and association commit atomically after original-evidence validation. Foreign keys, canonical integrity checks and immutable guards protect storage; invalid locator or orphaned authority is explicit rather than hidden as absence.

One entry binds one generated proposal to one original Result. Existing generated proposal identity is unchanged. A collision with another Result refuses; historical proposal-only records are not silently adopted. Before persistence the original Result URL is recoverable context. After persistence project/Result discovery recovers the exact request and time.

## B. Candidate selection

Product-owned reads resolve the current active committed App Model and its exact support/route authority. Existing physical enumeration and eligibility select a unique bounded correspondence. The operator supplies no hashes or authority envelope. Missing, ambiguous, unsupported, stale or corrupt evidence refuses explicitly. A reviewed candidate reference is echoed on creation; a changed active revision is not silently substituted. New approval, promotion, materialization and rerun require the frozen candidate to remain current. Explicit rejection remains available for an otherwise valid stale proposal. Exact committed replay and historical reads preserve their existing validation semantics.

## C. Composition

Thin core composition resolves canonical inputs and invokes existing owners. Lawful progression is proposal → explicit approve/reject → promotion → materialization → governed rerun → committed comparison → explicit disposition. Rejection permits no promotion. Each operation is individually durable and recoverable; no command skips prerequisites. Replay recovers committed IDs/timestamps and exact actor/action declarations; conflicting declarations refuse. Stable entry-scoped execution intent prevents duplicate browser execution. No automatic next repair occurs.

## D. Transport

Project-scoped transport uses [ExecutionContext](../../forge-ui/server/context/ExecutionContext.ts); routes perform no business logic or direct persistence. Result context, entry creation/discovery, stage commands, and readiness preparation accept only narrow Product inputs. The existing execution transport accepts an entry-resolved `repair_rerun` selection and preserves the full original diagnostic/Result, materialization and repair lineage. Resolution occurs inside existing execution ownership without nested queue calls.

## E. Resume and readiness

Read-only workflow projection joins canonical proposal, decision, supersession, origin, rerun, comparison and disposition. It does not calculate independent lifecycle truth or mutate prerequisites. The existing execution status/recovery owner handles restart reconciliation, followed by a workflow reread. Pending execution is not committed INCONCLUSIVE and offers no disposition. Missing/corrupt required authority remains explicit.

A missing association schema produces upgrade-required on GET without mutation. Explicit Prepare repair workspace invokes the existing guarded migration owner through ExecutionContext for the selected project. It accepts no filesystem path/dialect, refuses during active execution, and performs no conversion, backfill or hidden repair. Unsupported/corrupt storage remains refused.

## F. Truthful read

The core projection exposes original Result/diagnostic, selectors and model context, eligibility/refusal, human decision, repaired revision, rerun Result, effectiveness, disposition, provenance, integrity and lawful actions. Overall Result and bounded selector effectiveness remain separate. A repaired target/action with a later failed oracle displays both confirmed repair and overall failure. Historical records remain immutable.

## G. Operator boundary and certification

Reuse existing forge-ui Results/navigation for review, explicit human controls, continuation and history. Do not add a dashboard subsystem or require opaque context reconstruction. Actual HTTP handoff and rendered Product controls are certified. Required scenarios include rejection, ineffective/inconclusive reruns, cancelled/no-Result execution, later-oracle failure, resume/replay and invalid authority. Supported native/historical/WASM paths are certified explicitly; unsupported native WAL-to-WASM interchange and populated pre-037 transition, including populated-036 backfill, remain outside scope. Post-merge closure does not certify unavailable live storage.

## Operator journey

1. Open **Results**, select the project and canonical execution, then choose **Review selector repair** on the nonpassing Result. The Result ID in the URL is an existing canonical reference, not a new Result DTO or client-computed authority.
2. If the selected workspace needs migration 041, choose **Prepare repair workspace**. An unavailable or corrupt workspace cannot be repaired by this action. No migration runs from the workflow GET.
3. Review the original and proposed selectors, their App Model revisions and subjects. Choose **Create repair proposal** only when the server reports a unique eligible candidate.
4. Enter the local human operator identity and explicitly **Approve repair** or **Reject repair**. This trusted local declaration is not remote authentication. Rejection ends this proposal path.
5. For an approval, choose **Promote approved repair**, **Create repaired revision**, and **Run governed repair**. Each operation uses its existing authority owner and persists independently; the current TestSet follows existing materialization semantics, never disposition-driven adoption.
6. After terminal execution, choose **Evaluate repair outcome**. Pending execution cannot create a comparison or final disposition. Cancelled/no-Result execution can yield committed INCONCLUSIVE evidence, which still requires an explicit follow-up decision.
7. Review the overall Result separately from bounded selector effectiveness. Choose **Resolve bounded repair**, **Close unsuccessful repair**, or **Record manual follow-up** only when that action is lawful for the committed comparison. Recording follow-up launches no job and initiates no subsequent repair.

Refresh or reopen the Result URL to recover persisted context. The existing execution status owner reconciles a previously accepted execution after restart. Proposal, decision, supersession, origin, acceptance, comparison and disposition are reconstructed from canonical storage; no browser-only stage pointer is authority. History shows their exact identities. Corrupt locators, missing foreign-key prerequisites and mismatched identity witnesses refuse instead of reopening a completed stage.

## Implementation and evidence map

| Consumer or boundary | Owner / repeatable proof |
|---|---|
| Core lifecycle projection and commands | [GovernedRepairWorkflowService](../../src/core/healing/GovernedRepairWorkflowService.ts) |
| Original evidence / immutable association | [RepairWorkflowAuthority](../../src/core/storage/RepairWorkflowAuthority.ts), [migration 041](../../src/core/storage/migrations/041_repair_workflow_entry.ts) |
| Product HTTP | [RepairWorkflowController](../../forge-ui/server/context/RepairWorkflowController.ts), [project routes](../../forge-ui/server/routes/projects.ts), [actual HTTP tests](../../scripts/verify-m5-product-entry.test.ts) |
| Rendered operator controls | [ResultsPage](../../forge-ui/src/pages/ResultsPage.tsx), [RepairWorkflowPanel](../../forge-ui/src/components/results/RepairWorkflowPanel.tsx), [browser proof](../../scripts/prove-m5-product-browser.ts) |
| Refusal, replay, partial-stage reopen and integrity | [workflow authority tests](../../scripts/verify-m5-product-workflow-authority.test.ts) |
| Real reporting runtime / current schema | [reporter runtime test](../../scripts/verify-m5-reporter-runtime.test.ts) |

Historical proposal-only records remain readable through their existing owners but cannot be retroactively associated with a selected failure. The Product reports association unavailable instead of guessing. Certification uses disposable native and separately initialized WASM stores, including populated 040 upgrade/reopen/replay and a rendered journey through explicit readiness. It does not convert native WAL files into WASM storage or modify historical Result evidence. Selected live storage remains unavailable and uncertified under the accepted limitation. M5 is committed, merged, and post-merge certified only at the exact closure bindings recorded in [`M5_CLOSURE.md`](../project/M5_CLOSURE.md).
