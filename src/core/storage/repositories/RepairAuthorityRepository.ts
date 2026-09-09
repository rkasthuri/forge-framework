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
import { assertApprovedCorrespondence, projectRepairAuthorityColumns, isExactRepairAuthorityRow, parseRepairAuthority, repairAuthorityRow, validateRepairAuthority } from '../RepairAuthorityValidation'
import { isExactProposalIdentityRow, isProposalIdentityPair, projectProposalIdentityColumns } from '../RepairProposalIdentityAuthority'
import { verifyRerunProductAuthority } from '../RepairRerunAuthority'
import { verifySourceProductAuthority } from '../RepairSourceAuthority'

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
    | 'FOREIGN_KEYS_REQUIRED'
    | 'SUPERSESSION_INTEGRITY_INVALID'
    | 'SUPERSESSION_IDENTITY_CONFLICT') {
    super(code === 'FOREIGN_KEYS_REQUIRED'
      ? 'M5 repair authority persistence requires SQLite foreign-key enforcement.'
      : code === 'SUPERSESSION_IDENTITY_CONFLICT'
        ? 'Supersession authority identity conflicts with persisted authority.'
        : 'Supersession authority failed persisted integrity validation.')
    this.name = 'RepairAuthorityPersistenceError'
  }
}

function assertRequestedIntegrity(authority: AppModelTransitionSupersessionAuthorityV1): void {
  parseRepairAuthority('app_model_transition_supersessions', authority)
}
export class RepairAuthorityRepository {
  constructor(private readonly database: () => Kysely<Database> = getProductDb) {}

