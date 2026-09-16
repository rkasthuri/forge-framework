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
import {RepairAuthorityRepository} from '../storage/repositories/RepairAuthorityRepository'
import {GovernedRepairProposalService} from './GovernedRepairProposalService'
import {workflowFail,workflowId,workflowObject,workflowSame,type RepairWorkflowEntry} from './RepairWorkflowContract'
import {GovernedRepairDecisionService} from './GovernedRepairDecisionService'
import {GovernedRepairMaterializationService} from './GovernedRepairMaterializationService'
import {GovernedRepairComparisonService} from './GovernedRepairComparisonService'
import {GovernedRepairDispositionService} from './GovernedRepairDispositionService'
import {repairAuthorityHash,assertApprovedCorrespondence} from '../storage/RepairAuthorityValidation'
import {getProductDb} from '../storage/db'
import {AppModelRepository} from '../storage/repositories/AppModelRepository'
import {readWorkflowOriginal} from '../storage/RepairWorkflowAuthority'
import {REPAIR_EFFECTIVENESS_POLICY} from './RepairEffectivenessContract'
import type {RepairDispositionRequest} from './RepairDispositionContract'
import type {RepairMaterializationInput} from '../storage/RepairMaterializationAuthority'
import type {RepairRerunSelection} from '../storage/RepairExecutionAuthority'

