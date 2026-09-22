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
import { Kysely, sql } from 'kysely'
import { currentMigrationDialect } from '../MigrationContext'

const GRAPH_TABLES = [
  'executions', 'execution_items', 'execution_events', 'execution_locks', 'runs', 'test_results',
] as const
const SEQUENCED_TABLES = ['execution_events', 'runs', 'test_results'] as const

// Frozen from the supported Migration-026 graph. Canonicalization preserves
// SQL string literals exactly while normalizing semantically insignificant
// identifier quoting, SQL keyword case, and whitespace outside literals.
const EXPECTED_PRE_027_SCHEMA_HASH = 'd0602143f47c863e3f7a4dfee7f5c8c8aaeb2bb95c91145ff05779fd889b14b2'

const COLUMNS: Record<(typeof GRAPH_TABLES)[number], readonly string[]> = {
  executions: [
    'execution_id', 'project_id', 'accepted_at', 'test_set_id', 'test_set_revision',
    'model_row_id', 'model_version', 'source_observation_id', 'manifest_hash',
    'max_run_attempts', 'dispatch_mode', 'stop_rule',
  ],
  execution_items: ['execution_id', 'item_ordinal', 'definition_id', 'executable_plan_hash'],
  execution_events: [
    'id', 'execution_id', 'project_id', 'event_type', 'outcome', 'occurred_at',
    'process_instance_id', 'safe_code', 'safe_message', 'execution_plan_hash', 'lifecycle',
  ],
  execution_locks: ['project_id', 'execution_id', 'process_instance_id', 'acquired_at', 'last_heartbeat_at'],
  runs: [
    'id', 'run_id', 'app_name', 'branch', 'commit_sha', 'environment', 'base_url',
    'triggered_by', 'reporter_version', 'status', 'total_tests', 'passed', 'failed',
    'skipped', 'duration_ms', 'started_at', 'completed_at', 'metadata', 'input_health',
    'input_health_reason', 'lifecycle', 'execution_id', 'origin', 'attempt_ordinal',
  ],
  test_results: [
    'id', 'run_id', 'test_id', 'title', 'suite', 'status', 'duration_ms', 'retry_count',
    'error_msg', 'browser', 'tier', 'started_at', 'worker_index', 'tags', 'flaky_history',
    'screenshot_path', 'video_path', 'metadata', 'result_id', 'execution_item_ordinal',
    'definition_id', 'executable_plan_hash',
  ],
}

const ORDER_BY: Record<(typeof GRAPH_TABLES)[number], string> = {
  executions: 'execution_id',
  execution_items: 'execution_id, item_ordinal',
  execution_events: 'id',
  execution_locks: 'project_id',
  runs: 'id',
  test_results: 'id',
}

