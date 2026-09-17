/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeCanonicalEvidenceWorkspace } from '../forge-ui/server/context/CanonicalEvidenceWorkspacePresenter'
import { composeResultEvidenceBlocks, parseEvidenceWorkspaceContext, readCanonicalEvidenceWorkspace } from '../forge-ui/server/context/CanonicalEvidenceWorkspaceController'
import type { CanonicalExecutionResultsDetail } from '../forge-ui/src/api/resultsContract'
import { decodeCanonicalEvidenceWorkspace, EvidenceWorkspaceContractError, type EvidenceWorkspaceBlock } from '../forge-ui/src/api/evidenceWorkspaceContract'
import { canonicalEvidenceWorkspaceQuery, EvidenceWorkspaceBlockView } from '../forge-ui/src/pages/TruthBoardPage'
import { TestCasePresentationService } from '../src/core/test-design/TestCasePresentationService'

const assembledAt = '2026-09-17T12:00:00.000Z'
const project = { projectId: 'product', name: 'product' }

function block(overrides: Partial<EvidenceWorkspaceBlock> = {}): EvidenceWorkspaceBlock {
  return {
    blockId: 'project-anchor', kind: 'project_identity', role: 'root', tier: 1,
    scope: { projectId: 'product', semanticIdentity: 'product' }, title: 'Project',
    availability: 'available', integrity: 'verified', claims: [], references: [],
    unknowns: [], blockers: [], limitations: [], actions: [], ...overrides,
  }
}

test('contract fixture composes deterministically regardless of source arrival order', () => {
  const a = block()
  const b = block({ blockId: 'result-z', kind: 'result', role: 'primary', tier: 2, scope: { projectId: 'product', semanticIdentity: 'z' }, title: 'Result' })
  const first = composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [b, a] })
  const second = composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [a, b] })
  assert.deepEqual(first, second)
  assert.deepEqual(first.blocks.map(value => value.blockId), ['project-anchor', 'result-z'])
})

test('composition canonicalizes nested owner claims, references, actions, and limitations', () => {
  const nested = block({
    claims: [
      { claimId: 'z', label: 'Z', value: 2, owner: 'Owner', classification: 'DIRECT_CANONICAL' },
      { claimId: 'a', label: 'A', value: 1, owner: 'Owner', classification: 'DIRECT_CANONICAL' },
    ],
    references: [
      { reference: { kind: 'observation', projectId: 'product', observationId: 'z' }, resolution: 'resolved', href: '/z' },
      { reference: { kind: 'observation', projectId: 'product', observationId: 'a' }, resolution: 'resolved', href: '/a' },
    ],
    actions: [
      { actionId: 'z', label: 'Z', kind: 'inspect', owner: 'Owner', href: '/z' },
      { actionId: 'a', label: 'A', kind: 'inspect', owner: 'Owner', href: '/a' },
    ],
    unknowns: ['z','a'], blockers: ['z','a'], limitations: ['z','a'],
  })
  const reversed = { ...nested, claims: [...nested.claims].reverse(), references: [...nested.references].reverse(), actions: [...nested.actions].reverse(), unknowns: [...nested.unknowns].reverse(), blockers: [...nested.blockers].reverse(), limitations: [...nested.limitations].reverse() }
  assert.deepEqual(
    composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [nested] }),
    composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [reversed] }),
  )
})

test('hostile duplicate semantic blocks fail closed', () => {
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block(), block({ blockId: 'other' })] }), EvidenceWorkspaceContractError)
})

test('hostile duplicate references and conflicting semantic claims fail closed', () => {
  const reference = { reference: { kind: 'project' as const, projectId: 'product' }, resolution: 'resolved' as const, href: '/truth-board?project=product&context=project' }
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block({ references: [reference, reference] })] }), /Duplicate canonical reference/)
  const claims = [
    { claimId: 'state', label: 'State', value: 'one', owner: 'Owner', classification: 'DIRECT_CANONICAL' as const },
    { claimId: 'state', label: 'State', value: 'two', owner: 'Owner', classification: 'DIRECT_CANONICAL' as const },
  ]
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block({ claims })] }), /claim/)
})

test('hostile cross-project blocks and references fail closed', () => {
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block({ scope: { projectId: 'other', semanticIdentity: 'other' } })] }), /Cross-project/)
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block({ references: [{ reference: { kind: 'project', projectId: 'other' }, resolution: 'resolved', href: '/truth-board?project=other' }] })] }), /Cross-project/)
})