/** Product composition only; canonical services and repositories own all authority. */
export class GovernedRepairWorkflowService {
  constructor(private readonly workspaceRoot:string,private readonly repository=new RepairAuthorityRepository(),private readonly now=()=>new Date().toISOString()) {}
  context(projectId:string,resultId:string) {return this.repository.workflowContext(this.workspaceRoot,projectId,resultId,this.now())}
  create(projectId:string,resultId:string,input:unknown) {return this.repository.createWorkflowEntry(this.workspaceRoot,projectId,resultId,input,this.now())}
  async list(projectId:string) {
    if(!workflowId(projectId))workflowFail('invalid_request')
    return (await this.repository.listWorkflowEntries()).filter(e=>e.projectId===projectId)
  }
  async read(projectId:string,entryId:string) {
    if(!workflowId(entryId))workflowFail('invalid_request')
    const entry=(await this.list(projectId)).find(e=>e.entryId===entryId)
    if(!entry)workflowFail('repair_entry_not_found')
    const proposal=await new GovernedRepairProposalService(this.workspaceRoot).readExact(entry.request,entry.proposalId)
    if(proposal.kind==='refused')workflowFail(proposal.code)
    const original=await readWorkflowOriginal(getProductDb(),projectId,entry.originalEvidence.resultId)
    const inventory=await this.repository.workflowAuthorityInventory()
    const unique=(values:any[])=>{if(values.length>1)workflowFail();return values[0]??null}
    const decision=unique(inventory.authorities.repair_decisions.filter(d=>d.proposalAuthority.proposalId===entry.proposalId))
    const supersession=unique(inventory.authorities.app_model_transition_supersessions.filter(s=>s.proposalAuthority.proposalId===entry.proposalId))
    const origin=unique(inventory.authorities.repair_revision_origins.filter(o=>o.proposalAuthority.proposalId===entry.proposalId))
    if(decision) {
      const checked=await new GovernedRepairDecisionService(this.workspaceRoot).readExact(entry.request,decision)
      if(checked.kind==='refused')workflowFail(checked.code)
    }
    if(supersession) {
      if(!decision||decision.decision!=='approve')workflowFail()
      assertApprovedCorrespondence(proposal.proposal,decision,supersession)
    }
    let materialization:RepairMaterializationInput|null=null
    if(origin) {
      if(!supersession)workflowFail()
      const set=await getProductDb().selectFrom('test_set_revisions').select('generation_id').where('id','=',origin.testSetRowId).executeTakeFirstOrThrow()
      materialization={request:entry.request,supersession,generationId:set.generation_id,repairOriginId:origin.repairOriginId,generatedAt:origin.createdAt}
      const checked=await new GovernedRepairMaterializationService(this.workspaceRoot).readExact(materialization)
      if(checked.kind==='refused')workflowFail(checked.code)
    }
    const bindings=inventory.bindings.filter(b=>b.selection.materialization.request.projectId===projectId&&b.origin.proposalAuthority.proposalId===entry.proposalId)
    const matched=bindings.filter(b=>workflowSame(b.selection.originalEvidence,entry.originalEvidence))
    const executions=[]
    const {PersistedEvidenceAggregator,hasInvalidPersistedEvidence}=await import('../execution/PersistedEvidenceAggregator')
    for(const binding of matched) {
      const read=await new PersistedEvidenceAggregator(getProductDb).read(projectId,binding.row.execution_id)
      if(read.kind!=='ok'||hasInvalidPersistedEvidence(read.aggregation))workflowFail()
      const result=unique(read.evidence.results),execution=read.evidence.execution
      executions.push({executionId:binding.row.execution_id,executionIntentKey:execution.execution_intent_key,
        terminal:read.aggregation.execution.terminal,aggregation:read.aggregation.execution,result,binding:binding.selection})
    }
    const intent=this.intent(entry),execution=unique(executions.filter(e=>e.executionIntentKey===intent))
    const comparison=execution?await this.repository.readRepairComparison(projectId,execution.executionId):null
    const dispositionRequest=comparison&&origin?this.dispositionRequest(comparison,origin):null
    const disposition=dispositionRequest?await new GovernedRepairDispositionService(this.workspaceRoot).read(dispositionRequest):null
    const dispositionEligibility=dispositionRequest?await new GovernedRepairDispositionService(this.workspaceRoot).eligibility(dispositionRequest):null
    const nextActions:string[]=disposition?[]:comparison?[dispositionEligibility!.action]:execution?(execution.terminal?['compare']:['observe_execution','cancel_execution']):origin?['repair_rerun']:supersession?['materialize']:decision?(decision.decision==='approve'?['promote']:[]):['approve','reject']
    let operationReadiness:{state:'current'|'refused';code:string|null}={state:'current',code:null}
    try {await this.requireCurrent(entry)} catch(cause) {
      operationReadiness={state:'refused',code:(cause as {code?:string}).code??'candidate_integrity_unavailable'}
      for(let i=nextActions.length-1;i>=0;i--)if(['approve','promote','materialize','repair_rerun'].includes(nextActions[i]))nextActions.splice(i,1)
    }
    return {entry,proposal:proposal.proposal,originalResult:original.result,originalDiagnostic:original.evidence,decision,supersession,origin,
      materialization,execution,executions,executionIntentKey:intent,comparison,disposition,dispositionEligibility,nextActions,operationReadiness,integrity:'valid' as const}
  }

