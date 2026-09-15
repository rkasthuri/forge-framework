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
import { canonicalJson, canonicalJsonSha256 } from '../storage/JsonAppModelMigrationPlanner'
import { validateRepairJson } from '../storage/RepairAuthorityValidation'
import type { DiagnosticEvidenceV1 } from '../execution/DiagnosticEvidenceContract'

export const REPAIR_EFFECTIVENESS_POLICY = 'forge.m5.repair-effectiveness-policy/v1' as const
export const REPAIR_EFFECTIVENESS_SCHEMA = 'forge.m5.repair-effectiveness/v1' as const
export interface RepairComparisonRequest {
  projectId: string
  beforeResultId: string
  afterExecutionId: string
  expectedAfterResultId: string | null
  policyVersion: typeof REPAIR_EFFECTIVENESS_POLICY
}
export type RepairEffectivenessState = 'REPAIR_CONFIRMED' | 'REPAIR_NOT_CONFIRMED' | 'INCONCLUSIVE'
export type RepairEffectivenessReason = 'target_action_completed' | 'approved_target_absent' | 'same_target_action_failure'
  | 'execution_not_terminal' | 'no_result_observed' | 'target_not_reached' | 'target_not_unique' | 'different_target_action_failure' | 'target_action_evidence_incomplete'
export class RepairComparisonError extends Error {
  constructor(readonly code: 'comparison_input_invalid' | 'comparison_authority_invalid' | 'comparison_identity_conflict'
    | 'comparison_evidence_unavailable' | 'comparison_source_not_targeted' | 'comparison_transaction_unsupported' | 'comparison_persistence_failed' = 'comparison_authority_invalid') {
    super('Repair comparison refused: ' + code); this.name = 'RepairComparisonError'
  }
}
export function comparisonFail(code?: RepairComparisonError['code']): never { throw new RepairComparisonError(code) }
export function freezeRepairComparison(value: unknown): RepairComparisonRequest {
  try {
    validateRepairJson(value)
    const v = value as RepairComparisonRequest, id = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/
    if (!v || Object.keys(v).sort().join('|') !== 'afterExecutionId|beforeResultId|expectedAfterResultId|policyVersion|projectId'
      || ![v.projectId,v.beforeResultId,v.afterExecutionId].every(x => typeof x === 'string' && id.test(x))
      || v.expectedAfterResultId !== null && (typeof v.expectedAfterResultId !== 'string' || !id.test(v.expectedAfterResultId))
      || v.policyVersion !== REPAIR_EFFECTIVENESS_POLICY) comparisonFail('comparison_input_invalid')
    return JSON.parse(canonicalJson(v))
  } catch { return comparisonFail('comparison_input_invalid') }
}
export function repairComparisonId(request: RepairComparisonRequest): string {
  return 'comparison-' + canonicalJsonSha256({projectId:request.projectId,beforeResultId:request.beforeResultId,
    afterExecutionId:request.afterExecutionId,policyVersion:request.policyVersion})
}
export interface RepairEffectivenessEvidence {
  schemaVersion: typeof REPAIR_EFFECTIVENESS_SCHEMA
  comparisonId: string
  request: RepairComparisonRequest
  state: RepairEffectivenessState
  reason: RepairEffectivenessReason
  provenance: Record<string, unknown>
  evidenceHash: string
}
export type RepairComparisonResult = {kind:'compared';evidence:RepairEffectivenessEvidence;replayed:boolean}
  | {kind:'pending';state:'INCONCLUSIVE';reason:'execution_not_terminal';comparisonId:string}

/** Bounded selector/action evidence only. Authority and canonical integrity must
 * be established by the storage owner before this projection is consumed. */
export function classifyRepairEffectiveness(before: DiagnosticEvidenceV1, after: DiagnosticEvidenceV1 | null): {
  state: RepairEffectivenessState; reason: RepairEffectivenessReason
} {
  if (!after) return {state:'INCONCLUSIVE',reason:'no_result_observed'}
  if (after.targetObservation.outcome === 'not_observed') return {state:'REPAIR_NOT_CONFIRMED',reason:'approved_target_absent'}
  if (after.targetObservation.outcome === 'not_performed') return {state:'INCONCLUSIVE',reason:'target_not_reached'}
  if (after.targetObservation.cardinality !== 'one') return {state:'INCONCLUSIVE',reason:'target_not_unique'}
  if (after.action.outcome === 'completed') return {state:'REPAIR_CONFIRMED',reason:'target_action_completed'}
  if (after.action.outcome === 'not_completed') {
    return before.action.outcome === 'not_completed' && before.action.failureClass === after.action.failureClass
      ? {state:'REPAIR_NOT_CONFIRMED',reason:'same_target_action_failure'}
      : {state:'INCONCLUSIVE',reason:'different_target_action_failure'}
  }
  return {state:'INCONCLUSIVE',reason:'target_action_evidence_incomplete'}
}
