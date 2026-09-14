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
import { TestSetRepository } from '../storage/repositories/TestSetRepository'
import type { RepairMaterializationInput, RepairMaterializationResult } from '../storage/RepairMaterializationAuthority'

/** Identity-only Product entry. The existing Test Set persistence owner performs
 * all live authority preflight, canonical generation and the atomic commit. */
export class GovernedRepairMaterializationService {
  constructor(private readonly workspaceRoot:string,private readonly repository=new TestSetRepository()) {}
  materialize(input:RepairMaterializationInput):Promise<RepairMaterializationResult> {
    return this.repository.materializeApprovedRepair(this.workspaceRoot,input)
  }
  readExact(input:RepairMaterializationInput):Promise<RepairMaterializationResult> {
    return this.repository.materializeApprovedRepair(this.workspaceRoot,input,true)
  }
}
