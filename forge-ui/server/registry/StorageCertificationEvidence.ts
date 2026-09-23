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

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface StorageCertificationEvidence {
  schemaVersion: 'forge-storage-certification/v1'
  evidenceId: string
  certifiedAt: string
  appName: string
  authority: {
    classification: 'M7_SLICE_2_CLOSED'
    mergeCommit: string
    approvedProductHead: string
    frozenCheckpointSha256: string
    independentReview: 'PASS'
  }
  product: {
    approvedHead: string
    frozenCheckpointSha256: string
    preservationSourceHead: string
    preservationSourceSnapshotSha256: string
  }
  source: {
    workspacePath: string
    databasePath: string
    backend: 'native-sqlite'
    databaseSha256: string
    walSha256: string
    shmSha256: string
    migrationCount: number
    migrationName: string
    migrationHistorySha256: string
  }
  preservation: {
    receiptSha256: string
    classification: string
    sourceStability: string
    authoritativeContentMutation: boolean
    quiescence: string
    rawPreservation: string
    logicalSnapshot: {
      status: 'passed'
      sha256: string
      quickCheck: 'ok'
      integrityCheck: 'ok'
      foreignKeyViolationCount: 0
      reopenReadStable: true
    }
  }
  upgrade: {
    status: 'passed' | 'failed'
    failureClassification: string | null
    sourceMigrationCount: number
    targetMigrationCount: number
    targetMigrationName: string
    first: { status: 'passed' | 'failed'; databaseSha256: string }
    second: { status: 'passed' | 'failed'; databaseSha256: string }
    migrationHistorySha256: string
    schemaObjectsSha256: string
    rollbackAndRefusal: 'passed'
  }
  productReads: {
    status: 'passed' | 'failed'
    failureClassification: string | null
    projectionSha256: string
    testSetHistory: number
    definitionHistory: 'passed'
    executionHistory: number
    runHistory: number
    resultHistory: number
    resultContext: string
    appModelHistory: string
    observationHistory: string
    applicationReadiness: 'passed'
    evidenceWorkspaceProjectContext: 'passed'
    evidenceWorkspaceResultContext: 'passed'
    repairContext: 'TRUTHFUL_ABSENCE'
    historicalInvalidClassification: 'PRESERVED_HISTORICAL_INVALID'
    historicalInvalidPolicyFingerprint: string
  }
  review: { canonicalSuite: string; productRegressionCount: number; independentWorkReview: 'PASS' }
  evidenceSha256: string
}

const SHA40 = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/

function record(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
}

