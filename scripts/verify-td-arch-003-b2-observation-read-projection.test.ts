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

import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { sql } from 'kysely'
import { closeDb, getProductDb } from '../src/core/storage/db'
import { openProjectDatabase } from '../src/core/storage/DatabaseFactory'
import { createWorkspace } from '../src/core/workspace/WorkspaceManager'
import { ObservationService } from '../src/core/observation/ObservationService'
import { CRAWL_OBSERVATION_METHOD_VERSIONS } from '../src/core/observation/ObservationTypes'
import { AppModelRepository } from '../src/core/storage/repositories/AppModelRepository'
import type { AppModelCandidate } from '../src/core/onboarding/types'
import {
  ApplicationEvidenceInventoryProjection,
  ObservationReadProjectionService,
} from '../src/core/observation/ObservationReadProjectionService'
import { readApplicationEvidenceInventory } from '../forge-ui/server/context/ApplicationEvidenceInventoryController'
import { readExactObservation } from '../forge-ui/server/context/ExactHistoricalEvidenceController'

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-td-arch-003-b2-'))
const PROJECT = 'b2-product'
const START = '2026-08-12T14:00:00.000Z'
const END = '2026-08-12T14:00:01.000Z'
let service: ObservationService
let runId = ''
let observationId = ''
let gapId = ''
let linkedArtifactId = ''
let modelRowId = 0

const boundary = (completion: 'complete' | 'partial') => ({
  schemaVersion: 'forge-observation-boundary/v1' as const,
  kind: 'document' as const,
  scope: { acquisitionKind: 'web_crawl' },
  startedAt: START,
  endedAt: END,
  completion,
  policyId: 'forge.b2-boundary',
  policyVersion: '1',
})

before(async () => {
  await openProjectDatabase(createWorkspace(ROOT))
  service = new ObservationService(PROJECT, ROOT, {
    producerInstanceId: '22222222-2222-4222-8222-222222222222',
  })
  const run = await service.startRun({
    operationId: 'b2-operation', producer: 'forge.crawler', producerVersion: '1',
    acquisitionKind: 'web_crawl', startedAt: START,
    policyId: 'forge.b2-acquisition', policyVersion: '1',
    acquisitionPlan: { target: 'https://example.invalid/' },
  })
  runId = run.value.observationRunId
  const observation = await service.recordObservation({
    observationRunId: runId, projectId: PROJECT, producer: 'forge.crawler', producerVersion: '1',
    method: 'browser_dom_inspection', methodVersion: CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
    subjectId: 'inventory-page', predicate: 'page.discovered', outcome: 'present',
    observedValue: { urlPattern: '/inventory.html', elementCount: 1, fingerprint: 'dom-digest' },
    boundary: boundary('complete'), capturedAt: END, idempotencyKey: 'b2-page',
  })
  observationId = observation.value.observationId
  const gap = await service.recordGap({
    observationRunId: runId, projectId: PROJECT, producer: 'forge.crawler', producerVersion: '1',
    intendedMethod: 'browser_dom_inspection', intendedMethodVersion: CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
    intendedSubjectId: 'checkout-page', intendedPredicate: 'page.discovered',
    boundary: boundary('partial'), reason: 'not_reached', occurredAt: END,
    idempotencyKey: 'b2-gap', safeMessage: 'Checkout was not reached.',
  })
  gapId = gap.value.gapId
  const linkedArtifact = await service.persistArtifact({
    observationRunId: runId, projectId: PROJECT, mediaType: 'application/json',
    content: '{"status":"linked"}', sensitivityClass: 'internal', redactionState: 'not_required',
    capturedAt: END, retentionClass: 'standard_diagnostic',
    retentionPolicyId: 'forge.b2-retention', retentionPolicyVersion: '1',
  })
  linkedArtifactId = linkedArtifact.value.artifactId
  await service.recordObservation({
    observationRunId: runId, projectId: PROJECT, producer: 'forge.crawler', producerVersion: '1',
    method: 'browser_dom_inspection', methodVersion: CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
    subjectId: 'cart-page', predicate: 'page.discovered', outcome: 'present',
    observedValue: { urlPattern: '/cart.html', elementCount: 1, fingerprint: 'cart-digest' },
    boundary: boundary('complete'), capturedAt: END, idempotencyKey: 'b2-cart',
    artifactIds: [linkedArtifactId],
  })
  await service.persistArtifact({
    observationRunId: runId, projectId: PROJECT, mediaType: 'application/json',
    content: '{"status":"safe"}', sensitivityClass: 'internal', redactionState: 'not_required',
    capturedAt: END, retentionClass: 'standard_diagnostic',
    retentionPolicyId: 'forge.b2-retention', retentionPolicyVersion: '1',
  })
  await service.terminalizeRun({
    observationRunId: runId, lifecycle: 'completed', completeness: 'partial', terminalAt: END,
    safeReasonCode: 'coverage_incomplete', safeMessage: 'Partial crawl.',
  })
  const candidate: AppModelCandidate = {
    schemaVersion: '2.0', generatedAt: END, generatedBy: 'engine',
    app: {
      name: PROJECT, displayName: PROJECT, baseUrl: 'https://example.invalid', appType: 'web-ui',
      spaConfig: null, evidenceState: 'crawled',
      crawlMetadata: {
        crawlConfigHash: 'b2', crawledAt: END, crawledBy: 'engine', crawlDurationMs: 1,
        pagesBudget: 2, pagesDiscovered: 2, pagesSkipped: 0, aiBudgetStatus: 'within-budget', crawlDiagnostics: null,
      },
    },
    roles: [],
    pages: [{
      id: 'inventory-page', displayName: 'Inventory', urlPattern: '/inventory.html',
      urlPatternType: 'exact', fingerprint: 'dom-digest', fingerprintBasis: 'url+dom-hash',
      appType: 'web-ui', accessibleByRoles: [], isAuthPage: false, elements: [],
    }],
    flows: [], endpoints: null, api: null, diff: null,
  }
  const committed = await new AppModelRepository().commitCandidate(candidate, 'b2-model', {
    projectId: PROJECT,
    observationRunId: runId,
    observations: [{ observationId, claimKey: 'page:inventory-page', supportRole: 'basis' }],
    subjects: [{ canonicalSubjectId: 'inventory-page', observationId, claimKey: 'subject.exists', supportRole: 'basis' }],
    gaps: [{ gapId, claimKey: 'application.coverage', supportRole: 'bounds' }],
    characterizationPolicyId: 'forge.crawl-observation-characterization',
    characterizationPolicyVersion: '1',
    linkedAt: END,
  })
  modelRowId = committed.committed.rowId
})

