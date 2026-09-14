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

export const REPAIR_EXECUTION_TABLE_038=`CREATE TABLE execution_repair_bindings (
  execution_id text PRIMARY KEY NOT NULL, project_id text NOT NULL,
  repair_origin_id text NOT NULL, repair_lineage_hash text NOT NULL,
  test_set_row_id integer NOT NULL, definition_id text NOT NULL,
  original_execution_id text NOT NULL, original_run_id text NOT NULL, original_result_id text NOT NULL,
  original_item_ordinal integer NOT NULL CHECK(original_item_ordinal>0),
  original_plan_hash text NOT NULL, original_diagnostic_hash text NOT NULL,
  request_fingerprint text NOT NULL, plan_hash text NOT NULL, selection_json text NOT NULL CHECK(json_valid(selection_json)),
  FOREIGN KEY(execution_id) REFERENCES executions(execution_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(repair_origin_id) REFERENCES repair_revision_origins(repair_origin_id),
  FOREIGN KEY(test_set_row_id) REFERENCES test_set_revisions(id),
  FOREIGN KEY(execution_id,test_set_row_id,definition_id) REFERENCES execution_item_authorities(execution_id,test_set_row_id,definition_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(original_execution_id) REFERENCES executions(execution_id),
  FOREIGN KEY(original_run_id) REFERENCES runs(run_id),
  FOREIGN KEY(original_result_id) REFERENCES test_results(result_id),
  CHECK(execution_id<>original_execution_id)
)`
export const REPAIR_EXECUTION_COLUMNS_038=[
  'execution_id','project_id','repair_origin_id','repair_lineage_hash','test_set_row_id','definition_id',
  'original_execution_id','original_run_id','original_result_id','original_item_ordinal','original_plan_hash',
  'original_diagnostic_hash','request_fingerprint','plan_hash','selection_json',
] as const
const bindingJson=`json_object(${REPAIR_EXECUTION_COLUMNS_038.map(c=>`'${c}',NEW.${c}`).join(',')})`
export const REPAIR_EXECUTION_TRIGGERS_038:Readonly<Record<string,string>>={
  repair_result_no_existing_link:`CREATE TRIGGER repair_result_no_existing_link BEFORE INSERT ON test_results
    WHEN NEW.repair_rerun_link_id IS NOT NULL AND EXISTS(SELECT 1 FROM repair_rerun_links WHERE rerun_link_id=NEW.repair_rerun_link_id)
    BEGIN SELECT RAISE(ABORT,'A new governed Result cannot reuse historical rerun linkage'); END`,
  repair_execution_exact_item:`CREATE TRIGGER repair_execution_exact_item BEFORE INSERT ON execution_items
    WHEN EXISTS(SELECT 1 FROM executions WHERE execution_id=NEW.execution_id AND repair_binding_id IS NOT NULL)
      AND NOT EXISTS(SELECT 1 FROM execution_repair_bindings WHERE execution_id=NEW.execution_id AND NEW.item_ordinal=1 AND definition_id=NEW.definition_id AND plan_hash=NEW.executable_plan_hash)
    BEGIN SELECT RAISE(ABORT,'Governed repair manifest must match its exact single accepted plan'); END`,

  execution_repair_binding_insert:`CREATE TRIGGER execution_repair_binding_insert BEFORE INSERT ON execution_repair_bindings
    WHEN forge_m5_execution_binding(${bindingJson},
      (SELECT canonical_payload FROM repair_revision_origins WHERE repair_origin_id=NEW.repair_origin_id),
      (SELECT p.canonical_payload FROM repair_proposals p JOIN repair_revision_origins o ON p.proposal_id=json_extract(o.canonical_payload,'$.proposalAuthority.proposalId') WHERE o.repair_origin_id=NEW.repair_origin_id),
      (SELECT s.canonical_payload FROM app_model_transition_supersessions s JOIN repair_revision_origins o ON s.authority_id=o.supersession_authority_id WHERE o.repair_origin_id=NEW.repair_origin_id),
      (SELECT payload_json FROM test_set_revisions WHERE id=NEW.test_set_row_id),
      (SELECT m.model_json FROM app_models m JOIN test_set_revisions t ON t.model_row_id=m.id WHERE t.id=NEW.test_set_row_id))<>1
      OR NOT EXISTS(SELECT 1 FROM executions e JOIN repair_revision_origins o ON o.repair_origin_id=NEW.repair_origin_id
        JOIN test_set_revisions t ON t.id=NEW.test_set_row_id
        WHERE e.execution_id=NEW.execution_id AND e.repair_binding_id=e.execution_id
        AND e.project_id=NEW.project_id AND o.project_id=e.project_id AND o.test_set_row_id=t.id
        AND t.repair_origin_id=o.repair_origin_id AND t.revision_origin_kind='repair'
        AND e.execution_intent_fingerprint=NEW.request_fingerprint AND e.test_set_authority_scope='single'
        AND e.suite_id IS NULL AND e.suite_revision IS NULL AND e.suite_content_hash IS NULL
        AND e.test_set_id=t.test_set_id AND e.test_set_revision=t.revision AND e.definition_schema_version=3
        AND e.model_row_id=t.model_row_id AND e.model_version=t.model_version AND e.support_seal_hash=t.support_seal_hash
        AND e.manifest_hash=NEW.plan_hash)
    BEGIN SELECT RAISE(ABORT,'Governed repair acceptance binding is invalid'); END`,
  execution_repair_binding_original:`CREATE TRIGGER execution_repair_binding_original BEFORE INSERT ON execution_repair_bindings
    WHEN NOT EXISTS(SELECT 1 FROM runs r JOIN test_results x ON x.run_id=r.run_id
      JOIN execution_item_authorities a ON a.execution_id=r.execution_id AND a.item_ordinal=x.execution_item_ordinal
      JOIN diagnostic_evidence d ON d.execution_id=r.execution_id AND d.run_id=r.run_id AND d.item_ordinal=a.item_ordinal
      JOIN execution_events ev ON ev.execution_id=r.execution_id AND ev.event_type='terminal'
      WHERE r.execution_id=NEW.original_execution_id AND r.run_id=NEW.original_run_id AND r.origin='product' AND r.app_name=NEW.project_id
        AND x.result_id=NEW.original_result_id AND x.execution_item_ordinal=NEW.original_item_ordinal
        AND x.executable_plan_hash=NEW.original_plan_hash AND x.status IN ('failed','could_not_verify')
        AND d.result_id=x.result_id AND d.project_id=NEW.project_id AND d.evidence_hash=NEW.original_diagnostic_hash
        AND a.test_set_row_id=json_extract(NEW.selection_json,'$.materialization.request.sourceDefinitionAuthority.testSetRowId')
        AND a.definition_id=json_extract(NEW.selection_json,'$.materialization.request.sourceDefinitionAuthority.definitionId')
        AND ev.occurred_at<=json_extract(NEW.selection_json,'$.materialization.request.proposedAt'))
    BEGIN SELECT RAISE(ABORT,'Original repair execution evidence is invalid'); END`,
  execution_repair_binding_no_update:`CREATE TRIGGER execution_repair_binding_no_update BEFORE UPDATE ON execution_repair_bindings BEGIN SELECT RAISE(ABORT,'Repair execution binding is immutable'); END`,
  execution_repair_binding_no_delete:`CREATE TRIGGER execution_repair_binding_no_delete BEFORE DELETE ON execution_repair_bindings BEGIN SELECT RAISE(ABORT,'Repair execution binding is immutable'); END`,
  execution_repair_binding_no_replace:`CREATE TRIGGER execution_repair_binding_no_replace BEFORE INSERT ON execution_repair_bindings
    WHEN EXISTS(SELECT 1 FROM execution_repair_bindings WHERE execution_id=NEW.execution_id)
    BEGIN SELECT RAISE(ABORT,'Repair execution binding is immutable'); END`,
  execution_repair_item_exact:`CREATE TRIGGER execution_repair_item_exact BEFORE INSERT ON execution_item_authorities
    WHEN EXISTS(SELECT 1 FROM executions WHERE execution_id=NEW.execution_id AND repair_binding_id IS NOT NULL)
      AND NOT EXISTS(SELECT 1 FROM execution_repair_bindings b JOIN test_set_revisions t ON t.id=b.test_set_row_id
        WHERE b.execution_id=NEW.execution_id AND NEW.item_ordinal=1 AND NEW.definition_schema_version=3
          AND NEW.test_set_row_id=b.test_set_row_id AND NEW.definition_id=b.definition_id
          AND NEW.test_set_id=t.test_set_id AND NEW.test_set_revision=t.revision AND NEW.test_set_content_hash=t.content_hash)
    BEGIN SELECT RAISE(ABORT,'Repair execution manifest authority differs'); END`,
  repair_result_link_required:`CREATE TRIGGER repair_result_link_required BEFORE INSERT ON test_results
    WHEN (EXISTS(SELECT 1 FROM runs r JOIN executions e ON e.execution_id=r.execution_id
      WHERE r.run_id=NEW.run_id AND e.repair_binding_id IS NOT NULL))<>(NEW.repair_rerun_link_id IS NOT NULL)
    BEGIN SELECT RAISE(ABORT,'Governed repair Result requires its atomic evidence link'); END`,
  repair_result_link_reciprocal:`CREATE TRIGGER repair_result_link_reciprocal AFTER INSERT ON repair_rerun_links
    WHEN EXISTS(SELECT 1 FROM test_results r JOIN runs run ON run.run_id=r.run_id
      WHERE r.repair_rerun_link_id=NEW.rerun_link_id
        AND (r.result_id<>NEW.result_id OR r.run_id<>NEW.run_id OR run.execution_id<>NEW.execution_id))
    BEGIN SELECT RAISE(ABORT,'Repair linkage must identify its exact referencing Result'); END`,
  repair_result_link_exact:`CREATE TRIGGER repair_result_link_exact AFTER INSERT ON repair_rerun_links
    WHEN EXISTS(SELECT 1 FROM executions e WHERE e.execution_id=NEW.execution_id AND e.repair_binding_id IS NOT NULL)
    AND NOT EXISTS(SELECT 1 FROM test_results r JOIN execution_repair_bindings b ON b.execution_id=NEW.execution_id
      JOIN diagnostic_evidence d ON d.execution_id=b.execution_id AND d.run_id=r.run_id AND d.result_id=r.result_id AND d.item_ordinal=r.execution_item_ordinal
      WHERE r.result_id=NEW.result_id AND r.repair_rerun_link_id=NEW.rerun_link_id
        AND b.repair_origin_id=NEW.repair_origin_id AND b.repair_lineage_hash=NEW.repair_lineage_hash
        AND b.test_set_row_id=NEW.resulting_test_set_row_id AND b.definition_id=NEW.resulting_definition_id)
    BEGIN SELECT RAISE(ABORT,'Governed repair Result link disagrees with acceptance'); END`,
}

