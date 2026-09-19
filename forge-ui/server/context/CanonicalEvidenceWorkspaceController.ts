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

import { fail, ok } from '../http'
import { executionContext } from './ExecutionContext'
import { readApplicationReadiness } from './ApplicationReadinessController'
import { composeCanonicalEvidenceWorkspace } from './CanonicalEvidenceWorkspacePresenter'
import { serializeCanonicalExecutionResultsRead, type CanonicalExecutionResultsDetail } from '../../src/api/resultsContract'
import type {
  EvidenceClaim,
  EvidenceWorkspaceAction,
  EvidenceWorkspaceBlock,
  EvidenceWorkspaceContext,
  EvidenceWorkspaceSourceFailure,
} from '../../src/api/evidenceWorkspaceContract'

type Project = { appName: string; url?: string }
export type ResolveProject = (appName: string) => Promise<Project | undefined>
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/

const record = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
const scalar = (value: unknown): string | number | boolean | null => value === null || ['string', 'number', 'boolean'].includes(typeof value) ? value as string | number | boolean | null : JSON.stringify(value)
const claim = (claimId: string, label: string, value: unknown, owner: string, classification: EvidenceClaim['classification'] = 'DIRECT_CANONICAL'): EvidenceClaim => ({ claimId, label, value: scalar(value), owner, classification })

export function parseEvidenceWorkspaceContext(query: Record<string, unknown>): EvidenceWorkspaceContext | null {
  const keys = Object.keys(query).sort()
  if (query.context === 'project' && keys.join('|') === 'context') return { kind: 'project' }
  if (query.context === 'repair' && keys.join('|') === 'context|repair' && typeof query.repair === 'string' && SAFE_ID.test(query.repair)) return { kind: 'repair', entryId: query.repair }
  if (query.context === 'result' && keys.join('|') === 'context|execution|item|result|run'
    && typeof query.execution === 'string' && SAFE_ID.test(query.execution)
    && typeof query.run === 'string' && SAFE_ID.test(query.run)
    && typeof query.result === 'string' && SAFE_ID.test(query.result)
    && typeof query.item === 'string' && /^[1-9]\d{0,8}$/.test(query.item)) {
    return { kind: 'result', executionId: query.execution, runId: query.run, itemOrdinal: Number(query.item), resultId: query.result }
  }
  return null
}

function projectBlock(projectId: string, name: string): EvidenceWorkspaceBlock {
  return {
    blockId: 'project-anchor', kind: 'project_identity', role: 'root', tier: 1,
    scope: { projectId, semanticIdentity: projectId }, title: 'Project', availability: 'available', integrity: 'verified',
    claims: [claim('project-id', 'Project ID', projectId, 'ProjectRegistry'), claim('project-name', 'Project name', name, 'ProjectRegistry')],
    references: [{ reference: { kind: 'project', projectId }, resolution: 'resolved', href: `/truth-board?project=${encodeURIComponent(projectId)}&context=project` }],
    unknowns: [], blockers: [], limitations: [], actions: [],
  }
}

