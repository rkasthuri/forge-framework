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

import * as path from 'node:path'
import type { WorkspacePreservationReceipt } from '../../../src/core/storage/WorkspacePreservationService'
import type { StorageCertificationEvidence } from './StorageCertificationEvidence'

export type StorageReadinessStatus = 'READY' | 'BLOCKED' | 'UNKNOWN' | 'NOT_APPLICABLE'
export type StorageReadinessDimensionId = 'selection' | 'preservation' | 'integrity' | 'upgrade' | 'productReads' | 'cutoverEligibility'

export interface StorageReadinessDimension {
  id: StorageReadinessDimensionId
  label: string
  status: StorageReadinessStatus
  classification: string
  explanation: string
  blockers: string[]
  limitations: string[]
  evidence: Array<{ owner: string; identity: string }>
}

export interface StorageOperationalReadinessAssessment {
  schemaVersion: 'forge-storage-operational-readiness/v1'
  assessedAt: string
  selectedProject: string | null
  resolvedWorkspace: string | null
  storage: {
    backend: string
    canonicalDatabasePath: string | null
    databaseExists: boolean
    migration: { count: number; current: string | null; historySha256: string | null; recognized: boolean }
    sidecars: { wal: 'present' | 'absent' | 'unknown'; shm: 'present' | 'absent' | 'unknown' }
  }
  sourceBinding: {
    state: 'BOUND' | 'MISMATCH' | 'UNAVAILABLE'
    evidenceId: string | null
    evidenceSha256: string | null
    certifiedAt: string | null
    approvedProductHead: string | null
    authorityClassification: string | null
    mergeCommit: string | null
    frozenCheckpointSha256: string | null
    preservationReceiptSha256: string | null
    productReadProjectionSha256: string | null
    captureProductSourceSha: string
    captureProductSourceSnapshotSha256: string
    sourceDatabaseSha256: string | null
  }
  preservationEvidence: {
    sourceBoundary: 'selected-live-readonly'
    classification: string
    quiescence: string
    sourceStability: string
    authoritativeContentMutation: boolean | null
    rawPreservation: string
    logicalSnapshot: string
    logicalSnapshotSha256: string | null
  }
  integrityEvidence: {
    quickCheck: string | null
    integrityCheck: string | null
    foreignKeyViolationCount: number | null
    reopenReadStable: boolean | null
  }
  upgradeEvidence: {
    sourceMigration: string | null
    targetMigration: string | null
    independentPasses: number
    rollbackAndRefusal: string
  }
  productReadEvidence: {
    testSetHistory: number | null
    definitionHistory: string
    executionHistory: number | null
    runHistory: number | null
    resultHistory: number | null
    resultContext: string
    appModelHistory: string
    observationHistory: string
    applicationReadiness: string
    evidenceWorkspaceProjectContext: string
    evidenceWorkspaceResultContext: string
  }
  dimensions: Record<StorageReadinessDimensionId, StorageReadinessDimension>
  aggregate: { status: Exclude<StorageReadinessStatus, 'NOT_APPLICABLE'>; explanation: string }
  blockers: string[]
  limitations: string[]
  safeNextAction: string
  historicalState: {
    invalidClassification: string | null
    explanation: string
    repairContext: string | null
  }
}

const labels: Record<StorageReadinessDimensionId, string> = {
  selection: 'Selection', preservation: 'Preservation', integrity: 'Integrity',
  upgrade: 'Disposable upgrade', productReads: 'Product reads', cutoverEligibility: 'Live cutover eligibility',
}

function dimension(id: StorageReadinessDimensionId, status: StorageReadinessStatus, classification: string, explanation: string, owner: string, identity: string | null, blockers: string[] = [], limitations: string[] = []): StorageReadinessDimension {
  return { id, label: labels[id], status, classification, explanation, blockers, limitations, evidence: identity ? [{ owner, identity }] : [] }
}

