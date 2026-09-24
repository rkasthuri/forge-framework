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
import { projectRegistry, type ProjectEntry } from '../registry/ProjectRegistry'
import { readStorageCertificationEvidence, type StorageCertificationEvidence } from '../registry/StorageCertificationEvidence'
import { presentStorageOperationalReadiness } from '../registry/StorageOperationalReadinessPresenter'
import { readProductSourceIdentity, type ProductSourceIdentity } from '../registry/ProductSourceIdentity'
import { SelectedWorkspacePreservationController } from './SelectedWorkspacePreservationController'

interface PreservationPort {
  capture(request: { appName: unknown; productSourceSha: string; productSourceSnapshotSha256: string; createArtifacts: boolean }): Promise<unknown>
}

export interface StorageOperationalReadinessHttpResult { status: number; body: unknown }
export type ResolveStorageReadinessProject = (appName: string) => ProjectEntry | undefined | Promise<ProjectEntry | undefined>

const defaultPreservation = new SelectedWorkspacePreservationController('')
const resolveRegisteredProject: ResolveStorageReadinessProject = appName => projectRegistry.find(appName)

export async function readStorageOperationalReadiness(
  appName: string,
  preservation: PreservationPort = defaultPreservation,
  evidence: StorageCertificationEvidence | null = readStorageCertificationEvidence(),
  productSourceIdentity: ProductSourceIdentity | null = readProductSourceIdentity(),
  resolveProject: ResolveStorageReadinessProject = resolveRegisteredProject,
): Promise<StorageOperationalReadinessHttpResult> {
  if (!appName) return { status: 400, body: fail('An explicit registered project selection is required.', 'PROJECT_SELECTION_REQUIRED') }
  if (!await resolveProject(appName)) return { status: 404, body: fail('The selected project is not registered.', 'PROJECT_NOT_REGISTERED') }
  if (!productSourceIdentity) return { status: 503, body: fail('The current Product source identity is not configured; no fresh preservation receipt was created.', 'PRODUCT_SOURCE_IDENTITY_UNAVAILABLE') }
  try {
    const receipt = await preservation.capture({
      appName,
      productSourceSha: productSourceIdentity.productSourceSha,
      productSourceSnapshotSha256: productSourceIdentity.productSourceSnapshotSha256,
      createArtifacts: false,
    })
    if (!receipt || typeof receipt !== 'object') return { status: 503, body: fail('The preservation owner returned malformed evidence.', 'STORAGE_READINESS_SOURCE_INVALID') }
    const sourceIdentity = receipt as { productSourceSha?: unknown; productSourceSnapshotSha256?: unknown }
    if (sourceIdentity.productSourceSha !== productSourceIdentity.productSourceSha
      || sourceIdentity.productSourceSnapshotSha256 !== productSourceIdentity.productSourceSnapshotSha256) {
      return { status: 503, body: fail('The preservation evidence is not bound to the current Product source identity.', 'PRODUCT_SOURCE_IDENTITY_MISMATCH') }
    }
    return { status: 200, body: ok(presentStorageOperationalReadiness(receipt as any, evidence)) }
  } catch {
    return { status: 503, body: fail('Storage readiness evidence could not be composed safely.', 'STORAGE_READINESS_UNAVAILABLE') }
  }
}
