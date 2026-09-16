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

import { Kysely, sql, type Transaction } from 'kysely'
import { canonicalJson } from '../JsonAppModelMigrationPlanner'
import { getProductDb } from '../db'
import type { Database } from '../types'
import { projectRepairAuthorityColumns, isExactRepairAuthorityRow, parseRepairAuthority, repairAuthorityRow, validateRepairAuthority } from '../RepairAuthorityValidation'
import { verifyRerunProductAuthority } from '../RepairRerunAuthority'
import { verifySourceProductAuthority } from '../RepairSourceAuthority'
import { freezeRepairComparison, RepairComparisonError, comparisonFail, type RepairComparisonResult } from '../../healing/RepairEffectivenessContract'
import { inspectRepairComparison, readRepairComparisonEvidence } from '../RepairEffectivenessAuthority'
import {freezeRepairDisposition,freezeRepairDispositionDecision,RepairDispositionError,dispositionFail,repairDispositionPolicy,
  type RepairDispositionResult} from '../../healing/RepairDispositionContract'
import {inspectRepairDisposition,deriveRepairDisposition,readRepairDispositionEvidence} from '../RepairDispositionAuthority'
import {GovernedRepairProposalService} from '../../healing/GovernedRepairProposalService'
import {firstRepairRefusal} from '../../healing/GovernedRepairEligibility'
import {prepareWorkflowProposal,readWorkflowEntries,workflowEntryRow} from '../RepairWorkflowAuthority'
import {createWorkflowEntry,workflowFail,workflowId,workflowObject,type RepairWorkflowEntry} from '../../healing/RepairWorkflowContract'
import {parseProposalIdentityAuthority,isExactProposalIdentityRow,projectProposalIdentityColumns,assertProposalIdentityPair} from '../RepairProposalIdentityAuthority'
import {readRepairExecutionBinding} from '../RepairExecutionAuthority'

// The native/WASM SQL function captures the actual root owner, never SQL input.
// Only this repository can grant exact-payload admission during its own insert.
const dispositionAdmissions=new WeakMap<object,string>()
const workflowAdmissions=new WeakMap<object,string>()
export function isRepairWorkflowAdmission(owner:unknown,payload:unknown):number {
  return owner!==null&&typeof owner==='object'&&typeof payload==='string'&&workflowAdmissions.get(owner)===payload?1:0
}
export function isRepairDispositionAdmission(owner:unknown,payload:unknown):number {
  return owner!==null&&typeof owner==='object'&&typeof payload==='string'&&dispositionAdmissions.get(owner)===payload?1:0
}

export interface AppModelTransitionSupersessionAuthorityV1 {
  schemaVersion: 'forge.m5.app-model-transition-supersession-authority/v1'
  authorityId: string
  authorityHash: string
  projectId: string
  relationKind: 'human_approved_semantic_successor'
  source: Record<string, unknown>
  candidate: Record<string, unknown>
  proposalAuthority: { proposalId: string; proposalHash: string }
  decisionAuthority: { decisionId: string; decisionHash: string; decision: 'approve' }
  approvedBy: { kind: 'human'; actorId: string }
  promotedAt: string
}

export class RepairAuthorityPersistenceError extends Error {
  constructor(readonly code:
    | 'REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED'
    | 'FOREIGN_KEYS_REQUIRED'
    | 'SUPERSESSION_INTEGRITY_INVALID'
    | 'SUPERSESSION_IDENTITY_CONFLICT'
    | 'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED') {
    super(code === 'REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED'
      ? 'Repair origin creation and replay require TestSetRepository.materializeApprovedRepair and its committed approval preflight.'
      : code === 'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'
      ? 'Supersession promotion requires GovernedRepairDecisionService and its committed-decision promotion boundary.'
      : code === 'FOREIGN_KEYS_REQUIRED'
      ? 'M5 repair authority persistence requires SQLite foreign-key enforcement.'
      : code === 'SUPERSESSION_IDENTITY_CONFLICT'
        ? 'Supersession authority identity conflicts with persisted authority.'
        : 'Supersession authority failed persisted integrity validation.')
    this.name = 'RepairAuthorityPersistenceError'
  }
}