const CREATE_REPLACEMENT_GRAPH = `
  CREATE TABLE executions_027 (
    execution_id varchar(255) NOT NULL PRIMARY KEY,
    project_id varchar(255) NOT NULL,
    accepted_at varchar(50) NOT NULL,
    test_set_id varchar(255) NOT NULL,
    test_set_revision integer NOT NULL CHECK (test_set_revision > 0),
    definition_schema_version integer NOT NULL DEFAULT 1 CHECK (definition_schema_version IN (1, 2)),
    model_row_id integer NOT NULL CHECK (model_row_id > 0),
    model_version varchar(50) NOT NULL,
    source_observation_id varchar(255),
    support_seal_hash varchar(64),
    route_evidence_identity_hash varchar(64),
    authentication_expectation_identity_hash varchar(64),
    manifest_hash varchar(64) NOT NULL CHECK (length(manifest_hash) = 64 AND manifest_hash NOT GLOB '*[^a-f0-9]*'),
    max_run_attempts integer NOT NULL CHECK (max_run_attempts > 0),
    dispatch_mode varchar(20) NOT NULL CHECK (dispatch_mode = 'serial'),
    stop_rule varchar(50) NOT NULL CHECK (stop_rule = 'stop_on_first_non_completed'),
    CHECK (
      (definition_schema_version = 1 AND source_observation_id IS NOT NULL
        AND support_seal_hash IS NULL AND route_evidence_identity_hash IS NULL
        AND authentication_expectation_identity_hash IS NULL)
      OR
      (definition_schema_version = 2 AND source_observation_id IS NULL
        AND length(support_seal_hash) = 64 AND support_seal_hash NOT GLOB '*[^a-f0-9]*'
        AND length(route_evidence_identity_hash) = 64 AND route_evidence_identity_hash NOT GLOB '*[^a-f0-9]*'
        AND length(authentication_expectation_identity_hash) = 64 AND authentication_expectation_identity_hash NOT GLOB '*[^a-f0-9]*')
    )
  );
  CREATE TABLE execution_items_027 (
    execution_id varchar(255) NOT NULL,
    item_ordinal integer NOT NULL CHECK (item_ordinal > 0),
    definition_id varchar(255) NOT NULL,
    executable_plan_hash varchar(64) NOT NULL CHECK (length(executable_plan_hash) = 64 AND executable_plan_hash NOT GLOB '*[^a-f0-9]*'),
    PRIMARY KEY (execution_id, item_ordinal),
    UNIQUE (execution_id, definition_id),
    FOREIGN KEY (execution_id) REFERENCES executions_027(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT
  );
  CREATE TABLE execution_events_027 (
    id integer PRIMARY KEY AUTOINCREMENT,
    execution_id varchar(255) NOT NULL,
    project_id varchar(255) NOT NULL,
    event_type varchar(20) NOT NULL,
    outcome varchar(50),
    occurred_at varchar(50) NOT NULL,
    process_instance_id varchar(255) NOT NULL,
    safe_code varchar(100),
    safe_message text NOT NULL,
    execution_plan_hash varchar(64) NOT NULL,
    lifecycle varchar(30) CHECK (lifecycle IS NULL OR lifecycle IN ('accepted', 'cancellation_requested', 'completed', 'cancelled', 'interrupted')),
    FOREIGN KEY (execution_id) REFERENCES executions_027(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT
  );
  CREATE TABLE execution_locks_027 (
    project_id varchar(255) PRIMARY KEY,
    execution_id varchar(255) NOT NULL UNIQUE,
    process_instance_id varchar(255) NOT NULL,
    acquired_at varchar(50) NOT NULL,
    last_heartbeat_at varchar(50) NOT NULL,
    FOREIGN KEY (execution_id) REFERENCES executions_027(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT
  );
  CREATE TABLE runs_027 (
    id integer PRIMARY KEY AUTOINCREMENT,
    run_id varchar(255) NOT NULL UNIQUE,
    app_name varchar(255) NOT NULL,
    branch varchar(255) NOT NULL DEFAULT 'unknown',
    commit_sha varchar(255) NOT NULL DEFAULT 'unknown',
    environment varchar(50) NOT NULL DEFAULT 'local',
    base_url varchar(500) NOT NULL DEFAULT '',
    triggered_by varchar(50) NOT NULL DEFAULT 'manual',
    reporter_version varchar(50) NOT NULL DEFAULT 'unknown',
    status varchar(50) NOT NULL DEFAULT 'unknown',
    total_tests integer NOT NULL DEFAULT 0,
    passed integer NOT NULL DEFAULT 0,
    failed integer NOT NULL DEFAULT 0,
    skipped integer NOT NULL DEFAULT 0,
    duration_ms integer NOT NULL DEFAULT 0,
    started_at varchar(50) NOT NULL,
    completed_at varchar(50),
    metadata text NOT NULL DEFAULT '{}',
    input_health varchar(20) NOT NULL DEFAULT 'unknown',
    input_health_reason varchar(50),
    lifecycle varchar(50) NOT NULL DEFAULT 'completed',
    execution_id varchar(255),
    origin varchar(20) NOT NULL DEFAULT 'legacy' CHECK (origin IN ('legacy', 'product')),
    attempt_ordinal integer,
    CHECK ((origin = 'legacy' AND execution_id IS NULL AND attempt_ordinal IS NULL)
      OR (origin = 'product' AND execution_id IS NOT NULL AND attempt_ordinal > 0)),
    FOREIGN KEY (execution_id) REFERENCES executions_027(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT
  );
  CREATE TABLE test_results_027 (
    id integer PRIMARY KEY AUTOINCREMENT,
    run_id varchar(255) NOT NULL,
    test_id varchar(255) NOT NULL,
    title text NOT NULL,
    suite varchar(255) NOT NULL,
    status varchar(50) NOT NULL,
    duration_ms integer NOT NULL DEFAULT 0,
    retry_count integer NOT NULL DEFAULT 0,
    error_msg text,
    browser varchar(50) NOT NULL DEFAULT 'unknown',
    tier varchar(50) NOT NULL DEFAULT 'ui',
    started_at varchar(50) NOT NULL DEFAULT '',
    worker_index integer NOT NULL DEFAULT 0,
    tags text NOT NULL DEFAULT '[]',
    flaky_history integer NOT NULL DEFAULT 0,
    screenshot_path text,
    video_path text,
    metadata text NOT NULL DEFAULT '{}',
    result_id varchar(255),
    execution_item_ordinal integer,
    definition_id varchar(255),
    executable_plan_hash varchar(64),
    CHECK ((result_id IS NULL AND execution_item_ordinal IS NULL AND definition_id IS NULL AND executable_plan_hash IS NULL)
      OR (result_id IS NOT NULL AND execution_item_ordinal > 0 AND definition_id IS NOT NULL
        AND length(executable_plan_hash) = 64 AND executable_plan_hash NOT GLOB '*[^a-f0-9]*')),
    FOREIGN KEY (run_id) REFERENCES runs_027(run_id) ON UPDATE RESTRICT ON DELETE RESTRICT
  )
`