after(async () => {
  await closeDb()
  fs.rmSync(ROOT, { recursive: true, force: true })
})

test('canonical run, Observation, Gap, safe artifact metadata, warnings, and unknown operation project read-only truth', async () => {
  const projection = await new ObservationReadProjectionService().readProject(PROJECT)
  assert.equal(projection.authority, 'canonical_product')
  assert.equal(projection.runs[0].runId, runId)
  assert.ok(projection.observations.some(item => item.observationId === observationId))
  assert.equal(projection.gaps[0].gapId, gapId)
  assert.equal(projection.artifacts.length, 2)
  assert.equal(Object.hasOwn(projection.artifacts[0], 'storageKey'), false)
  assert.equal(Object.hasOwn(projection.artifacts[0], 'content'), false)
  assert.ok(projection.warnings.some(item => item.code === 'orphan_artifact'))
  assert.equal(projection.support[0].modelRowId, modelRowId)
  assert.deepEqual(projection.support[0].observations.map(item => item.observationId), [observationId])
  assert.deepEqual(projection.support[0].gaps.map(item => item.gapId), [gapId])
  assert.equal(await new ObservationReadProjectionService().readOperation(PROJECT, 'unknown-execution'), null)
})

test('exact Observation read returns an older run identity without substituting the newer run', async () => {
  const exactProject = 'exact-history-project'
  const exactService = new ObservationService(exactProject, ROOT, {
    producerInstanceId: '66666666-6666-4666-8666-666666666666',
  })
  const recordRun = async (label: string, startedAt: string, endedAt: string) => {
    const run = await exactService.startRun({
      operationId: `exact-${label}`, producer: 'forge.crawler', producerVersion: '1',
      acquisitionKind: 'web_crawl', startedAt,
      policyId: 'forge.b2-acquisition', policyVersion: '1',
      acquisitionPlan: { target: `https://${label}.invalid/` },
    })
    const observation = await exactService.recordObservation({
      observationRunId: run.value.observationRunId, projectId: exactProject,
      producer: 'forge.crawler', producerVersion: '1',
      method: 'browser_dom_inspection', methodVersion: CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
      subjectId: `${label}-page`, predicate: 'page.discovered', outcome: 'present',
      observedValue: { urlPattern: `/${label}`, elementCount: 1, fingerprint: `${label}-digest` },
      boundary: {
        schemaVersion: 'forge-observation-boundary/v1', kind: 'document',
        scope: { acquisitionKind: 'web_crawl' }, startedAt, endedAt, completion: 'complete',
        policyId: 'forge.b2-boundary', policyVersion: '1',
      },
      capturedAt: endedAt, idempotencyKey: `exact-${label}`,
    })
    await exactService.terminalizeRun({
      observationRunId: run.value.observationRunId, lifecycle: 'completed',
      completeness: 'complete', terminalAt: endedAt,
    })
    return { runId: run.value.observationRunId, observationId: observation.value.observationId }
  }

  const older = await recordRun('older', '2026-08-12T15:00:00.000Z', '2026-08-12T15:00:01.000Z')
  const newer = await recordRun('newer', '2026-08-12T16:00:00.000Z', '2026-08-12T16:00:01.000Z')
  const reader = new ObservationReadProjectionService()
  const exactOlder = await reader.readExactObservation(exactProject, older.observationId)
  assert.equal(exactOlder.kind, 'ok')
  if (exactOlder.kind === 'ok') {
    assert.deepEqual(
      [exactOlder.observation.observationId, exactOlder.observation.projectId, exactOlder.observation.runId, exactOlder.observation.historyPosition],
      [older.observationId, exactProject, older.runId, 'historical'],
    )
    assert.notEqual(exactOlder.observation.observationId, newer.observationId)
  }
  const exactNewer = await reader.readExactObservation(exactProject, newer.observationId)
  assert.equal(exactNewer.kind, 'ok')
  if (exactNewer.kind === 'ok') assert.equal(exactNewer.observation.historyPosition, 'latest')
  assert.deepEqual(await reader.readExactObservation('another-project', older.observationId), { kind: 'not_found' })
  assert.deepEqual(await reader.readExactObservation(exactProject, 'missing-observation'), { kind: 'not_found' })
  assert.deepEqual(await reader.readExactObservation(exactProject, '../latest'), { kind: 'identity_mismatch' })
})

