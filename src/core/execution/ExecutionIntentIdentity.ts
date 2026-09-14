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
import * as crypto from 'crypto'
import type { CanonicalSuiteRevision } from '../suites/SuiteContract'
import { canonicalJson } from '../storage/JsonAppModelMigrationPlanner'
import type { RepairRerunSelection } from '../storage/RepairExecutionAuthority'

/** Existing execution-intent owner; ordinary direct/Suite preimages remain unchanged. */
export function executionIntentFingerprint(input: {
  projectId:string; definitionIds:string[]; revision?:number;
  suiteAuthority?:CanonicalSuiteRevision; repairSelection?:RepairRerunSelection;
}):string {
  if(input.repairSelection) return crypto.createHash('sha256').update(canonicalJson({
    schemaVersion:3, projectId:input.projectId, selection:input.repairSelection,
  })).digest('hex')
  return crypto.createHash('sha256').update(JSON.stringify({
    schemaVersion: input.suiteAuthority ? 2 : 1,
    projectId: input.projectId,
    selection: input.suiteAuthority ? {kind:'suite_revision',suiteId:input.suiteAuthority.suiteId,suiteRevision:input.suiteAuthority.revision,suiteContentHash:input.suiteAuthority.contentHash,testSetId:input.suiteAuthority.members[0].definitionAuthority.testSetId,testSetRevision:input.suiteAuthority.members[0].definitionAuthority.testSetRevision,testSetContentHash:input.suiteAuthority.members[0].definitionAuthority.testSetContentHash}:undefined,
    revision: input.revision ?? null,
    definitionIds: input.definitionIds,
  })).digest('hex')
}