interface SchemaObject { type: 'index' | 'table' | 'trigger'; name: string; tbl_name: string; sql: string | null }
interface SequenceRow { name: string; seq: number }
interface Projection { count: number; hash: string }

export interface Migration027TestHooks {
  afterReplacementCopy?: (db: Kysely<any>) => Promise<void>
  afterReplacementVerification?: (db: Kysely<any>) => Promise<void>
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function executeStatements(db: Kysely<any>, statements: string): Promise<void> {
  for (const statement of statements.split(';').map(value => value.trim()).filter(Boolean)) {
    await sql.raw(statement).execute(db)
  }
}

function canonicalSql(object: SchemaObject): string | null {
  if (object.sql === null) return null
  let normalized = ''
  let pendingSpace = false
  for (let index = 0; index < object.sql.length; index++) {
    const character = object.sql[index]
    if (character === "'") {
      const terminator = character
      if (pendingSpace && normalized.length > 0 && !/[(),]$/.test(normalized)) normalized += ' '
      pendingSpace = false
      normalized += character
      for (index++; index < object.sql.length; index++) {
        const quotedCharacter = object.sql[index]
        normalized += quotedCharacter
        if (quotedCharacter !== terminator) continue
        if (object.sql[index + 1] === terminator) {
          normalized += object.sql[++index]
          continue
        }
        break
      }
      continue
    }
    if (character === '"' || character === '`' || character === '[') {
      const terminator = character === '[' ? ']' : character
      if (pendingSpace && normalized.length > 0 && !/[(),]$/.test(normalized)) normalized += ' '
      pendingSpace = false
      for (index++; index < object.sql.length; index++) {
        const quotedCharacter = object.sql[index]
        if (quotedCharacter !== terminator) {
          normalized += quotedCharacter.toLowerCase()
          continue
        }
        if (object.sql[index + 1] === terminator) {
          normalized += object.sql[++index].toLowerCase()
          continue
        }
        break
      }
      continue
    }
    if (/\s/.test(character)) {
      pendingSpace = true
      continue
    }
    if (object.type === 'table' && /[(),]/.test(character)) {
      normalized = normalized.trimEnd() + character
      pendingSpace = false
      continue
    }
    if (pendingSpace && normalized.length > 0 && !/[(),]$/.test(normalized)) normalized += ' '
    pendingSpace = false
    normalized += character.toLowerCase()
  }
  return normalized.trim()
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function affectedSchema(db: Kysely<any>): Promise<SchemaObject[]> {
  const tableList = GRAPH_TABLES.map(literal).join(', ')
  return (await sql.raw(`
    SELECT type, name, tbl_name, sql FROM sqlite_schema
    WHERE tbl_name IN (${tableList}) AND type IN ('table', 'index', 'trigger')
    ORDER BY type, name
  `).execute(db)).rows as SchemaObject[]
}

function schemaHash(objects: SchemaObject[]): string {
  return digest(objects.map(row => ({ ...row, sql: canonicalSql(row) })))
}

async function verifyDependencyClosure(db: Kysely<any>): Promise<void> {
  const expected = new Set([
    'execution_items.execution_id->executions.execution_id:RESTRICT:RESTRICT',
    'execution_events.execution_id->executions.execution_id:RESTRICT:RESTRICT',
    'execution_locks.execution_id->executions.execution_id:RESTRICT:RESTRICT',
    'runs.execution_id->executions.execution_id:RESTRICT:RESTRICT',
    'test_results.run_id->runs.run_id:RESTRICT:RESTRICT',
  ])
  const actual = new Set<string>()
  const tables = (await sql<{ name: string }>`
    SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name
  `.execute(db)).rows
  for (const table of tables) {
    const foreignKeys = (await sql.raw(`PRAGMA foreign_key_list(${quote(table.name)})`).execute(db)).rows as Array<{
      table: string; from: string; to: string; on_update: string; on_delete: string
    }>
    for (const foreignKey of foreignKeys) {
      if (GRAPH_TABLES.includes(table.name as any) || GRAPH_TABLES.includes(foreignKey.table as any)) {
        actual.add(`${table.name}.${foreignKey.from}->${foreignKey.table}.${foreignKey.to}:${foreignKey.on_update}:${foreignKey.on_delete}`)
      }
    }
  }
  const unexpected = [...actual].filter(edge => !expected.has(edge))
  const missing = [...expected].filter(edge => !actual.has(edge))
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`Migration 027 refused foreign-key dependency graph; unexpected=[${unexpected.join(', ')}], missing=[${missing.join(', ')}].`)
  }
}

