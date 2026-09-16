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
import {sql,type Kysely,type Transaction} from 'kysely'
import type {Database} from './types'
import {canonicalJson} from './JsonAppModelMigrationPlanner'
import {AppModelRepository} from './repositories/AppModelRepository'
import {DiagnosticEvidenceRepository} from './repositories/DiagnosticEvidenceRepository'
import {HistoricalDefinitionAuthorityResolver} from '../execution/HistoricalDefinitionAuthorityResolver'
import {parseDiagnosticEvidenceV1,DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION} from '../execution/DiagnosticEvidenceContract'
import {checkedRepairTestSetRow,repairDefinitionAuthority} from './RepairMaterializationAuthority'
import {assertRepairSourceTargeted} from './RepairEffectivenessAuthority'
import {TestDefinitionAuthorityProjectionService} from '../test-design/TestDefinitionAuthorityProjectionService'
import {enumeratePhysicalEndpointSlots,governedRepairEndpoint,type GovernedPhysicalCandidate,type RepairProposalRequest} from '../healing/GovernedRepairEligibility'
import {freezeWorkflowEntry,workflowFail,workflowSame,type RepairWorkflowEntry} from '../healing/RepairWorkflowContract'
import {isExactRepairAuthorityRow,projectRepairAuthorityColumns,parseRepairAuthority} from './RepairAuthorityValidation'
import {isExactProposalIdentityRow,projectProposalIdentityColumns,parseProposalIdentityAuthority,assertProposalIdentityPair} from './RepairProposalIdentityAuthority'

export async function readWorkflowOriginal(db:Kysely<Database>,projectId:string,resultId:string) {
  const {PersistedEvidenceAggregator,hasInvalidPersistedEvidence}=await import('../execution/PersistedEvidenceAggregator')
  const result=await db.selectFrom('test_results').selectAll().where('result_id','=',resultId).executeTakeFirst()
  if(!result||!result.run_id||!result.execution_item_ordinal)workflowFail('original_result_unavailable')
  const run=await db.selectFrom('runs').selectAll().where('run_id','=',result.run_id).where('app_name','=',projectId).executeTakeFirst()
  if(!run?.execution_id)workflowFail('original_result_unavailable')
  const snapshot=await new PersistedEvidenceAggregator(()=>db).read(projectId,run.execution_id,db as Transaction<Database>)
  if(snapshot.kind!=='ok'||hasInvalidPersistedEvidence(snapshot.aggregation)||!snapshot.aggregation.execution.terminal)workflowFail('original_evidence_invalid')
  if(!['failed','could_not_verify'].includes(result.status))workflowFail('original_result_not_nonpassing')
  const diagnostic=await new DiagnosticEvidenceRepository(()=>db).readExact({projectId,executionId:run.execution_id,runId:run.run_id,
    itemOrdinal:result.execution_item_ordinal,evidenceSchemaVersion:DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION},db as Transaction<Database>)
  if(!diagnostic||diagnostic.result_id!==resultId)workflowFail('diagnostic_unavailable')
  const evidence=parseDiagnosticEvidenceV1(JSON.parse(diagnostic.evidence_json))
  const historical=await new HistoricalDefinitionAuthorityResolver(()=>db).resolve({projectId,executionId:run.execution_id,runId:run.run_id,
    itemOrdinal:result.execution_item_ordinal,resultId,definitionId:result.definition_id!,executablePlanHash:result.executable_plan_hash!},db as Transaction<Database>)
  if(!workflowSame(historical,evidence.authority))workflowFail()
  assertRepairSourceTargeted(evidence,diagnostic.evidence_hash)
  const item=await db.selectFrom('execution_item_authorities').selectAll().where('execution_id','=',run.execution_id).where('item_ordinal','=',result.execution_item_ordinal).executeTakeFirstOrThrow()
  const row=await db.selectFrom('test_set_revisions').selectAll().where('id','=',item.test_set_row_id).executeTakeFirstOrThrow()
  const parsed=checkedRepairTestSetRow(row),definition=parsed.value.definitions.find(d=>d.id===result.definition_id)
  if(!definition||parsed.value.definitions.length!==1)workflowFail('unsupported_source_definition')
  const sourceDefinitionAuthority=repairDefinitionAuthority(parsed.value,row.id)
  const originalEvidence={executionId:run.execution_id,runId:run.run_id,resultId,itemOrdinal:result.execution_item_ordinal,
    planHash:result.executable_plan_hash!,evidenceSchemaVersion:DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION,evidenceHash:diagnostic.evidence_hash}
  const terminal=snapshot.evidence.events.find(e=>e.event_type==='terminal')!
  return {result,diagnostic,evidence,definition,sourceDefinitionAuthority,originalEvidence,terminalAt:terminal.occurred_at}
}

