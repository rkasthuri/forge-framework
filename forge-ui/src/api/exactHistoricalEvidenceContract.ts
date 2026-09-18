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

import type { ApplicationModelHistoryItem } from './types'

export const EXACT_APP_MODEL_SCHEMA = 'forge.exact-app-model/v1' as const
export const EXACT_OBSERVATION_SCHEMA = 'forge.exact-observation/v1' as const

export interface ExactAppModelResponse {
  schemaVersion: typeof EXACT_APP_MODEL_SCHEMA
  project: { id: string; name: string }
  model: ApplicationModelHistoryItem
}

export interface ExactObservationResponse {
  schemaVersion: typeof EXACT_OBSERVATION_SCHEMA
  project: { id: string; name: string }
  observation: {
    observationId: string
    projectId: string
    runId: string
    historyPosition: 'latest' | 'historical'
    run: { lifecycle: string; completeness: string | null; startedAt: string; terminalAt: string | null }
    outcome: string
    subject: string
    predicate: string
    method: { id: string; version: string }
    boundary: { schemaVersion: string; kind: string; scope: Record<string, unknown>; startedAt: string; endedAt: string; completion: string; policyId: string; policyVersion: string }
    capturedAt: string
    provenanceClass: string
    reasonCode: string | null
    artifactIds: string[]
    sourceModels: Array<{ rowId: number; version: string; lifecycle: string }>
    integrity: 'verified'
  }
}

export class ExactHistoricalEvidenceContractError extends Error {
  constructor() { super('Exact historical evidence payload is malformed.'); this.name = 'ExactHistoricalEvidenceContractError' }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/
const SHA = /^[a-f0-9]{64}$/
const record = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ExactHistoricalEvidenceContractError()
  return value as Record<string, any>
}
const iso = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const nullableIso = (value: unknown) => value === null || iso(value)
const stringArray = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string')
const nonEmpty = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 1024
const exactObservationHref = (value: unknown, projectId: string, observationId: string) => {
  if (typeof value !== 'string') return false
  const [pathname, query, extra] = value.split('?')
  if (pathname !== '/application/observations' || !query || extra !== undefined) return false
  const params = new URLSearchParams(query)
  const keys = [...params.keys()].sort()
  return keys.join('|') === 'exact|observation|project'
    && params.getAll('project').length === 1 && params.get('project') === projectId
    && params.getAll('observation').length === 1 && params.get('observation') === observationId
    && params.getAll('exact').length === 1 && params.get('exact') === 'true'
}

export interface ExactAppModelRequestIdentity {
  projectId: string
  rowId: number
  version: string
  fingerprint: string | null
}

export interface ExactObservationRequestIdentity {
  projectId: string
  observationId: string
}

