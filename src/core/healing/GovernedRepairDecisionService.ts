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
import { sql, type Kysely } from 'kysely'
import { getProductDb } from '../storage/db'
import type { Database } from '../storage/types'
import { canonicalJson } from '../storage/JsonAppModelMigrationPlanner'
import { assertApprovedCorrespondence, parseRepairAuthority, repairAuthorityHash, repairAuthorityRow,
  isExactRepairAuthorityRow, projectRepairAuthorityColumns } from '../storage/RepairAuthorityValidation'
import { RepairAuthorityRepository, type AppModelTransitionSupersessionAuthorityV1 } from '../storage/repositories/RepairAuthorityRepository'
import { GovernedRepairProposalService } from './GovernedRepairProposalService'
import { validateRepairRequestEnvelope, type RepairProposalRequest, type RepairEligibilityResult } from './GovernedRepairEligibility'

type Refused = Extract<RepairEligibilityResult, {kind:'refused'}>
type Decision = Record<string, any>
export type RepairDecisionResult = Refused | {kind:'accepted'; decision:Decision; replay:boolean}
export type RepairPromotionResult = Refused | {kind:'promoted'; authority:AppModelTransitionSupersessionAuthorityV1; replay:boolean}
const refused = (code:Refused['code']):Refused => ({kind:'refused',code,counts:{a:0,b:0,c:0}})
const same = (a:unknown,b:unknown) => canonicalJson(a) === canonicalJson(b)

/** Trusted local Product callers supply an explicit human decision. This service
 * preserves that declaration; it does not authenticate a remote human or permit
 * a model to infer approval. One committed terminal decision precedes promotion. */
export class GovernedRepairDecisionService {
  constructor(private readonly workspaceRoot:string, private readonly database:()=>Kysely<Database> = getProductDb) {}