test('unresolved references require an explicit reason', () => {
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block({ references: [{ reference: { kind: 'project', projectId: 'product' }, resolution: 'unresolved' }] })] }), /resolution/)
})

test('missing or repeated project anchors fail closed', () => {
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [] }), /project anchor/)
  assert.throws(() => composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block(), block({ blockId: 'project-two', scope: { projectId: 'product', semanticIdentity: 'second' } })] }), /project anchor/)
})

test('context parser accepts only one complete exact context', () => {
  assert.deepEqual(parseEvidenceWorkspaceContext({ context: 'project' }), { kind: 'project' })
  assert.deepEqual(parseEvidenceWorkspaceContext({ context: 'repair', repair: 'entry-1' }), { kind: 'repair', entryId: 'entry-1' })
  assert.deepEqual(parseEvidenceWorkspaceContext({ context: 'result', execution: 'execution-1', run: 'run-1', item: '1', result: 'result-1' }), { kind: 'result', executionId: 'execution-1', runId: 'run-1', itemOrdinal: 1, resultId: 'result-1' })
  assert.equal(parseEvidenceWorkspaceContext({ context: 'result', execution: 'execution-1', run: 'run-1', result: 'result-1' }), null)
  assert.equal(parseEvidenceWorkspaceContext({ context: 'repair', repair: 'entry-1', execution: 'execution-1' }), null)
})

test('project context renders explicit no-evidence without fake health or KPI claims', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'project' }, async () => ({ appName: 'product' }), {
    readInventory: async () => ({ total: 0 }), readEvidenceInventory: async () => ({ authority: 'canonical_product', page: { projectTotal: 0 } }), readResults: async () => null, readExactDefinition: async () => null, readRepair: async () => null, now: () => assembledAt,
  })
  assert.equal(response.status, 200)
  const payload = (response.body as any).data
  assert.equal(payload.blocks.find((value: any) => value.blockId === 'project-no-evidence').availability, 'no_evidence')
  assert.doesNotMatch(JSON.stringify(payload), /health|confidence|severity|pass rate/i)
})

test('project source failure stays unavailable and does not become no evidence', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'project' }, async () => ({ appName: 'product' }), {
    readInventory: async () => { throw new Error('offline') }, readEvidenceInventory: async () => ({ authority: 'canonical_product', page: { projectTotal: 0 } }), readResults: async () => null, readExactDefinition: async () => null, readRepair: async () => null, now: () => assembledAt,
  })
  const payload = (response.body as any).data
  assert.equal(payload.blocks.find((value: any) => value.blockId === 'project-evidence-unavailable').availability, 'unavailable')
  assert.equal(payload.sourceFailures[0].required, true)
})

test('omitted canonical evidence inventory owner fails explicitly instead of fabricating zero', async () => {
  const sources = {
    readInventory: async () => ({ total: 0 }), readResults: async () => null,
    readExactDefinition: async () => null, readRepair: async () => null, now: () => assembledAt,
  } as any
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'project' }, async () => ({ appName: 'product' }), sources)
  const payload = (response.body as any).data
  assert.equal(payload.blocks.find((value: any) => value.blockId === 'project-observation-unavailable').availability, 'unavailable')
  assert.equal(payload.blocks.some((value: any) => value.blockId === 'project-no-evidence'), false)
  assert.equal(payload.sourceFailures.find((value: any) => value.source === 'ApplicationEvidenceInventoryProjection').required, true)
})