test('corrupt exact Observation artifact membership fails integrity and maps to HTTP 422', async () => {
  const integrityProject = 'exact-integrity-project'
  const integrityService = new ObservationService(integrityProject, ROOT, {
    producerInstanceId: '77777777-7777-4777-8777-777777777777',
  })
  const integrityStart = '2026-08-12T17:00:00.000Z'
  const integrityEnd = '2026-08-12T17:00:01.000Z'
  const run = await integrityService.startRun({
    operationId: 'exact-integrity', producer: 'forge.crawler', producerVersion: '1',
    acquisitionKind: 'web_crawl', startedAt: integrityStart,
    policyId: 'forge.b2-acquisition', policyVersion: '1',
    acquisitionPlan: { target: 'https://integrity.invalid/' },
  })
  const artifact = await integrityService.persistArtifact({
    observationRunId: run.value.observationRunId, projectId: integrityProject,
    mediaType: 'application/json', content: '{"status":"bound"}',
    sensitivityClass: 'internal', redactionState: 'not_required',
    capturedAt: integrityEnd, retentionClass: 'standard_diagnostic',
    retentionPolicyId: 'forge.b2-retention', retentionPolicyVersion: '1',
  })
  const observation = await integrityService.recordObservation({
    observationRunId: run.value.observationRunId, projectId: integrityProject,
    producer: 'forge.crawler', producerVersion: '1',
    method: 'browser_dom_inspection', methodVersion: CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
    subjectId: 'integrity-page', predicate: 'page.discovered', outcome: 'present',
    observedValue: { urlPattern: '/integrity', elementCount: 1, fingerprint: 'integrity-digest' },
    boundary: {
      schemaVersion: 'forge-observation-boundary/v1', kind: 'document',
      scope: { acquisitionKind: 'web_crawl' }, startedAt: integrityStart, endedAt: integrityEnd,
      completion: 'complete', policyId: 'forge.b2-boundary', policyVersion: '1',
    },
    capturedAt: integrityEnd, idempotencyKey: 'exact-integrity-observation',
    artifactIds: [artifact.value.artifactId],
  })
  await integrityService.terminalizeRun({
    observationRunId: run.value.observationRunId, lifecycle: 'completed',
    completeness: 'complete', terminalAt: integrityEnd,
  })
  const reader = new ObservationReadProjectionService()
  assert.equal((await reader.readExactObservation(integrityProject, observation.value.observationId)).kind, 'ok')

  await sql`DROP TRIGGER observation_artifact_links_immutable_delete`.execute(getProductDb())
  await getProductDb().deleteFrom('observation_artifact_links')
    .where('observation_id', '=', observation.value.observationId).execute()
  const corrupted = await reader.readExactObservation(integrityProject, observation.value.observationId)
  assert.equal(corrupted.kind, 'integrity_invalid')

  const response = await readExactObservation(
    integrityProject,
    observation.value.observationId,
    async () => ({ appName: integrityProject }),
    {
      readAppModel: async () => ({ kind: 'not_found' }),
      readObservationProjection: async () => ({ runs: [], observations: [] }),
      readObservation: async () => corrupted,
    },
  )
  assert.equal(response.status, 422)
  assert.equal((response.body as any).code, 'EXACT_OBSERVATION_INTEGRITY_INVALID')
})

