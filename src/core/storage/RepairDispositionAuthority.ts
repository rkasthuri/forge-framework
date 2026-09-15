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
import {sql,type Kysely} from 'kysely'
import type {Database} from './types'
import {canonicalJson,canonicalJsonSha256} from './JsonAppModelMigrationPlanner'
import {repairEffectivenessRowsSql,isExactRepairEffectiveness,inspectRepairComparison,readRepairComparisonEvidence} from './RepairEffectivenessAuthority'
import type {RepairEffectivenessEvidence} from '../healing/RepairEffectivenessContract'
import {dispositionFail,freezeRepairDisposition,freezeRepairDispositionDecision,repairDispositionPolicy,repairDispositionId,REPAIR_DISPOSITION_SCHEMA,
  type RepairDispositionRequest,type RepairDispositionDecision,type RepairDispositionEvidence} from '../healing/RepairDispositionContract'

type Row=Record<string,any>
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b)
/** The row and underlying facts are selected by SQL, never supplied witnesses. */
export function repairDispositionRowsSql(request:string):string {
  const comparison=`json_extract(${request},'$.comparison')`
  const row=`(SELECT json_object('comparison_id',comparison_id,'project_id',project_id,'before_result_id',before_result_id,'after_execution_id',after_execution_id,'after_result_id',after_result_id,'policy_version',policy_version,'request_json',request_json,'canonical_payload',canonical_payload,'evidence_hash',evidence_hash) FROM repair_effectiveness_evidence WHERE comparison_id=json_extract(${request},'$.comparisonId'))`
  return `json_object('comparison',${row},'facts',${repairEffectivenessRowsSql(comparison)})`
}
function checkedComparison(request:RepairDispositionRequest,rows:{comparison:Row|null;facts:any}):RepairEffectivenessEvidence {
  const row=rows.comparison
  if(!row)dispositionFail('disposition_evidence_unavailable')
  if(isExactRepairEffectiveness(row.request_json,row.canonical_payload,row.evidence_hash,JSON.stringify(rows.facts))!==1)dispositionFail()
  const evidence=JSON.parse(row.canonical_payload) as RepairEffectivenessEvidence
  const r=evidence.request,p=evidence.provenance as Row,origin=p.repairOrigin
  if(!same(r,request.comparison)||row.request_json!==canonicalJson(r)||row.comparison_id!==evidence.comparisonId
    ||row.evidence_hash!==evidence.evidenceHash||row.project_id!==r.projectId||row.before_result_id!==r.beforeResultId
    ||row.after_execution_id!==r.afterExecutionId||row.after_result_id!==r.expectedAfterResultId||row.policy_version!==r.policyVersion
    ||evidence.comparisonId!==request.comparisonId||evidence.evidenceHash!==request.evidenceHash
    ||origin.repairOriginId!==request.repairOriginId||origin.supersessionAuthorityId!==request.supersessionAuthorityId
    ||origin.supersessionAuthorityHash!==request.supersessionAuthorityHash||!same(origin.resultingDefinitionAuthority,request.resultingDefinitionAuthority))dispositionFail('disposition_identity_conflict')
  return evidence
}
export function deriveRepairDisposition(requestValue:unknown,decisionValue:unknown,rows:{comparison:Row|null;facts:any}):RepairDispositionEvidence {
  const request=freezeRepairDisposition(requestValue),decision=freezeRepairDispositionDecision(decisionValue)
  const comparison=checkedComparison(request,rows),policy=repairDispositionPolicy(comparison.state),p=comparison.provenance as Row
  if(decision.action!==policy.action)dispositionFail('disposition_action_ineligible')
  const afterTime=p.after?.terminal?.occurred_at
  if(typeof afterTime!=='string'||!Number.isFinite(Date.parse(afterTime))||Date.parse(decision.decidedAt)<Date.parse(afterTime))dispositionFail('disposition_authority_invalid')
  const base={schemaVersion:REPAIR_DISPOSITION_SCHEMA,dispositionId:repairDispositionId(comparison.comparisonId),request,decision,state:policy.state,
    effectiveness:{comparisonId:comparison.comparisonId,evidenceHash:comparison.evidenceHash,state:comparison.state,reason:comparison.reason},provenance:comparison.provenance}
  return {...base,dispositionHash:canonicalJsonSha256(base)}
}
export function isExactRepairDisposition(requestJson:unknown,decisionJson:unknown,payloadJson:unknown,dispositionHash:unknown,rowsJson:unknown):number {
  try {
    if([requestJson,decisionJson,payloadJson,dispositionHash,rowsJson].some(v=>typeof v!=='string'))return 0
    const expected=deriveRepairDisposition(JSON.parse(requestJson as string),JSON.parse(decisionJson as string),JSON.parse(rowsJson as string))
    return canonicalJson(expected)===payloadJson&&expected.dispositionHash===dispositionHash?1:0
  } catch{return 0}
}
async function selectedRows(db:Kysely<Database>,request:RepairDispositionRequest) {
  const rows=(await sql<{payload:string}>`WITH input AS (SELECT ${canonicalJson(request)} AS payload) SELECT ${sql.raw(repairDispositionRowsSql('(SELECT payload FROM input)'))} AS payload`.execute(db)).rows
  return JSON.parse(rows[0].payload)
}
/** Fresh local authority and a committed comparison are both mandatory. This
 * does not call compareRepair or create a missing prerequisite on read. */
export async function inspectRepairDisposition(db:Kysely<Database>,workspaceRoot:string,request:RepairDispositionRequest) {
  const comparison=await readRepairComparisonEvidence(db,request.comparison.projectId,request.comparison.afterExecutionId)
  if(!comparison)dispositionFail('disposition_evidence_unavailable')
  const fresh=await inspectRepairComparison(db,workspaceRoot,request.comparison)
  if(fresh.kind!=='compared'||!same(comparison,fresh.evidence))dispositionFail()
  const rows=await selectedRows(db,request)
  checkedComparison(request,rows)
  return {comparison,rows}
}
export async function readRepairDispositionEvidence(db:Kysely<Database>,projectId:string,afterExecutionId:string):Promise<RepairDispositionEvidence|null> {
  const row=await db.selectFrom('repair_dispositions').selectAll().where('project_id','=',projectId).where('after_execution_id','=',afterExecutionId).executeTakeFirst()
  if(!row)return null
  const request=freezeRepairDisposition(JSON.parse(row.request_json)),rows=await selectedRows(db,request)
  if(isExactRepairDisposition(row.request_json,row.decision_json,row.canonical_payload,row.disposition_hash,JSON.stringify(rows))!==1)dispositionFail()
  const evidence=JSON.parse(row.canonical_payload) as RepairDispositionEvidence
  if(row.disposition_id!==evidence.dispositionId||row.comparison_id!==request.comparisonId||row.project_id!==request.comparison.projectId
    ||row.after_execution_id!==request.comparison.afterExecutionId||row.decision_id!==evidence.decision.decisionId
    ||row.request_json!==canonicalJson(evidence.request)||row.decision_json!==canonicalJson(evidence.decision))dispositionFail()
  return evidence
}