test('nonpassing Result binds exact Run, Result, historical Definition, App Model, and diagnostic refusal', () => {
  const context = { kind: 'result' as const, executionId: 'execution-1', runId: 'run-1', itemOrdinal: 1, resultId: 'result-1' }
  const detail: CanonicalExecutionResultsDetail = {
    kind: 'canonical_execution_results', evidenceHeadlineOutcome: 'failed',
    execution: { executionId: 'execution-1', lifecycle: 'completed', terminalOutcome: 'failed', authorityReasonCode: 'result_failed', acceptedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, definitionAuthority: { schemaVersion: 2, testSetId: 'set-1', revision: 4, modelRowId: 7, modelVersion: '1', supportSealHash: 'a'.repeat(64), routeEvidenceIdentityHash: 'b'.repeat(64), authenticationExpectationIdentityHash: 'c'.repeat(64) } },
    run: { runId: 'run-1', lifecycle: 'completed', evidenceOutcome: 'failed', evidenceReasonCode: 'result_failed', startedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, observedResultCount: 1, evidenceCounts: { passed: 0, failed: 1, couldNotVerify: 0, missing: 0 } },
    items: [{ manifestOrdinal: 1, definitionId: 'definition-1', executablePlanHash: 'd'.repeat(64), evidence: { kind: 'observed_result', resultId: 'result-1', outcome: 'failed', reasonCode: 'action_failed', safeMessage: null, durationMs: 12, oracleKind: 'subject_observable', observedSubjectId: 'subject-1' }, diagnostic: { state: 'available', identity: { projectId: 'product', executionId: 'execution-1', runId: 'run-1', itemOrdinal: 1, evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1' }, evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1', evidenceHash: 'e'.repeat(64), classifierVersion: 'forge.m4.diagnostic-classifier/v1', outcome: { schemaVersion: 'forge.m4.diagnostic-outcome/v1', evidenceSchemaVersion: 'forge.m4.diagnostic-evidence/v1', classifierVersion: 'forge.m4.diagnostic-classifier/v1', evidenceHash: 'e'.repeat(64), kind: 'refusal', refusalCode: 'insufficient_evidence', explanationCode: 'diagnostic_predicates_not_satisfied', explanationParameters: {} }, displayString: 'Evidence was insufficient for a bounded diagnosis.' } }], integrityWarnings: [],
  }
  const exact = { rowId: 44, contentHash: 'f'.repeat(64), testSet: { projectId: 'product', testSetId: 'set-1', revision: 4 }, definition: { definitionId: 'definition-1', title: 'Historical definition', provenance: { supportingObservationIds: ['observation-1'] }, materialUnknowns: [], confidenceLimitations: [] } }
  const blocks = composeResultEvidenceBlocks('product', context, detail, exact)
  assert.equal(blocks.find(value => value.kind === 'result')?.claims.find(value => value.claimId === 'result-outcome')?.value, 'failed')
  assert.equal(blocks.find(value => value.kind === 'diagnostic')?.availability, 'refused')
  assert.equal(blocks.find(value => value.kind === 'test_set')?.references[0].reference.kind, 'test_set')
  const definitionReferences = blocks.find(value => value.kind === 'test_definition')?.references ?? []
  const modelReference = definitionReferences.find(value => value.reference.kind === 'app_model')
  const observationReference = definitionReferences.find(value => value.reference.kind === 'observation')
  assert.equal(modelReference?.resolution, 'unresolved')
  assert.equal(modelReference?.href, undefined)
  assert.match(modelReference?.reason ?? '', /cannot yet verify both the exact historical row and version/)
  assert.equal(observationReference?.resolution, 'unresolved')
  assert.equal(observationReference?.href, undefined)
  assert.match(observationReference?.reason ?? '', /missing exact historical identity/)
  assert.throws(() => composeResultEvidenceBlocks('product', { ...context, runId: 'latest-run' }, detail, exact), /Exact Run/)
  assert.throws(() => composeResultEvidenceBlocks('product', context, detail, { ...exact, testSet: { ...exact.testSet, projectId: 'other' } }), /authority/)
})

test('completed repair keeps overall rerun Result, bounded effectiveness, and disposition separate', async () => {
  const entry = { entryId: 'entry-1', projectId: 'product', proposalId: 'proposal-1', originalEvidence: { executionId: 'execution-before', runId: 'run-before', resultId: 'result-before', itemOrdinal: 1 } }
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'repair', repair: 'entry-1' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => null, readExactDefinition: async () => null,
    readRepair: async () => ({
      entry, proposal: { proposalId: 'proposal-1', proposalHash: '1'.repeat(64) }, originalResult: { outcome: 'failed' },
      decision: { decision: 'approve', decisionId: 'decision-1', decisionHash: '2'.repeat(64) },
      supersession: { authorityId: 'supersession-1', authorityHash: '3'.repeat(64) },
      origin: { testSetRowId: 45, resultingDefinitionAuthority: { testSetId: 'set-repaired', testSetRevision: 5, definitionId: 'definition-1' } },
      execution: { executionId: 'execution-after', aggregation: { outcome: 'failed' }, result: { result_id: 'result-after', run_id: 'run-after', execution_item_ordinal: 1, outcome: 'failed' } },
      comparison: { comparisonId: 'comparison-1', evidenceHash: '4'.repeat(64), state: 'REPAIR_CONFIRMED', reason: 'target_action_completed' },
      disposition: { dispositionId: 'disposition-1', state: 'bounded_repair_resolved', decision: { action: 'resolve_bounded_repair' }, effectiveness: { comparisonId: 'comparison-1' } },
      nextActions: [], operationReadiness: { state: 'current', code: null }, integrity: 'valid',
    }), now: () => assembledAt,
  })
  assert.equal(response.status, 200)
  assert.doesNotThrow(() => decodeCanonicalEvidenceWorkspace((response.body as any).data))
  const blocks = (response.body as any).data.blocks
  assert.equal(blocks.find((value: any) => value.blockId === 'repair-rerun-result').claims.find((value: any) => value.claimId === 'rerun-overall-result').value, 'failed')
  assert.equal(blocks.find((value: any) => value.blockId === 'repair-effectiveness').claims.find((value: any) => value.claimId === 'effectiveness-state').value, 'REPAIR_CONFIRMED')
  assert.equal(blocks.find((value: any) => value.blockId === 'repair-disposition').claims.find((value: any) => value.claimId === 'disposition-state').value, 'bounded_repair_resolved')
  assert.equal(blocks.find((value: any) => value.blockId === 'selected-repair').title, 'Completed repair lifecycle')
  assert.deepEqual(blocks.find((value: any) => value.blockId === 'selected-repair').references.map((value: any) => value.reference.kind).sort(), ['decision', 'proposal', 'repair', 'repair_revision', 'supersession'])
  assert.match(blocks.find((value: any) => value.blockId === 'repair-original-result').references[0].href, /execution=execution-before.*run=run-before.*item=1.*result=result-before/)
  assert.match(blocks.find((value: any) => value.blockId === 'repair-rerun-result').references[0].href, /execution=execution-after.*run=run-after.*item=1.*result=result-after/)
  assert.equal(blocks.find((value: any) => value.blockId === 'repair-effectiveness').references[0].reference.kind, 'effectiveness')
  assert.equal(blocks.find((value: any) => value.blockId === 'repair-disposition').references[0].reference.kind, 'disposition')
})