async function verifyPrecondition(db: Kysely<any>): Promise<SchemaObject[]> {
  await verifyDependencyClosure(db)
  const objects = await affectedSchema(db)
  const actual = schemaHash(objects)
  if (actual !== EXPECTED_PRE_027_SCHEMA_HASH) {
    throw new Error(`Migration 027 refused unsupported Migration-026 schema; expected ${EXPECTED_PRE_027_SCHEMA_HASH}, observed ${actual}.`)
  }
  return objects
}

async function projection(db: Kysely<any>, table: (typeof GRAPH_TABLES)[number], replacement: boolean): Promise<Projection> {
  const source = `${table}${replacement ? '_027' : ''}`
  const columns = COLUMNS[table].map(quote).join(', ')
  const rows = (await sql.raw(`SELECT ${columns} FROM ${quote(source)} ORDER BY ${ORDER_BY[table]}`).execute(db)).rows
  return { count: rows.length, hash: digest(rows) }
}

async function graphProjections(db: Kysely<any>, replacement: boolean): Promise<Record<string, Projection>> {
  const result: Record<string, Projection> = {}
  for (const table of GRAPH_TABLES) result[table] = await projection(db, table, replacement)
  return result
}

async function readSequences(db: Kysely<any>): Promise<SequenceRow[]> {
  const names = SEQUENCED_TABLES.map(literal).join(', ')
  return (await sql.raw(`SELECT name, seq FROM sqlite_sequence WHERE name IN (${names}) ORDER BY name`).execute(db)).rows as SequenceRow[]
}