test('missing artifact metadata is warned without repairing persistence', async () => {
  await sql`PRAGMA foreign_keys = OFF`.execute(getProductDb())
  await sql`DROP TRIGGER observation_artifacts_immutable_delete`.execute(getProductDb())
  await getProductDb().deleteFrom('observation_artifacts').where('artifact_id', '=', linkedArtifactId).execute()
  await sql`DROP TRIGGER app_model_observation_support_immutable_update`.execute(getProductDb())
  await sql`DROP TRIGGER app_model_observation_support_closed_insert`.execute(getProductDb())
  await sql`DROP TRIGGER app_model_gap_support_immutable_update`.execute(getProductDb())
  await sql`PRAGMA ignore_check_constraints = ON`.execute(getProductDb())
  await getProductDb().updateTable('app_model_observation_support').set({
    observation_id: '33333333-3333-4333-8333-333333333333',
    support_role: 'unsupported_role',
  }).where('model_row_id', '=', modelRowId).execute()
  await getProductDb().insertInto('app_model_observation_support').values({
    model_row_id: modelRowId, project_id: PROJECT,
    observation_id: '33333333-3333-4333-8333-333333333333',
    claim_key: 'page:inventory-page', support_role: 'basis',
    characterization_policy_id: 'forge.crawl-observation-characterization',
    characterization_policy_version: '1', linked_at: END,
  }).execute()
  await getProductDb().updateTable('app_model_gap_support').set({
    gap_id: '55555555-5555-4555-8555-555555555555',
  }).where('model_row_id', '=', modelRowId).execute()
  await sql`PRAGMA ignore_check_constraints = OFF`.execute(getProductDb())
  await sql`PRAGMA foreign_keys = ON`.execute(getProductDb())
  const projection = await new ObservationReadProjectionService().readProject(PROJECT)
  assert.ok(projection.warnings.some(item => item.code === 'missing_artifact'
    && item.referenceId === linkedArtifactId))
  assert.ok(projection.warnings.some(item => item.code === 'missing_observation'))
  assert.ok(projection.warnings.some(item => item.code === 'missing_gap'))
  assert.ok(projection.warnings.some(item => item.code === 'unknown_support_role'))
  assert.ok(projection.warnings.some(item => item.code === 'broken_support'))
  assert.ok(projection.warnings.some(item => item.code === 'conflicting_support'))
})

test('application inventory uses exact canonical Observation identity without creating evidence', async () => {
  const before = fs.readFileSync(path.join(ROOT, '.forge', 'forge.db'))
  const inventory = await new ApplicationEvidenceInventoryProjection().read(PROJECT)
  const item = inventory.evidence.find(entry => entry.id === observationId)
  assert.equal(item?.sourceObservation.id, observationId)
  assert.equal(inventory.authority, 'canonical_product')
  const after = fs.readFileSync(path.join(ROOT, '.forge', 'forge.db'))
  assert.deepEqual(after, before)
})

test('UI evidence controller transports the core projection without legacy composition', async () => {
  const marker = { authority: 'canonical_product', canonicalRunCount: 1, evidence: [{ id: observationId }] }
  const result = await readApplicationEvidenceInventory(
    PROJECT,
    { limit: '25' },
    async () => ({ appName: PROJECT }),
    { readApplicationEvidenceInventory: async () => marker } as any,
  )
  assert.equal(result.status, 200)
  assert.deepEqual((result.body as any).data, marker)

  const presenter = fs.readFileSync(path.join(process.cwd(), 'forge-ui/server/registry/ApplicationModelHistoryPresenter.ts'), 'utf8')
  const routes = fs.readFileSync(path.join(process.cwd(), 'forge-ui/server/routes/projects.ts'), 'utf8')
  const crawl = fs.readFileSync(path.join(process.cwd(), 'forge-ui/server/routes/crawl.ts'), 'utf8')
  assert.doesNotMatch(presenter, /ObservationStore|observationStore/)
  assert.match(routes, /readApplicationEvidenceInventory/)
  assert.match(crawl, /readObservationHistoryView/)
})

test('legacy compatibility is isolated, labelled, and cannot override canonical preference', async () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'forge-ui/server/registry/LegacyObservationCompatibilityProjection.ts'), 'utf8')
  const crawl = fs.readFileSync(path.join(process.cwd(), 'forge-ui/server/routes/crawl.ts'), 'utf8')
  assert.match(source, /authority: 'legacy_compatibility'/)
  assert.match(crawl, /compatibility\/observations/)
  assert.doesNotMatch(crawl, /history\.observations\.length > 0/)
  assert.doesNotMatch(source, /complete\(|start\(|writeFile|appendFile/)
})