test('repair source mismatch preserves exact selected context as unavailable', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'repair', repair: 'entry-1' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => null, readExactDefinition: async () => null,
    readRepair: async () => ({ entry: { entryId: 'entry-2', projectId: 'other' } }), now: () => assembledAt,
  })
  assert.equal(response.status, 200)
  assert.equal((response.body as any).data.context.entryId, 'entry-1')
  assert.equal((response.body as any).data.blocks.find((value: any) => value.blockId === 'selected-repair-unavailable').availability, 'unavailable')
})

test('governed repair actions are copied verbatim from the owner projection', async () => {
  const base = { entry: { entryId: 'entry-1', projectId: 'product', proposalId: 'proposal-1', originalEvidence: { executionId: 'e', runId: 'r', resultId: 'x', itemOrdinal: 1 } }, originalResult: { outcome: 'failed' }, nextActions: ['repair_rerun'], integrity: 'valid' }
  for (const [state, expected] of [['current', 1], ['refused', 1]] as const) {
    const response = await readCanonicalEvidenceWorkspace('product', { context: 'repair', repair: 'entry-1' }, async () => ({ appName: 'product' }), {
      readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => null, readExactDefinition: async () => null,
      readRepair: async () => ({ ...base, operationReadiness: { state, code: state === 'refused' ? 'stale_candidate' : null } }), now: () => assembledAt,
    })
    const lifecycle = (response.body as any).data.blocks.find((value: any) => value.blockId === 'selected-repair')
    assert.equal(lifecycle.actions.length, expected)
  }
})

test('client query builder fails closed on incomplete Result and preserves exact anchors', () => {
  assert.equal(canonicalEvidenceWorkspaceQuery(new URLSearchParams('context=result&execution=e&run=r&result=x')), null)
  assert.equal(canonicalEvidenceWorkspaceQuery(new URLSearchParams('context=result&execution=e&run=r&item=1&result=x'))?.toString(), 'context=result&execution=e&run=r&item=1&result=x')
  assert.equal(canonicalEvidenceWorkspaceQuery(new URLSearchParams('context=repair&repair=entry-1&execution=e')), null)
})

