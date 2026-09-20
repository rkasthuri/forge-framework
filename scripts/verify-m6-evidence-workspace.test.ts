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
import { resultEvidenceWorkspaceHref } from '../forge-ui/src/pages/ResultsPage'
import { repairEvidenceWorkspaceHref } from '../forge-ui/src/components/results/RepairWorkflowPanel'
import { TestCasePresentationService } from '../src/core/test-design/TestCasePresentationService'
import { readExactAppModel, readExactObservation } from '../forge-ui/server/context/ExactHistoricalEvidenceController'
import {
  decodeExactAppModelResponse,
  decodeExactObservationResponse,
  ExactHistoricalEvidenceContractError,
  EXACT_APP_MODEL_SCHEMA,
  EXACT_OBSERVATION_SCHEMA,
} from '../forge-ui/src/api/exactHistoricalEvidenceContract'

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
  assert.match(modelReference?.reason ?? '', /could not be verified/)
  assert.equal(observationReference?.resolution, 'unresolved')
  assert.equal(observationReference?.href, undefined)
  assert.match(observationReference?.reason ?? '', /could not be verified/)
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

test('wrong repair entry identity preserves the exact selected context as unavailable', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'repair', repair: 'entry-1' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => null, readExactDefinition: async () => null,
    readRepair: async () => ({ entry: { entryId: 'entry-2', projectId: 'product' } }), now: () => assembledAt,
  })
  assert.equal(response.status, 200)
  assert.equal((response.body as any).data.context.entryId, 'entry-1')
  assert.equal((response.body as any).data.blocks.find((value: any) => value.blockId === 'selected-repair-unavailable').availability, 'unavailable')
})

test('cross-project repair identity preserves the exact selected context as unavailable', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'repair', repair: 'entry-1' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => null, readExactDefinition: async () => null,
    readRepair: async () => ({ entry: { entryId: 'entry-1', projectId: 'other' } }), now: () => assembledAt,
  })
  assert.equal(response.status, 200)
  assert.equal((response.body as any).data.context.entryId, 'entry-1')
  assert.equal((response.body as any).data.blocks.find((value: any) => value.blockId === 'selected-repair-unavailable').availability, 'unavailable')
  assert.doesNotMatch(JSON.stringify((response.body as any).data), /project=other/)
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

const exactObservation = {
  observationId: 'observation-1', projectId: 'product', runId: 'run-1', historyPosition: 'historical' as const,
  run: { lifecycle: 'completed', completeness: 'complete', startedAt: assembledAt, terminalAt: assembledAt },
  outcome: 'present', subject: 'page:inventory', predicate: 'route_exists',
  method: { id: 'browser_dom_inspection', version: 'forge.browser-dom-inspection/v1' },
  boundary: { schemaVersion: 'forge-observation-boundary/v1', kind: 'document', scope: { path: '/inventory' }, startedAt: assembledAt, endedAt: assembledAt, completion: 'complete', policyId: 'fixture', policyVersion: '1' },
  capturedAt: assembledAt, provenanceClass: 'native', reasonCode: null, artifactIds: ['artifact-1'],
  sourceModels: [{ rowId: 7, version: '1.0.0', lifecycle: 'superseded' }], integrity: 'verified' as const,
}

test('exact Observation controller returns only the project-scoped verified identity', async () => {
  const owner = {
    readAppModel: async () => ({ kind: 'not_found' }), readObservationProjection: async () => ({ runs: [], observations: [] }),
    readObservation: async (projectId: string, observationId: string) => projectId === 'product' && observationId === 'observation-1'
      ? { kind: 'ok', observation: exactObservation } : { kind: 'not_found' },
  }
  const okRead = await readExactObservation('product', 'observation-1', async () => ({ appName: 'product' }), owner)
  assert.equal(okRead.status, 200)
  assert.equal((okRead.body as any).data.observation.historyPosition, 'historical')
  assert.equal((await readExactObservation('other', 'observation-1', async () => ({ appName: 'other' }), owner)).status, 404)
  assert.equal((await readExactObservation('product', '../newest', async () => ({ appName: 'product' }), owner)).status, 400)
})