function stateBlock(projectId: string, id: string, title: string, availability: EvidenceWorkspaceBlock['availability'], message: string, tier: 4 | 5 = 4): EvidenceWorkspaceBlock {
  return {
    blockId: id, kind: 'bounded_state', role: 'contextual', tier,
    scope: { projectId, semanticIdentity: id }, title, availability, integrity: 'not_evaluated',
    claims: [claim(`${id}-message`, 'State', message, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY')],
    references: [], unknowns: availability === 'unknown' || availability === 'not_evaluated' ? [message] : [],
    blockers: availability === 'blocked' || availability === 'refused' ? [message] : [], limitations: [], actions: [],
  }
}

function selectedContextUnavailable(projectId: string, context: Exclude<EvidenceWorkspaceContext, { kind: 'project' }>, message: string): EvidenceWorkspaceBlock {
  const result = context.kind === 'result'
  return {
    ...stateBlock(projectId, result ? 'selected-result-unavailable' : 'selected-repair-unavailable', result ? 'Selected Result context unavailable' : 'Selected repair context unavailable', 'unavailable', message),
    role: 'primary', tier: 2,
    scope: { projectId, semanticIdentity: result ? `${context.executionId}:${context.runId}:${context.itemOrdinal}:${context.resultId}` : context.entryId },
    claims: result
      ? [claim('selected-execution-id', 'Execution', context.executionId, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY'), claim('selected-run-id', 'Run', context.runId, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY'), claim('selected-item-ordinal', 'Item ordinal', context.itemOrdinal, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY'), claim('selected-result-id', 'Result', context.resultId, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY')]
      : [claim('selected-repair-entry-id', 'Repair entry', context.entryId, 'CanonicalEvidenceWorkspaceController', 'COMPOSITION_ONLY')],
    references: result
      ? [{ reference: { kind: 'result', projectId, executionId: context.executionId, runId: context.runId, itemOrdinal: context.itemOrdinal, resultId: context.resultId }, resolution: 'unresolved', reason: message }]
      : [{ reference: { kind: 'repair', projectId, entryId: context.entryId }, resolution: 'unresolved', reason: message }],
  }
}

export interface EvidenceWorkspaceSources {
  readInventory(projectId: string): Promise<unknown>
  readEvidenceInventory(projectId: string): Promise<unknown>
  readResults(projectId: string, executionId: string): Promise<unknown>
  readExactDefinition(projectId: string, testSetId: string, revision: number, definitionId: string): Promise<unknown>
  readRepair(projectId: string, entryId: string): Promise<unknown>
  readReadiness?(projectId: string): Promise<unknown>
  readExactSuite?(projectId: string, suiteId: string, revision: number): Promise<unknown>
  readExactAppModel?(projectId: string, rowId: number, version: string, fingerprint: string | null): Promise<unknown>
  readExactObservation?(projectId: string, observationId: string): Promise<unknown>
  now(): string
}

const defaultSources: EvidenceWorkspaceSources = {
  readInventory: projectId => executionContext.readTestInventory(projectId, { limit: 1, cursor: null, definitionId: null }),
  readEvidenceInventory: projectId => executionContext.readApplicationEvidenceInventory(projectId, { limit: 25 }),
  readResults: (projectId, executionId) => executionContext.readProductExecutionResults(projectId, executionId),
  readExactDefinition: (projectId, testSetId, revision, definitionId) => executionContext.readExactTestDefinition(projectId, testSetId, revision, definitionId),
  readRepair: (projectId, entryId) => executionContext.productRepairWorkflow(projectId, 'read', entryId),
  readReadiness: async projectId => {
    const result = await readApplicationReadiness(projectId, async appName => appName === projectId ? { appName } : undefined)
    if (result.status !== 200) throw new Error('Application Readiness owner is unavailable.')
    return result.body
  },
  readExactSuite: (projectId, suiteId, revision) => executionContext.readProductSuiteRevision(projectId, suiteId, revision),
  readExactAppModel: (projectId, rowId, version, fingerprint) => executionContext.readExactAppModel(projectId, rowId, version, fingerprint),
  readExactObservation: (projectId, observationId) => executionContext.readExactObservation(projectId, observationId),
  now: () => new Date().toISOString(),
}

function readinessAvailability(state: unknown): EvidenceWorkspaceBlock['availability'] {
  if (state === 'supported') return 'available'
  if (state === 'supported_with_constraints') return 'partial'
  if (state === 'blocked') return 'blocked'
  return 'unknown'
}

function ownerHref(href: string, projectId: string): boolean {
  try {
    const parsed = new URL(href, 'http://forge.local')
    return parsed.origin === 'http://forge.local' && parsed.searchParams.get('project') === projectId
  } catch { return false }
}

function readinessBlocks(projectId: string, value: unknown): EvidenceWorkspaceBlock[] {
  const envelope = record(value)
  const readiness = record(envelope?.data)
  if (!readiness || record(readiness.project)?.id !== projectId || !Array.isArray(readiness.decisions) || readiness.decisions.length === 0) throw new Error('Application Readiness owner returned an invalid or cross-project projection.')
  const decisionIds = new Set<string>()
  return readiness.decisions.map((raw: unknown) => {
    const decision = record(raw)
    if (!decision || typeof decision.id !== 'string' || !SAFE_ID.test(decision.id)
      || typeof decision.label !== 'string' || !['supported', 'supported_with_constraints', 'blocked', 'unknown'].includes(String(decision.state))
      || typeof decision.explanation !== 'string' || !Array.isArray(decision.supportingEvidence)
      || !Array.isArray(decision.blockers) || !Array.isArray(decision.unknowns) || !Array.isArray(decision.limitations)) throw new Error('Application Readiness decision is malformed.')
    if (decisionIds.has(decision.id) || [...decision.blockers, ...decision.unknowns, ...decision.limitations].some(value => typeof value !== 'string')) throw new Error('Application Readiness decision is malformed.')
    decisionIds.add(decision.id)
    const references: EvidenceWorkspaceBlock['references'] = decision.supportingEvidence.map((rawReference: unknown) => {
      const reference = record(rawReference)
      if (!reference || typeof reference.kind !== 'string' || typeof reference.id !== 'string' || typeof reference.href !== 'string') throw new Error('Application Readiness reference is malformed.')
      if (!['observation', 'model', 'evidence'].includes(reference.kind) || !ownerHref(reference.href, projectId)
        || !['verified', 'failed', 'not_evaluated'].includes(String(reference.integrity)) || reference.freshness !== 'not_evaluated'
        || typeof reference.label !== 'string') throw new Error('Application Readiness reference is malformed.')
      return {
        reference: { kind: 'readiness_evidence' as const, projectId, decisionId: decision.id, evidenceKind: reference.kind as 'observation' | 'model' | 'evidence', evidenceId: reference.id, integrity: reference.integrity as 'verified' | 'failed' | 'not_evaluated', freshness: 'not_evaluated' as const },
        resolution: 'resolved' as const, href: reference.href, label: reference.label,
      }
    })
    const next = decision.safeNextAction === null ? null : record(decision.safeNextAction)
    if (next && (typeof next.actionId !== 'string' || !SAFE_ID.test(next.actionId) || typeof next.label !== 'string' || typeof next.explanation !== 'string' || typeof next.href !== 'string' || !ownerHref(next.href, projectId))) throw new Error('Application Readiness safe action is malformed.')
    return {
      blockId: `readiness-${decision.id}`, kind: 'readiness_decision', role: 'primary', tier: 2,
      scope: { projectId, semanticIdentity: decision.id }, title: decision.label,
      availability: readinessAvailability(decision.state), integrity: 'not_evaluated',
      claims: [claim(`${decision.id}-state`, 'Readiness state', decision.state, 'ApplicationReadinessPresenter'), claim(`${decision.id}-explanation`, 'Explanation', decision.explanation, 'ApplicationReadinessPresenter'), ...(next ? [claim(`${decision.id}-safe-action-explanation`, 'Safe next action basis', next.explanation, 'ApplicationReadinessPresenter')] : [])],
      references, blockers: [...decision.blockers], unknowns: [...decision.unknowns], limitations: [...decision.limitations],
      actions: next ? [{ actionId: next.actionId, label: next.label, kind: 'governed', owner: 'ApplicationReadinessPresenter', href: next.href }] : [],
    }
  })
}

async function verifiedSuiteBlock(projectId: string, detail: CanonicalExecutionResultsDetail, sources: EvidenceWorkspaceSources): Promise<EvidenceWorkspaceBlock | null> {
  const authority = detail.execution.selectionAuthority
  if (!authority) return null
  if (!sources.readExactSuite) throw new Error('The exact Suite revision reader is unavailable.')
  const suite = record(await sources.readExactSuite(projectId, authority.suiteId, authority.suiteRevision))
  if (!suite || suite.projectId !== projectId || suite.suiteId !== authority.suiteId || suite.revision !== authority.suiteRevision
    || suite.contentHash !== authority.suiteContentHash || suite.name !== authority.name || suite.purpose !== authority.purpose) {
    throw new Error('The exact Suite revision did not match accepted execution authority.')
  }
  const href = `/run?${new URLSearchParams({ project: projectId, suiteId: authority.suiteId, suiteRevision: String(authority.suiteRevision) })}`
  return {
    blockId: 'accepted-suite-revision', kind: 'suite', role: 'supporting', tier: 3,
    scope: { projectId, semanticIdentity: `${authority.suiteId}:${authority.suiteRevision}:${authority.suiteContentHash}` },
    title: 'Accepted Suite revision', availability: 'available', integrity: 'verified',
    claims: [claim('suite-id', 'Suite ID', authority.suiteId, 'ExecutionResultProjectionService'), claim('suite-name', 'Suite name', authority.name, 'ExecutionResultProjectionService'), claim('suite-revision', 'Revision', authority.suiteRevision, 'ExecutionResultProjectionService'), claim('suite-content-hash', 'Content hash', authority.suiteContentHash, 'ExecutionResultProjectionService')],
    references: [{ reference: { kind: 'suite', projectId, suiteId: authority.suiteId, revision: authority.suiteRevision, contentHash: authority.suiteContentHash }, resolution: 'resolved', href }],
    unknowns: [], blockers: [], limitations: [], actions: [],
  }
}

type VerifiedHistoricalReferences = {
  appModels?: Map<string, { fingerprint: string; href: string }>
  observations?: Map<string, string>
}

const modelKey = (rowId: number, version: string) => `${rowId}@${version}`

async function verifyModelReference(projectId: string, rowId: number, version: string, fingerprint: string | null, sources: EvidenceWorkspaceSources): Promise<{ fingerprint: string; href: string } | null> {
  if (!sources.readExactAppModel) return null
  const read = record(await sources.readExactAppModel(projectId, rowId, version, fingerprint))
  const model = record(read?.model)
  if (read?.kind !== 'ok' || !model || model.appName !== projectId
    || model.rowId !== rowId || model.version !== version
    || model.validation !== 'valid' || !['verified', 'not_evaluated'].includes(model.integrity)
    || typeof model.modelFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(model.modelFingerprint)
    || fingerprint !== null && model.modelFingerprint !== fingerprint) return null
  const query = new URLSearchParams({ project: projectId, model: String(rowId), version, fingerprint: model.modelFingerprint })
  return { fingerprint: model.modelFingerprint, href: `/application/model?${query}` }
}

async function verifyObservationReference(projectId: string, observationId: string, sources: EvidenceWorkspaceSources): Promise<string | null> {
  if (!sources.readExactObservation) return null
  const read = record(await sources.readExactObservation(projectId, observationId))
  const observation = record(read?.observation)
  if (read?.kind !== 'ok' || !observation || observation.projectId !== projectId || observation.observationId !== observationId || observation.integrity !== 'verified') return null
  return `/application/observations?${new URLSearchParams({ project: projectId, observation: observationId, exact: 'true' })}`
}

export function composeResultEvidenceBlocks(projectId: string, context: Extract<EvidenceWorkspaceContext, { kind: 'result' }>, detail: CanonicalExecutionResultsDetail, exact: Record<string, any> | null, verified: VerifiedHistoricalReferences = {}): EvidenceWorkspaceBlock[] {
  if (!detail.run || detail.run.runId !== context.runId) throw Object.assign(new Error('Exact Run identity did not resolve.'), { code: 'RESULT_CONTEXT_NOT_FOUND' })
  const item = detail.items.find(candidate => candidate.manifestOrdinal === context.itemOrdinal)
  if (!item || item.evidence.kind !== 'observed_result' || item.evidence.resultId !== context.resultId) throw Object.assign(new Error('Exact Result identity did not resolve.'), { code: 'RESULT_CONTEXT_NOT_FOUND' })
  const authority = detail.execution.definitionAuthority
  if ('scope' in authority) throw Object.assign(new Error('Per-item Definition authority cannot satisfy this exact historical context.'), { code: 'DEFINITION_AUTHORITY_UNAVAILABLE' })
  const resultHref = `/results?project=${encodeURIComponent(projectId)}&execution=${encodeURIComponent(context.executionId)}&run=${encodeURIComponent(context.runId)}&item=${context.itemOrdinal}&result=${encodeURIComponent(context.resultId)}`
  const definitionHref = `/tests?project=${encodeURIComponent(projectId)}&testSet=${encodeURIComponent(authority.testSetId)}&revision=${authority.revision}&test=${encodeURIComponent(item.definitionId)}`
  const blocks: EvidenceWorkspaceBlock[] = [
    {
      blockId: 'selected-execution', kind: 'execution', role: 'primary', tier: 2, scope: { projectId, semanticIdentity: context.executionId }, title: 'Selected execution', availability: 'available', integrity: detail.integrityWarnings.length ? 'warning' : 'verified',
      claims: [claim('execution-lifecycle', 'Lifecycle', detail.execution.lifecycle, 'ExecutionResultProjectionService'), claim('execution-terminal-outcome', 'Terminal Result', detail.execution.terminalOutcome, 'ExecutionResultProjectionService')],
      references: [{ reference: { kind: 'execution', projectId, executionId: context.executionId }, resolution: 'resolved', href: resultHref }], unknowns: [], blockers: [], limitations: detail.integrityWarnings.map(value => value.safeMessage), actions: [],
    },
    {
      blockId: 'selected-run', kind: 'run', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `${context.executionId}:${context.runId}` }, title: 'Exact run', availability: 'available', integrity: 'verified',
      claims: [claim('run-lifecycle', 'Lifecycle', detail.run.lifecycle, 'ExecutionResultProjectionService'), claim('run-outcome', 'Evidence outcome', detail.run.evidenceOutcome, 'ExecutionResultProjectionService')],
      references: [{ reference: { kind: 'run', projectId, executionId: context.executionId, runId: context.runId }, resolution: 'resolved', href: resultHref }], unknowns: [], blockers: [], limitations: [], actions: [],
    },
    {
      blockId: 'selected-result', kind: 'result', role: 'primary', tier: 2, scope: { projectId, semanticIdentity: `${context.executionId}:${context.runId}:${context.itemOrdinal}:${context.resultId}` }, title: 'Exact historical Result', availability: 'available', integrity: 'verified',
      claims: [claim('result-outcome', 'Result', item.evidence.outcome, 'ExecutionResultProjectionService'), claim('result-reason', 'Reason', item.evidence.reasonCode, 'ExecutionResultProjectionService'), claim('result-definition', 'Definition', item.definitionId, 'ExecutionResultProjectionService')],
      references: [{ reference: { kind: 'result', projectId, executionId: context.executionId, runId: context.runId, itemOrdinal: context.itemOrdinal, resultId: context.resultId }, resolution: 'resolved', href: resultHref }], unknowns: [], blockers: [], limitations: [], actions: [],
    },
  ]
  if (exact) {
    const exactSet = record(exact.testSet)
    const exactDefinition = record(exact.definition)
    if (!Number.isSafeInteger(exact.rowId) || exact.rowId < 1 || typeof exact.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(exact.contentHash)
      || !exactSet || exactSet.projectId !== projectId || exactSet.testSetId !== authority.testSetId || exactSet.revision !== authority.revision
      || !exactDefinition || exactDefinition.definitionId !== item.definitionId) {
      throw Object.assign(new Error('Exact historical Definition authority did not match the selected Result.'), { code: 'DEFINITION_CONTEXT_INVALID' })
    }
    const verifiedModel = verified.appModels?.get(modelKey(authority.modelRowId, authority.modelVersion))
    const definitionReferences: EvidenceWorkspaceBlock['references'] = [
      { reference: { kind: 'test_definition', projectId, testSetId: authority.testSetId, revision: authority.revision, rowId: exact.rowId, definitionId: item.definitionId }, resolution: 'resolved', href: definitionHref },
      verifiedModel
        ? { reference: { kind: 'app_model', projectId, rowId: authority.modelRowId, version: authority.modelVersion, fingerprint: verifiedModel.fingerprint }, resolution: 'resolved', href: verifiedModel.href }
        : { reference: { kind: 'app_model', projectId, rowId: authority.modelRowId, version: authority.modelVersion }, resolution: 'unresolved', reason: 'The exact historical App Model identity could not be verified.' },
    ]
    const provenance = record(exactDefinition.provenance)
    const observations = Array.isArray(provenance?.supportingObservationIds)
      ? provenance.supportingObservationIds.filter((value: unknown): value is string => typeof value === 'string' && SAFE_ID.test(value))
      : typeof provenance?.sourceObservationId === 'string' && SAFE_ID.test(provenance.sourceObservationId) ? [provenance.sourceObservationId] : []
    for (const observationId of [...new Set(observations)].sort()) {
      const href = verified.observations?.get(observationId)
      definitionReferences.push(href
        ? { reference: { kind: 'observation', projectId, observationId }, resolution: 'resolved', href }
        : { reference: { kind: 'observation', projectId, observationId }, resolution: 'unresolved', reason: 'The exact historical Observation identity could not be verified.' })
    }
    blocks.push({
      blockId: 'historical-test-set', kind: 'test_set', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `${authority.testSetId}:${authority.revision}:${exact.rowId}` }, title: 'Historical Test Set revision', availability: 'available', integrity: 'verified',
      claims: [claim('test-set-id', 'Test Set', authority.testSetId, 'TestSetRepository'), claim('test-set-revision', 'Revision', authority.revision, 'TestSetRepository'), claim('test-set-hash', 'Verified content hash', exact.contentHash, 'TestSetRepository')],
      references: [{ reference: { kind: 'test_set', projectId, testSetId: authority.testSetId, revision: authority.revision, rowId: exact.rowId, contentHash: exact.contentHash }, resolution: 'resolved', href: definitionHref }], unknowns: [], blockers: [], limitations: [], actions: [],
    }, {
      blockId: 'historical-definition', kind: 'test_definition', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `${authority.testSetId}:${authority.revision}:${item.definitionId}` }, title: 'Exact historical Test Definition', availability: 'available', integrity: 'verified',
      claims: [claim('definition-id', 'Definition ID', item.definitionId, 'TestSetRepository'), claim('definition-title', 'Title', exact.definition.title, 'TestCasePresentationService')],
      references: definitionReferences, unknowns: [...(exact.definition.materialUnknowns ?? [])], blockers: [], limitations: [...(exact.definition.confidenceLimitations ?? [])], actions: [],
    })
  } else {
    blocks.push(stateBlock(projectId, 'historical-test-set-unavailable', 'Historical Test Set revision unavailable', 'unavailable', 'The exact historical Test Set revision could not be read.'))
    blocks.push(stateBlock(projectId, 'historical-definition-unavailable', 'Exact historical Test Definition unavailable', 'unavailable', 'The exact historical Test Definition could not be read.'))
  }
  const diagnostic = item.diagnostic
  if (!diagnostic) blocks.push(stateBlock(projectId, 'diagnostic-not-recorded', 'Diagnostic evidence', 'unavailable', 'No canonical diagnostic projection was supplied for this Result.'))
  else if (diagnostic.state === 'available') blocks.push({
    blockId: 'selected-diagnostic', kind: 'diagnostic', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: diagnostic.evidenceHash }, title: diagnostic.outcome.kind === 'refusal' ? 'Diagnostic refusal' : 'M4 diagnostic', availability: diagnostic.outcome.kind === 'refusal' ? 'refused' : 'available', integrity: diagnostic.outcome.kind === 'refusal' && diagnostic.outcome.refusalCode === 'integrity_invalid' ? 'invalid' : 'verified',
    claims: [claim('diagnostic-outcome', 'Diagnostic outcome', diagnostic.outcome.kind, 'ExecutionResultProjectionService'), claim('diagnostic-explanation', 'Explanation', diagnostic.displayString, 'ExecutionResultProjectionService')],
    references: [{ reference: { kind: 'diagnostic', projectId, executionId: context.executionId, runId: context.runId, itemOrdinal: context.itemOrdinal, resultId: context.resultId, evidenceSchemaVersion: diagnostic.evidenceSchemaVersion, evidenceHash: diagnostic.evidenceHash, classifierVersion: diagnostic.classifierVersion }, resolution: 'resolved', href: resultHref }], unknowns: [], blockers: diagnostic.outcome.kind === 'refusal' ? [diagnostic.displayString] : [], limitations: [], actions: [],
  })
  else blocks.push(stateBlock(projectId, 'diagnostic-unavailable', 'Diagnostic evidence unavailable', 'unavailable', `Canonical diagnostic source reported ${diagnostic.reason}.`))
  return blocks
}

