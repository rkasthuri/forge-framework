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
export const REPAIR_DISPOSITION_TABLE_040=`CREATE TABLE repair_dispositions (
  disposition_id text PRIMARY KEY NOT NULL,
  comparison_id text NOT NULL UNIQUE REFERENCES repair_effectiveness_evidence(comparison_id),
  project_id text NOT NULL,
  after_execution_id text NOT NULL UNIQUE REFERENCES execution_repair_bindings(execution_id),
  decision_id text NOT NULL UNIQUE,
  request_json text NOT NULL CHECK(json_valid(request_json)),
  decision_json text NOT NULL CHECK(json_valid(decision_json)),
  canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
  disposition_hash text NOT NULL
)`
export async function repairDispositionTriggers040():Promise<Record<string,string>> {
  const {repairDispositionRowsSql}=require('../RepairDispositionAuthority') as typeof import('../RepairDispositionAuthority')
  return {
    repair_disposition_validate:`CREATE TRIGGER repair_disposition_validate BEFORE INSERT ON repair_dispositions
      WHEN forge_m5_disposition_admission(NEW.canonical_payload)<>1
        OR forge_m5_disposition(NEW.request_json,NEW.decision_json,NEW.canonical_payload,NEW.disposition_hash,${repairDispositionRowsSql('NEW.request_json')})<>1
        OR NEW.disposition_id IS NOT json_extract(NEW.canonical_payload,'$.dispositionId')
        OR NEW.comparison_id IS NOT json_extract(NEW.request_json,'$.comparisonId')
        OR NEW.project_id IS NOT json_extract(NEW.request_json,'$.comparison.projectId')
        OR NEW.after_execution_id IS NOT json_extract(NEW.request_json,'$.comparison.afterExecutionId')
        OR NEW.decision_id IS NOT json_extract(NEW.decision_json,'$.decisionId')
      BEGIN SELECT RAISE(ABORT,'Repair disposition requires governed admission and exact committed evidence'); END`,
    repair_disposition_no_update:`CREATE TRIGGER repair_disposition_no_update BEFORE UPDATE ON repair_dispositions BEGIN SELECT RAISE(ABORT,'Repair disposition is immutable'); END`,
    repair_disposition_no_delete:`CREATE TRIGGER repair_disposition_no_delete BEFORE DELETE ON repair_dispositions BEGIN SELECT RAISE(ABORT,'Repair disposition is immutable'); END`,
    repair_disposition_no_replace:`CREATE TRIGGER repair_disposition_no_replace BEFORE INSERT ON repair_dispositions
      WHEN EXISTS(SELECT 1 FROM repair_dispositions WHERE disposition_id=NEW.disposition_id OR comparison_id=NEW.comparison_id OR after_execution_id=NEW.after_execution_id OR decision_id=NEW.decision_id)
      BEGIN SELECT RAISE(ABORT,'Repair disposition requires exact replay'); END`,
  }
}
export async function up(db:Kysely<any>):Promise<void> {
  if(currentMigrationDialect()!=='sqlite')throw Error('Migration 040 requires SQLite.')
  if(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys)!==1)throw Error('Migration 040 requires foreign_keys=ON.')
  await sql.raw(REPAIR_DISPOSITION_TABLE_040).execute(db)
  for(const definition of Object.values(await repairDispositionTriggers040()))await sql.raw(definition).execute(db)
  if((await sql.raw('PRAGMA foreign_key_check').execute(db)).rows.length)throw Error('Migration 040 foreign keys disagree.')
}
export async function down():Promise<void>{throw Error('Migration 040 is intentionally irreversible.')}
