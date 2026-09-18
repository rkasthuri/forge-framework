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
import { presentExactApplicationModel } from '../registry/ApplicationModelHistoryPresenter'
import { executionContext } from './ExecutionContext'
import { EXACT_APP_MODEL_SCHEMA, EXACT_OBSERVATION_SCHEMA, decodeExactAppModelResponse, decodeExactObservationResponse } from '../../src/api/exactHistoricalEvidenceContract'

type Project = { appName: string }
export type ExactProjectResolver = (appName: string) => Promise<Project | undefined>
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/
const SHA = /^[a-f0-9]{64}$/
const object = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null

export interface ExactHistoricalSources {
  readAppModel(projectId: string, rowId: number, version: string, fingerprint: string | null): Promise<unknown>
  readObservation(projectId: string, observationId: string): Promise<unknown>
  readObservationProjection(projectId: string): Promise<unknown>
}

const sources: ExactHistoricalSources = {
  readAppModel: (projectId, rowId, version, fingerprint) => executionContext.readExactAppModel(projectId, rowId, version, fingerprint),
  readObservation: (projectId, observationId) => executionContext.readExactObservation(projectId, observationId),
  readObservationProjection: projectId => executionContext.readObservationProjection(projectId, { limit: 50 }),
}

export async function readExactAppModel(
  appName: string, rowValue: string, query: Record<string, unknown>, resolveProject: ExactProjectResolver,
  owner: ExactHistoricalSources = sources,
): Promise<{ status: number; body: unknown }> {
  const keys = Object.keys(query).sort().join('|')
  const version = query.version, fingerprint = query.fingerprint ?? null
  if (!/^[1-9]\d{0,14}$/.test(rowValue) || (keys !== 'version' && keys !== 'fingerprint|version')
    || typeof version !== 'string' || !VERSION.test(version)
    || fingerprint !== null && (typeof fingerprint !== 'string' || !SHA.test(fingerprint))) {
    return { status: 400, body: fail('Exact App Model identity is malformed.', 'INVALID_EXACT_APP_MODEL_IDENTITY') }
  }
  const project = await resolveProject(appName)
  if (!project) return { status: 404, body: fail('Project not found', 'NOT_FOUND') }
  try {
    const read = object(await owner.readAppModel(appName, Number(rowValue), version, fingerprint))
    if (!read || read.kind === 'not_found' || read.kind === 'identity_mismatch') return { status: 404, body: fail('Exact historical App Model not found.', 'EXACT_APP_MODEL_NOT_FOUND') }
    if (read.kind !== 'ok') return { status: 422, body: fail('Exact historical App Model failed integrity validation.', 'EXACT_APP_MODEL_INTEGRITY_INVALID') }
    const emptyProjection = { runs: [], observations: [] }
    let projection: Record<string, any> = emptyProjection
    try {
      const candidate = object(await owner.readObservationProjection(appName))
      if (candidate && Array.isArray(candidate.runs) && Array.isArray(candidate.observations)) projection = candidate
    } catch {
      // The exact App Model owner remains authoritative. Auxiliary Observation
      // projection loss makes source relationships unavailable, not the model.
    }
    let presented
    try {
      presented = presentExactApplicationModel(read.model, { id: appName, name: project.appName }, projection as any)
    } catch {
      // Malformed auxiliary entries must not hide an otherwise valid exact
      // App Model. Retry without the non-authoritative projection so source
      // relationships remain explicitly unavailable.
      presented = presentExactApplicationModel(read.model, { id: appName, name: project.appName }, emptyProjection)
    }
    if (presented.kind !== 'ok') return { status: 422, body: fail('Exact historical App Model failed presentation validation.', 'EXACT_APP_MODEL_INTEGRITY_INVALID') }
    const response = decodeExactAppModelResponse(
      { schemaVersion: EXACT_APP_MODEL_SCHEMA, project: { id: appName, name: project.appName }, model: presented.value },
      { projectId: appName, rowId: Number(rowValue), version, fingerprint },
    )
    return { status: 200, body: ok(response) }
  } catch { return { status: 503, body: fail('Exact historical App Model is unavailable.', 'EXACT_APP_MODEL_READ_UNAVAILABLE') } }
}

export async function readExactObservation(
  appName: string, observationId: string, resolveProject: ExactProjectResolver,
  owner: ExactHistoricalSources = sources,
): Promise<{ status: number; body: unknown }> {
  if (!ID.test(observationId)) return { status: 400, body: fail('Exact Observation identity is malformed.', 'INVALID_EXACT_OBSERVATION_IDENTITY') }
  const project = await resolveProject(appName)
  if (!project) return { status: 404, body: fail('Project not found', 'NOT_FOUND') }
  try {
    const read = object(await owner.readObservation(appName, observationId))
    if (!read || read.kind === 'not_found' || read.kind === 'identity_mismatch') return { status: 404, body: fail('Exact historical Observation not found.', 'EXACT_OBSERVATION_NOT_FOUND') }
    if (read.kind !== 'ok') return { status: 422, body: fail('Exact historical Observation failed integrity validation.', 'EXACT_OBSERVATION_INTEGRITY_INVALID') }
    const response = decodeExactObservationResponse(
      { schemaVersion: EXACT_OBSERVATION_SCHEMA, project: { id: appName, name: project.appName }, observation: read.observation },
      { projectId: appName, observationId },
    )
    return { status: 200, body: ok(response) }
  } catch { return { status: 503, body: fail('Exact historical Observation is unavailable.', 'EXACT_OBSERVATION_READ_UNAVAILABLE') } }
}