  private intent(entry:RepairWorkflowEntry) {return 'repair-rerun-'+entry.entryId}
  private async requireCurrent(entry:RepairWorkflowEntry) {
    const active=await new AppModelRepository().getActiveCommitted(entry.projectId)
    if(!active||active.rowId!==entry.request.candidate.modelRowId)workflowFail('stale_candidate')
  }
  private dispositionRequest(comparison:any,origin:any):RepairDispositionRequest {
    return {comparison:comparison.request,comparisonId:comparison.comparisonId,evidenceHash:comparison.evidenceHash,
      repairOriginId:origin.repairOriginId,supersessionAuthorityId:origin.supersessionAuthorityId,supersessionAuthorityHash:origin.supersessionAuthorityHash,
      resultingDefinitionAuthority:origin.resultingDefinitionAuthority}
  }
  async selection(projectId:string,entryId:string,intentKey:unknown):Promise<RepairRerunSelection> {
    const view=await this.read(projectId,entryId)
    if(intentKey!==view.executionIntentKey)workflowFail('execution_intent_conflict')
    if(!view.origin||!view.materialization)workflowFail('invalid_next_stage')
    if(view.execution)return view.execution.binding
    await this.requireCurrent(view.entry)
    return {kind:'repair_rerun',materialization:view.materialization,resultingDefinitionAuthority:view.origin.resultingDefinitionAuthority,originalEvidence:view.entry.originalEvidence}
  }
  async command(projectId:string,entryId:string,input:unknown) {
    const human=['approve','reject','resolve_bounded_repair','close_unsuccessful','record_inconclusive']
    const action=(input as any)?.action
    const body=workflowObject(input,human.includes(action)?['action','actorId']:['action'])
    if(!['approve','reject','promote','materialize','compare',...human.slice(2)].includes(body.action)||human.includes(action)&&!workflowId(body.actorId))workflowFail('invalid_request')
    const view=await this.read(projectId,entryId),entry=view.entry,decisions=new GovernedRepairDecisionService(this.workspaceRoot)
    if(action==='approve'||action==='reject') {
      if(view.decision) {
        if(view.decision.decision!==action||view.decision.decidedBy.actorId!==body.actorId)workflowFail('decision_identity_conflict')
        const replay=await decisions.accept(entry.request,view.decision);if(replay.kind==='refused')workflowFail(replay.code)
      } else {
        if(action==='approve')await this.requireCurrent(entry)
        const declaration:any={schemaVersion:'forge.m5.transition-correspondence-decision/v1',decisionId:'repair-decision-'+entry.entryId,decisionHash:'0'.repeat(64),
          projectId,proposalAuthority:{proposalId:entry.proposalId,proposalHash:entry.proposalHash},source:view.proposal.source,candidate:view.proposal.candidate,
          decision:action,decidedBy:{kind:'human',actorId:body.actorId},decidedAt:this.now()}
        declaration.decisionHash=repairAuthorityHash('repair_decisions',declaration)
        const accepted=await decisions.accept(entry.request,declaration);if(accepted.kind==='refused')workflowFail(accepted.code)
      }
    } else if(action==='promote') {
      if(!view.decision||view.decision.decision!=='approve')workflowFail('invalid_next_stage')
      if(!view.supersession)await this.requireCurrent(entry)
      const promoted=await decisions.promote(entry.request,view.decision,view.supersession?.authorityId??'repair-supersession-'+entry.entryId,view.supersession?.promotedAt??this.now())
      if(promoted.kind==='refused')workflowFail(promoted.code)
    } else if(action==='materialize') {
      if(!view.supersession)workflowFail('invalid_next_stage')
      if(!view.materialization)await this.requireCurrent(entry)
      const materialized=await new GovernedRepairMaterializationService(this.workspaceRoot).materialize(view.materialization??{
        request:entry.request,supersession:view.supersession,generationId:'repair-generation-'+entry.entryId,repairOriginId:'repair-origin-'+entry.entryId,generatedAt:this.now()})
      if(materialized.kind==='refused')workflowFail(materialized.code)
    } else if(action==='compare') {
      if(!view.execution?.terminal)workflowFail('invalid_next_stage')
      await new GovernedRepairComparisonService(this.workspaceRoot).compare({projectId,beforeResultId:entry.originalEvidence.resultId,
        afterExecutionId:view.execution.executionId,expectedAfterResultId:view.execution.result?.result_id??null,policyVersion:REPAIR_EFFECTIVENESS_POLICY})
    } else {
      if(!view.comparison||!view.origin)workflowFail('invalid_next_stage')
      if(view.disposition&&(view.disposition.decision.action!==action||view.disposition.decision.actor.actorId!==body.actorId))workflowFail('disposition_identity_conflict')
      await new GovernedRepairDispositionService(this.workspaceRoot).dispose(this.dispositionRequest(view.comparison,view.origin),view.disposition?.decision??{
        decisionId:'repair-disposition-decision-'+entry.entryId,actor:{kind:'human',actorId:body.actorId},decidedAt:this.now(),action})
    }
    return this.read(projectId,entryId)
  }
}