export class RepairAuthorityRepository {
  constructor(private readonly database: () => Kysely<Database> = getProductDb) {}

  async listWorkflowEntries():Promise<RepairWorkflowEntry[]> {return readWorkflowEntries(this.database())}

  /** Canonical inventory is validated before locators select a workflow lineage. */
  async workflowAuthorityInventory() {
    const db=this.database(),authorities:Record<string,Record<string,any>[] >={}
    for(const table of ['repair_decisions','app_model_transition_supersessions','repair_revision_origins'] as const) {
      authorities[table]=[]
      for(const row of await db.selectFrom(table).selectAll().execute()) {
        if(isExactRepairAuthorityRow(table,row.canonical_payload,JSON.stringify(projectRepairAuthorityColumns(table,row)))!==1)workflowFail()
        authorities[table].push(parseRepairAuthority(table,row.canonical_payload))
      }
    }
    const bindings=[]
    for(const row of await db.selectFrom('execution_repair_bindings').selectAll().execute()) {
      const binding=await readRepairExecutionBinding(db,row.execution_id)
      if(!binding)workflowFail();bindings.push(binding)
    }
    // Validate projected terminal locators before a selected lookup can report
    // absence and offer a stage which has already been durably completed.
    for(const row of await db.selectFrom('repair_effectiveness_evidence').selectAll().execute()) {
      const evidence=await readRepairComparisonEvidence(db,row.project_id,row.after_execution_id)
      if(!evidence||evidence.comparisonId!==row.comparison_id)workflowFail()
    }
    for(const row of await db.selectFrom('repair_dispositions').selectAll().execute()) {
      const evidence=await readRepairDispositionEvidence(db,row.project_id,row.after_execution_id)
      if(!evidence||evidence.dispositionId!==row.disposition_id)workflowFail()
    }
    return {authorities,bindings}
  }

  async workflowContext(workspaceRoot:string,projectId:string,resultId:string,proposedAt:string) {
    if(!workflowId(projectId)||!workflowId(resultId))workflowFail('invalid_request')
    const db=this.database(),entries=await readWorkflowEntries(db)
    const existing=entries.filter(e=>e.projectId===projectId&&e.originalEvidence.resultId===resultId)
    if(existing.length)return {kind:'existing' as const,entries:existing}
    return this.inspectWorkflowCandidate(db,workspaceRoot,projectId,resultId,proposedAt)
  }

