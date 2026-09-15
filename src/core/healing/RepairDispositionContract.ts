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
import {canonicalJson,canonicalJsonSha256} from '../storage/JsonAppModelMigrationPlanner'
import {validateRepairJson,validateRepairComponent} from '../storage/RepairAuthorityValidation'
import {freezeRepairComparison,type RepairComparisonRequest,type RepairEffectivenessEvidence,type RepairEffectivenessState} from './RepairEffectivenessContract'

export const REPAIR_DISPOSITION_SCHEMA='forge.m5.repair-disposition/v1' as const
export interface RepairDispositionRequest {
  comparison:RepairComparisonRequest
  comparisonId:string
  evidenceHash:string
  repairOriginId:string
  supersessionAuthorityId:string
  supersessionAuthorityHash:string
  resultingDefinitionAuthority:Record<string,unknown>
}
export type RepairDispositionAction='resolve_bounded_repair'|'close_unsuccessful'|'record_inconclusive'
export type RepairDispositionState='bounded_repair_resolved'|'repair_unsuccessful'|'manual_followup_required'
export interface RepairDispositionDecision {
  decisionId:string
  actor:{kind:'human';actorId:string}
  decidedAt:string
  action:RepairDispositionAction
}
export interface RepairDispositionEvidence {
  schemaVersion:typeof REPAIR_DISPOSITION_SCHEMA
  dispositionId:string
  request:RepairDispositionRequest
  decision:RepairDispositionDecision
  state:RepairDispositionState
  effectiveness:{comparisonId:string;evidenceHash:string;state:RepairEffectivenessState;reason:RepairEffectivenessEvidence['reason']}
  provenance:RepairEffectivenessEvidence['provenance']
  dispositionHash:string
}
export type RepairDispositionResult={kind:'disposed';evidence:RepairDispositionEvidence;replayed:boolean}
export class RepairDispositionError extends Error {
  constructor(readonly code:'disposition_input_invalid'|'disposition_evidence_unavailable'|'disposition_authority_invalid'|'disposition_identity_conflict'|'disposition_action_ineligible'|'disposition_transaction_unsupported'|'disposition_persistence_failed'='disposition_authority_invalid') {
    super('Repair disposition refused: '+code);this.name='RepairDispositionError'
  }
}
export function dispositionFail(code?:RepairDispositionError['code']):never {throw new RepairDispositionError(code)}
const keys=(value:object,names:string[])=>Object.keys(value).sort().join('|')===[...names].sort().join('|')
const id=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(v)
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
export function freezeRepairDisposition(value:unknown):RepairDispositionRequest {
  try {
    validateRepairJson(value)
    const v=value as RepairDispositionRequest
    if(!v||!keys(v,['comparison','comparisonId','evidenceHash','repairOriginId','supersessionAuthorityId','supersessionAuthorityHash','resultingDefinitionAuthority'])
      ||![v.comparisonId,v.repairOriginId,v.supersessionAuthorityId].every(id)||!hash(v.evidenceHash)||!hash(v.supersessionAuthorityHash))throw Error('input')
    freezeRepairComparison(v.comparison);validateRepairComponent('definitionAuthority',v.resultingDefinitionAuthority)
    return JSON.parse(canonicalJson(v))
  } catch {return dispositionFail('disposition_input_invalid')}
}
export function freezeRepairDispositionDecision(value:unknown):RepairDispositionDecision {
  try {
    validateRepairJson(value)
    const v=value as RepairDispositionDecision
    if(!v||!keys(v,['decisionId','actor','decidedAt','action'])||!id(v.decisionId)||!v.actor||!keys(v.actor,['kind','actorId'])
      ||v.actor.kind!=='human'||!id(v.actor.actorId)||typeof v.decidedAt!=='string'||!Number.isFinite(Date.parse(v.decidedAt))
      ||new Date(v.decidedAt).toISOString()!==v.decidedAt||!['resolve_bounded_repair','close_unsuccessful','record_inconclusive'].includes(v.action))throw Error('input')
    return JSON.parse(canonicalJson(v))
  } catch {return dispositionFail('disposition_input_invalid')}
}
export function repairDispositionPolicy(state:RepairEffectivenessState):{action:RepairDispositionAction;state:RepairDispositionState} {
  switch(state) {
    case 'REPAIR_CONFIRMED':return {action:'resolve_bounded_repair',state:'bounded_repair_resolved'}
    case 'REPAIR_NOT_CONFIRMED':return {action:'close_unsuccessful',state:'repair_unsuccessful'}
    case 'INCONCLUSIVE':return {action:'record_inconclusive',state:'manual_followup_required'}
    default:return dispositionFail()
  }
}
export function repairDispositionId(comparisonId:string):string {return 'disposition-'+canonicalJsonSha256({comparisonId,schemaVersion:REPAIR_DISPOSITION_SCHEMA})}