  async accept(request:RepairProposalRequest, input:unknown):Promise<RepairDecisionResult> {
    return this.inspectDecision(request,input,false)
  }
  /** Exact replay still requires available, intact Product and proposal authority. */
  async readExact(request:RepairProposalRequest, input:unknown):Promise<RepairDecisionResult> {
    return this.inspectDecision(request,input,true)
  }
  private async inspectDecision(request:RepairProposalRequest,input:unknown,readOnly:boolean):Promise<RepairDecisionResult> {
    let decision:Decision
    try { validateRepairRequestEnvelope(request); request=JSON.parse(canonicalJson(request)); decision=JSON.parse(canonicalJson(parseRepairAuthority('repair_decisions',input))) } catch { return refused('integrity_mismatch') }
    return this.transaction(async db=>{
      const existing=await this.exactDecision(db,decision)
      if(existing.kind==='refused')return existing
      const proposal=await new GovernedRepairProposalService(this.workspaceRoot,this.database)
        .readExactInTransaction(request,decision.proposalAuthority.proposalId,db)
      if(proposal.kind==='refused')return proposal
      try { assertApprovedCorrespondence(proposal.proposal,decision) } catch { return refused('stale_authority') }
      if(Date.parse(decision.decidedAt)<Date.parse(proposal.proposal.proposedAt))return refused('stale_authority')
      if(existing.found)return {kind:'accepted',decision,replay:true}
      if(readOnly)return refused('stale_authority')
      await db.insertInto('repair_decisions').values(repairAuthorityRow('repair_decisions',decision) as any).execute()
      return {kind:'accepted',decision,replay:false}
    })
  }
  /** Approval must already be committed. This transaction rebinds it and the
   * exact live proposal, then appends only supersession authority. */
  async promote(request:RepairProposalRequest,input:unknown,authorityId:string,promotedAt:string):Promise<RepairPromotionResult> {
    let decision:Decision,authority:AppModelTransitionSupersessionAuthorityV1
    try {
      validateRepairRequestEnvelope(request); request=JSON.parse(canonicalJson(request))
      decision=JSON.parse(canonicalJson(parseRepairAuthority('repair_decisions',input)))
      const value:any={schemaVersion:'forge.m5.app-model-transition-supersession-authority/v1',authorityId,
        authorityHash:'0'.repeat(64),projectId:decision.projectId,relationKind:'human_approved_semantic_successor',
        source:decision.source,candidate:decision.candidate,proposalAuthority:decision.proposalAuthority,
        decisionAuthority:{decisionId:decision.decisionId,decisionHash:decision.decisionHash,decision:'approve'},
        approvedBy:decision.decidedBy,promotedAt}
      value.authorityHash=repairAuthorityHash('app_model_transition_supersessions',value)
      authority=JSON.parse(canonicalJson(value))
    } catch { return refused('integrity_mismatch') }
    return this.transaction(async db=>{
      const existing=await this.exactDecision(db,decision)
      if(existing.kind==='refused')return existing
      // Examine persisted target integrity before lower live-authority refusals.
      const rows=await db.selectFrom('app_model_transition_supersessions').selectAll().execute()
      for(const row of rows) {
        if(isExactRepairAuthorityRow('app_model_transition_supersessions',row.canonical_payload,
          JSON.stringify(projectRepairAuthorityColumns('app_model_transition_supersessions',row)))!==1)return refused('integrity_mismatch')
        if((row.authority_id===authorityId || row.proposal_id===decision.proposalAuthority.proposalId || row.decision_id===decision.decisionId)
          && !same(JSON.parse(row.canonical_payload),authority))return refused('integrity_mismatch')
      }
      const proposal=await new GovernedRepairProposalService(this.workspaceRoot,this.database)
        .readExactInTransaction(request,decision.proposalAuthority.proposalId,db)
      if(proposal.kind==='refused')return proposal
      try { assertApprovedCorrespondence(proposal.proposal,decision,authority) } catch { return refused('stale_authority') }
      if(!existing.found || Date.parse(decision.decidedAt)<Date.parse(proposal.proposal.proposedAt)
        || Date.parse(promotedAt)<Date.parse(decision.decidedAt))return refused('stale_authority')
      // There is no exported insertion capability: only this fully rebound
      // promotion transaction may append authority. Exact replay also reaches
      // this point only after the same fresh preflight.
      parseRepairAuthority('app_model_transition_supersessions',authority)
      const origins=await db.selectFrom('repair_revision_origins').selectAll()
        .where('supersession_authority_id','=',authorityId).execute()
      for(const origin of origins)await new RepairAuthorityRepository(this.database)
        .readOriginExact(origin.project_id,origin.repair_origin_id,db)
      const replay=rows.some(row=>row.authority_id===authorityId)
      if(!replay)await db.insertInto('app_model_transition_supersessions')
        .values(repairAuthorityRow('app_model_transition_supersessions',authority) as any).execute()
      return {kind:'promoted',authority,replay}
    })
  }
  /** Verify the decision inventory before trusting its mutable SQL locators.
   * Immutability guards protect ordinary writes; this also detects single-row
   * corruption. It is not an independent witness against coordinated DB rewrite. */
  private async exactDecision(db:Kysely<Database>,decision:Decision):Promise<Refused|{kind:'checked';found:boolean}> {
    const rows=await db.selectFrom('repair_decisions').selectAll().execute()
    let found=false
    for(const row of rows) {
      if(isExactRepairAuthorityRow('repair_decisions',row.canonical_payload,
        JSON.stringify(projectRepairAuthorityColumns('repair_decisions',row)))!==1)return refused('integrity_mismatch')
      if(row.decision_id===decision.decisionId || row.proposal_id===decision.proposalAuthority.proposalId) {
        if(!same(JSON.parse(row.canonical_payload),decision))return refused('integrity_mismatch')
        found=true
      }
    }
    return {kind:'checked',found}
  }
  private async transaction<T>(run:(db:Kysely<Database>)=>Promise<T>):Promise<T|Refused> {
    const database=this.database()
    // A Kysely transaction must never supply decision acceptance + promotion.
    // For a manually reserved connection, BEGIN IMMEDIATE below independently
    // refuses an already-open transaction before reads or writes, and before
    // our rollback handler (which must never roll back the caller's work).
    if(database.isTransaction)return refused('stale_authority')
    return database.connection().execute(async db=>{
      if(Number((await sql.raw<{foreign_keys:number}>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys)!==1)
        return refused('integrity_mismatch')
      await sql.raw('BEGIN IMMEDIATE').execute(db)
      try {const result=await run(db);await sql.raw('COMMIT').execute(db);return result}
      catch(cause){await sql.raw('ROLLBACK').execute(db);throw cause}
    })
  }
}
