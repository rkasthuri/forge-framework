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
import { currentMigrationDialect } from '../MigrationContext'
export const REPAIR_EFFECTIVENESS_TABLE_039=`CREATE TABLE repair_effectiveness_evidence (
  comparison_id text PRIMARY KEY NOT NULL,
  project_id text NOT NULL,
  before_result_id text NOT NULL REFERENCES test_results(result_id),
  after_execution_id text NOT NULL UNIQUE REFERENCES execution_repair_bindings(execution_id),
  after_result_id text NULL REFERENCES test_results(result_id),
  policy_version text NOT NULL CHECK(policy_version='forge.m5.repair-effectiveness-policy/v1'),
  request_json text NOT NULL CHECK(json_valid(request_json)),
  canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
  evidence_hash text NOT NULL,
  UNIQUE(project_id,before_result_id,after_execution_id,policy_version)
)`
/** Runtime import keeps database UDF/repository initialization acyclic. */
export async function repairEffectivenessTriggers039():Promise<Record<string,string>> {
  const {repairEffectivenessRowsSql}=await import('../RepairEffectivenessAuthority')
  return {
    repair_effectiveness_validate:`CREATE TRIGGER repair_effectiveness_validate BEFORE INSERT ON repair_effectiveness_evidence
      WHEN forge_m5_effectiveness(NEW.request_json,NEW.canonical_payload,NEW.evidence_hash,${repairEffectivenessRowsSql('NEW.request_json')})<>1
        OR NEW.comparison_id<>json_extract(NEW.canonical_payload,'$.comparisonId')
        OR NEW.project_id<>json_extract(NEW.request_json,'$.projectId')
        OR NEW.before_result_id<>json_extract(NEW.request_json,'$.beforeResultId')
        OR NEW.after_execution_id<>json_extract(NEW.request_json,'$.afterExecutionId')
        OR NEW.after_result_id IS NOT json_extract(NEW.request_json,'$.expectedAfterResultId')
        OR NEW.policy_version<>json_extract(NEW.request_json,'$.policyVersion')
      BEGIN SELECT RAISE(ABORT,'Repair comparison must match exact persisted canonical evidence'); END`,
    repair_effectiveness_no_update:`CREATE TRIGGER repair_effectiveness_no_update BEFORE UPDATE ON repair_effectiveness_evidence BEGIN SELECT RAISE(ABORT,'Repair comparison is immutable'); END`,
    repair_effectiveness_no_delete:`CREATE TRIGGER repair_effectiveness_no_delete BEFORE DELETE ON repair_effectiveness_evidence BEGIN SELECT RAISE(ABORT,'Repair comparison is immutable'); END`,
    repair_effectiveness_no_replace:`CREATE TRIGGER repair_effectiveness_no_replace BEFORE INSERT ON repair_effectiveness_evidence
      WHEN EXISTS(SELECT 1 FROM repair_effectiveness_evidence WHERE comparison_id=NEW.comparison_id OR after_execution_id=NEW.after_execution_id)
      BEGIN SELECT RAISE(ABORT,'Repair comparison requires exact replay'); END`,
  }
}
export async function up(db:Kysely<any>):Promise<void> {
  if(currentMigrationDialect()!=='sqlite')throw Error('Migration 039 requires SQLite.')
  if(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys)!==1)throw Error('Migration 039 requires foreign_keys=ON.')
  await sql.raw(REPAIR_EFFECTIVENESS_TABLE_039).execute(db)
  for(const definition of Object.values(await repairEffectivenessTriggers039()))await sql.raw(definition).execute(db)
  if((await sql.raw('PRAGMA foreign_key_check').execute(db)).rows.length)throw Error('Migration 039 foreign keys disagree.')
}
export async function down():Promise<void> {throw Error('Migration 039 is intentionally irreversible.')}