  private async inspectWorkflowCandidate(db:Kysely<Database>,workspaceRoot:string,projectId:string,resultId:string,proposedAt:string) {
    const prepared=await prepareWorkflowProposal(db,projectId,resultId,proposedAt),service=new GovernedRepairProposalService(workspaceRoot,this.database)
    // Resolve identity collisions using validated persisted bytes before a new
    // timestamp can be mistaken for a conflicting replay of generated identity.
    for(const row of await db.selectFrom('repair_proposals').selectAll().execute()) {
      if(isExactRepairAuthorityRow('repair_proposals',row.canonical_payload,JSON.stringify(projectRepairAuthorityColumns('repair_proposals',row)))!==1)workflowFail()
      const stored=parseRepairAuthority('repair_proposals',row.canonical_payload)
      const request=prepared.requests.find(r=>r.projectId===stored.projectId&&canonicalJson(r.source)===canonicalJson(stored.source)&&canonicalJson(r.candidate)===canonicalJson(stored.candidate))
      if(!request)continue
      const linked=(await readWorkflowEntries(db)).find(e=>e.proposalId===stored.proposalId)
      const witnessRow=await db.selectFrom('repair_proposal_identity_authorities').selectAll().where('proposal_id','=',stored.proposalId).executeTakeFirst()
      if(!witnessRow||isExactProposalIdentityRow(witnessRow.canonical_payload,JSON.stringify(projectProposalIdentityColumns(witnessRow)))!==1)workflowFail()
      const witness=parseProposalIdentityAuthority(witnessRow.canonical_payload)
      assertProposalIdentityPair(witness,stored,row.identity_authority_hash)
      const exact=await service.readExactInTransaction(linked?.request??{...request,proposedAt:stored.proposedAt,
        ...(witness.originKind==='caller'?{proposalId:stored.proposalId}:{})},stored.proposalId,db)
      if(exact.kind==='refused')workflowFail(exact.code)
      workflowFail(linked?'repair_context_conflict':'repair_association_unavailable')
    }
    const evaluations=[]
    for(const request of prepared.requests)evaluations.push({request,result:await service.evaluateInTransaction(request,db)})
    const eligible=evaluations.filter(e=>e.result.kind==='eligible')
    if(eligible.length!==1) {
      const refusals=evaluations.flatMap(e=>e.result.kind==='refused'?[e.result.code]:[])
      workflowFail(eligible.length?'candidate_ambiguous':firstRepairRefusal(refusals)??'candidate_not_found')
    }
    const selected=eligible[0],proposal=selected.result
    if(proposal.kind!=='eligible')workflowFail()
    const existingProposal=await db.selectFrom('repair_proposals').select('proposal_id').where('proposal_id','=',proposal.proposal.proposalId).executeTakeFirst()
    if(existingProposal) {
      const linked=(await readWorkflowEntries(db)).find(e=>e.proposalId===existingProposal.proposal_id)
      workflowFail(linked?'repair_context_conflict':'repair_association_unavailable')
    }
    return {kind:'eligible' as const,candidateModelRowId:prepared.candidateModelRowId,originalEvidence:prepared.originalEvidence,
      originalResult:prepared.result,diagnostic:prepared.evidence,request:selected.request,proposal:proposal.proposal,counts:proposal.counts}
  }

  async createWorkflowEntry(workspaceRoot:string,projectId:string,resultId:string,input:unknown,proposedAt:string) {
    const body=workflowObject(input,['candidateModelRowId'])
    if(!workflowId(projectId)||!workflowId(resultId)||!Number.isSafeInteger(body.candidateModelRowId)||body.candidateModelRowId<1)workflowFail('invalid_request')
    const owner=this.database()
    if(owner.isTransaction)workflowFail('repair_transaction_unsupported')
    return owner.connection().execute(async db=>{
      if(Number((await sql<{foreign_keys:number}>`PRAGMA foreign_keys`.execute(db)).rows[0]?.foreign_keys)!==1)workflowFail()
      try {await sql`BEGIN IMMEDIATE`.execute(db)} catch {workflowFail('repair_transaction_unsupported')}
      try {
        const entries=await readWorkflowEntries(db),existing=entries.find(e=>e.projectId===projectId&&e.originalEvidence.resultId===resultId&&e.request.candidate.modelRowId===body.candidateModelRowId)
        if(existing) {
          const replay=await new GovernedRepairProposalService(workspaceRoot,this.database).readExactInTransaction(existing.request,existing.proposalId,db)
          if(replay.kind==='refused')workflowFail(replay.code)
          await sql`COMMIT`.execute(db);return {entry:existing,replayed:true}
        }
        const context=await this.inspectWorkflowCandidate(db,workspaceRoot,projectId,resultId,proposedAt)
        if(context.candidateModelRowId!==body.candidateModelRowId)workflowFail('stale_candidate')
        const proposed=await new GovernedRepairProposalService(workspaceRoot,this.database).proposeInTransaction(context.request,db)
        if(proposed.kind==='refused')workflowFail(proposed.code)
        const entry=createWorkflowEntry(context.originalEvidence,context.request,proposed.proposal),payload=canonicalJson(entry)
        if(workflowAdmissions.has(owner))workflowFail('repair_transaction_unsupported')
        workflowAdmissions.set(owner,payload)
        try {await db.insertInto('repair_workflow_entries').values(workflowEntryRow(entry)).execute()} finally {workflowAdmissions.delete(owner)}
        if(!(await readWorkflowEntries(db)).some(e=>e.entryId===entry.entryId))workflowFail()
        await sql`COMMIT`.execute(db);return {entry,replayed:false}
      } catch(cause) {await sql`ROLLBACK`.execute(db);throw cause}
    })
  }