  /** The caller's transaction supplies the reciprocal repaired Test Set row;
   * this persistence boundary neither materializes nor executes a repair. */
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
      return { authority:persisted,replay:true }
    }
    await verifySourceProductAuthority(transaction,authority)
    await transaction.insertInto('repair_revision_origins').values(repairAuthorityRow('repair_revision_origins',authority) as any).execute()
    return { authority,replay:false }
  }

  async readOriginExact(projectId:string, repairOriginId:string): Promise<Record<string,any>|null> {
    return this.database().transaction().execute(async transaction=>{
      const row=await transaction.selectFrom('repair_revision_origins').selectAll()
        .where('project_id','=',projectId).where('repair_origin_id','=',repairOriginId).executeTakeFirst()
      return row ? this.verifyOriginRow(transaction,row) : null
    })
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

  async persistSupersessionExact(
    authority: AppModelTransitionSupersessionAuthorityV1,
  ): Promise<{ authority: AppModelTransitionSupersessionAuthorityV1; replay: boolean }> {
    assertRequestedIntegrity(authority)
    // Freeze the strictly validated representation before awaiting database work.
    authority = JSON.parse(canonicalJson(authority)) as AppModelTransitionSupersessionAuthorityV1
    return this.database().connection().execute(async connection => {
      const enabled = Number((await sql<{ foreign_keys:number }>`PRAGMA foreign_keys`.execute(connection)).rows[0]?.foreign_keys)
      if (enabled !== 1) throw new RepairAuthorityPersistenceError('FOREIGN_KEYS_REQUIRED')
      let transactionOpen = false
      try {
        await sql.raw('BEGIN IMMEDIATE').execute(connection)
        transactionOpen = true
        const existing = await connection.selectFrom('app_model_transition_supersessions').selectAll()
          .where('authority_id', '=', authority.authorityId).executeTakeFirst()
        if (existing) {
          const persisted = this.fromRow(existing)
          await this.verifyApproval(connection, persisted)
          if (canonicalJson(persisted) !== canonicalJson(authority)) {
            throw new RepairAuthorityPersistenceError('SUPERSESSION_IDENTITY_CONFLICT')
          }
          await sql.raw('COMMIT').execute(connection)
          transactionOpen = false
          return { authority: persisted, replay: true }
        }
        await this.verifyApproval(connection, authority)
        await connection.insertInto('app_model_transition_supersessions').values({
          canonical_payload: canonicalJson(authority),
          authority_id: authority.authorityId,
          authority_hash: authority.authorityHash,
          project_id: authority.projectId,
          source_endpoint_identity: canonicalJson(authority.source),
          candidate_endpoint_identity: canonicalJson(authority.candidate),
          proposal_id: authority.proposalAuthority.proposalId,
          proposal_hash: authority.proposalAuthority.proposalHash,
          decision_id: authority.decisionAuthority.decisionId,
          decision_hash: authority.decisionAuthority.decisionHash,
          decision_kind: authority.decisionAuthority.decision,
          actor_kind: authority.approvedBy.kind,
          actor_id: authority.approvedBy.actorId,
          mechanism_id: 'local_product',
          promoted_at: authority.promotedAt,
        }).execute()
        await sql.raw('COMMIT').execute(connection)
        transactionOpen = false
        return { authority, replay: false }
      } catch (cause) {
        if (transactionOpen) await sql.raw('ROLLBACK').execute(connection)
        throw cause
      }
    })
  }

  private async verifyApproval(connection: Kysely<Database>, authority: AppModelTransitionSupersessionAuthorityV1): Promise<void> {
    const proposal = await connection.selectFrom('repair_proposals').selectAll()
      .where('proposal_id', '=', authority.proposalAuthority.proposalId).executeTakeFirst()
    const decision = await connection.selectFrom('repair_decisions').selectAll()
      .where('decision_id', '=', authority.decisionAuthority.decisionId).executeTakeFirst()
    if (!proposal || !decision) throw new Error('M5 approved endpoint correspondence missing.')
    for (const [table, row] of [['repair_proposals', proposal], ['repair_decisions', decision]] as const) {
      const { canonical_payload } = row
      if (isExactRepairAuthorityRow(table, canonical_payload, JSON.stringify(projectRepairAuthorityColumns(table, row))) !== 1) {
        throw new RepairAuthorityPersistenceError('SUPERSESSION_INTEGRITY_INVALID')
      }
    }
    // Migration 036 has no witness. At 037 the physical binding is verified
    // separately and can never be discarded by the frozen logical projection.
    const witnessTable = await sql`SELECT 1 FROM sqlite_schema WHERE type='table'
      AND name='repair_proposal_identity_authorities'`.execute(connection)
    if (witnessTable.rows.length || Object.hasOwn(proposal, 'identity_authority_hash')) {
      if (!witnessTable.rows.length) throw new RepairAuthorityPersistenceError('SUPERSESSION_INTEGRITY_INVALID')
      const witness = await connection.selectFrom('repair_proposal_identity_authorities').selectAll()
        .where('proposal_id', '=', proposal.proposal_id).executeTakeFirst()
      if (!witness || isExactProposalIdentityRow(witness.canonical_payload, JSON.stringify(projectProposalIdentityColumns(witness))) !== 1
        || isProposalIdentityPair(witness.canonical_payload, proposal.canonical_payload, proposal.identity_authority_hash) !== 1) {
        throw new RepairAuthorityPersistenceError('SUPERSESSION_INTEGRITY_INVALID')
      }
    }
    assertApprovedCorrespondence(proposal.canonical_payload, decision.canonical_payload, authority)
    const origins=await connection.selectFrom('repair_revision_origins').selectAll()
      .where('supersession_authority_id','=',authority.authorityId).execute()
    for(const origin of origins) await this.verifyOriginRow(connection,origin)
  }

  private fromRow(row: {
    canonical_payload:string;
    authority_id:string; authority_hash:string; project_id:string; source_endpoint_identity:string;
    candidate_endpoint_identity:string; proposal_id:string; proposal_hash:string; decision_id:string;
    decision_hash:string; decision_kind:string; actor_kind:string; actor_id:string; mechanism_id:string; promoted_at:string;
  }): AppModelTransitionSupersessionAuthorityV1 {
    const { canonical_payload } = row
    if (isExactRepairAuthorityRow('app_model_transition_supersessions', canonical_payload, JSON.stringify(projectRepairAuthorityColumns('app_model_transition_supersessions', row))) !== 1) {
      throw new RepairAuthorityPersistenceError('SUPERSESSION_INTEGRITY_INVALID')
    }
    return parseRepairAuthority('app_model_transition_supersessions', canonical_payload) as AppModelTransitionSupersessionAuthorityV1
  }
}
