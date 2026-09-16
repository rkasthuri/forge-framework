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
import {sql,type Kysely} from 'kysely'
import {currentMigrationDialect} from '../MigrationContext'
import {REPAIR_AUTHORITY_COLUMNS} from '../RepairAuthorityValidation'
export const REPAIR_WORKFLOW_TABLE_041=`CREATE TABLE repair_workflow_entries (
  entry_id text PRIMARY KEY NOT NULL,
  project_id text NOT NULL,
  original_result_id text NOT NULL REFERENCES test_results(result_id),
  proposal_id text NOT NULL UNIQUE REFERENCES repair_proposals(proposal_id),
  canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
  entry_hash text NOT NULL
)`
const object=(cols:string[])=>`json_object(${cols.map(c=>`'${c}',${c}`).join(',')})`
export const REPAIR_WORKFLOW_TRIGGERS_041:Record<string,string>={
  repair_workflow_validate:`CREATE TRIGGER repair_workflow_validate BEFORE INSERT ON repair_workflow_entries
    WHEN forge_m5_workflow_admission(NEW.canonical_payload)<>1 OR forge_m5_workflow_entry(
      json_object('entry_id',NEW.entry_id,'project_id',NEW.project_id,'original_result_id',NEW.original_result_id,'proposal_id',NEW.proposal_id,'canonical_payload',NEW.canonical_payload,'entry_hash',NEW.entry_hash),
      (SELECT ${object(['canonical_payload',...Object.keys(REPAIR_AUTHORITY_COLUMNS.repair_proposals)])} FROM repair_proposals WHERE proposal_id=NEW.proposal_id),
      (SELECT ${object(['result_id','run_id','execution_item_ordinal','executable_plan_hash','status'])} FROM test_results WHERE result_id=NEW.original_result_id),
      (SELECT ${object(['evidence_json','evidence_hash','evidence_schema_version','project_id','result_id','execution_id','run_id','item_ordinal','definition_id'])} FROM diagnostic_evidence WHERE result_id=NEW.original_result_id))<>1
    BEGIN SELECT RAISE(ABORT,'Repair workflow requires exact original evidence and governed proposal admission'); END`,
  repair_workflow_no_update:`CREATE TRIGGER repair_workflow_no_update BEFORE UPDATE ON repair_workflow_entries BEGIN SELECT RAISE(ABORT,'Repair entry is immutable'); END`,
  repair_workflow_no_delete:`CREATE TRIGGER repair_workflow_no_delete BEFORE DELETE ON repair_workflow_entries BEGIN SELECT RAISE(ABORT,'Repair entry is immutable'); END`,
  repair_workflow_no_replace:`CREATE TRIGGER repair_workflow_no_replace BEFORE INSERT ON repair_workflow_entries WHEN EXISTS(SELECT 1 FROM repair_workflow_entries WHERE entry_id=NEW.entry_id OR proposal_id=NEW.proposal_id) BEGIN SELECT RAISE(ABORT,'Repair entry requires exact replay'); END`,
}
export async function up(db:Kysely<any>):Promise<void> {
  if(currentMigrationDialect()!=='sqlite')throw Error('Migration 041 requires SQLite.')
  if(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys)!==1)throw Error('Migration 041 requires foreign_keys=ON.')
  await sql.raw(REPAIR_WORKFLOW_TABLE_041).execute(db)
  for(const definition of Object.values(REPAIR_WORKFLOW_TRIGGERS_041))await sql.raw(definition).execute(db)
  if((await sql.raw('PRAGMA foreign_key_check').execute(db)).rows.length)throw Error('Migration 041 foreign keys disagree.')
}
export async function down():Promise<void>{throw Error('Migration 041 is intentionally irreversible.')}