  async disposeRepair(workspaceRoot:string,requestValue:unknown,decisionValue:unknown):Promise<RepairDispositionResult> {
    const request=freezeRepairDisposition(requestValue),decision=freezeRepairDispositionDecision(decisionValue)
    return this.dispositionTransaction(async (connection,owner)=>{
      const {rows}=await inspectRepairDisposition(connection,workspaceRoot,request)
      const evidence=deriveRepairDisposition(request,decision,rows)
      const existing=await readRepairDispositionEvidence(connection,request.comparison.projectId,request.comparison.afterExecutionId)
      if(existing) {
        if(canonicalJson(existing)!==canonicalJson(evidence))dispositionFail('disposition_identity_conflict')
        return {kind:'disposed',evidence:existing,replayed:true}
      }
      if(await connection.selectFrom('repair_dispositions').select('decision_id').where('decision_id','=',decision.decisionId).executeTakeFirst())dispositionFail('disposition_identity_conflict')
      const payload=canonicalJson(evidence)
      if(dispositionAdmissions.has(owner))dispositionFail('disposition_transaction_unsupported')
      dispositionAdmissions.set(owner,payload)
      try {
        await connection.insertInto('repair_dispositions').values({disposition_id:evidence.dispositionId,comparison_id:request.comparisonId,
          project_id:request.comparison.projectId,after_execution_id:request.comparison.afterExecutionId,decision_id:decision.decisionId,
          request_json:canonicalJson(request),decision_json:canonicalJson(decision),canonical_payload:payload,disposition_hash:evidence.dispositionHash}).execute()
      } finally {dispositionAdmissions.delete(owner)}
      const reread=await readRepairDispositionEvidence(connection,request.comparison.projectId,request.comparison.afterExecutionId)
      if(!reread||canonicalJson(reread)!==payload)dispositionFail()
      return {kind:'disposed',evidence:reread,replayed:false}
    })
  }

  async repairDispositionEligibility(workspaceRoot:string,requestValue:unknown) {
    const request=freezeRepairDisposition(requestValue)
    return this.dispositionTransaction(async connection=>{
      const {comparison}=await inspectRepairDisposition(connection,workspaceRoot,request)
      const existing=await readRepairDispositionEvidence(connection,request.comparison.projectId,request.comparison.afterExecutionId)
      return {kind:'eligible' as const,comparisonId:comparison.comparisonId,evidenceHash:comparison.evidenceHash,
        effectivenessState:comparison.state,...repairDispositionPolicy(comparison.state),existing}
    })
  }

  async readRepairDisposition(workspaceRoot:string,requestValue:unknown) {
    const request=freezeRepairDisposition(requestValue)
    return this.dispositionTransaction(async connection=>{
      await inspectRepairDisposition(connection,workspaceRoot,request)
      return readRepairDispositionEvidence(connection,request.comparison.projectId,request.comparison.afterExecutionId)
    })
  }

  private async dispositionTransaction<T>(run:(connection:Kysely<Database>,owner:Kysely<Database>)=>Promise<T>):Promise<T> {
    const owner=this.database()
    if(owner.isTransaction)dispositionFail('disposition_transaction_unsupported')
    return owner.connection().execute(async connection=>{
      if(Number((await sql<{foreign_keys:number}>`PRAGMA foreign_keys`.execute(connection)).rows[0]?.foreign_keys)!==1)dispositionFail('disposition_transaction_unsupported')
      // BEGIN is outside rollback: never roll back a caller-owned transaction.
      try {await sql`BEGIN IMMEDIATE`.execute(connection)} catch {dispositionFail('disposition_transaction_unsupported')}
      try {const result=await run(connection,owner);await sql`COMMIT`.execute(connection);return result}
      catch(cause) {
        await sql`ROLLBACK`.execute(connection)
        if(cause instanceof RepairDispositionError)throw cause
        dispositionFail('disposition_authority_invalid')
      }
    })
  }