function repairModelBlock(projectId: string, role: 'source' | 'candidate', endpoint: Record<string, any>, verified: { fingerprint: string; href: string } | null): EvidenceWorkspaceBlock {
  const rowId = Number(endpoint.modelRowId), version = String(endpoint.modelVersion)
  return {
    blockId: `repair-${role}-app-model`, kind: 'app_model', role: 'supporting', tier: 3,
    scope: { projectId, semanticIdentity: `${role}:${rowId}:${version}` }, title: `${role === 'source' ? 'Source' : 'Candidate'} App Model`,
    availability: verified ? 'available' : 'unavailable', integrity: verified ? 'verified' : 'not_evaluated',
    claims: [claim(`${role}-model-row`, 'Model row', rowId, 'AppModelRepository'), claim(`${role}-model-version`, 'Model version', version, 'AppModelRepository'), claim(`${role}-model-fingerprint`, 'Model fingerprint', endpoint.modelContentHash ?? null, 'GovernedRepairWorkflowService')],
    references: [verified
      ? { reference: { kind: 'app_model', projectId, rowId, version, fingerprint: verified.fingerprint }, resolution: 'resolved', href: verified.href }
      : { reference: { kind: 'app_model', projectId, rowId, version }, resolution: 'unresolved', reason: `The exact historical ${role} App Model identity could not be verified.` }],
    unknowns: verified ? [] : [`The exact historical ${role} App Model is unavailable.`], blockers: [], limitations: [], actions: [],
  }
}