async function verifyReplacement(db: Kysely<any>, expected: Record<string, Projection>): Promise<void> {
  const actual = await graphProjections(db, true)
  for (const table of GRAPH_TABLES) {
    if (actual[table].count !== expected[table].count || actual[table].hash !== expected[table].hash) {
      throw new Error(`Migration 027 replacement verification failed for ${table}; expected ${JSON.stringify(expected[table])}, observed ${JSON.stringify(actual[table])}.`)
    }
  }
  const invalidNewFields = await sql<{ count: number }>`
    SELECT COUNT(*) AS count FROM executions_027
    WHERE definition_schema_version <> 1 OR support_seal_hash IS NOT NULL
      OR route_evidence_identity_hash IS NOT NULL OR authentication_expectation_identity_hash IS NOT NULL
  `.execute(db)
  if (Number(invalidNewFields.rows[0]?.count ?? -1) !== 0) {
    throw new Error('Migration 027 replacement verification found invalid migration-defined field values.')
  }
  const orphans = await sql<{ count: number }>`
    SELECT
      (SELECT COUNT(*) FROM execution_items_027 i LEFT JOIN executions_027 x ON x.execution_id = i.execution_id WHERE x.execution_id IS NULL)
      + (SELECT COUNT(*) FROM execution_events_027 e LEFT JOIN executions_027 x ON x.execution_id = e.execution_id WHERE x.execution_id IS NULL)
      + (SELECT COUNT(*) FROM execution_locks_027 l LEFT JOIN executions_027 x ON x.execution_id = l.execution_id WHERE x.execution_id IS NULL)
      + (SELECT COUNT(*) FROM runs_027 r LEFT JOIN executions_027 x ON x.execution_id = r.execution_id WHERE r.execution_id IS NOT NULL AND x.execution_id IS NULL)
      + (SELECT COUNT(*) FROM test_results_027 t LEFT JOIN runs_027 r ON r.run_id = t.run_id WHERE r.run_id IS NULL)
      AS count
  `.execute(db)
  if (Number(orphans.rows[0]?.count ?? -1) !== 0) throw new Error('Migration 027 replacement verification found broken relationships.')
}

async function assertForeignKeysClean(db: Kysely<any>, phase: string): Promise<void> {
  const violations = (await sql.raw('PRAGMA foreign_key_check').execute(db)).rows
  if (violations.length !== 0) throw new Error(`Migration 027 ${phase} foreign_key_check returned ${violations.length} violation(s).`)
}

async function restoreSequences(db: Kysely<any>, preserved: SequenceRow[]): Promise<void> {
  for (const table of SEQUENCED_TABLES) await sql.raw(`DELETE FROM sqlite_sequence WHERE name = ${literal(table)}`).execute(db)
  for (const row of preserved) {
    await sql`INSERT INTO sqlite_sequence (name, seq) VALUES (${row.name}, ${row.seq})`.execute(db)
  }
  const restored = await readSequences(db)
  if (digest(restored) !== digest(preserved)) throw new Error('Migration 027 failed to restore sqlite_sequence exactly.')
}

async function copyReplacementGraph(db: Kysely<any>): Promise<void> {
  await executeStatements(db, `
    INSERT INTO executions_027 (
      execution_id, project_id, accepted_at, test_set_id, test_set_revision,
      definition_schema_version, model_row_id, model_version, source_observation_id,
      support_seal_hash, route_evidence_identity_hash, authentication_expectation_identity_hash,
      manifest_hash, max_run_attempts, dispatch_mode, stop_rule
    ) SELECT execution_id, project_id, accepted_at, test_set_id, test_set_revision,
      1, model_row_id, model_version, source_observation_id, NULL, NULL, NULL,
      manifest_hash, max_run_attempts, dispatch_mode, stop_rule FROM executions ORDER BY execution_id;
    INSERT INTO execution_items_027 SELECT * FROM execution_items ORDER BY execution_id, item_ordinal;
    INSERT INTO execution_events_027 SELECT * FROM execution_events ORDER BY id;
    INSERT INTO execution_locks_027 SELECT * FROM execution_locks ORDER BY project_id;
    INSERT INTO runs_027 SELECT * FROM runs ORDER BY id;
    INSERT INTO test_results_027 SELECT * FROM test_results ORDER BY id
  `)
}

async function swapGraph(db: Kysely<any>, schemaObjects: SchemaObject[], sequences: SequenceRow[]): Promise<void> {
  const triggers = schemaObjects.filter(row => row.type === 'trigger' && row.sql !== null)
  const indexes = schemaObjects.filter(row => row.type === 'index' && row.sql !== null)
  for (const trigger of triggers) await sql.raw(`DROP TRIGGER ${quote(trigger.name)}`).execute(db)
  for (const table of ['test_results', 'execution_items', 'execution_events', 'execution_locks', 'runs', 'executions']) {
    await sql.raw(`DROP TABLE ${quote(table)}`).execute(db)
  }
  for (const table of ['executions', 'execution_items', 'execution_events', 'execution_locks', 'runs', 'test_results']) {
    await sql.raw(`ALTER TABLE ${quote(`${table}_027`)} RENAME TO ${quote(table)}`).execute(db)
  }
  for (const index of indexes) await sql.raw(index.sql!).execute(db)
  for (const trigger of triggers) await sql.raw(trigger.sql!).execute(db)
  await restoreSequences(db, sequences)
}