test('exact App Model controller rejects incomplete, conflicting, and unavailable identities without fallback', async () => {
  const owner = { readAppModel: async () => ({ kind: 'not_found' }), readObservation: async () => ({ kind: 'not_found' }), readObservationProjection: async () => ({ runs: [], observations: [] }) }
  assert.equal((await readExactAppModel('product', '7', {}, async () => ({ appName: 'product' }), owner)).status, 400)
  assert.equal((await readExactAppModel('product', '7', { version: '1.0.0', cursor: 'newest' }, async () => ({ appName: 'product' }), owner)).status, 400)
  assert.equal((await readExactAppModel('product', '7', { version: '1.0.0' }, async () => ({ appName: 'product' }), owner)).status, 404)
})

test('exact App Model remains available when auxiliary Observation projection is unavailable', async () => {
  const fingerprint = '7'.repeat(64)
  const model = {
    rowId: 7, appName: 'product', version: '1.0.0', lifecycle: 'superseded',
    generatedAt: assembledAt, crawledAt: assembledAt, evidenceState: 'crawled',
    sourceObservationId: 'observation-1', sourceObservationRunId: 'run-1',
    supportObservationIds: ['observation-1'], supportGapIds: [],
    validation: 'valid', integrity: 'verified', modelFingerprint: fingerprint,
    subjects: [{
      id: 'page:inventory', kind: 'page', routePath: '/inventory',
      derivedClassification: { label: 'Inventory', confidence: 'high', method: 'rule' },
    }],
    recovery: null,
  }
  const response = await readExactAppModel(
    'product', '7', { version: '1.0.0', fingerprint },
    async () => ({ appName: 'product' }),
    {
      readAppModel: async () => ({ kind: 'ok', model }),
      readObservation: async () => ({ kind: 'not_found' }),
      readObservationProjection: async () => { throw new Error('projection unavailable') },
    },
  )
  assert.equal(response.status, 200)
  const exact = (response.body as any).data.model
  assert.deepEqual([exact.rowId, exact.version, exact.modelFingerprint], [7, '1.0.0', fingerprint])
  assert.equal(exact.sourceObservation.id, 'observation-1')
  assert.equal(exact.sourceObservation.available, false)
  assert.equal(exact.sourceObservation.href, null)
  assert.equal(exact.recommendation, null)
  assert.ok(exact.unknowns.some((value: string) => /source observation is unavailable/i.test(value)))
})

test('exact App Model remains available when auxiliary Observation projection entries are malformed', async () => {
  const fingerprint = '8'.repeat(64)
  const model = {
    rowId: 8, appName: 'product', version: '1.0.1', lifecycle: 'superseded',
    generatedAt: assembledAt, crawledAt: assembledAt, evidenceState: 'crawled',
    sourceObservationId: 'observation-1', sourceObservationRunId: 'run-1',
    supportObservationIds: ['observation-1'], supportGapIds: [],
    validation: 'valid', integrity: 'verified', modelFingerprint: fingerprint,
    subjects: [{
      id: 'page:inventory', kind: 'page', routePath: '/inventory',
      derivedClassification: { label: 'Inventory', confidence: 'high', method: 'rule' },
    }],
    recovery: null,
  }
  const response = await readExactAppModel(
    'product', '8', { version: '1.0.1', fingerprint },
    async () => ({ appName: 'product' }),
    {
      readAppModel: async () => ({ kind: 'ok', model }),
      readObservation: async () => ({ kind: 'not_found' }),
      readObservationProjection: async () => ({ runs: [null], observations: [] }),
    },
  )
  assert.equal(response.status, 200)
  const exact = (response.body as any).data.model
  assert.deepEqual([exact.rowId, exact.version, exact.modelFingerprint], [8, '1.0.1', fingerprint])
  assert.equal(exact.sourceObservation.id, 'observation-1')
  assert.equal(exact.sourceObservation.available, false)
  assert.equal(exact.sourceObservation.href, null)
  assert.equal(exact.recommendation, null)
})