function repairBlocks(projectId: string, context: Extract<EvidenceWorkspaceContext, { kind: 'repair' }>, raw: Record<string, any>, exactModels: EvidenceWorkspaceBlock[] = []): EvidenceWorkspaceBlock[] {
  const entry = record(raw.entry)
  if (!entry || entry.entryId !== context.entryId || entry.projectId !== projectId) throw Object.assign(new Error('Exact repair entry did not resolve.'), { code: 'REPAIR_CONTEXT_NOT_FOUND' })
  const original = record(raw.originalResult)
  const rerun = record(raw.execution)
  const comparison = record(raw.comparison)
  const disposition = record(raw.disposition)
  const proposal = record(raw.proposal)
  const decision = record(raw.decision)
  const supersession = record(raw.supersession)
  const origin = record(raw.origin)
  const readiness = record(raw.operationReadiness)
  const resultHref = `/results?project=${encodeURIComponent(projectId)}&repairEntry=${encodeURIComponent(context.entryId)}`
  const originalHref = `/results?project=${encodeURIComponent(projectId)}&execution=${encodeURIComponent(entry.originalEvidence.executionId)}&run=${encodeURIComponent(entry.originalEvidence.runId)}&item=${entry.originalEvidence.itemOrdinal}&result=${encodeURIComponent(entry.originalEvidence.resultId)}&repairEntry=${encodeURIComponent(context.entryId)}`
  const rerunResult = record(rerun?.result)
  const rerunHref = rerun && rerunResult
    ? `/results?project=${encodeURIComponent(projectId)}&execution=${encodeURIComponent(rerun.executionId)}&run=${encodeURIComponent(String(rerunResult.run_id))}&item=${Number(rerunResult.execution_item_ordinal)}&result=${encodeURIComponent(String(rerunResult.result_id))}`
    : resultHref
  const lifecycleReferences: EvidenceWorkspaceBlock['references'] = [{ reference: { kind: 'repair', projectId, entryId: context.entryId }, resolution: 'resolved', href: resultHref }]
  if (proposal?.proposalId && proposal?.proposalHash) lifecycleReferences.push({ reference: { kind: 'proposal', projectId, entryId: context.entryId, proposalId: proposal.proposalId, proposalHash: proposal.proposalHash }, resolution: 'resolved', href: resultHref })
  if (decision?.decisionId && decision?.decisionHash) lifecycleReferences.push({ reference: { kind: 'decision', projectId, entryId: context.entryId, proposalId: entry.proposalId, decisionId: decision.decisionId, decisionHash: decision.decisionHash }, resolution: 'resolved', href: resultHref })
  if (supersession?.authorityId && supersession?.authorityHash) lifecycleReferences.push({ reference: { kind: 'supersession', projectId, entryId: context.entryId, proposalId: entry.proposalId, authorityId: supersession.authorityId, authorityHash: supersession.authorityHash }, resolution: 'resolved', href: resultHref })
  const repairedAuthority = record(origin?.resultingDefinitionAuthority)
  if (origin && repairedAuthority && Number.isSafeInteger(origin.testSetRowId)) lifecycleReferences.push({ reference: { kind: 'repair_revision', projectId, entryId: context.entryId, testSetId: repairedAuthority.testSetId, revision: repairedAuthority.testSetRevision, rowId: origin.testSetRowId, definitionId: repairedAuthority.definitionId }, resolution: 'resolved', href: `/tests?project=${encodeURIComponent(projectId)}&testSet=${encodeURIComponent(String(repairedAuthority.testSetId))}&revision=${Number(repairedAuthority.testSetRevision)}&test=${encodeURIComponent(String(repairedAuthority.definitionId))}` })
  const ownerActions: EvidenceWorkspaceAction[] = Array.isArray(raw.nextActions)
    ? raw.nextActions.filter((value: unknown): value is string => typeof value === 'string').map(actionId => ({ actionId, label: actionId.replaceAll('_', ' '), kind: 'governed', owner: 'GovernedRepairWorkflowService', href: resultHref })) : []
  const blocks: EvidenceWorkspaceBlock[] = [{
    blockId: 'selected-repair', kind: 'repair_lifecycle', role: 'primary', tier: 2, scope: { projectId, semanticIdentity: context.entryId }, title: disposition ? 'Completed repair lifecycle' : 'Repair lifecycle', availability: 'available', integrity: raw.integrity === 'valid' ? 'verified' : 'warning',
    claims: [claim('repair-entry', 'Repair entry', context.entryId, 'GovernedRepairWorkflowService'), claim('proposal-id', 'Proposal', entry.proposalId, 'GovernedRepairWorkflowService'), claim('decision', 'Human decision', record(raw.decision)?.decision ?? null, 'GovernedRepairWorkflowService')],
    references: lifecycleReferences, unknowns: [], blockers: readiness?.state === 'refused' ? [String(readiness.code ?? 'operation refused')] : [], limitations: [], actions: ownerActions,
  }, {
    blockId: 'repair-original-result', kind: 'result', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `before:${entry.originalEvidence.resultId}` }, title: 'Original Result', availability: original ? 'available' : 'unavailable', integrity: original ? 'verified' : 'not_evaluated',
    claims: [claim('original-result-id', 'Result ID', entry.originalEvidence.resultId, 'GovernedRepairWorkflowService'), claim('original-result-outcome', 'Overall Result', original?.outcome ?? original?.result ?? null, 'GovernedRepairWorkflowService')],
    references: [{ reference: { kind: 'result', projectId, executionId: entry.originalEvidence.executionId, runId: entry.originalEvidence.runId, itemOrdinal: entry.originalEvidence.itemOrdinal, resultId: entry.originalEvidence.resultId }, resolution: 'resolved', href: originalHref }], unknowns: [], blockers: [], limitations: [], actions: [],
  }, {
    blockId: 'repair-rerun-result', kind: 'result', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `after:${rerun?.executionId ?? context.entryId}` }, title: 'Rerun Result', availability: rerunResult ? 'available' : 'no_evidence', integrity: rerunResult ? 'verified' : 'not_evaluated',
    claims: [claim('rerun-execution', 'Execution', rerun?.executionId ?? null, 'GovernedRepairWorkflowService'), claim('rerun-overall-result', 'Overall Result', record(rerun?.aggregation)?.outcome ?? rerunResult?.outcome ?? null, 'GovernedRepairWorkflowService')], references: rerun?.executionId ? rerunResult ? [{ reference: { kind: 'result', projectId, executionId: rerun.executionId, runId: rerunResult.run_id, itemOrdinal: Number(rerunResult.execution_item_ordinal), resultId: rerunResult.result_id }, resolution: 'resolved', href: rerunHref }] : [{ reference: { kind: 'execution', projectId, executionId: rerun.executionId }, resolution: 'resolved', href: rerunHref }] : [], unknowns: rerun ? rerunResult ? [] : ['The repair execution has no canonical Result yet.'] : ['No repair rerun has been recorded.'], blockers: [], limitations: [], actions: [],
  }, {
    blockId: 'repair-effectiveness', kind: 'bounded_state', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `effectiveness:${comparison?.comparisonId ?? context.entryId}` }, title: 'Bounded repair effectiveness', availability: comparison ? 'available' : 'no_evidence', integrity: comparison ? 'verified' : 'not_evaluated',
    claims: [claim('effectiveness-state', 'Selector effectiveness', comparison?.state ?? null, 'RepairEffectivenessAuthority'), claim('effectiveness-reason', 'Reason', comparison?.reason ?? null, 'RepairEffectivenessAuthority')], references: comparison?.comparisonId && comparison?.evidenceHash ? [{ reference: { kind: 'effectiveness', projectId, entryId: context.entryId, comparisonId: comparison.comparisonId, evidenceHash: comparison.evidenceHash }, resolution: 'resolved', href: resultHref }] : [], unknowns: comparison ? [] : ['No bounded effectiveness comparison has been recorded.'], blockers: [], limitations: ['This bounded selector effectiveness does not replace the rerun Result.'], actions: [],
  }, {
    blockId: 'repair-disposition', kind: 'bounded_state', role: 'supporting', tier: 3, scope: { projectId, semanticIdentity: `disposition:${disposition?.dispositionId ?? context.entryId}` }, title: 'Human disposition', availability: disposition ? 'available' : 'no_evidence', integrity: disposition ? 'verified' : 'not_evaluated',
    claims: [claim('disposition-state', 'Disposition', disposition?.state ?? null, 'GovernedRepairDispositionService'), claim('disposition-action', 'Human action', record(disposition?.decision)?.action ?? null, 'GovernedRepairDispositionService')], references: disposition?.dispositionId && record(disposition?.effectiveness)?.comparisonId ? [{ reference: { kind: 'disposition', projectId, entryId: context.entryId, dispositionId: disposition.dispositionId, comparisonId: record(disposition.effectiveness)!.comparisonId }, resolution: 'resolved', href: resultHref }] : [], unknowns: disposition ? [] : ['No human disposition has been recorded.'], blockers: [], limitations: [], actions: [],
  }]
  return [...blocks, ...exactModels]
}