export async function up(db: Kysely<any>, hooks: Migration027TestHooks = {}): Promise<void> {
  if (currentMigrationDialect() !== 'sqlite') throw new Error('Migration 027 is governed for SQLite workspace databases only.')
  const schemaObjects = await verifyPrecondition(db)
  await assertForeignKeysClean(db, 'precondition')
  const preserved = await graphProjections(db, false)
  const sequences = await readSequences(db)

  await executeStatements(db, CREATE_REPLACEMENT_GRAPH)
  await copyReplacementGraph(db)
  await hooks.afterReplacementCopy?.(db)
  await verifyReplacement(db, preserved)
  await assertForeignKeysClean(db, 'pre-swap')
  await hooks.afterReplacementVerification?.(db)

  await swapGraph(db, schemaObjects, sequences)
  const migrated = await graphProjections(db, false)
  for (const table of GRAPH_TABLES) {
    if (digest(migrated[table]) !== digest(preserved[table])) throw new Error(`Migration 027 post-swap verification failed for ${table}.`)
  }
  await assertForeignKeysClean(db, 'post-swap')
}

interface TriggerDefinition { name: string; sql: string }

async function suspendTriggers(db: Kysely<any>): Promise<TriggerDefinition[]> {
  const rows = (await sql<TriggerDefinition>`SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND sql IS NOT NULL ORDER BY name`.execute(db)).rows
  for (const row of rows) await sql.raw(`DROP TRIGGER ${quote(row.name)}`).execute(db)
  return rows
}

async function restoreTriggers(db: Kysely<any>, triggers: TriggerDefinition[]): Promise<void> {
  for (const trigger of triggers) await sql.raw(trigger.sql).execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  if (currentMigrationDialect() !== 'sqlite') throw new Error('Migration 027 rollback is governed for SQLite workspace databases only.')
  const v2 = await sql<{ count: number }>`SELECT COUNT(*) AS count FROM executions WHERE definition_schema_version = 2`.execute(db)
  if (Number(v2.rows[0]?.count ?? 0) !== 0) throw new Error('Migration 027 cannot roll back while v2 Execution roots exist.')
  await sql`PRAGMA defer_foreign_keys = ON`.execute(db)
  const triggers = await suspendTriggers(db)
  await sql.raw(`
    CREATE TABLE executions_026 (
      execution_id varchar(255) NOT NULL PRIMARY KEY, project_id varchar(255) NOT NULL,
      accepted_at varchar(50) NOT NULL, test_set_id varchar(255) NOT NULL,
      test_set_revision integer NOT NULL CHECK (test_set_revision > 0),
      model_row_id integer NOT NULL CHECK (model_row_id > 0), model_version varchar(50) NOT NULL,
      source_observation_id varchar(255) NOT NULL,
      manifest_hash varchar(64) NOT NULL CHECK (length(manifest_hash) = 64 AND manifest_hash NOT GLOB '*[^a-f0-9]*'),
      max_run_attempts integer NOT NULL CHECK (max_run_attempts > 0),
      dispatch_mode varchar(20) NOT NULL CHECK (dispatch_mode = 'serial'),
      stop_rule varchar(50) NOT NULL CHECK (stop_rule = 'stop_on_first_non_completed')
    )
  `).execute(db)
  await sql.raw(`INSERT INTO executions_026 SELECT execution_id, project_id, accepted_at, test_set_id, test_set_revision, model_row_id, model_version, source_observation_id, manifest_hash, max_run_attempts, dispatch_mode, stop_rule FROM executions`).execute(db)
  await sql`DROP TABLE executions`.execute(db)
  await sql`ALTER TABLE executions_026 RENAME TO executions`.execute(db)
  await sql`CREATE INDEX idx_executions_project_accepted ON executions (project_id, accepted_at)`.execute(db)
  await restoreTriggers(db, triggers)
}
