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

import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { after, test } from 'node:test'
import express from 'express'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { WorkspacePreservationReceipt } from '../src/core/storage/WorkspacePreservationService'
import { readStorageOperationalReadiness } from '../forge-ui/server/context/StorageOperationalReadinessController'
import { readStorageCertificationEvidence } from '../forge-ui/server/registry/StorageCertificationEvidence'
import { presentStorageOperationalReadiness } from '../forge-ui/server/registry/StorageOperationalReadinessPresenter'
import { readProductSourceIdentity } from '../forge-ui/server/registry/ProductSourceIdentity'
import projectsRouter from '../forge-ui/server/routes/projects'
import { StorageOperationalReadiness } from '../forge-ui/src/components/application-workspace/StorageOperationalReadiness'

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s3-'))
after(() => fs.rmSync(temporary, { recursive: true, force: true }))

const evidence = readStorageCertificationEvidence()
assert.ok(evidence, 'the tracked Slice-2 certification must validate')
const liveTest = process.env.FORGE_M7_SLICE3_LIVE === '1' ? test : test.skip
const currentSourceIdentity = readProductSourceIdentity()
assert.ok(currentSourceIdentity, 'current Product source identity must be observable')

function getRoute(urlPath: string): Promise<{ status: number; json: any }> {
  const app = express()
  app.use('/api/v1/projects', projectsRouter)
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const address = server.address() as { port: number }
        const response = await fetch(`http://127.0.0.1:${address.port}${urlPath}`)
        const json = await response.json()
        server.close(() => resolve({ status: response.status, json }))
      } catch (cause) {
        server.close(() => reject(cause))
      }
    })
  })
}

function receipt(overrides: Partial<WorkspacePreservationReceipt> = {}): WorkspacePreservationReceipt {
  const databasePath = evidence.source.databasePath
  return {
    schemaVersion: 'forge-workspace-preservation/v1', timestamp: '2026-09-23T12:00:00.000Z',
    productSourceSha: evidence.product.preservationSourceHead,
    productSourceSnapshotSha256: evidence.product.preservationSourceSnapshotSha256,
    appName: evidence.appName, projectRegistryMembership: true,
    registryEntry: { appName: evidence.appName, url: 'https://www.saucedemo.com', workspacePath: evidence.source.workspacePath, createdAt: '2026-01-01T00:00:00.000Z', lastOpenedAt: '2026-01-01T00:00:00.000Z' },
    registryEntrySha256: '1'.repeat(64), canonicalProjectsRoot: path.dirname(evidence.source.workspacePath),
    workspaceResolver: { identity: 'WorkspaceResolver', version: '1' }, normalizedWorkspaceRoot: evidence.source.workspacePath,
    workspaceContainment: 'within_canonical_root', canonicalDatabasePath: databasePath, backend: 'native-sqlite', sqliteRuntimeVersion: '3', databaseExists: true,
    components: {
      database: { path: databasePath, exists: true, required: true, byteSize: 1, modifiedAt: null, sha256: evidence.source.databaseSha256, fileIdentity: null },
      wal: { path: `${databasePath}-wal`, exists: true, required: false, byteSize: 0, modifiedAt: null, sha256: evidence.source.walSha256, fileIdentity: null },
      shm: { path: `${databasePath}-shm`, exists: true, required: false, byteSize: 1, modifiedAt: null, sha256: evidence.source.shmSha256, fileIdentity: null },
    },
    journalMode: 'wal', migrationNames: Array.from({ length: 25 }, (_, index) => index === 24 ? evidence.source.migrationName : `${String(index + 1).padStart(3, '0')}_migration`),
    migrationHistorySha256: evidence.source.migrationHistorySha256, migrationHistoryRecognized: true, canonicalTables: [],
    quiescence: 'EXTERNAL_WRITER_UNRESOLVED', registryPathConsistency: 'MATCH',
    sourceStability: { stable: true, classification: 'UNCHANGED', semanticMutation: 'NO', authoritativeContentMutation: false, metadataChanged: false, before: [], after: [] },
    rawPreservation: { status: 'blocked', destination: null, components: [] },
    logicalSnapshot: { status: 'not_requested', path: null, sha256: null, integrity: null, migrationNames: [], migrationHistorySha256: null, canonicalTables: [] },
    blockers: [{ code: 'ACTIVE_WRITER_UNRESOLVED', message: 'External writer exclusion is not proven.' }],
    safeNextAction: 'Retain the logical snapshot as disposable evidence; exercise raw recovery only after a separately approved live maintenance gate exists.',
    classification: 'ACTIVE_WRITER_UNRESOLVED',
    ...overrides,
  }
}