export function decodeExactAppModelResponse(raw: unknown, expected: ExactAppModelRequestIdentity): ExactAppModelResponse {
  const value = record(raw), project = record(value.project), model = record(value.model)
  const source = model.sourceObservation === null ? null : record(model.sourceObservation)
  const recovery = model.recovery === null ? null : record(model.recovery)
  const recommendation = model.recommendation === null ? null : record(model.recommendation)
  if (value.schemaVersion !== EXACT_APP_MODEL_SCHEMA || typeof project.id !== 'string' || !ID.test(project.id)
    || typeof project.name !== 'string' || !Number.isSafeInteger(model.rowId) || model.rowId < 1
    || typeof model.version !== 'string' || !VERSION.test(model.version)
    || !['active','superseded','unknown'].includes(model.lifecycle)
    || !nullableIso(model.createdAt) || !nullableIso(model.sourceCrawlAt)
    || !['crawled','crawled-empty','unsupported-platform','unknown'].includes(model.evidenceState)
    || !['valid','invalid','malformed'].includes(model.validation)
    || !['verified','failed','not_evaluated'].includes(model.integrity)
    || typeof model.modelFingerprint !== 'string' || !SHA.test(model.modelFingerprint)
    || !['current','unavailable','invalid','mismatched','not_evaluated','not_applicable'].includes(model.projection)
    || model.freshness !== 'not_evaluated' || model.coverage !== 'unknown'
    || project.id !== expected.projectId || model.rowId !== expected.rowId || model.version !== expected.version
    || expected.fingerprint !== null && model.modelFingerprint !== expected.fingerprint
    || !Array.isArray(model.subjects) || model.subjects.some((rawSubject: unknown) => {
      const subject = record(rawSubject)
      const derived = subject.derivedClassification === null ? null : record(subject.derivedClassification)
      return typeof subject.id !== 'string' || !ID.test(subject.id)
        || !['page','endpoint'].includes(subject.kind)
        || subject.routePath !== null && typeof subject.routePath !== 'string'
        || !['direct_observation','unknown'].includes(subject.basis)
        || subject.evidenceId !== null && (typeof subject.evidenceId !== 'string' || !ID.test(subject.evidenceId))
        || derived !== null && (!nonEmpty(derived.label)
          || !['high','medium','low','unknown'].includes(derived.confidence)
          || !['rule','ai','manual','unknown'].includes(derived.method))
    })
    || source !== null && (typeof source.id !== 'string' || !ID.test(source.id)
      || typeof source.available !== 'boolean'
      || source.outcome !== null && !['completed','partially_completed','blocked','failed','unknown'].includes(source.outcome)
      || !nullableIso(source.startedAt) || !nullableIso(source.completedAt)
      || (source.available ? !exactObservationHref(source.href, expected.projectId, source.id) : source.href !== null))
    || recovery !== null && (!Number.isSafeInteger(recovery.sourceRowId) || recovery.sourceRowId < 1
      || recovery.sourceVersion !== null && (typeof recovery.sourceVersion !== 'string' || !VERSION.test(recovery.sourceVersion))
      || typeof recovery.sourceFingerprint !== 'string' || !SHA.test(recovery.sourceFingerprint)
      || typeof recovery.sourceFingerprintMatches !== 'boolean')
    || !stringArray(model.limitations) || !stringArray(model.unknowns) || !stringArray(model.blockers)
    || recommendation !== null && (!nonEmpty(recommendation.action) || !nonEmpty(recommendation.because)
      || typeof recommendation.destination !== 'string' || !ID.test(recommendation.destination)
      || source === null || recommendation.destination !== source.id
      || !exactObservationHref(recommendation.href, expected.projectId, recommendation.destination))) throw new ExactHistoricalEvidenceContractError()
  return raw as ExactAppModelResponse
}

export function decodeExactObservationResponse(raw: unknown, expected: ExactObservationRequestIdentity): ExactObservationResponse {
  const value = record(raw), project = record(value.project), observation = record(value.observation)
  const run = record(observation.run), method = record(observation.method), boundary = record(observation.boundary)
  if (value.schemaVersion !== EXACT_OBSERVATION_SCHEMA || typeof project.id !== 'string' || !ID.test(project.id)
    || typeof project.name !== 'string' || observation.projectId !== project.id
    || typeof observation.observationId !== 'string' || !ID.test(observation.observationId)
    || project.id !== expected.projectId || observation.observationId !== expected.observationId
    || typeof observation.runId !== 'string' || !ID.test(observation.runId)
    || !['latest','historical'].includes(observation.historyPosition) || observation.integrity !== 'verified'
    || !['running','completed','blocked','failed','interrupted'].includes(run.lifecycle)
    || run.completeness !== null && !['complete','partial','unobserved'].includes(run.completeness)
    || !iso(run.startedAt) || !nullableIso(run.terminalAt)
    || !['present','absent','indeterminate'].includes(observation.outcome)
    || typeof observation.subject !== 'string' || !ID.test(observation.subject)
    || typeof observation.predicate !== 'string' || !ID.test(observation.predicate)
    || !['browser_dom_inspection','browser_navigation_attempt','http_response_inspection'].includes(method.id)
    || !nonEmpty(method.version)
    || boundary.schemaVersion !== 'forge-observation-boundary/v1'
    || !['document','navigation_attempt','http_exchange'].includes(boundary.kind)
    || !record(boundary.scope) || !iso(boundary.startedAt) || !iso(boundary.endedAt)
    || !['complete','partial'].includes(boundary.completion)
    || !nonEmpty(boundary.policyId) || !nonEmpty(boundary.policyVersion)
    || !iso(observation.capturedAt)
    || !['native','legacy_direct','legacy_reconstructed'].includes(observation.provenanceClass)
    || observation.reasonCode !== null && (typeof observation.reasonCode !== 'string' || !ID.test(observation.reasonCode))
    || !Array.isArray(observation.artifactIds)
    || observation.artifactIds.some((id: unknown) => typeof id !== 'string' || !ID.test(id))
    || !Array.isArray(observation.sourceModels)
    || observation.sourceModels.some((model: unknown) => {
      const item = record(model)
      return !Number.isSafeInteger(item.rowId) || item.rowId < 1
        || typeof item.version !== 'string' || !VERSION.test(item.version)
        || !['active','superseded','unknown'].includes(item.lifecycle)
    })) throw new ExactHistoricalEvidenceContractError()
  return raw as ExactObservationResponse
}