function samePath(left: string | null, right: string): boolean {
  if (!left) return false
  const a = path.resolve(left)
  const b = path.resolve(right)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

function componentHash(receipt: WorkspacePreservationReceipt, name: 'database' | 'wal' | 'shm'): string | null {
  return receipt.components[name]?.sha256 ?? null
}

function sourceBound(receipt: WorkspacePreservationReceipt, evidence: StorageCertificationEvidence | null): boolean {
  if (!evidence || receipt.appName !== evidence.appName || receipt.backend !== evidence.source.backend) return false
  return samePath(receipt.normalizedWorkspaceRoot, evidence.source.workspacePath)
    && samePath(receipt.canonicalDatabasePath, evidence.source.databasePath)
    && componentHash(receipt, 'database') === evidence.source.databaseSha256
    && componentHash(receipt, 'wal') === evidence.source.walSha256
    && componentHash(receipt, 'shm') === evidence.source.shmSha256
    && receipt.migrationNames.length === evidence.source.migrationCount
    && receipt.migrationNames.at(-1) === evidence.source.migrationName
    && receipt.migrationHistorySha256 === evidence.source.migrationHistorySha256
}

function aggregateStatus(dimensions: Record<StorageReadinessDimensionId, StorageReadinessDimension>): 'READY' | 'BLOCKED' | 'UNKNOWN' {
  const required = Object.values(dimensions)
  if (required.some(item => item.status === 'BLOCKED')) return 'BLOCKED'
  if (required.some(item => item.status !== 'READY')) return 'UNKNOWN'
  return 'READY'
}

export function presentStorageOperationalReadiness(receipt: WorkspacePreservationReceipt, evidence: StorageCertificationEvidence | null): StorageOperationalReadinessAssessment {
  const selected = receipt.projectRegistryMembership
    && receipt.workspaceContainment === 'within_canonical_root'
    && receipt.registryPathConsistency === 'MATCH'
    && receipt.backend === 'native-sqlite'
    && receipt.databaseExists
  const binding = sourceBound(receipt, evidence)
  const unsupported = receipt.classification === 'UNSUPPORTED_STORAGE_BACKEND'
  const selection = selected
    ? dimension('selection', 'READY', 'CANONICAL_SOURCE_RESOLVED', 'The registered project, resolver workspace, and DatabaseAuthority path agree.', 'ProjectRegistry → WorkspaceResolver → DatabaseAuthority', receipt.registryEntrySha256)
    : dimension('selection', 'BLOCKED', receipt.classification, 'The selected canonical storage source could not be established.', 'WorkspacePreservationService', receipt.classification, receipt.blockers.map(item => item.code))

  const preservation = selected
    ? receipt.classification === 'PRESERVATION_READY'
      ? dimension('preservation', 'READY', receipt.classification, 'The preservation owner reports coherent raw and logical preservation.', 'WorkspacePreservationService', receipt.productSourceSnapshotSha256)
      : dimension('preservation', 'BLOCKED', receipt.classification, binding && evidence?.preservation.logicalSnapshot.status === 'passed'
        ? 'A coherent logical snapshot is certified for disposable use, but raw live preservation and writer exclusion are not proven.'
        : 'Live preservation is not established for this source.', 'WorkspacePreservationService', receipt.productSourceSnapshotSha256, receipt.blockers.map(item => item.code), binding ? [] : ['Certified preservation evidence is not bound to the selected source identity.'])
    : dimension('preservation', unsupported ? 'NOT_APPLICABLE' : 'UNKNOWN', receipt.classification, 'Preservation cannot be evaluated until canonical selection succeeds.', 'WorkspacePreservationService', null)

  const inspected = selected && receipt.migrationHistoryRecognized
    && receipt.sourceStability.classification !== 'SOURCE_CHANGED_DURING_CAPTURE'
    && !['SQLITE_INTEGRITY_FAILED', 'FOREIGN_KEY_VIOLATION', 'SQLITE_SIDECAR_INCOHERENT'].includes(receipt.classification)
  const integrity = inspected && binding && evidence
    ? dimension('integrity', 'READY', 'SQLITE_INTEGRITY_CERTIFIED', 'SQLite quick_check, integrity_check, foreign-key, reopen, and repeat-read evidence passed on the bound disposable snapshot; the current source inspection was accepted by the preservation owner.', 'WorkspacePreservationService', evidence.preservation.receiptSha256)
    : dimension('integrity', inspected ? 'UNKNOWN' : selected ? 'BLOCKED' : unsupported ? 'NOT_APPLICABLE' : 'UNKNOWN', receipt.classification, inspected ? 'Integrity certification exists but is not bound to this exact selected source.' : 'SQLite integrity evidence is unavailable or failed.', 'WorkspacePreservationService', receipt.migrationHistorySha256, inspected ? [] : receipt.blockers.map(item => item.code))

  const upgrade = binding && evidence?.upgrade.status === 'passed'
    ? dimension('upgrade', 'READY', 'DISPOSABLE_UPGRADE_CERTIFIED', `${evidence.upgrade.sourceMigrationCount} → ${evidence.upgrade.targetMigrationCount} passed twice independently with rollback/refusal coverage.`, 'Migrations + M7 Slice-2 certification', evidence.evidenceSha256)
    : binding && evidence?.upgrade.status === 'failed'
      ? dimension('upgrade', 'BLOCKED', evidence.upgrade.failureClassification ?? 'DISPOSABLE_UPGRADE_FAILED', 'The source-bound disposable-upgrade owner recorded a failure.', 'Migrations + M7 Slice-2 certification', evidence.evidenceSha256, [evidence.upgrade.failureClassification ?? 'DISPOSABLE_UPGRADE_FAILED'])
      : dimension('upgrade', selected ? 'UNKNOWN' : unsupported ? 'NOT_APPLICABLE' : 'UNKNOWN', evidence ? 'SOURCE_EVIDENCE_IDENTITY_MISMATCH' : 'UPGRADE_EVIDENCE_MISSING', 'No source-bound disposable-upgrade conclusion can be made.', 'M7 Slice-2 certification', evidence?.evidenceSha256 ?? null, [], ['Unknown is not upgraded to ready.'])

  const productReads = binding && evidence?.productReads.status === 'passed'
    ? dimension('productReads', 'READY', 'PRODUCT_READS_CERTIFIED', 'Historical Test Set, Definition, Execution, Run, Result, App Model, Observation, Application Readiness, Evidence Workspace, and repair contexts passed on the upgraded bound snapshot.', 'Product read owners + M7 Slice-2 certification', evidence.productReads.projectionSha256)
    : binding && evidence?.productReads.status === 'failed'
      ? dimension('productReads', 'BLOCKED', evidence.productReads.failureClassification ?? 'PRODUCT_READ_CERTIFICATION_FAILED', 'The source-bound Product-read owner recorded a failure.', 'Product read owners + M7 Slice-2 certification', evidence.productReads.projectionSha256, [evidence.productReads.failureClassification ?? 'PRODUCT_READ_CERTIFICATION_FAILED'])
      : dimension('productReads', selected ? 'UNKNOWN' : unsupported ? 'NOT_APPLICABLE' : 'UNKNOWN', evidence ? 'SOURCE_EVIDENCE_IDENTITY_MISMATCH' : 'PRODUCT_READ_EVIDENCE_MISSING', 'Product-read certification is absent or does not bind to this selected source.', 'Product read owners + M7 Slice-2 certification', evidence?.productReads.projectionSha256 ?? null)

  const cutoverPrerequisites = [selection, preservation, integrity, upgrade, productReads]
  const prerequisiteBlockers = cutoverPrerequisites.filter(item => item.status !== 'READY').map(item => `${item.id}:${item.classification}`)
  const cutover = dimension(
    'cutoverEligibility', 'BLOCKED',
    receipt.classification === 'ACTIVE_WRITER_UNRESOLVED' ? 'ACTIVE_WRITER_UNRESOLVED' : prerequisiteBlockers.length ? 'CUTOVER_PREREQUISITE_BLOCKED' : 'LIVE_RECOVERY_PREREQUISITE_NOT_ESTABLISHED',
    prerequisiteBlockers.length
      ? 'Live cutover consideration is blocked by one or more required dimensions.'
      : 'The selected-live owner does not establish raw recovery and live restoration readiness; cutover remains blocked.',
    'StorageOperationalReadinessPresenter', evidence?.evidenceSha256 ?? null,
    prerequisiteBlockers.length ? prerequisiteBlockers : ['liveRecovery:LIVE_RECOVERY_PREREQUISITE_NOT_ESTABLISHED'],
  )

  const dimensions = { selection, preservation, integrity, upgrade, productReads, cutoverEligibility: cutover }
  const aggregate = aggregateStatus(dimensions)
  const blockers = [...new Set(Object.values(dimensions).flatMap(item => item.blockers))]
  const limitations = [...new Set(Object.values(dimensions).flatMap(item => item.limitations))]
  return {
    schemaVersion: 'forge-storage-operational-readiness/v1', assessedAt: receipt.timestamp,
    selectedProject: receipt.appName, resolvedWorkspace: receipt.normalizedWorkspaceRoot,
    storage: {
      backend: receipt.backend, canonicalDatabasePath: receipt.canonicalDatabasePath, databaseExists: receipt.databaseExists,
      migration: { count: receipt.migrationNames.length, current: receipt.migrationNames.at(-1) ?? null, historySha256: receipt.migrationHistorySha256, recognized: receipt.migrationHistoryRecognized },
      sidecars: { wal: receipt.components.wal ? receipt.components.wal.exists ? 'present' : 'absent' : 'unknown', shm: receipt.components.shm ? receipt.components.shm.exists ? 'present' : 'absent' : 'unknown' },
    },
    sourceBinding: {
      state: binding ? 'BOUND' : evidence ? 'MISMATCH' : 'UNAVAILABLE',
      evidenceId: evidence?.evidenceId ?? null, evidenceSha256: evidence?.evidenceSha256 ?? null,
      certifiedAt: evidence?.certifiedAt ?? null, approvedProductHead: evidence?.product.approvedHead ?? null,
      authorityClassification: evidence?.authority.classification ?? null,
      mergeCommit: evidence?.authority.mergeCommit ?? null,
      frozenCheckpointSha256: evidence?.authority.frozenCheckpointSha256 ?? null,
      preservationReceiptSha256: evidence?.preservation.receiptSha256 ?? null,
      productReadProjectionSha256: evidence?.productReads.projectionSha256 ?? null,
      captureProductSourceSha: receipt.productSourceSha,
      captureProductSourceSnapshotSha256: receipt.productSourceSnapshotSha256,
      sourceDatabaseSha256: receipt.components.database?.sha256 ?? null,
    },
    preservationEvidence: {
      sourceBoundary: 'selected-live-readonly',
      classification: receipt.classification, quiescence: receipt.quiescence,
      sourceStability: receipt.sourceStability.classification,
      authoritativeContentMutation: receipt.sourceStability.authoritativeContentMutation,
      rawPreservation: receipt.rawPreservation.status,
      logicalSnapshot: binding ? evidence?.preservation.logicalSnapshot.status ?? 'unknown' : 'unknown',
      logicalSnapshotSha256: binding ? evidence?.preservation.logicalSnapshot.sha256 ?? null : null,
    },
    integrityEvidence: {
      quickCheck: binding ? evidence?.preservation.logicalSnapshot.quickCheck ?? null : null,
      integrityCheck: binding ? evidence?.preservation.logicalSnapshot.integrityCheck ?? null : null,
      foreignKeyViolationCount: binding ? evidence?.preservation.logicalSnapshot.foreignKeyViolationCount ?? null : null,
      reopenReadStable: binding ? evidence?.preservation.logicalSnapshot.reopenReadStable ?? null : null,
    },
    upgradeEvidence: {
      sourceMigration: binding ? evidence?.source.migrationName ?? null : null,
      targetMigration: binding ? evidence?.upgrade.targetMigrationName ?? null : null,
      independentPasses: binding && evidence ? [evidence.upgrade.first, evidence.upgrade.second].filter(item => item.status === 'passed').length : 0,
      rollbackAndRefusal: binding ? evidence?.upgrade.rollbackAndRefusal ?? 'unknown' : 'unknown',
    },
    productReadEvidence: {
      testSetHistory: binding ? evidence?.productReads.testSetHistory ?? null : null,
      definitionHistory: binding ? evidence?.productReads.definitionHistory ?? 'unknown' : 'unknown',
      executionHistory: binding ? evidence?.productReads.executionHistory ?? null : null,
      runHistory: binding ? evidence?.productReads.runHistory ?? null : null,
      resultHistory: binding ? evidence?.productReads.resultHistory ?? null : null,
      resultContext: binding ? evidence?.productReads.resultContext ?? 'unknown' : 'unknown',
      appModelHistory: binding ? evidence?.productReads.appModelHistory ?? 'unknown' : 'unknown',
      observationHistory: binding ? evidence?.productReads.observationHistory ?? 'unknown' : 'unknown',
      applicationReadiness: binding ? evidence?.productReads.applicationReadiness ?? 'unknown' : 'unknown',
      evidenceWorkspaceProjectContext: binding ? evidence?.productReads.evidenceWorkspaceProjectContext ?? 'unknown' : 'unknown',
      evidenceWorkspaceResultContext: binding ? evidence?.productReads.evidenceWorkspaceResultContext ?? 'unknown' : 'unknown',
    },
    dimensions, aggregate: { status: aggregate, explanation: aggregate === 'READY' ? 'Every required storage-readiness dimension is ready.' : aggregate === 'BLOCKED' ? 'The aggregate is no stronger than the weakest required dimension.' : 'At least one required dimension remains unknown.' },
    blockers, limitations, safeNextAction: receipt.safeNextAction,
    historicalState: {
      invalidClassification: binding ? evidence?.productReads.historicalInvalidClassification ?? null : null,
      explanation: binding ? 'Historical rows remain invalid under the current schema, source-bound and unchanged, and exact Product reads continue to report integrity_invalid. This is not a validity waiver.' : 'Historical-invalid evidence is not asserted without exact source binding.',
      repairContext: binding ? evidence?.productReads.repairContext ?? null : null,
    },
  }
}