export async function prepareWorkflowProposal(db:Kysely<Database>,projectId:string,resultId:string,proposedAt:string) {
  const original=await readWorkflowOriginal(db,projectId,resultId),models=new AppModelRepository()
  if(Date.parse(proposedAt)<Date.parse(original.terminalAt))workflowFail('stale_authority')
  const source=await models.getCommittedById(original.sourceDefinitionAuthority.modelRowId,db)
  const candidate=await models.getActiveCommitted(projectId,db)
  if(!candidate)workflowFail('candidate_not_found')
  const support=new TestDefinitionAuthorityProjectionService(models)
  const sourceSupport=await support.readExact(projectId,source.rowId,db),candidateSupport=await support.readExact(projectId,candidate.rowId,db)
  if(sourceSupport.kind!=='ok'||candidateSupport.kind!=='ok')workflowFail('candidate_not_governed')
  const target=original.evidence.targetObservation
  if(target.outcome==='not_performed')workflowFail('comparison_source_not_targeted')
  const d=original.definition.normalizedIntent
  const sourceSlots=enumeratePhysicalEndpointSlots(source.snapshot).flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>({...slot,strategy,strategyPosition})))
    .filter(slot=>slot.flow.id===d.grounding.sourceFlowId&&d.grounding.selectedFlowStepIndexes.includes(slot.step.stepIndex)
      &&slot.source.id===target.targetAuthority.subjectId&&slot.element.id===target.targetAuthority.elementId
      &&slot.strategy.type==='data-test'&&slot.strategy.value===target.targetAuthority.selectorValue)
  if(sourceSlots.length!==1)workflowFail('unsupported_source_definition')
  const s=sourceSlots[0]
  const candidates=enumeratePhysicalEndpointSlots(candidate.snapshot).filter(slot=>slot.flow.id===s.flow.id&&slot.step.stepIndex===s.step.stepIndex
    &&slot.source.id===s.source.id&&slot.target.id===s.target.id&&slot.element.id===s.element.id)
    .flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>({...slot,strategy,strategyPosition})))
    .filter(slot=>slot.strategy.type==='data-test'&&slot.strategy.value!==s.strategy.value)
  if(!candidates.length)workflowFail('candidate_not_found')
  // A nomination cannot reduce the governed evaluator's full physical candidate set.
  const requests:RepairProposalRequest[]=candidates.map(c=>({projectId,sourceDefinitionAuthority:original.sourceDefinitionAuthority,
    source:governedRepairEndpoint(source.rowId,source.snapshot,sourceSupport.authority,s),
    candidate:governedRepairEndpoint(candidate.rowId,candidate.snapshot,candidateSupport.authority,c as GovernedPhysicalCandidate),proposedAt}))
  return {...original,candidateModelRowId:candidate.rowId,requests}
}