test('rendered block shows supplied states, owners, distinct limitations, and exact links', () => {
  const html = renderToStaticMarkup(React.createElement(EvidenceWorkspaceBlockView, { block: block({
    blockId: 'effectiveness', kind: 'bounded_state', role: 'supporting', tier: 3, scope: { projectId: 'product', semanticIdentity: 'effectiveness' }, title: 'Bounded repair effectiveness',
    claims: [{ claimId: 'state', label: 'Selector effectiveness', value: 'REPAIR_CONFIRMED', owner: 'RepairEffectivenessAuthority', classification: 'DIRECT_CANONICAL' }], limitations: ['Does not replace overall Result.'],
    references: [{ reference: { kind: 'project', projectId: 'product' }, resolution: 'resolved', href: '/truth-board?project=product&context=project' }],
  }) }))
  assert.match(html, /REPAIR_CONFIRMED/)
  assert.match(html, /RepairEffectivenessAuthority/)
  assert.match(html, /Does not replace overall Result/)
  assert.match(html, /truth-board\?project=product/)
})

test('client decoder refuses malformed structural payloads', () => {
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ schemaVersion: 'wrong', project, context: { kind: 'project' }, assembledAt, blocks: [], sourceFailures: [] }), EvidenceWorkspaceContractError)
  const valid = composeCanonicalEvidenceWorkspace({ project, context: { kind: 'project' }, assembledAt, blocks: [block()] })
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ ...valid, context: { kind: 'result', executionId: 'e' } }), EvidenceWorkspaceContractError)
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ ...valid, blocks: [{ ...valid.blocks[0], availability: 'healthy' }] }), EvidenceWorkspaceContractError)
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ ...valid, blocks: [{ ...valid.blocks[0], claims: [{ claimId: 'x', label: 'X', value: 1, owner: '', classification: 'DIRECT_CANONICAL' }] }] }), EvidenceWorkspaceContractError)
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ ...valid, context: { kind: 'repair', entryId: 'entry-1', resultId: 'extra' } }), EvidenceWorkspaceContractError)
  assert.throws(() => decodeCanonicalEvidenceWorkspace({ ...valid, blocks: [{ ...valid.blocks[0], references: [{ reference: { kind: 'invented', projectId: 'product' }, resolution: 'resolved', href: '/' }] }] }), EvidenceWorkspaceContractError)
})

test('exact historical service preserves supplied revision and row/hash identity', async () => {
  const testSet: any = { schemaVersion: 1, testSetId: 'set-1', revision: 4, projectId: 'product', generationId: 'generation-1', generatedAt: assembledAt, generationMethod: 'deterministic', outcome: 'completed', sourceObservationId: 'observation-1', modelRowId: 7, modelVersion: '1', supportingEvidenceIds: [], definitions: [{ id: 'definition-1', title: 'Historical', intent: 'Historical intent', category: 'navigation', canonicalSubjects: ['subject-1'], preconditions: [], steps: [], oracle: { kind: 'subject_observable', subjectId: 'subject-1', evidenceId: 'evidence-1', explanation: 'Observed.' }, provenance: { sourceObservationId: 'observation-1', modelRowId: 7, modelVersion: '1', supportingEvidenceIds: [] }, generationMethod: 'deterministic', validation: { state: 'valid', explanation: 'Valid.' }, confidenceLimitations: [], materialUnknowns: [], unobservedScope: [], preventedStrongerDefinition: 'None.' }], limitations: [], materialUnknowns: [], unobservedScope: [], preventedStrongerSet: 'None.', coverage: 'unknown', freshness: 'not_evaluated' }
  const service = new TestCasePresentationService({ readExactDefinition: async (projectId: string, setId: string, revision: number, definitionId: string) => {
    assert.deepEqual([projectId, setId, revision, definitionId], ['product', 'set-1', 4, 'definition-1'])
    return { rowId: 44, contentHash: 'a'.repeat(64), testSet, definition: testSet.definitions[0] }
  } } as any)
  const exact = await service.readExactDefinition('product', 'set-1', 4, 'definition-1')
  assert.deepEqual([exact?.rowId, exact?.contentHash, exact?.testSet.revision, exact?.definition.definitionId], [44, 'a'.repeat(64), 4, 'definition-1'])
})

test('implementation contains no new persistence, migration, AI, or legacy truth dependency', () => {
  const files = ['forge-ui/server/context/CanonicalEvidenceWorkspaceController.ts', 'forge-ui/server/context/CanonicalEvidenceWorkspacePresenter.ts', 'forge-ui/src/api/evidenceWorkspaceContract.ts']
  const source = files.map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n')
  assert.doesNotMatch(source, /insertInto|updateTable|deleteFrom|EvidenceLedgerController|HealStore|applicationOverviewAdapter|openai|anthropic/i)
})