/** Migration coordinator owns the transaction; no historical facts are rewritten. */
export async function up(db:Kysely<any>):Promise<void> {
  if(currentMigrationDialect()!=='sqlite')throw Error('Migration 038 requires SQLite.')
  if(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys)!==1)throw Error('Migration 038 requires foreign_keys=ON.')
  await sql.raw(REPAIR_EXECUTION_TABLE_038).execute(db)
  await sql.raw(`ALTER TABLE executions ADD COLUMN repair_binding_id text DEFAULT NULL
    CHECK(repair_binding_id IS NULL OR repair_binding_id=execution_id)
    REFERENCES execution_repair_bindings(execution_id) DEFERRABLE INITIALLY DEFERRED`).execute(db)
  await sql.raw(`ALTER TABLE test_results ADD COLUMN repair_rerun_link_id text DEFAULT NULL
    REFERENCES repair_rerun_links(rerun_link_id) DEFERRABLE INITIALLY DEFERRED`).execute(db)
  await sql.raw('CREATE UNIQUE INDEX uq_product_result_repair_link ON test_results(repair_rerun_link_id) WHERE repair_rerun_link_id IS NOT NULL').execute(db)
  for(const definition of Object.values(REPAIR_EXECUTION_TRIGGERS_038))await sql.raw(definition).execute(db)
  if((await sql.raw('PRAGMA foreign_key_check').execute(db)).rows.length)throw Error('Migration 038 foreign keys disagree.')
}
export async function down():Promise<void> {throw Error('Migration 038 is intentionally irreversible.')}
