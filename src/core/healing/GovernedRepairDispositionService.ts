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
import type {Kysely} from 'kysely'
import type {Database} from '../storage/types'
import {getProductDb} from '../storage/db'
import {RepairAuthorityRepository} from '../storage/repositories/RepairAuthorityRepository'

/** Explicit trusted-local human intent, not remote authentication. The existing
 * repository derives authority from committed facts and owns its transaction. */
export class GovernedRepairDispositionService {
  constructor(private readonly workspaceRoot:string,private readonly database:()=>Kysely<Database>=getProductDb) {}
  eligibility(request:unknown) {return new RepairAuthorityRepository(this.database).repairDispositionEligibility(this.workspaceRoot,request)}
  dispose(request:unknown,decision:unknown) {return new RepairAuthorityRepository(this.database).disposeRepair(this.workspaceRoot,request,decision)}
  read(request:unknown) {return new RepairAuthorityRepository(this.database).readRepairDisposition(this.workspaceRoot,request)}
}
