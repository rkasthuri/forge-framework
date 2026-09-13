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
    | 'SUPERSESSION_IDENTITY_CONFLICT'
    | 'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED') {
    super(code === 'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'
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