test('exact historical controllers map owner transport failure to 503 without fallback', async () => {
  const unavailable = async () => { throw new Error('owner unavailable') }
  const owner = {
    readAppModel: unavailable,
    readObservation: unavailable,
    readObservationProjection: unavailable,
  }
  const model = await readExactAppModel(
    'product', '7', { version: '1.0.0' },
    async () => ({ appName: 'product' }), owner,
  )
  assert.equal(model.status, 503)
  assert.equal((model.body as any).code, 'EXACT_APP_MODEL_READ_UNAVAILABLE')

  const observation = await readExactObservation(
    'product', 'observation-1',
    async () => ({ appName: 'product' }), owner,
  )
  assert.equal(observation.status, 503)
  assert.equal((observation.body as any).code, 'EXACT_OBSERVATION_READ_UNAVAILABLE')
})

test('exact historical client contracts bind structurally valid payloads to the requested identities', () => {
  const observationRequest = { projectId: 'product', observationId: 'observation-1' }
  const validObservation = { schemaVersion: EXACT_OBSERVATION_SCHEMA, project: { id: 'product', name: 'Product' }, observation: exactObservation }
  assert.equal(decodeExactObservationResponse(validObservation, observationRequest).observation.observationId, 'observation-1')
  assert.throws(() => decodeExactObservationResponse({
    ...validObservation,
    project: { id: 'other', name: 'Other' },
    observation: { ...exactObservation, projectId: 'other' },
  }, observationRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactObservationResponse({
    ...validObservation,
    observation: { ...exactObservation, observationId: 'observation-newest' },
  }, observationRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactObservationResponse({
    ...validObservation,
    observation: { ...exactObservation, integrity: 'failed' },
  }, observationRequest), ExactHistoricalEvidenceContractError)

  const fingerprint = '9'.repeat(64)
  const modelRequest = { projectId: 'product', rowId: 7, version: '1.0.0', fingerprint }
  const exactModel = {
    rowId: 7, version: '1.0.0', lifecycle: 'superseded', createdAt: assembledAt, sourceCrawlAt: assembledAt,
    sourceObservation: {
      id: 'observation-1', available: true, outcome: 'completed', startedAt: assembledAt, completedAt: assembledAt,
      href: '/application/observations?project=product&observation=observation-1&exact=true',
    },
    evidenceState: 'crawled', validation: 'valid', integrity: 'verified', modelFingerprint: fingerprint,
    projection: 'not_applicable', freshness: 'not_evaluated', coverage: 'unknown',
    subjects: [{
      id: 'page:inventory', kind: 'page', routePath: '/inventory', basis: 'direct_observation',
      evidenceId: 'observation-1', derivedClassification: { label: 'Inventory', confidence: 'high', method: 'rule' },
    }],
    recovery: null, limitations: [], unknowns: [], blockers: [],
    recommendation: {
      action: 'Review the source observation', because: 'Inspect exact evidence.', destination: 'observation-1',
      href: '/application/observations?project=product&observation=observation-1&exact=true',
    },
  }
  const validModel = { schemaVersion: EXACT_APP_MODEL_SCHEMA, project: { id: 'product', name: 'Product' }, model: exactModel }
  assert.equal(decodeExactAppModelResponse(validModel, modelRequest).model.rowId, 7)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel, model: { ...exactModel, rowId: 8, lifecycle: 'active' },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel, model: { ...exactModel, version: '2.0.0' },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel, model: { ...exactModel, modelFingerprint: '8'.repeat(64) },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel,
    project: { id: 'other', name: 'Other' },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel, model: { ...exactModel, subjects: [{ ...exactModel.subjects[0], kind: 'current-page' }] },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel,
    model: { ...exactModel, sourceObservation: { ...exactModel.sourceObservation, href: '/application/observations?project=product&observation=observation-1' } },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  for (const href of [
    '/application/observations?project=other&observation=observation-1&exact=true',
    '/application/observations?project=product&observation=observation-2&exact=true',
  ]) {
    assert.throws(() => decodeExactAppModelResponse({
      ...validModel,
      model: { ...exactModel, sourceObservation: { ...exactModel.sourceObservation, href } },
    }, modelRequest), ExactHistoricalEvidenceContractError)
  }
  for (const href of [
    '/application/observations?project=other&observation=observation-1&exact=true',
    '/application/observations?project=product&observation=observation-2&exact=true',
  ]) {
    assert.throws(() => decodeExactAppModelResponse({
      ...validModel,
      model: { ...exactModel, recommendation: { ...exactModel.recommendation, href } },
    }, modelRequest), ExactHistoricalEvidenceContractError)
  }
  assert.throws(() => decodeExactAppModelResponse({
    ...validModel,
    model: { ...exactModel, recommendation: { ...exactModel.recommendation, destination: 'observation-2', href: '/application/observations?project=product&observation=observation-2&exact=true' } },
  }, modelRequest), ExactHistoricalEvidenceContractError)
  for (const malformedObservation of [
    { ...exactObservation, outcome: 'observed' },
    { ...exactObservation, provenanceClass: 'direct' },
    { ...exactObservation, run: { ...exactObservation.run, lifecycle: 'done' } },
    { ...exactObservation, boundary: { ...exactObservation.boundary, completion: 'unknown' } },
    { ...exactObservation, sourceModels: [{ ...exactObservation.sourceModels[0], lifecycle: 'current' }] },
  ]) {
    assert.throws(() => decodeExactObservationResponse({
      ...validObservation, observation: malformedObservation,
    }, observationRequest), ExactHistoricalEvidenceContractError)
  }
})

test('workspace refuses wrong-project and integrity-failed owner responses even when labelled ok', async () => {
  const fingerprint = '9'.repeat(64)
  const repair = {
    entry: {
      entryId: 'entry-1', projectId: 'product', proposalId: 'proposal-1',
      originalEvidence: { executionId: 'execution-1', runId: 'run-1', resultId: 'result-1', itemOrdinal: 1 },
      request: { source: { modelRowId: 7, modelVersion: '1.0.0', modelContentHash: fingerprint } },
    },
    originalResult: { outcome: 'failed' }, nextActions: [], integrity: 'valid',
  }
  const baseModel = {
    rowId: 7, appName: 'product', version: '1.0.0', validation: 'valid',
    integrity: 'verified', modelFingerprint: fingerprint,
  }
  for (const hostileModel of [
    { ...baseModel, appName: 'other' },
    { ...baseModel, integrity: 'failed' },
    { ...baseModel, validation: 'invalid' },
  ]) {
    const response = await readCanonicalEvidenceWorkspace(
      'product',
      { context: 'repair', repair: 'entry-1' },
      async () => ({ appName: 'product' }),
      {
        readInventory: async () => null,
        readEvidenceInventory: async () => null,
        readResults: async () => null,
        readExactDefinition: async () => null,
        readRepair: async () => repair,
        readExactAppModel: async () => ({ kind: 'ok', model: hostileModel }),
        now: () => assembledAt,
      },
    )
    assert.equal(response.status, 200)
    const payload = (response.body as any).data
    const reference = payload.blocks.find((value: any) => value.blockId === 'repair-source-app-model').references[0]
    assert.equal(reference.resolution, 'unresolved')
    assert.equal(reference.href, undefined)
    assert.ok(payload.sourceFailures.some((failure: any) => failure.code === 'EXACT_REPAIR_SOURCE_MODEL_UNRESOLVED'))
  }
})

test('Result workspace promotes exact App Model and Observation links only after verified reads', () => {
  const context = { kind: 'result' as const, executionId: 'execution-1', runId: 'run-1', itemOrdinal: 1, resultId: 'result-1' }
  const detail: CanonicalExecutionResultsDetail = {
    kind: 'canonical_execution_results', evidenceHeadlineOutcome: 'failed',
    execution: { executionId: 'execution-1', lifecycle: 'completed', terminalOutcome: 'failed', authorityReasonCode: 'result_failed', acceptedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, definitionAuthority: { schemaVersion: 2, testSetId: 'set-1', revision: 4, modelRowId: 7, modelVersion: '1.0.0', supportSealHash: 'a'.repeat(64), routeEvidenceIdentityHash: 'b'.repeat(64), authenticationExpectationIdentityHash: 'c'.repeat(64) } },
    run: { runId: 'run-1', lifecycle: 'completed', evidenceOutcome: 'failed', evidenceReasonCode: 'result_failed', startedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, observedResultCount: 1, evidenceCounts: { passed: 0, failed: 1, couldNotVerify: 0, missing: 0 } },
    items: [{ manifestOrdinal: 1, definitionId: 'definition-1', executablePlanHash: 'd'.repeat(64), evidence: { kind: 'observed_result', resultId: 'result-1', outcome: 'failed', reasonCode: 'action_failed', safeMessage: null, durationMs: 12, oracleKind: 'subject_observable', observedSubjectId: 'subject-1' }, diagnostic: null }], integrityWarnings: [],
  }
  const exact = { rowId: 44, contentHash: 'f'.repeat(64), testSet: { projectId: 'product', testSetId: 'set-1', revision: 4 }, definition: { definitionId: 'definition-1', title: 'Historical', provenance: { supportingObservationIds: ['observation-1'] }, materialUnknowns: [], confidenceLimitations: [] } }
  const fingerprint = '9'.repeat(64)
  const blocks = composeResultEvidenceBlocks('product', context, detail, exact, {
    appModels: new Map([['7@1.0.0', { fingerprint, href: `/application/model?project=product&model=7&version=1.0.0&fingerprint=${fingerprint}` }]]),
    observations: new Map([['observation-1', '/application/observations?project=product&observation=observation-1&exact=true']]),
  })
  const references = blocks.find(value => value.kind === 'test_definition')!.references
  assert.equal(references.find(value => value.reference.kind === 'app_model')?.resolution, 'resolved')
  assert.equal(references.find(value => value.reference.kind === 'observation')?.resolution, 'resolved')
  assert.match(references.find(value => value.reference.kind === 'app_model')?.href ?? '', /fingerprint=/)
  assert.match(references.find(value => value.reference.kind === 'observation')?.href ?? '', /exact=true/)
})

function readinessOwner(state: 'supported' | 'supported_with_constraints' | 'blocked' | 'unknown' = 'supported_with_constraints', withAction = true, projectId = 'product') {
  return { data: { project: { id: projectId, name: projectId }, decisions: [{
    id: 'observe_application', label: 'Observe the application', state,
    explanation: `Owner explanation for ${state}.`,
    supportingEvidence: [{ kind: 'observation', id: 'observation-1', label: 'Observation observation-1', href: `/application/observations?project=${projectId}&observation=observation-1`, integrity: 'not_evaluated', freshness: 'not_evaluated' }],
    blockers: state === 'blocked' ? ['Owner blocker.'] : [], unknowns: state === 'unknown' ? ['Owner unknown.'] : [],
    limitations: ['Owner limitation.'], preventedStrongerState: 'Owner boundary.',
    safeNextAction: withAction ? { actionId: 'readiness-observe_application', label: 'Open Crawl', explanation: 'Owner action basis.', href: `/crawl?project=${projectId}` } : null,
  }] } }
}

test('project workspace copies readiness owner state, constraints, references, and safe action without deriving status', async () => {
  for (const state of ['supported_with_constraints', 'blocked', 'unknown'] as const) {
    const response = await readCanonicalEvidenceWorkspace('product', { context: 'project' }, async () => ({ appName: 'product' }), {
      readInventory: async () => ({ total: 0 }), readEvidenceInventory: async () => ({ authority: 'canonical_product', page: { projectTotal: 0 } }),
      readResults: async () => null, readExactDefinition: async () => null, readRepair: async () => null,
      readReadiness: async () => readinessOwner(state), now: () => assembledAt,
    })
    const payload = (response.body as any).data
    const readiness = payload.blocks.find((value: any) => value.kind === 'readiness_decision')
    assert.equal(readiness.claims.find((value: any) => value.label === 'Readiness state').value, state)
    assert.deepEqual(readiness.blockers, state === 'blocked' ? ['Owner blocker.'] : [])
    assert.deepEqual(readiness.unknowns, state === 'unknown' ? ['Owner unknown.'] : [])
    assert.deepEqual(readiness.limitations, ['Owner limitation.'])
    assert.deepEqual(readiness.actions, [{ actionId: 'readiness-observe_application', label: 'Open Crawl', kind: 'governed', owner: 'ApplicationReadinessPresenter', href: '/crawl?project=product' }])
    assert.equal(readiness.references[0].reference.kind, 'readiness_evidence')
  }
})

test('readiness absence and hostile cross-project owner output fail closed without manufacturing an action', async () => {
  for (const readReadiness of [async () => readinessOwner('blocked', false), async () => readinessOwner('blocked', true, 'other'), async () => { throw new Error('offline') }]) {
    const response = await readCanonicalEvidenceWorkspace('product', { context: 'project' }, async () => ({ appName: 'product' }), {
      readInventory: async () => ({ total: 0 }), readEvidenceInventory: async () => ({ authority: 'canonical_product', page: { projectTotal: 0 } }),
      readResults: async () => null, readExactDefinition: async () => null, readRepair: async () => null,
      readReadiness, now: () => assembledAt,
    })
    const payload = (response.body as any).data
    const decision = payload.blocks.find((value: any) => value.kind === 'readiness_decision')
    if (decision) assert.deepEqual(decision.actions, [])
    else {
      assert.equal(payload.blocks.find((value: any) => value.blockId === 'project-readiness-unavailable').availability, 'unavailable')
      assert.ok(payload.sourceFailures.some((value: any) => value.code === 'APPLICATION_READINESS_UNAVAILABLE'))
    }
    assert.doesNotMatch(JSON.stringify(payload), /project=other/)
  }
})

test('normal Product entry hrefs preserve every exact Result and repair identity', () => {
  assert.equal(resultEvidenceWorkspaceHref('product', 'execution-1', 'run-1', 7, 'result-1'), '/truth-board?project=product&context=result&execution=execution-1&run=run-1&item=7&result=result-1')
  assert.equal(repairEvidenceWorkspaceHref('product', 'entry-1'), '/truth-board?project=product&context=repair&repair=entry-1')
})

function suiteResultRead() {
  return { kind: 'ok', projection: {
    availability: 'available', headlineOutcome: 'failed',
    execution: { executionId: 'execution-1', lifecycle: 'completed', outcome: 'failed', reasonCode: 'result_failed', acceptedAt: assembledAt, terminalAt: assembledAt, manifestCount: 1, definitionAuthority: { schemaVersion: 2, testSetId: 'set-1', revision: 4, modelRowId: 7, modelVersion: '1.0.0', supportSealHash: 'a'.repeat(64), routeEvidenceIdentityHash: 'b'.repeat(64), authenticationExpectationIdentityHash: 'c'.repeat(64) }, selectionAuthority: { kind: 'suite_revision', suiteId: 'suite-11111111-1111-1111-1111-111111111111', suiteRevision: 3, suiteContentHash: '9'.repeat(64), name: 'Exact Suite', purpose: 'sanity' } },
    run: { runId: 'run-1', lifecycle: 'completed', outcome: 'failed', reasonCode: 'action_failed', startedAt: assembledAt, terminalAt: assembledAt, expectedResultCount: 1, observedResultCount: 1, aggregateCounts: { passed: 0, failed: 1, couldNotVerify: 0 } },
    items: [{ itemOrdinal: 1, definitionId: 'definition-1', executablePlanHash: 'd'.repeat(64), result: { state: 'result_observed', resultId: 'result-1', outcome: 'failed', reasonCode: 'action_failed', safeMessage: null, durationMs: 12, oracleKind: 'subject_observable', observedSubjectId: 'subject-1' } }], integrityWarnings: [],
  } }
}

test('wrong Result ordinal refuses the exact selected Result context', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'result', execution: 'execution-1', run: 'run-1', item: '2', result: 'result-1' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => suiteResultRead(),
    readExactDefinition: async () => null, readRepair: async () => null, now: () => assembledAt,
  })
  const payload = (response.body as any).data
  assert.equal(payload.context.itemOrdinal, 2)
  assert.equal(payload.blocks.find((value: any) => value.blockId === 'selected-result-unavailable').availability, 'unavailable')
  assert.equal(payload.blocks.some((value: any) => value.blockId === 'selected-result'), false)
})

