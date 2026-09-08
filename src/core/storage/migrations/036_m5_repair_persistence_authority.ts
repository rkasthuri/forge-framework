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

import { Kysely, sql } from 'kysely'
import { currentMigrationDialect } from '../MigrationContext'
import { REPAIR_AUTHORITY_COLUMNS } from '../RepairAuthorityValidation'
import { rerunProductRowsSql } from '../RepairRerunAuthority'
import { sourceProductRowsSql } from '../RepairSourceAuthority'

interface SchemaObject { name: string; sql: string }
interface SuspendedTable extends SchemaObject { indexes: SchemaObject[]; rows: Record<string, unknown>[] }

const DIRECT_TEST_SET_DEPENDENTS = new Set([
  'execution_item_authorities',
  'suite_revision_member_authorities',
  'suite_revisions',
])

const TABLE_DROP_ORDER = [
  'suite_revision_member_authorities',
  'suite_revision_members',
  'suite_revisions',
  'execution_item_authorities',
]

const TABLE_RESTORE_ORDER = [
  'suite_revisions',
  'suite_revision_members',
  'suite_revision_member_authorities',
  'execution_item_authorities',
]

function quoted(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

async function captureTables(db: Kysely<any>, names: string[]): Promise<SuspendedTable[]> {
  const captured: SuspendedTable[] = []
  for (const name of names) {
    const table = (await sql<SchemaObject>`SELECT name,sql FROM sqlite_schema
      WHERE type='table' AND name=${name} AND sql IS NOT NULL`.execute(db)).rows[0]
    if (!table) throw new Error(`Migration 036 required dependent table ${name} is missing.`)
    const rows = (await sql.raw<Record<string, unknown>>(`SELECT * FROM ${quoted(name)}`).execute(db)).rows
    const indexes = (await sql<SchemaObject>`SELECT name,sql FROM sqlite_schema
      WHERE type='index' AND tbl_name=${name} AND sql IS NOT NULL ORDER BY name`.execute(db)).rows
    captured.push({ ...table, indexes: [...indexes], rows: [...rows] })
  }
  return captured
}

async function restoreTables(db: Kysely<any>, tables: SuspendedTable[]): Promise<void> {
  const byName = new Map(tables.map(table => [table.name, table]))
  for (const name of TABLE_RESTORE_ORDER) {
    const table = byName.get(name)!
    await sql.raw(table.sql).execute(db)
    for (let offset = 0; offset < table.rows.length; offset += 50) {
      await db.insertInto(name as any).values(table.rows.slice(offset, offset + 50)).execute()
    }
    for (const index of table.indexes) await sql.raw(index.sql).execute(db)
  }
}

const IMMUTABLE_TABLES = [
  'repair_proposals',
  'repair_decisions',
  'app_model_transition_supersessions',
  'repair_revision_origins',
  'repair_rerun_links',
] as const

export const MIGRATION_036_TRIGGER_DEFINITIONS_V1 = Object.freeze({
  repair_revision_origins_source_rebound_insert: `CREATE TRIGGER repair_revision_origins_source_rebound_insert
    BEFORE INSERT ON repair_revision_origins
    WHEN forge_m5_source_product_authority(NEW.canonical_payload,${sourceProductRowsSql('NEW.canonical_payload')})<>1
    BEGIN SELECT RAISE(ABORT,'Repair source integrity authority mismatch (execution-item witness)'); END`,
  repair_rerun_links_product_rebound_insert: `CREATE TRIGGER repair_rerun_links_product_rebound_insert
    AFTER INSERT ON repair_rerun_links
    WHEN forge_m5_rerun_product_authority(NEW.canonical_payload,${rerunProductRowsSql('NEW.canonical_payload')})<>1
    BEGIN SELECT RAISE(ABORT,'Repair rerun persisted Product authority mismatch'); END`,
  ...Object.fromEntries(Object.entries(REPAIR_AUTHORITY_COLUMNS).map(([table, columns]) => [
    `${table}_exact_payload_insert`, `CREATE TRIGGER ${table}_exact_payload_insert BEFORE INSERT ON ${table}
      WHEN forge_m5_exact_authority_row('${table}',NEW.canonical_payload,json_object(${Object.keys(columns)
        .map(column => `'${column}',NEW.${column}`).join(',')}))<>1
      BEGIN SELECT RAISE(ABORT,'M5 authority schema or integrity mismatch (CHECK)'); END`,
  ])),
  repair_decisions_correspondence_insert: `CREATE TRIGGER repair_decisions_correspondence_insert
    BEFORE INSERT ON repair_decisions WHEN EXISTS (SELECT 1 FROM repair_proposals WHERE proposal_id=NEW.proposal_id)
      AND NOT EXISTS (SELECT 1 FROM repair_proposals p WHERE p.proposal_id=NEW.proposal_id
        AND forge_m5_approved_correspondence(p.canonical_payload,NEW.canonical_payload,NULL)=1)
    BEGIN SELECT RAISE(ABORT,'M5 approved endpoint correspondence mismatch (FOREIGN KEY)'); END`,
  app_model_transition_supersessions_correspondence_insert: `CREATE TRIGGER app_model_transition_supersessions_correspondence_insert
    BEFORE INSERT ON app_model_transition_supersessions WHEN NOT EXISTS (
      SELECT 1 FROM repair_proposals p JOIN repair_decisions d ON d.proposal_id=p.proposal_id
      WHERE p.proposal_id=NEW.proposal_id AND d.decision_id=NEW.decision_id
        AND forge_m5_approved_correspondence(p.canonical_payload,d.canonical_payload,NEW.canonical_payload)=1)
    BEGIN SELECT RAISE(ABORT,'M5 approved endpoint correspondence mismatch (FOREIGN KEY)'); END`,
  test_set_revisions_immutable_collision: `CREATE TRIGGER test_set_revisions_immutable_collision
    BEFORE INSERT ON test_set_revisions WHEN EXISTS (
      SELECT 1 FROM test_set_revisions WHERE id=NEW.id OR generation_id=NEW.generation_id
        OR (project_id=NEW.project_id AND revision=NEW.revision)
        OR (NEW.repair_origin_id IS NOT NULL AND repair_origin_id=NEW.repair_origin_id))
    BEGIN SELECT RAISE(ABORT,'Test Set revision authority identity already exists'); END`,
  manual_test_promotions_authority_insert: `CREATE TRIGGER manual_test_promotions_authority_insert
    BEFORE INSERT ON manual_test_promotions WHEN
      NOT EXISTS (SELECT 1 FROM manual_test_sources s WHERE s.source_id=NEW.source_id
        AND s.project_id=NEW.project_id AND s.content_hash=NEW.source_content_hash)
      OR NOT EXISTS (SELECT 1 FROM test_set_revisions t WHERE t.id=NEW.test_set_row_id
        AND t.project_id=NEW.project_id AND t.test_set_id=NEW.test_set_id
        AND t.revision=NEW.test_set_revision AND t.content_hash=NEW.test_set_content_hash
        AND t.schema_version=3 AND t.revision_origin_kind='generation' AND t.repair_origin_id IS NULL)
    BEGIN SELECT RAISE(ABORT,'Manual Test promotion authority mismatch'); END`,
  repair_revision_origin_validate_insert: `CREATE TRIGGER repair_revision_origin_validate_insert
    AFTER INSERT ON repair_revision_origins
    WHEN EXISTS (SELECT 1 FROM test_set_revisions WHERE id=NEW.test_set_row_id)
      AND NOT EXISTS (SELECT 1 FROM m5_valid_repair_origin_pairs
        WHERE repair_origin_id=NEW.repair_origin_id AND test_set_row_id=NEW.test_set_row_id)
    BEGIN SELECT RAISE(ABORT,'Repair revision origin authority mismatch'); END`,
  test_set_repair_origin_validate_insert: `CREATE TRIGGER test_set_repair_origin_validate_insert
    AFTER INSERT ON test_set_revisions
    WHEN NEW.revision_origin_kind='repair'
      AND EXISTS (SELECT 1 FROM repair_revision_origins WHERE repair_origin_id=NEW.repair_origin_id)
      AND NOT EXISTS (SELECT 1 FROM m5_valid_repair_origin_pairs
        WHERE repair_origin_id=NEW.repair_origin_id AND test_set_row_id=NEW.id)
    BEGIN SELECT RAISE(ABORT,'Repair Test Set origin authority mismatch'); END`,
  repair_rerun_links_validate_insert: `CREATE TRIGGER repair_rerun_links_validate_insert
    BEFORE INSERT ON repair_rerun_links WHEN NOT EXISTS (
      SELECT 1 FROM repair_revision_origins origin
      JOIN test_set_revisions t ON t.id=NEW.resulting_test_set_row_id
      JOIN executions e ON e.execution_id=NEW.execution_id
      JOIN execution_items i ON i.execution_id=NEW.execution_id AND i.item_ordinal=NEW.item_ordinal
      JOIN execution_item_authorities a ON a.execution_id=i.execution_id AND a.item_ordinal=i.item_ordinal
      JOIN runs r ON r.run_id=NEW.run_id
      JOIN test_results tr ON tr.result_id=NEW.result_id
      WHERE origin.repair_origin_id=NEW.repair_origin_id AND origin.project_id=NEW.project_id
        AND json_extract(origin.canonical_payload,'$.lineageHash')=NEW.repair_lineage_hash
        AND t.id=origin.test_set_row_id AND t.revision_origin_kind='repair'
        AND t.repair_origin_id=NEW.repair_origin_id AND t.project_id=NEW.project_id
        AND t.test_set_id=NEW.resulting_test_set_id AND t.revision=NEW.resulting_test_set_revision
        AND t.content_hash=NEW.resulting_test_set_content_hash
        AND t.schema_version=NEW.resulting_definition_schema_version
        AND t.model_row_id=NEW.model_row_id AND t.model_version=NEW.model_version
        AND t.support_seal_hash=NEW.support_seal_hash
        AND forge_is_exact_canonical_v3_definition_member(t.payload_json,t.content_hash,t.test_set_id,t.revision,
          t.project_id,t.definition_count,NEW.resulting_definition_id)=1
        AND forge_is_exact_canonical_v3_definition_hash(t.payload_json,NEW.resulting_definition_id,
          NEW.resulting_definition_content_hash)=1
        AND e.project_id=NEW.project_id
        AND i.definition_id=NEW.resulting_definition_id AND i.executable_plan_hash=NEW.plan_hash
        AND a.test_set_row_id=NEW.resulting_test_set_row_id AND a.test_set_id=NEW.resulting_test_set_id
        AND a.test_set_revision=NEW.resulting_test_set_revision
        AND a.test_set_content_hash=NEW.resulting_test_set_content_hash
        AND a.definition_schema_version=NEW.resulting_definition_schema_version
        AND a.definition_id=NEW.resulting_definition_id
        AND r.app_name=NEW.project_id AND r.execution_id=NEW.execution_id
        AND r.attempt_ordinal=NEW.attempt_ordinal AND r.origin='product'
        AND tr.run_id=NEW.run_id AND tr.execution_item_ordinal=NEW.item_ordinal
        AND tr.definition_id=NEW.resulting_definition_id AND tr.executable_plan_hash=NEW.plan_hash
        AND ((NEW.suite_id IS NULL AND e.suite_id IS NULL)
          OR (NEW.suite_id IS NOT NULL AND e.suite_id=NEW.suite_id
            AND e.suite_revision=NEW.suite_revision AND e.suite_content_hash=NEW.suite_content_hash
            AND NEW.suite_project_id=NEW.project_id AND NEW.suite_item_ordinal=NEW.item_ordinal AND EXISTS (
            SELECT 1 FROM suites s
            JOIN suite_revisions sr ON sr.suite_id=NEW.suite_id AND sr.revision=NEW.suite_revision
            JOIN suite_revision_members sm ON sm.suite_id=NEW.suite_id
              AND sm.suite_revision=NEW.suite_revision AND sm.member_ordinal=NEW.suite_item_ordinal
            JOIN suite_revision_member_authorities sa ON sa.suite_id=sm.suite_id
              AND sa.suite_revision=sm.suite_revision AND sa.member_ordinal=sm.member_ordinal
            WHERE s.suite_id=NEW.suite_id AND s.project_id=NEW.suite_project_id
              AND sr.project_id=NEW.project_id AND sr.content_hash=NEW.suite_content_hash
              AND sa.test_set_row_id=NEW.resulting_test_set_row_id
              AND sa.definition_id=NEW.resulting_definition_id)))
    ) BEGIN SELECT RAISE(ABORT,'Repair rerun authority mismatch'); END`,
} as const)

export function migration036ImmutableTriggerDefinitions(): Record<string, string> {
  const collisionPredicates: Record<(typeof IMMUTABLE_TABLES)[number], string> = {
    repair_proposals: 'proposal_id=NEW.proposal_id OR (proposal_id=NEW.proposal_id AND project_id=NEW.project_id AND proposal_hash=NEW.proposal_hash)',
    repair_decisions: 'decision_id=NEW.decision_id OR proposal_id=NEW.proposal_id',
    app_model_transition_supersessions: 'authority_id=NEW.authority_id OR decision_id=NEW.decision_id OR proposal_id=NEW.proposal_id',
    repair_revision_origins: 'repair_origin_id=NEW.repair_origin_id OR test_set_row_id=NEW.test_set_row_id OR supersession_authority_id=NEW.supersession_authority_id',
    repair_rerun_links: 'rerun_link_id=NEW.rerun_link_id OR rerun_link_hash=NEW.rerun_link_hash',
  }
  const definitions: Record<string, string> = {}
  for (const table of IMMUTABLE_TABLES) {
    const label = table.replace(/_/g, ' ')
    definitions[`${table}_immutable_update`] = `CREATE TRIGGER ${table}_immutable_update BEFORE UPDATE ON ${table}
      BEGIN SELECT RAISE(ABORT,'${label} authority is immutable'); END`
    definitions[`${table}_immutable_delete`] = `CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table}
      BEGIN SELECT RAISE(ABORT,'${label} authority is immutable'); END`
    definitions[`${table}_immutable_collision`] = `CREATE TRIGGER ${table}_immutable_collision BEFORE INSERT ON ${table}
      WHEN EXISTS (SELECT 1 FROM ${table} WHERE ${collisionPredicates[table]})
      BEGIN SELECT RAISE(ABORT,'${label} authority identity already exists'); END`
  }
  return definitions
}

export async function up(db: Kysely<any>): Promise<void> {
  if (currentMigrationDialect() !== 'sqlite') throw new Error('Migration 036 is governed for SQLite workspace databases only.')

  const foreignKeys = Number((await sql<{ foreign_keys: number }>`PRAGMA foreign_keys`.execute(db)).rows[0]?.foreign_keys)
  if (foreignKeys !== 1) throw new Error('Migration 036 requires PRAGMA foreign_keys=ON before its transaction begins.')

  const duplicates = (await sql<{ result_id: string; count: number }>`SELECT result_id,COUNT(*) count
    FROM test_results WHERE result_id IS NOT NULL GROUP BY result_id HAVING COUNT(*)>1 ORDER BY result_id`.execute(db)).rows
  if (duplicates.length > 0) {
    throw new Error(`Migration 036 cannot create uq_results_result_id_fk: duplicate non-NULL test_results.result_id authority: ${duplicates.map(row => `${row.result_id} (${row.count})`).join(', ')}.`)
  }

  const directDependents = new Set<string>()
  const tables = (await sql<{ name: string }>`SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'`.execute(db)).rows
  for (const table of tables) {
    const fks = (await sql.raw<{ table: string }>(`PRAGMA foreign_key_list(${quoted(table.name)})`).execute(db)).rows
    if (fks.some(fk => fk.table === 'test_set_revisions')) directDependents.add(table.name)
  }
  const unexpected = [...directDependents].filter(name => !DIRECT_TEST_SET_DEPENDENTS.has(name))
  const missing = [...DIRECT_TEST_SET_DEPENDENTS].filter(name => !directDependents.has(name))
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`Migration 036 Test Set dependency graph differs from the reviewed schema (unexpected: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}).`)
  }

  const triggers = (await sql<SchemaObject>`SELECT name,sql FROM sqlite_schema
    WHERE type='trigger' AND sql IS NOT NULL ORDER BY name`.execute(db)).rows
  const views = (await sql<SchemaObject>`SELECT name,sql FROM sqlite_schema
    WHERE type='view' AND sql IS NOT NULL AND lower(sql) LIKE '%test_set_revisions%' ORDER BY name`.execute(db)).rows
  const dependents = await captureTables(db, TABLE_DROP_ORDER)
  const testSetIndexes = (await sql<SchemaObject>`SELECT name,sql FROM sqlite_schema
    WHERE type='index' AND tbl_name='test_set_revisions' AND sql IS NOT NULL ORDER BY name`.execute(db)).rows
  for (const trigger of triggers) await sql.raw(`DROP TRIGGER ${quoted(trigger.name)}`).execute(db)
  for (const view of views) await sql.raw(`DROP VIEW ${quoted(view.name)}`).execute(db)
  for (const name of TABLE_DROP_ORDER) await sql.raw(`DROP TABLE ${quoted(name)}`).execute(db)

  // Create the empty reverse side first. SQLite permits its still-empty parent
  // reference to target the replacement table name, and ALTER TABLE RENAME
  // rewrites that reference after the old parent has been removed.
  await sql.raw(`CREATE TABLE repair_revision_origins (
    canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
    repair_origin_id varchar(255) NOT NULL PRIMARY KEY, test_set_row_id integer NOT NULL UNIQUE,
    project_id varchar(255) NOT NULL, source_definition_authority_json text NOT NULL CHECK(json_valid(source_definition_authority_json)),
    result_definition_authority_json text NOT NULL CHECK(json_valid(result_definition_authority_json)),
    supersession_authority_id varchar(255) NOT NULL UNIQUE, supersession_authority_hash varchar(64) NOT NULL,
    proposal_id varchar(255) NOT NULL, proposal_hash varchar(64) NOT NULL,
    decision_id varchar(255) NOT NULL, decision_hash varchar(64) NOT NULL,
    materializer_version varchar(100) NOT NULL CHECK(materializer_version='forge.m5.selector-repair-materializer/v1'),
    transform_hash varchar(64) NOT NULL CHECK(length(transform_hash)=64 AND transform_hash NOT GLOB '*[^a-f0-9]*'),
    created_at varchar(50) NOT NULL,
    FOREIGN KEY(test_set_row_id,repair_origin_id) REFERENCES test_set_revisions_036(id,repair_origin_id)
      ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY(supersession_authority_id,supersession_authority_hash,project_id,proposal_id,proposal_hash,decision_id,decision_hash)
      REFERENCES app_model_transition_supersessions(authority_id,authority_hash,project_id,proposal_id,proposal_hash,decision_id,decision_hash)
      ON UPDATE RESTRICT ON DELETE RESTRICT)`).execute(db)

  await sql.raw(`CREATE TABLE test_set_revisions_036 (
    id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    test_set_id varchar(255) NOT NULL,
    revision integer NOT NULL,
    project_id varchar(255) NOT NULL,
    generation_id varchar(255) NOT NULL UNIQUE,
    schema_version integer NOT NULL DEFAULT 1 CHECK(schema_version IN (1, 2, 3)),
    source_observation_id varchar(255),
    model_row_id integer NOT NULL,
    model_version varchar(50) NOT NULL,
    observation_run_id varchar(255),
    support_seal_hash varchar(64),
    characterization_policy_id varchar(255),
    characterization_policy_version varchar(100),
    generated_at varchar(50) NOT NULL,
    outcome varchar(50) NOT NULL,
    definition_count integer NOT NULL,
    payload_json text NOT NULL,
    content_hash varchar(64) NOT NULL,
    revision_origin_kind varchar(20) NOT NULL DEFAULT 'generation' CHECK(revision_origin_kind IN ('generation','repair')),
    repair_origin_id varchar(255) UNIQUE,
    CONSTRAINT uq_test_set_project_revision UNIQUE(project_id,revision),
    UNIQUE(id,repair_origin_id),
    CHECK((schema_version=1 AND source_observation_id IS NOT NULL AND observation_run_id IS NULL
      AND support_seal_hash IS NULL AND characterization_policy_id IS NULL AND characterization_policy_version IS NULL)
      OR (schema_version IN (2,3) AND source_observation_id IS NULL AND observation_run_id IS NOT NULL
      AND length(support_seal_hash)=64 AND support_seal_hash NOT GLOB '*[^a-f0-9]*'
      AND characterization_policy_id IS NOT NULL AND characterization_policy_version IS NOT NULL)),
    CHECK((revision_origin_kind='generation' AND repair_origin_id IS NULL)
      OR (revision_origin_kind='repair' AND repair_origin_id IS NOT NULL)),
    FOREIGN KEY(repair_origin_id) REFERENCES repair_revision_origins(repair_origin_id)
      ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
  )`).execute(db)
  await sql.raw(`INSERT INTO test_set_revisions_036 (
    id,test_set_id,revision,project_id,generation_id,schema_version,source_observation_id,model_row_id,model_version,
    observation_run_id,support_seal_hash,characterization_policy_id,characterization_policy_version,generated_at,
    outcome,definition_count,payload_json,content_hash,revision_origin_kind,repair_origin_id)
    SELECT id,test_set_id,revision,project_id,generation_id,schema_version,source_observation_id,model_row_id,model_version,
      observation_run_id,support_seal_hash,characterization_policy_id,characterization_policy_version,generated_at,
      outcome,definition_count,payload_json,content_hash,'generation',NULL FROM test_set_revisions ORDER BY id`).execute(db)
  await sql`DROP TABLE test_set_revisions`.execute(db)
  await sql`ALTER TABLE test_set_revisions_036 RENAME TO test_set_revisions`.execute(db)
  for (const index of testSetIndexes) await sql.raw(index.sql).execute(db)

  await sql.raw(`CREATE TABLE repair_proposals (
    proposal_id varchar(255) NOT NULL PRIMARY KEY, project_id varchar(255) NOT NULL,
    schema_version varchar(100) NOT NULL CHECK(schema_version='forge.m5.transition-correspondence-proposal/v1'),
    repair_kind varchar(40) NOT NULL CHECK(repair_kind='selector_replacement'), canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
    proposal_hash varchar(64) NOT NULL CHECK(length(proposal_hash)=64 AND proposal_hash NOT GLOB '*[^a-f0-9]*'),
    source_endpoint_identity text NOT NULL CHECK(json_valid(source_endpoint_identity)),
    candidate_endpoint_identity text NOT NULL CHECK(json_valid(candidate_endpoint_identity)),
    enumerator_version varchar(100) NOT NULL CHECK(enumerator_version='forge.m5.bounded-successor-enumerator/v1'),
    candidate_set_hash varchar(64) NOT NULL CHECK(length(candidate_set_hash)=64 AND candidate_set_hash NOT GLOB '*[^a-f0-9]*'),
    derived_successor_count integer NOT NULL CHECK(derived_successor_count=1),
    UNIQUE(proposal_id,project_id,proposal_hash))`).execute(db)

  await sql.raw(`CREATE TABLE repair_decisions (
    decision_id varchar(255) NOT NULL PRIMARY KEY, proposal_id varchar(255) NOT NULL, project_id varchar(255) NOT NULL,
    proposal_hash varchar(64) NOT NULL, decision varchar(10) NOT NULL CHECK(decision IN ('approve','reject')),
    actor_kind varchar(10) NOT NULL CHECK(actor_kind='human'), actor_id varchar(255) NOT NULL,
    mechanism_id varchar(30) NOT NULL CHECK(mechanism_id='local_product'), decided_at varchar(50) NOT NULL,
    canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
    decision_hash varchar(64) NOT NULL CHECK(length(decision_hash)=64 AND decision_hash NOT GLOB '*[^a-f0-9]*'),
    UNIQUE(proposal_id), UNIQUE(decision_id,proposal_id,project_id,proposal_hash,decision,actor_kind,actor_id,mechanism_id,decision_hash),
    FOREIGN KEY(proposal_id,project_id,proposal_hash) REFERENCES repair_proposals(proposal_id,project_id,proposal_hash)
      ON UPDATE RESTRICT ON DELETE RESTRICT)`).execute(db)

  await sql.raw(`CREATE TABLE app_model_transition_supersessions (
    canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
    authority_id varchar(255) NOT NULL PRIMARY KEY,
    authority_hash varchar(64) NOT NULL CHECK(length(authority_hash)=64 AND authority_hash NOT GLOB '*[^a-f0-9]*'),
    project_id varchar(255) NOT NULL, source_endpoint_identity text NOT NULL CHECK(json_valid(source_endpoint_identity)),
    candidate_endpoint_identity text NOT NULL CHECK(json_valid(candidate_endpoint_identity)),
    proposal_id varchar(255) NOT NULL, proposal_hash varchar(64) NOT NULL,
    decision_id varchar(255) NOT NULL, decision_hash varchar(64) NOT NULL,
    decision_kind varchar(10) NOT NULL CHECK(decision_kind='approve'), actor_kind varchar(10) NOT NULL CHECK(actor_kind='human'),
    actor_id varchar(255) NOT NULL, mechanism_id varchar(30) NOT NULL CHECK(mechanism_id='local_product'), promoted_at varchar(50) NOT NULL,
    UNIQUE(authority_id,authority_hash,project_id,proposal_id,proposal_hash,decision_id,decision_hash),
    UNIQUE(decision_id), UNIQUE(proposal_id),
    FOREIGN KEY(decision_id,proposal_id,project_id,proposal_hash,decision_kind,actor_kind,actor_id,mechanism_id,decision_hash)
      REFERENCES repair_decisions(decision_id,proposal_id,project_id,proposal_hash,decision,actor_kind,actor_id,mechanism_id,decision_hash)
      ON UPDATE RESTRICT ON DELETE RESTRICT)`).execute(db)

  await sql.raw(`CREATE TABLE repair_rerun_links (
    canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),
    rerun_link_id varchar(255) NOT NULL PRIMARY KEY, rerun_link_hash varchar(64) NOT NULL UNIQUE,
    repair_origin_id varchar(255) NOT NULL, repair_lineage_hash varchar(64) NOT NULL, project_id varchar(255) NOT NULL,
    resulting_test_set_row_id integer NOT NULL, resulting_test_set_id varchar(255) NOT NULL,
    resulting_test_set_revision integer NOT NULL, resulting_test_set_content_hash varchar(64) NOT NULL,
    resulting_definition_schema_version integer NOT NULL CHECK(resulting_definition_schema_version=3),
    resulting_definition_id varchar(255) NOT NULL, resulting_definition_content_hash varchar(64) NOT NULL,
    model_row_id integer NOT NULL, model_version varchar(50) NOT NULL, support_seal_hash varchar(64) NOT NULL,
    execution_id varchar(255) NOT NULL, item_ordinal integer NOT NULL, plan_hash varchar(64) NOT NULL,
    run_id varchar(255) NOT NULL, attempt_ordinal integer NOT NULL, result_id varchar(255) NOT NULL,
    suite_project_id varchar(255), suite_id varchar(255), suite_revision integer, suite_content_hash varchar(64), suite_item_ordinal integer,
    recorded_at varchar(50) NOT NULL,
    CHECK((suite_project_id IS NULL AND suite_id IS NULL AND suite_revision IS NULL AND suite_content_hash IS NULL AND suite_item_ordinal IS NULL)
      OR (suite_project_id IS NOT NULL AND suite_id IS NOT NULL AND suite_revision IS NOT NULL AND suite_content_hash IS NOT NULL AND suite_item_ordinal IS NOT NULL)),
    FOREIGN KEY(repair_origin_id) REFERENCES repair_revision_origins(repair_origin_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY(execution_id,item_ordinal) REFERENCES execution_items(execution_id,item_ordinal) ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY(execution_id,item_ordinal) REFERENCES execution_item_authorities(execution_id,item_ordinal) ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY(run_id) REFERENCES runs(run_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY(result_id) REFERENCES test_results(result_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY(suite_id,suite_revision,suite_item_ordinal) REFERENCES suite_revision_members(suite_id,suite_revision,member_ordinal)
      ON UPDATE RESTRICT ON DELETE RESTRICT)`).execute(db)

  await sql.raw(`CREATE VIEW m5_valid_repair_origin_pairs AS
    SELECT origin.repair_origin_id,origin.test_set_row_id
    FROM repair_revision_origins origin
    JOIN test_set_revisions result ON result.id=origin.test_set_row_id
    JOIN app_model_transition_supersessions supersession
      ON supersession.authority_id=origin.supersession_authority_id
     AND supersession.authority_hash=origin.supersession_authority_hash
     AND supersession.project_id=origin.project_id
     AND supersession.proposal_id=origin.proposal_id AND supersession.proposal_hash=origin.proposal_hash
     AND supersession.decision_id=origin.decision_id AND supersession.decision_hash=origin.decision_hash
    JOIN repair_proposals proposal
      ON proposal.proposal_id=supersession.proposal_id AND proposal.project_id=supersession.project_id
     AND proposal.proposal_hash=supersession.proposal_hash
    JOIN repair_decisions decision
      ON decision.decision_id=supersession.decision_id AND decision.proposal_id=proposal.proposal_id
     AND decision.project_id=proposal.project_id AND decision.proposal_hash=proposal.proposal_hash
     AND decision.decision_hash=supersession.decision_hash AND decision.decision='approve'
     AND decision.actor_kind='human' AND decision.mechanism_id='local_product'
    JOIN test_set_revisions source
      ON source.id=json_extract(origin.source_definition_authority_json,'$.testSetRowId')
    WHERE result.project_id=origin.project_id AND result.revision_origin_kind='repair'
      AND result.repair_origin_id=origin.repair_origin_id
      AND result.id=json_extract(origin.result_definition_authority_json,'$.testSetRowId')
      AND result.test_set_id=json_extract(origin.result_definition_authority_json,'$.testSetId')
      AND result.revision=json_extract(origin.result_definition_authority_json,'$.testSetRevision')
      AND result.content_hash=json_extract(origin.result_definition_authority_json,'$.testSetContentHash')
      AND result.model_row_id=json_extract(origin.result_definition_authority_json,'$.modelRowId')
      AND result.model_version=json_extract(origin.result_definition_authority_json,'$.modelVersion')
      AND result.support_seal_hash=json_extract(origin.result_definition_authority_json,'$.supportSealHash')
      AND forge_is_exact_canonical_v3_definition_member(result.payload_json,result.content_hash,result.test_set_id,
        result.revision,result.project_id,result.definition_count,
        json_extract(origin.result_definition_authority_json,'$.definitionId'))=1
      AND forge_is_exact_canonical_v3_definition_hash(result.payload_json,
        json_extract(origin.result_definition_authority_json,'$.definitionId'),
        json_extract(origin.result_definition_authority_json,'$.definitionContentHash'))=1
      AND source.project_id=origin.project_id
      AND source.test_set_id=json_extract(origin.source_definition_authority_json,'$.testSetId')
      AND source.revision=json_extract(origin.source_definition_authority_json,'$.testSetRevision')
      AND source.content_hash=json_extract(origin.source_definition_authority_json,'$.testSetContentHash')
      AND source.model_row_id=json_extract(origin.source_definition_authority_json,'$.modelRowId')
      AND source.model_version=json_extract(origin.source_definition_authority_json,'$.modelVersion')
      AND source.support_seal_hash=json_extract(origin.source_definition_authority_json,'$.supportSealHash')
      AND forge_is_exact_canonical_v3_definition_member(source.payload_json,source.content_hash,source.test_set_id,
        source.revision,source.project_id,source.definition_count,
        json_extract(origin.source_definition_authority_json,'$.definitionId'))=1
      AND forge_is_exact_canonical_v3_definition_hash(source.payload_json,
        json_extract(origin.source_definition_authority_json,'$.definitionId'),
        json_extract(origin.source_definition_authority_json,'$.definitionContentHash'))=1
      AND source.model_row_id=json_extract(proposal.source_endpoint_identity,'$.modelRowId')
      AND source.model_version=json_extract(proposal.source_endpoint_identity,'$.modelVersion')
      AND source.support_seal_hash=json_extract(proposal.source_endpoint_identity,'$.supportSealHash')
      AND result.model_row_id=json_extract(proposal.candidate_endpoint_identity,'$.modelRowId')
      AND result.model_version=json_extract(proposal.candidate_endpoint_identity,'$.modelVersion')
      AND result.support_seal_hash=json_extract(proposal.candidate_endpoint_identity,'$.supportSealHash')
      AND forge_m5_source_product_authority(origin.canonical_payload,${sourceProductRowsSql('origin.canonical_payload')})=1`).execute(db)

  await restoreTables(db, dependents)
  await sql`CREATE UNIQUE INDEX uq_results_result_id_fk ON test_results(result_id)`.execute(db)
  for (const view of views) await sql.raw(view.sql).execute(db)
  for (const trigger of triggers) {
    if (trigger.name === 'manual_test_promotions_authority_insert') continue
    await sql.raw(trigger.sql).execute(db)
  }
  for (const [name, definition] of Object.entries(MIGRATION_036_TRIGGER_DEFINITIONS_V1)) {
    try { await sql.raw(definition).execute(db) } catch (cause) {
      throw new Error(`Migration 036 could not create trigger ${name}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
    }
  }
  for (const definition of Object.values(migration036ImmutableTriggerDefinitions())) await sql.raw(definition).execute(db)

  const violations = (await sql<Record<string, unknown>>`PRAGMA foreign_key_check`.execute(db)).rows
  if (violations.length > 0) throw new Error(`Migration 036 foreign_key_check failed: ${JSON.stringify(violations)}.`)
}

export async function down(db: Kysely<any>): Promise<void> {
  void db
  throw new Error('Migration 036 is intentionally irreversible.')
}