  /** Identity-only admission. The repository owns both read/write serialization
   * and fresh upstream validation; callers cannot supply effectiveness bytes. */
  async compareRepair(workspaceRoot:string, requestValue:unknown):Promise<RepairComparisonResult> {
    const request=freezeRepairComparison(requestValue),db=this.database()
    if(db.isTransaction)comparisonFail('comparison_transaction_unsupported')
    return db.connection().execute(async connection=>{
      if(Number((await sql<{foreign_keys:number}>`PRAGMA foreign_keys`.execute(connection)).rows[0]?.foreign_keys)!==1)comparisonFail('comparison_transaction_unsupported')
      await sql`BEGIN IMMEDIATE`.execute(connection)
      try {
        const computed=await inspectRepairComparison(connection,workspaceRoot,request)
        const existing=await readRepairComparisonEvidence(connection,request.projectId,request.afterExecutionId)
        if(computed.kind==='pending') {
          if(existing)comparisonFail()
          await sql`COMMIT`.execute(connection);return computed
        }
        if(existing) {
          if(canonicalJson(existing)!==canonicalJson(computed.evidence))comparisonFail('comparison_identity_conflict')
          await sql`COMMIT`.execute(connection);return {...computed,evidence:existing,replayed:true}
        }
        const evidence=computed.evidence
        await connection.insertInto('repair_effectiveness_evidence').values({comparison_id:evidence.comparisonId,project_id:request.projectId,
          before_result_id:request.beforeResultId,after_execution_id:request.afterExecutionId,after_result_id:request.expectedAfterResultId,
          policy_version:request.policyVersion,request_json:canonicalJson(request),canonical_payload:canonicalJson(evidence),evidence_hash:evidence.evidenceHash}).execute()
        const reread=await readRepairComparisonEvidence(connection,request.projectId,request.afterExecutionId)
        if(!reread||canonicalJson(reread)!==canonicalJson(evidence))comparisonFail()
        await sql`COMMIT`.execute(connection)
        return computed
      } catch(cause) {
        await sql`ROLLBACK`.execute(connection)
        if(cause instanceof RepairComparisonError)throw cause
        throw new RepairComparisonError('comparison_authority_invalid')
      }
    })
  }

  async readRepairComparison(projectId:string,afterExecutionId:string) {
    return this.database().transaction().execute(trx=>readRepairComparisonEvidence(trx,projectId,afterExecutionId))
  }

  /** Retired insertion-only entry retains schema/source/conflict diagnostics;
   * creation and replay require the owned live materialization boundary. */
  async persistOriginExact(input: unknown, transaction: Transaction<Database>): Promise<{ authority:Record<string,any>; replay:boolean }> {
    validateRepairAuthority('repair_revision_origins',input)
    const authority=JSON.parse(canonicalJson(input))
    const fk=await sql<{ foreign_keys:number }>`PRAGMA foreign_keys`.execute(transaction)
    if(Number(fk.rows[0]?.foreign_keys)!==1) throw new RepairAuthorityPersistenceError('FOREIGN_KEYS_REQUIRED')
    const existing=await transaction.selectFrom('repair_revision_origins').selectAll()
      .where('repair_origin_id','=',authority.repairOriginId).executeTakeFirst()
    if(existing) {
      const persisted=await this.verifyOriginRow(transaction,existing)
      await verifySourceProductAuthority(transaction,authority)
      parseRepairAuthority('repair_revision_origins',authority)
      if(canonicalJson(persisted)!==canonicalJson(authority)) throw new Error('Repair origin authority identity conflicts with persisted authority.')
      throw new RepairAuthorityPersistenceError('REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED')
    }
    await verifySourceProductAuthority(transaction,authority)
    throw new RepairAuthorityPersistenceError('REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED')

  }

  async readOriginExact(projectId:string, repairOriginId:string, connection?:Kysely<Database>): Promise<Record<string,any>|null> {
    const read=async (transaction:Kysely<Database>)=>{
      const row=await transaction.selectFrom('repair_revision_origins').selectAll()
        .where('project_id','=',projectId).where('repair_origin_id','=',repairOriginId).executeTakeFirst()
      return row ? this.verifyOriginRow(transaction,row) : null
    }
    return connection ? read(connection) : this.database().transaction().execute(read)
  }

