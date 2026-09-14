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
import type { Kysely } from 'kysely'
import type { Database } from '../storage/types'
import { getProductDb } from '../storage/db'
import { RepairAuthorityRepository } from '../storage/repositories/RepairAuthorityRepository'
import { freezeRepairComparison } from './RepairEffectivenessContract'

/** Explicit comparison only. No execution, repair or approval is initiated. */
export class GovernedRepairComparisonService {
  private readonly repository:RepairAuthorityRepository
  constructor(private readonly workspaceRoot:string,database:()=>Kysely<Database>=getProductDb) {
    this.repository=new RepairAuthorityRepository(database)
  }
  async compare(request:unknown) {return this.repository.compareRepair(this.workspaceRoot,freezeRepairComparison(request))}
  read(projectId:string,afterExecutionId:string) {return this.repository.readRepairComparison(projectId,afterExecutionId)}
}