test('tracked certification is exact, source-bound owner evidence', () => {
  assert.equal(evidence.schemaVersion, 'forge-storage-certification/v1')
  assert.equal(evidence.source.migrationCount, 25)
  assert.equal(evidence.upgrade.targetMigrationCount, 41)
  assert.equal(evidence.productReads.historicalInvalidClassification, 'PRESERVED_HISTORICAL_INVALID')
  assert.equal(evidence.productReads.historicalInvalidPolicyFingerprint, 'cb7422a4ecee1e3279f67e85a5f13e3d29064beb3e369bb5aee9fb9fb81d008f')
  assert.equal(evidence.productReads.repairContext, 'TRUTHFUL_ABSENCE')
  assert.match(evidence.evidenceSha256, /^[a-f0-9]{64}$/)
})

test('historical-invalid policy drift invalidates the certification binding', () => {
  const driftedPolicy = path.join(temporary, 'drifted-policy.json')
  fs.writeFileSync(driftedPolicy, JSON.stringify({ schemaVersion: 'forge-historical-invalid-app-model-preservation/v1', evidenceFingerprint: '0'.repeat(64), source: { databaseSha256: evidence.preservation.logicalSnapshot.sha256, migrationCount: 25, lastMigration: evidence.source.migrationName } }))
  const certificatePath = path.resolve('docs/configuration/baselines/m7-slice2-saucedemo-storage-certification-v1.json')
  assert.equal(readStorageCertificationEvidence(certificatePath, driftedPolicy), null)
})

test('contradictory aggregate PASS evidence is rejected before presentation', () => {
  const certificatePath = path.resolve('docs/configuration/baselines/m7-slice2-saucedemo-storage-certification-v1.json')
  const failedIndependentPath = path.join(temporary, 'contradictory-independent-upgrade.json')
  fs.writeFileSync(failedIndependentPath, JSON.stringify({ ...evidence, evidenceSha256: undefined, upgrade: { ...evidence.upgrade, first: { ...evidence.upgrade.first, status: 'failed' } } }))
  assert.equal(readStorageCertificationEvidence(failedIndependentPath), null)
  const failedCanonicalPath = path.join(temporary, 'contradictory-canonical-suite.json')
  fs.writeFileSync(failedCanonicalPath, JSON.stringify({ ...evidence, evidenceSha256: undefined, review: { ...evidence.review, canonicalSuite: '0/3315' } }))
  assert.equal(readStorageCertificationEvidence(failedCanonicalPath), null)
  assert.ok(readStorageCertificationEvidence(certificatePath))
})

test('no selection and unknown project fail before storage inspection', async () => {
  let calls = 0
  const port = { capture: async () => { calls += 1; return receipt() } }
  const missing = await readStorageOperationalReadiness('', port, evidence, currentSourceIdentity)
  const unknown = await readStorageOperationalReadiness('definitely-not-a-registered-forge-project', port, evidence, currentSourceIdentity)
  assert.equal(missing.status, 400)
  assert.equal(unknown.status, 404)
  assert.equal(calls, 0)
})

test('selection refuses stale registry, missing database, and unsupported backend', () => {
  const cases: Array<[string, WorkspacePreservationReceipt]> = [
    ['STALE_REGISTRY_METADATA', receipt({ registryPathConsistency: 'STALE_REGISTRY_METADATA', classification: 'STALE_REGISTRY_METADATA' })],
    ['DATABASE_NOT_FOUND', receipt({ databaseExists: false, classification: 'DATABASE_NOT_FOUND' })],
    ['UNSUPPORTED_STORAGE_BACKEND', receipt({ backend: 'postgres', classification: 'UNSUPPORTED_STORAGE_BACKEND' })],
  ]
  for (const [classification, input] of cases) {
    const result = presentStorageOperationalReadiness(input, evidence)
    assert.equal(result.dimensions.selection.status, 'BLOCKED', classification)
    assert.equal(result.aggregate.status, 'BLOCKED', classification)
    assert.notEqual(result.dimensions.cutoverEligibility.status, 'READY', classification)
  }
})