export function workflowEntryRow(entry:RepairWorkflowEntry) {
  return {entry_id:entry.entryId,project_id:entry.projectId,original_result_id:entry.originalEvidence.resultId,
    proposal_id:entry.proposalId,canonical_payload:canonicalJson(entry),entry_hash:entry.entryHash}
}
export function isExactWorkflowEntry(rowJson:unknown,proposalJson:unknown,resultJson:unknown,diagnosticJson:unknown):number {
  try {
    if([rowJson,proposalJson,resultJson,diagnosticJson].some(v=>typeof v!=='string'))return 0
    const row=JSON.parse(rowJson as string),entry=freezeWorkflowEntry(JSON.parse(row.canonical_payload)),proposalRow=JSON.parse(proposalJson as string)
    if(!workflowSame(row,workflowEntryRow(entry))||isExactRepairAuthorityRow('repair_proposals',proposalRow.canonical_payload,JSON.stringify(projectRepairAuthorityColumns('repair_proposals',proposalRow)))!==1)return 0
    const proposal=parseRepairAuthority('repair_proposals',proposalRow.canonical_payload),result=JSON.parse(resultJson as string),diagnostic=JSON.parse(diagnosticJson as string)
    const e=entry.originalEvidence,evidence=parseDiagnosticEvidenceV1(JSON.parse(diagnostic.evidence_json))
    assertRepairSourceTargeted(evidence,diagnostic.evidence_hash)
    return proposal.proposalId===entry.proposalId&&proposal.proposalHash===entry.proposalHash&&proposal.projectId===entry.projectId
      &&workflowSame(proposal.source,entry.request.source)&&workflowSame(proposal.candidate,entry.request.candidate)&&proposal.proposedAt===entry.request.proposedAt
      &&result.result_id===e.resultId&&result.run_id===e.runId&&result.execution_item_ordinal===e.itemOrdinal&&result.executable_plan_hash===e.planHash
      &&['failed','could_not_verify'].includes(result.status)&&diagnostic.project_id===entry.projectId&&diagnostic.result_id===e.resultId
      &&diagnostic.execution_id===e.executionId&&diagnostic.run_id===e.runId&&diagnostic.item_ordinal===e.itemOrdinal&&diagnostic.evidence_hash===e.evidenceHash
      &&diagnostic.evidence_schema_version===e.evidenceSchemaVersion&&diagnostic.definition_id===entry.request.sourceDefinitionAuthority.definitionId?1:0
  } catch {return 0}
}
export async function readWorkflowEntries(db:Kysely<Database>):Promise<RepairWorkflowEntry[]> {
  const tables=await sql<{name:string}>`SELECT name FROM sqlite_schema WHERE type='table' AND name='repair_workflow_entries'`.execute(db)
  if(!tables.rows.length)workflowFail('repair_workspace_upgrade_required')
  if((await sql`PRAGMA foreign_key_check`.execute(db)).rows.length)workflowFail()
  const rows=await db.selectFrom('repair_workflow_entries').selectAll().execute(),entries:RepairWorkflowEntry[]=[]
  for(const row of rows) {
    const entry=freezeWorkflowEntry(JSON.parse(row.canonical_payload))
    const proposal=await db.selectFrom('repair_proposals').selectAll().where('proposal_id','=',entry.proposalId).executeTakeFirst()
    const result=await db.selectFrom('test_results').selectAll().where('result_id','=',entry.originalEvidence.resultId).executeTakeFirst()
    const diagnostic=await db.selectFrom('diagnostic_evidence').selectAll().where('result_id','=',entry.originalEvidence.resultId).executeTakeFirst()
    if(isExactWorkflowEntry(JSON.stringify(row),JSON.stringify(proposal),JSON.stringify(result),JSON.stringify(diagnostic))!==1)workflowFail()
    const witness=await db.selectFrom('repair_proposal_identity_authorities').selectAll().where('proposal_id','=',entry.proposalId).executeTakeFirst()
    if(!proposal||!witness||isExactProposalIdentityRow(witness.canonical_payload,JSON.stringify(projectProposalIdentityColumns(witness)))!==1)workflowFail()
    assertProposalIdentityPair(parseProposalIdentityAuthority(witness.canonical_payload),parseRepairAuthority('repair_proposals',proposal.canonical_payload),proposal.identity_authority_hash)
    const original=await readWorkflowOriginal(db,entry.projectId,entry.originalEvidence.resultId)
    if(!workflowSame(original.originalEvidence,entry.originalEvidence)||!workflowSame(original.sourceDefinitionAuthority,entry.request.sourceDefinitionAuthority)
      ||Date.parse(entry.request.proposedAt)<Date.parse(original.terminalAt))workflowFail()
    entries.push(entry)
  }
  return entries
}
