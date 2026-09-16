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
import {validateRepairJson} from '../storage/RepairAuthorityValidation'
import {validateRepairRequestEnvelope,type RepairProposalRequest} from './GovernedRepairEligibility'
import type {RepairOriginalEvidence} from '../storage/RepairExecutionAuthority'

export class RepairWorkflowError extends Error {
  constructor(readonly code:string) {super('Repair workflow unavailable: '+code);this.name='RepairWorkflowError'}
}
export function workflowFail(code='repair_integrity_invalid'):never {throw new RepairWorkflowError(code)}
export const workflowId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(v)
export const workflowSame=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b)
export function workflowObject(value:unknown,keys:string[]):Record<string,any> {
  try {validateRepairJson(value)} catch {return workflowFail('invalid_request')}
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==keys.sort().join('|'))workflowFail('invalid_request')
  return JSON.parse(canonicalJson(value))
}
export interface RepairWorkflowEntry {
  schemaVersion:'forge.m5.repair-workflow-entry/v1';entryId:string;entryHash:string;projectId:string;
  originalEvidence:RepairOriginalEvidence;request:RepairProposalRequest;proposalId:string;proposalHash:string;
}
export function createWorkflowEntry(originalEvidence:RepairOriginalEvidence,request:RepairProposalRequest,proposal:Record<string,any>):RepairWorkflowEntry {
  const entry:any={schemaVersion:'forge.m5.repair-workflow-entry/v1',entryId:'repair-entry-'+canonicalJsonSha256({originalEvidence,proposalId:proposal.proposalId}),
    projectId:request.projectId,originalEvidence,request,proposalId:proposal.proposalId,proposalHash:proposal.proposalHash}
  return freezeWorkflowEntry({...entry,entryHash:canonicalJsonSha256(entry)})
}
export function freezeWorkflowEntry(value:unknown):RepairWorkflowEntry {
  const v=workflowObject(value,['schemaVersion','entryId','entryHash','projectId','originalEvidence','request','proposalId','proposalHash'])
  validateRepairRequestEnvelope(v.request)
  const e=workflowObject(v.originalEvidence,['executionId','runId','resultId','itemOrdinal','planHash','evidenceSchemaVersion','evidenceHash'])
  if(v.schemaVersion!=='forge.m5.repair-workflow-entry/v1'||![v.entryId,v.projectId,v.proposalId,e.executionId,e.runId,e.resultId].every(workflowId)
    ||v.projectId!==v.request.projectId||![v.entryHash,v.proposalHash,e.planHash,e.evidenceHash].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))
    ||e.evidenceSchemaVersion!=='forge.m4.diagnostic-evidence/v1'||!Number.isSafeInteger(e.itemOrdinal)||e.itemOrdinal<1)workflowFail()
  const {entryHash,...body}=v
  if(canonicalJsonSha256(body)!==entryHash||v.entryId!=='repair-entry-'+canonicalJsonSha256({originalEvidence:e,proposalId:v.proposalId}))workflowFail()
  return v as RepairWorkflowEntry
}