test('preservation and integrity hostile states fail closed without hiding classifications', () => {
  const cases: Array<[string, Partial<WorkspacePreservationReceipt>]> = [
    ['SQLITE_SIDECAR_INCOHERENT', { classification: 'SQLITE_SIDECAR_INCOHERENT' }],
    ['ACTIVE_WRITER_UNRESOLVED', { classification: 'ACTIVE_WRITER_UNRESOLVED', quiescence: 'ACTIVE_PRODUCT_WRITER', migrationHistoryRecognized: false }],
    ['SOURCE_CHANGED_DURING_CAPTURE', { classification: 'SOURCE_CHANGED_DURING_CAPTURE', sourceStability: { stable: false, classification: 'SOURCE_CHANGED_DURING_CAPTURE', semanticMutation: 'UNKNOWN', authoritativeContentMutation: true, metadataChanged: true, before: [], after: [] } }],
    ['MIGRATION_HISTORY_UNRECOGNIZED', { classification: 'MIGRATION_HISTORY_UNRECOGNIZED', migrationHistoryRecognized: false }],
    ['SQLITE_INTEGRITY_FAILED', { classification: 'SQLITE_INTEGRITY_FAILED' }],
  ]
  for (const [classification, overrides] of cases) {
    const input = receipt({ ...overrides, blockers: [{ code: classification as any, message: classification }] })
    const result = presentStorageOperationalReadiness(input, evidence)
    assert.equal(result.dimensions.preservation.status, 'BLOCKED', classification)
    assert.notEqual(result.dimensions.integrity.status, 'READY', classification)
    assert.equal(result.dimensions.cutoverEligibility.status, 'BLOCKED', classification)
  }
})

test('missing, malformed, failed, and source-mismatched certification never become ready', () => {
  const malformedPath = path.join(temporary, 'malformed.json')
  fs.writeFileSync(malformedPath, JSON.stringify({ ...evidence, productReads: { ...evidence.productReads, status: 'failed' }, evidenceSha256: undefined }))
  assert.equal(readStorageCertificationEvidence(malformedPath), null)
  const missing = presentStorageOperationalReadiness(receipt(), null)
  assert.equal(missing.dimensions.upgrade.status, 'UNKNOWN')
  assert.equal(missing.dimensions.productReads.status, 'UNKNOWN')
  const mismatchReceipt = receipt({ components: { ...receipt().components, database: { ...receipt().components.database!, sha256: '0'.repeat(64) } } })
  const mismatch = presentStorageOperationalReadiness(mismatchReceipt, evidence)
  assert.equal(mismatch.sourceBinding.state, 'MISMATCH')
  assert.notEqual(mismatch.dimensions.upgrade.status, 'READY')
  assert.notEqual(mismatch.dimensions.productReads.status, 'READY')
  assert.equal(mismatch.dimensions.cutoverEligibility.status, 'BLOCKED')
})

test('source-bound upgrade and Product-read failures remain BLOCKED with exact classifications', () => {
  const failedUpgrade = { ...evidence, upgrade: { ...evidence.upgrade, status: 'failed' as const, failureClassification: 'DISPOSABLE_UPGRADE_FAILED' } }
  const upgradeResult = presentStorageOperationalReadiness(receipt(), failedUpgrade)
  assert.equal(upgradeResult.dimensions.upgrade.status, 'BLOCKED')
  assert.equal(upgradeResult.dimensions.upgrade.classification, 'DISPOSABLE_UPGRADE_FAILED')
  const failedReads = { ...evidence, productReads: { ...evidence.productReads, status: 'failed' as const, failureClassification: 'PRODUCT_READ_CERTIFICATION_FAILED' } }
  const readsResult = presentStorageOperationalReadiness(receipt(), failedReads)
  assert.equal(readsResult.dimensions.productReads.status, 'BLOCKED')
  assert.equal(readsResult.dimensions.productReads.classification, 'PRODUCT_READ_CERTIFICATION_FAILED')
})

test('bound certification preserves historical-invalid and truthful repair absence semantics', () => {
  const result = presentStorageOperationalReadiness(receipt(), evidence)
  assert.equal(result.sourceBinding.state, 'BOUND')
  assert.equal(result.sourceBinding.authorityClassification, 'M7_SLICE_2_CLOSED')
  assert.equal(result.sourceBinding.frozenCheckpointSha256, '81c07b39b41c6aa4fc396aefd8d96dd49f6c95f29c0d2ae1f6157f4edc7fdf99')
  assert.equal(result.dimensions.selection.status, 'READY')
  assert.equal(result.dimensions.integrity.status, 'READY')
  assert.equal(result.dimensions.upgrade.status, 'READY')
  assert.equal(result.dimensions.productReads.status, 'READY')
  assert.equal(result.preservationEvidence.rawPreservation, 'blocked')
  assert.equal(result.preservationEvidence.logicalSnapshot, 'passed')
  assert.equal(result.integrityEvidence.quickCheck, 'ok')
  assert.equal(result.integrityEvidence.foreignKeyViolationCount, 0)
  assert.equal(result.upgradeEvidence.independentPasses, 2)
  assert.equal(result.productReadEvidence.resultContext, '4/4')
  assert.equal(result.historicalState.invalidClassification, 'PRESERVED_HISTORICAL_INVALID')
  assert.match(result.historicalState.explanation, /not a validity waiver/)
  assert.equal(result.historicalState.repairContext, 'TRUTHFUL_ABSENCE')
  assert.equal(result.dimensions.preservation.status, 'BLOCKED')
  assert.equal(result.dimensions.cutoverEligibility.status, 'BLOCKED')
  assert.equal(result.aggregate.status, 'BLOCKED')
})