function valid(value: unknown): value is Omit<StorageCertificationEvidence, 'evidenceSha256'> {
  const root = record(value)
  const product = record(root?.product)
  const authority = record(root?.authority)
  const source = record(root?.source)
  const preservation = record(root?.preservation)
  const logical = record(preservation?.logicalSnapshot)
  const upgrade = record(root?.upgrade)
  const first = record(upgrade?.first)
  const second = record(upgrade?.second)
  const reads = record(root?.productReads)
  const review = record(root?.review)
  const hashes = [
    product?.frozenCheckpointSha256, product?.preservationSourceSnapshotSha256,
    source?.databaseSha256, source?.walSha256, source?.shmSha256, source?.migrationHistorySha256,
    preservation?.receiptSha256, logical?.sha256, first?.databaseSha256, second?.databaseSha256,
    upgrade?.migrationHistorySha256, upgrade?.schemaObjectsSha256, reads?.projectionSha256,
    reads?.historicalInvalidPolicyFingerprint,
  ]
  const ratio = (candidate: unknown): boolean => {
    const match = typeof candidate === 'string' ? /^(\d+)\/(\d+)$/.exec(candidate) : null
    return !!match && match[1] === match[2] && Number(match[1]) > 0
  }
  return root?.schemaVersion === 'forge-storage-certification/v1'
    && root.evidenceId === 'm7-slice2-saucedemo-025-to-041' && !Number.isNaN(Date.parse(String(root.certifiedAt))) && root.appName === 'saucedemo'
    && SHA40.test(String(product?.approvedHead)) && SHA40.test(String(product?.preservationSourceHead))
    && authority?.classification === 'M7_SLICE_2_CLOSED' && authority?.independentReview === 'PASS'
    && SHA40.test(String(authority?.mergeCommit))
    && authority?.approvedProductHead === product?.approvedHead
    && authority?.frozenCheckpointSha256 === product?.frozenCheckpointSha256
    && hashes.every(hash => SHA256.test(String(hash)))
    && source?.backend === 'native-sqlite' && typeof source.workspacePath === 'string' && typeof source.databasePath === 'string'
    && source.databasePath === path.join(source.workspacePath, '.forge', 'forge.db')
    && source.migrationCount === 25 && source.migrationName === '025_historical_observation_import'
    && preservation?.classification === 'ACTIVE_WRITER_UNRESOLVED'
    && preservation?.sourceStability === 'TRANSIENT_SQLITE_METADATA_TOUCH'
    && preservation?.quiescence === 'EXTERNAL_WRITER_UNRESOLVED'
    && preservation?.authoritativeContentMutation === false && preservation?.rawPreservation === 'blocked'
    && logical?.status === 'passed' && logical?.quickCheck === 'ok' && logical?.integrityCheck === 'ok'
    && logical?.foreignKeyViolationCount === 0 && logical?.reopenReadStable === true
    && ['passed', 'failed'].includes(String(upgrade?.status))
    && ['passed', 'failed'].includes(String(first?.status)) && ['passed', 'failed'].includes(String(second?.status)) && upgrade?.rollbackAndRefusal === 'passed'
    && (upgrade?.status === 'passed'
      ? upgrade.failureClassification === null && first?.status === 'passed' && second?.status === 'passed'
      : typeof upgrade?.failureClassification === 'string')
    && upgrade?.sourceMigrationCount === source.migrationCount && upgrade?.targetMigrationCount === 41
    && upgrade?.targetMigrationName === '041_repair_workflow_entry'
    && ['passed', 'failed'].includes(String(reads?.status))
    && (reads?.status === 'passed' ? reads.failureClassification === null : typeof reads?.failureClassification === 'string')
    && reads?.repairContext === 'TRUTHFUL_ABSENCE'
    && reads?.historicalInvalidClassification === 'PRESERVED_HISTORICAL_INVALID'
    && Number.isSafeInteger(reads?.testSetHistory) && reads.testSetHistory >= 0
    && reads?.definitionHistory === 'passed'
    && Number.isSafeInteger(reads?.executionHistory) && Number.isSafeInteger(reads?.runHistory) && Number.isSafeInteger(reads?.resultHistory)
    && ratio(reads?.resultContext) && ratio(reads?.appModelHistory) && ratio(reads?.observationHistory)
    && reads?.applicationReadiness === 'passed'
    && reads?.evidenceWorkspaceProjectContext === 'passed' && reads?.evidenceWorkspaceResultContext === 'passed'
    && ratio(review?.canonicalSuite)
    && review?.productRegressionCount === 0 && review?.independentWorkReview === 'PASS'
}

const BASELINES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/configuration/baselines')

export function readStorageCertificationEvidence(
  filePath = path.join(BASELINES, 'm7-slice2-saucedemo-storage-certification-v1.json'),
  historicalPolicyPath = path.join(BASELINES, 'm7-slice2-saucedemo-historical-invalid-v1.json'),
): StorageCertificationEvidence | null {
  try {
    const bytes = fs.readFileSync(filePath)
    const parsed: unknown = JSON.parse(bytes.toString('utf8'))
    if (!valid(parsed)) return null
    const policy = record(JSON.parse(fs.readFileSync(historicalPolicyPath, 'utf8')))
    const policySource = record(policy?.source)
    if (policy?.schemaVersion !== 'forge-historical-invalid-app-model-preservation/v1'
      || policy.evidenceFingerprint !== parsed.productReads.historicalInvalidPolicyFingerprint
      || policySource?.databaseSha256 !== parsed.preservation.logicalSnapshot.sha256
      || policySource?.migrationCount !== parsed.source.migrationCount
      || policySource?.lastMigration !== parsed.source.migrationName) return null
    return { ...parsed, evidenceSha256: crypto.createHash('sha256').update(bytes).digest('hex') }
  } catch {
    return null
  }
}