  private async verifyOriginRow(connection:Kysely<Database>, row:Database['repair_revision_origins']): Promise<Record<string,any>> {
    const { canonical_payload }=row
    const authority=JSON.parse(canonical_payload)
    await verifySourceProductAuthority(connection,authority)
    if(isExactRepairAuthorityRow('repair_revision_origins',canonical_payload,JSON.stringify(projectRepairAuthorityColumns('repair_revision_origins', row)))!==1)
      throw new Error('Repair origin persisted payload/column integrity mismatch.')
    const pairs=await sql`SELECT 1 FROM m5_valid_repair_origin_pairs WHERE repair_origin_id=${row.repair_origin_id}`.execute(connection)
    if(pairs.rows.length!==1) throw new Error('Repair origin persisted relational integrity mismatch.')
    return authority
  }

  async persistRerunExact(input: unknown): Promise<{ authority: Record<string, any>; replay: boolean }> {
    validateRepairAuthority('repair_rerun_links', input)
    const authority = JSON.parse(canonicalJson(input))
    return this.database().connection().execute(async connection => {
      const enabled = Number((await sql<{ foreign_keys:number }>`PRAGMA foreign_keys`.execute(connection)).rows[0]?.foreign_keys)
      if (enabled !== 1) throw new RepairAuthorityPersistenceError('FOREIGN_KEYS_REQUIRED')
      await sql`BEGIN IMMEDIATE`.execute(connection)
      try {
        const existing = await connection.selectFrom('repair_rerun_links').selectAll()
          .where('rerun_link_id', '=', authority.rerunLinkId).executeTakeFirst()
        if (existing) {
          const persisted = await this.verifyRerunRow(connection, existing)
          // Independently rebind the submitted envelope before computing its hash.
          await verifyRerunProductAuthority(connection, authority)
          if (canonicalJson(persisted) !== canonicalJson(authority)) throw new Error('Repair rerun authority identity conflicts with persisted authority.')
          await sql`COMMIT`.execute(connection)
          return { authority:persisted, replay:true }
        }
        await verifyRerunProductAuthority(connection, authority)
        await connection.insertInto('repair_rerun_links').values(repairAuthorityRow('repair_rerun_links', authority) as any).execute()
        await sql`COMMIT`.execute(connection)
        return { authority, replay:false }
      } catch (cause) { await sql`ROLLBACK`.execute(connection); throw cause }
    })
  }

  async readRerunExact(projectId: string, rerunLinkId: string): Promise<Record<string, any> | null> {
    return this.database().transaction().execute(async transaction => {
      const row = await transaction.selectFrom('repair_rerun_links').selectAll()
        .where('project_id', '=', projectId).where('rerun_link_id', '=', rerunLinkId).executeTakeFirst()
      return row ? this.verifyRerunRow(transaction, row) : null
    })
  }

  private async verifyRerunRow(connection: Kysely<Database>, row: Database['repair_rerun_links']): Promise<Record<string, any>> {
    const { canonical_payload } = row
    const authority = JSON.parse(canonical_payload)
    await verifyRerunProductAuthority(connection, authority)
    if (isExactRepairAuthorityRow('repair_rerun_links', canonical_payload, JSON.stringify(projectRepairAuthorityColumns('repair_rerun_links', row))) !== 1) {
      throw new Error('Repair rerun persisted payload/column integrity mismatch.')
    }
    return authority
  }

  /** Retired write entry: an authority envelope alone cannot establish live
   * Product preflight. Kept fail-closed so existing callers receive an explicit
   * remedy; promotion and replay belong to GovernedRepairDecisionService. */
  async persistSupersessionExact(
    _authority: AppModelTransitionSupersessionAuthorityV1,
  ): Promise<never> {
    throw new RepairAuthorityPersistenceError('SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED')
  }
}