export async function readCanonicalEvidenceWorkspace(appName: string, query: Record<string, unknown>, resolveProject: ResolveProject, sources: EvidenceWorkspaceSources = defaultSources): Promise<{ status: number; body: unknown }> {
  const project = await resolveProject(appName)
  if (!project) return { status: 404, body: fail('Project not found', 'NOT_FOUND') }
  const context = parseEvidenceWorkspaceContext(query)
  if (!context) return { status: 400, body: fail('Evidence Workspace context is mixed, incomplete, or invalid.', 'INVALID_EVIDENCE_WORKSPACE_CONTEXT') }
  const blocks = [projectBlock(appName, project.appName)]
  const sourceFailures: EvidenceWorkspaceSourceFailure[] = []
  try {
    if (context.kind === 'project') {
      try {
        if (!sources.readReadiness) throw new Error('Application Readiness owner is unavailable.')
        blocks.push(...readinessBlocks(appName, await sources.readReadiness(appName)))
      } catch {
        sourceFailures.push({ source: 'ApplicationReadinessPresenter', code: 'APPLICATION_READINESS_UNAVAILABLE', message: 'Canonical Application Readiness is unavailable.', required: true })
        blocks.push(stateBlock(appName, 'project-readiness-unavailable', 'Application Readiness unavailable', 'unavailable', 'The canonical Application Readiness owner could not be read.'))
      }
      let testTotal: number | null = null
      let evidenceTotal: number | null = null
      try {
        const inventory = record(await sources.readInventory(appName))
        if (!inventory || typeof inventory.total !== 'number') throw new Error('Invalid inventory projection.')
        testTotal = inventory.total
        if (inventory.total > 0) blocks.push({ blockId: 'project-test-inventory', kind: 'evidence_inventory', role: 'contextual', tier: 5, scope: { projectId: appName, semanticIdentity: 'test-inventory' }, title: 'Canonical Test evidence inventory', availability: 'available', integrity: 'verified', claims: [claim('test-set-count', 'Historical Test Set revisions', inventory.total, 'TestSetRepository')], references: [], unknowns: [], blockers: [], limitations: [], actions: [] })
      } catch {
        sourceFailures.push({ source: 'TestSetRepository', code: 'TEST_INVENTORY_UNAVAILABLE', message: 'Canonical Test evidence inventory is unavailable.', required: true })
        blocks.push(stateBlock(appName, 'project-evidence-unavailable', 'Canonical evidence source unavailable', 'unavailable', 'Canonical Test evidence inventory could not be read.'))
      }
      try {
        const inventory = record(await sources.readEvidenceInventory(appName))
        const page = record(inventory?.page)
        if (inventory?.authority !== 'canonical_product' || !page || typeof page.projectTotal !== 'number') throw new Error('Invalid canonical evidence inventory.')
        evidenceTotal = page.projectTotal
        if (evidenceTotal > 0) blocks.push({ blockId: 'project-observation-inventory', kind: 'evidence_inventory', role: 'contextual', tier: 5, scope: { projectId: appName, semanticIdentity: 'observation-inventory' }, title: 'Canonical Observation evidence inventory', availability: 'available', integrity: 'verified', claims: [claim('observation-evidence-count', 'Canonical evidence items', evidenceTotal, 'ApplicationEvidenceInventoryProjection')], references: [], unknowns: [], blockers: [], limitations: ['This inventory does not establish complete application coverage, health, quality, or freshness.'], actions: [] })
      } catch {
        sourceFailures.push({ source: 'ApplicationEvidenceInventoryProjection', code: 'OBSERVATION_INVENTORY_UNAVAILABLE', message: 'Canonical Observation evidence inventory is unavailable.', required: true })
        blocks.push(stateBlock(appName, 'project-observation-unavailable', 'Canonical Observation source unavailable', 'unavailable', 'Canonical Observation evidence inventory could not be read.'))
      }
      if (testTotal === 0 && evidenceTotal === 0) blocks.push(stateBlock(appName, 'project-no-evidence', 'No canonical evidence in the inspected domains', 'no_evidence', 'No canonical Observation evidence or Test Set revision has been recorded for this project.'))
    } else if (context.kind === 'result') {
      try {
        const read = serializeCanonicalExecutionResultsRead(await sources.readResults(appName, context.executionId), appName)
        if (read.kind !== 'ok') throw new Error('Exact execution Results unavailable.')
        const authority = read.projection.execution.definitionAuthority
        if ('scope' in authority) throw new Error('Exact Definition authority is per-item and unavailable.')
        const item = read.projection.items.find(value => value.manifestOrdinal === context.itemOrdinal)
        if (!item) throw new Error('Exact Result item unavailable.')
        try {
          const suite = await verifiedSuiteBlock(appName, read.projection, sources)
          if (suite) blocks.push(suite)
        } catch {
          sourceFailures.push({ source: 'SuiteRepository', code: 'EXACT_SUITE_UNRESOLVED', message: 'The exact accepted Suite revision could not be verified.', required: true })
        }
        let exact: Record<string, any> | null = null
        try {
          exact = record(await sources.readExactDefinition(appName, authority.testSetId, authority.revision, item.definitionId))
          if (!exact) throw new Error('Exact historical Definition did not resolve.')
          const verified: VerifiedHistoricalReferences = { appModels: new Map(), observations: new Map() }
          try {
            const model = await verifyModelReference(appName, authority.modelRowId, authority.modelVersion, null, sources)
            if (model) verified.appModels!.set(modelKey(authority.modelRowId, authority.modelVersion), model)
            else sourceFailures.push({ source: 'AppModelRepository', code: 'EXACT_APP_MODEL_UNRESOLVED', message: 'The exact historical App Model identity could not be verified.', required: true })
          } catch {
            sourceFailures.push({ source: 'AppModelRepository', code: 'EXACT_APP_MODEL_UNAVAILABLE', message: 'The exact historical App Model reader is unavailable.', required: true })
          }
          const provenance = record(record(exact.definition)?.provenance)
          const observationIds = Array.isArray(provenance?.supportingObservationIds)
            ? provenance.supportingObservationIds.filter((value: unknown): value is string => typeof value === 'string' && SAFE_ID.test(value))
            : typeof provenance?.sourceObservationId === 'string' && SAFE_ID.test(provenance.sourceObservationId) ? [provenance.sourceObservationId] : []
          for (const observationId of [...new Set(observationIds)].sort()) {
            try {
              const href = await verifyObservationReference(appName, observationId, sources)
              if (href) verified.observations!.set(observationId, href)
              else sourceFailures.push({ source: 'ObservationRepository', code: 'EXACT_OBSERVATION_UNRESOLVED', message: `The exact historical Observation ${observationId} could not be verified.`, required: true })
            } catch {
              sourceFailures.push({ source: 'ObservationRepository', code: 'EXACT_OBSERVATION_UNAVAILABLE', message: `The exact historical Observation reader failed for ${observationId}.`, required: true })
            }
          }
          blocks.push(...composeResultEvidenceBlocks(appName, context, read.projection, exact, verified))
        } catch (cause) {
          sourceFailures.push({ source: 'TestSetRepository', code: 'EXACT_DEFINITION_UNAVAILABLE', message: cause instanceof Error ? cause.message : 'Exact historical Definition unavailable.', required: true })
          blocks.push(...composeResultEvidenceBlocks(appName, context, read.projection, null))
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Exact execution Results unavailable.'
        sourceFailures.push({ source: 'ExecutionResultProjectionService', code: 'EXACT_RESULT_UNAVAILABLE', message, required: true })
        blocks.push(selectedContextUnavailable(appName, context, message))
      }
    } else {
      try {
        const repair = record(await sources.readRepair(appName, context.entryId))
        if (!repair) throw new Error('Repair source returned an invalid projection.')
        const exactModelBlocks: EvidenceWorkspaceBlock[] = []
        const request = record(record(repair.entry)?.request)
        const seenModels = new Set<string>()
        for (const role of ['source', 'candidate'] as const) {
          const endpoint = record(request?.[role])
          if (!endpoint || !Number.isSafeInteger(endpoint.modelRowId) || endpoint.modelRowId < 1
            || typeof endpoint.modelVersion !== 'string' || typeof endpoint.modelContentHash !== 'string') continue
          const key = modelKey(endpoint.modelRowId, endpoint.modelVersion)
          if (seenModels.has(key)) continue
          seenModels.add(key)
          let verified: { fingerprint: string; href: string } | null = null
          try {
            verified = await verifyModelReference(appName, endpoint.modelRowId, endpoint.modelVersion, endpoint.modelContentHash, sources)
            if (!verified) sourceFailures.push({ source: 'AppModelRepository', code: `EXACT_REPAIR_${role.toUpperCase()}_MODEL_UNRESOLVED`, message: `The exact historical ${role} App Model identity could not be verified.`, required: true })
          } catch {
            sourceFailures.push({ source: 'AppModelRepository', code: `EXACT_REPAIR_${role.toUpperCase()}_MODEL_UNAVAILABLE`, message: `The exact historical ${role} App Model reader is unavailable.`, required: true })
          }
          exactModelBlocks.push(repairModelBlock(appName, role, endpoint, verified))
        }
        blocks.push(...repairBlocks(appName, context, repair, exactModelBlocks))
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Repair lifecycle unavailable.'
        sourceFailures.push({ source: 'GovernedRepairWorkflowService', code: 'REPAIR_CONTEXT_UNAVAILABLE', message, required: true })
        blocks.push(selectedContextUnavailable(appName, context, message))
      }
    }
    const workspace = composeCanonicalEvidenceWorkspace({ project: { projectId: appName, name: project.appName }, context, assembledAt: sources.now(), blocks, sourceFailures })
    return { status: 200, body: ok(workspace) }
  } catch (cause) {
    const code = typeof (cause as { code?: unknown })?.code === 'string' ? String((cause as { code: string }).code) : 'EVIDENCE_WORKSPACE_SOURCE_UNAVAILABLE'
    const status = code.includes('NOT_FOUND') ? 404 : code.includes('INVALID') ? 422 : 503
    return { status, body: fail(cause instanceof Error ? cause.message : 'Canonical Evidence Workspace is unavailable.', code) }
  }
}