test('wrong Result ID refuses the exact selected Result context', async () => {
  const response = await readCanonicalEvidenceWorkspace('product', { context: 'result', execution: 'execution-1', run: 'run-1', item: '1', result: 'result-2' }, async () => ({ appName: 'product' }), {
    readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => suiteResultRead(),
    readExactDefinition: async () => null, readRepair: async () => null, now: () => assembledAt,
  })
  const payload = (response.body as any).data
  assert.equal(payload.context.resultId, 'result-2')
  assert.equal(payload.blocks.find((value: any) => value.blockId === 'selected-result-unavailable').availability, 'unavailable')
  assert.equal(payload.blocks.some((value: any) => value.blockId === 'selected-result'), false)
})

test('accepted Suite provenance appears only after exact project, revision, and hash verification', async () => {
  const exactDefinition = { rowId: 44, contentHash: 'f'.repeat(64), testSet: { projectId: 'product', testSetId: 'set-1', revision: 4 }, definition: { definitionId: 'definition-1', title: 'Historical', provenance: {}, materialUnknowns: [], confidenceLimitations: [] } }
  const base = { schemaVersion: 1, projectId: 'product', suiteId: 'suite-11111111-1111-1111-1111-111111111111', revision: 3, contentHash: '9'.repeat(64), name: 'Exact Suite', purpose: 'sanity' }
  for (const [suite, expected] of [[base, true], [{ ...base, revision: 4 }, false], [{ ...base, projectId: 'other' }, false], [{ ...base, contentHash: '8'.repeat(64) }, false]] as const) {
    const suiteReads: Array<[string, string, number]> = []
    const response = await readCanonicalEvidenceWorkspace('product', { context: 'result', execution: 'execution-1', run: 'run-1', item: '1', result: 'result-1' }, async () => ({ appName: 'product' }), {
      readInventory: async () => null, readEvidenceInventory: async () => null, readResults: async () => suiteResultRead(),
      readExactDefinition: async () => exactDefinition, readRepair: async () => null,
      readExactSuite: async (projectId, suiteId, revision) => {
        suiteReads.push([projectId, suiteId, revision])
        return suite
      },
      now: () => assembledAt,
    })
    const payload = (response.body as any).data
    assert.deepEqual(suiteReads, [['product', 'suite-11111111-1111-1111-1111-111111111111', 3]])
    assert.equal(payload.blocks.some((value: any) => value.kind === 'suite'), expected, JSON.stringify(payload))
    assert.equal(payload.sourceFailures.some((value: any) => value.code === 'EXACT_SUITE_UNRESOLVED'), !expected)
    if (expected) assert.doesNotThrow(() => decodeCanonicalEvidenceWorkspace(payload))
  }
})