test('operator view renders exact authority, owner detail, blocker, and safe action', () => {
  const assessment = presentStorageOperationalReadiness(receipt(), evidence)
  const html = renderToStaticMarkup(React.createElement(StorageOperationalReadiness, { readModel: assessment }))
  for (const expected of [
    'Storage Operational Readiness', 'M7_SLICE_2_CLOSED', 'selected-live-readonly',
    'EXTERNAL_WRITER_UNRESOLVED', 'quick_check: ok', '025_historical_observation_import',
    '041_repair_workflow_entry', 'PRESERVED_HISTORICAL_INVALID', 'TRUTHFUL_ABSENCE',
    'ACTIVE_WRITER_UNRESOLVED', 'Safest non-mutating next action',
  ]) assert.match(html, new RegExp(expected))
})

test('aggregate never exceeds any required blocked or unknown dimension', () => {
  const blocked = presentStorageOperationalReadiness(receipt(), evidence)
  assert.equal(blocked.aggregate.status, 'BLOCKED')
  const unknown = presentStorageOperationalReadiness(receipt({ classification: 'PRESERVATION_READY', blockers: [], rawPreservation: { status: 'passed', destination: 'disposable', components: [] } }), null)
  assert.equal(unknown.dimensions.preservation.status, 'READY')
  assert.equal(unknown.aggregate.status, 'BLOCKED')
  assert.equal(unknown.dimensions.cutoverEligibility.status, 'BLOCKED')
})

test('current Product source identity is required and stale certification provenance is never replayed', async () => {
  let calls = 0
  const port = { capture: async () => { calls += 1; return receipt() } }
  const result = await readStorageOperationalReadiness('saucedemo', port, evidence, null)
  assert.equal(result.status, 503)
  assert.equal((result.body as any).code, 'PRODUCT_SOURCE_IDENTITY_UNAVAILABLE')
  assert.equal(calls, 0)
})

liveTest('registered saucedemo runtime assessment is bound, non-mutating, and blocked only for live preservation', async () => {
  const result = await readStorageOperationalReadiness('saucedemo', undefined, undefined, currentSourceIdentity)
  assert.equal(result.status, 200)
  const envelope = result.body as { data: ReturnType<typeof presentStorageOperationalReadiness> }
  const assessment = envelope.data
  assert.equal(assessment.selectedProject, 'saucedemo')
  assert.equal(assessment.storage.backend, 'native-sqlite')
  assert.equal(assessment.storage.migration.count, 25)
  assert.equal(assessment.sourceBinding.state, 'BOUND')
  assert.equal(assessment.dimensions.selection.status, 'READY')
  assert.equal(assessment.dimensions.preservation.classification, 'ACTIVE_WRITER_UNRESOLVED')
  assert.equal(assessment.dimensions.integrity.status, 'READY')
  assert.equal(assessment.dimensions.upgrade.status, 'READY')
  assert.equal(assessment.dimensions.productReads.status, 'READY')
  assert.equal(assessment.dimensions.cutoverEligibility.status, 'BLOCKED')
  assert.match(assessment.safeNextAction, /separately approved live maintenance gate/)
})

liveTest('operator route transports the bounded assessment and refuses unknown selection', async () => {
  process.env.FORGE_PRODUCT_SOURCE_SHA = currentSourceIdentity.productSourceSha
  process.env.FORGE_PRODUCT_SOURCE_SNAPSHOT_SHA256 = currentSourceIdentity.productSourceSnapshotSha256
  process.env.FORGE_PRODUCT_SOURCE_FILE_COUNT = String(currentSourceIdentity.sourceFileCount)
  const selected = await getRoute('/api/v1/projects/saucedemo/storage-readiness')
  assert.equal(selected.status, 200)
  assert.equal(selected.json.data.schemaVersion, 'forge-storage-operational-readiness/v1')
  assert.equal(selected.json.data.dimensions.cutoverEligibility.status, 'BLOCKED')
  const unknown = await getRoute('/api/v1/projects/definitely-not-registered/storage-readiness')
  assert.equal(unknown.status, 404)
  assert.equal(unknown.json.code, 'PROJECT_NOT_REGISTERED')
  delete process.env.FORGE_PRODUCT_SOURCE_SHA
  delete process.env.FORGE_PRODUCT_SOURCE_SNAPSHOT_SHA256
  delete process.env.FORGE_PRODUCT_SOURCE_FILE_COUNT
})
