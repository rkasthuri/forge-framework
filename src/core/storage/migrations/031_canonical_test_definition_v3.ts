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

interface TriggerDefinition { name: string; sql: string }
interface PreservedTable {
  name: string
  createSql: string
  indexSql: string[]
  rows: Record<string, unknown>[]
}
interface SequenceRow { name: string; seq: number }

const EXECUTION_DEPENDENTS = [
  'test_results',
  'execution_items',
  'execution_events',
  'execution_locks',
  'runs',
] as const

const GRAPH_TABLES = new Set<string>(['executions', ...EXECUTION_DEPENDENTS])

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function assertKnownExecutionGraph(db: Kysely<any>): Promise<void> {
  const tables = (await sql<{ name: string }>`
    SELECT name FROM sqlite_schema
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `.execute(db)).rows
  for (const table of tables) {
    const foreignKeys = (await sql.raw(`PRAGMA foreign_key_list(${quote(table.name)})`).execute(db)).rows as Array<{
      table: string
    }>
    for (const foreignKey of foreignKeys) {
      if (foreignKey.table === 'executions' && !GRAPH_TABLES.has(table.name)) {
        throw new Error(`Migration 031 refused unknown Execution dependent '${table.name}'.`)
      }
    }
  }
}

async function preserveTables(db: Kysely<any>): Promise<PreservedTable[]> {
  const preserved: PreservedTable[] = []
  for (const name of EXECUTION_DEPENDENTS) {
    const table = (await sql<{ sql: string }>`
      SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ${name}
    `.execute(db)).rows[0]
    if (!table?.sql) throw new Error(`Migration 031 expected dependent table '${name}'.`)
    const rows = (await sql.raw<Record<string, unknown>>(`SELECT * FROM ${quote(name)} ORDER BY rowid`).execute(db)).rows
    const indexSql = (await sql<{ sql: string | null }>`
      SELECT sql FROM sqlite_schema
      WHERE type = 'index' AND tbl_name = ${name} AND sql IS NOT NULL
      ORDER BY name
    `.execute(db)).rows.map(index => index.sql).filter((value): value is string => value !== null)
    preserved.push({ name, createSql: table.sql, indexSql, rows })
  }
  return preserved
}

async function readSequences(db: Kysely<any>): Promise<SequenceRow[]> {
  return (await sql<SequenceRow>`
    SELECT name, seq FROM sqlite_sequence
    WHERE name IN ('test_set_revisions', 'execution_events', 'runs', 'test_results')
    ORDER BY name
  `.execute(db)).rows.map(row => ({ name: row.name, seq: Number(row.seq) }))
}

async function restoreSequences(db: Kysely<any>, sequences: SequenceRow[]): Promise<void> {
  for (const name of ['test_set_revisions', 'execution_events', 'runs', 'test_results']) {
    await sql.raw(`DELETE FROM sqlite_sequence WHERE name = '${name}'`).execute(db)
  }
  for (const row of sequences) {
    await sql`INSERT INTO sqlite_sequence (name, seq) VALUES (${row.name}, ${row.seq})`.execute(db)
  }
}

async function dropPreservedTables(db: Kysely<any>, preserved: PreservedTable[]): Promise<void> {
  const byName = new Map(preserved.map(table => [table.name, table]))
  for (const name of EXECUTION_DEPENDENTS) {
    if (byName.has(name)) await sql.raw(`DROP TABLE ${quote(name)}`).execute(db)
  }
}

async function restorePreservedTables(db: Kysely<any>, preserved: PreservedTable[]): Promise<void> {
  const byName = new Map(preserved.map(table => [table.name, table]))
  for (const name of ['execution_items', 'execution_events', 'execution_locks', 'runs', 'test_results']) {
    const table = byName.get(name)
    if (!table) throw new Error(`Migration 031 lost dependent table '${name}'.`)
    await sql.raw(table.createSql).execute(db)
    for (let offset = 0; offset < table.rows.length; offset += 50) {
      await db.insertInto(name as any).values(table.rows.slice(offset, offset + 50)).execute()
    }
    for (const index of table.indexSql) await sql.raw(index).execute(db)
  }
}

async function assertPreservedRelationships(db: Kysely<any>): Promise<void> {
  const violations = (await sql.raw('PRAGMA foreign_key_check').execute(db)).rows
  if (violations.length !== 0) {
    throw new Error(`Migration 031 replacement foreign_key_check returned ${violations.length} violation(s).`)
  }
}

async function suspendTriggers(db: Kysely<any>): Promise<TriggerDefinition[]> {
  const rows = (await sql<TriggerDefinition>`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'trigger' AND sql IS NOT NULL
    ORDER BY name
  `.execute(db)).rows
  for (const row of rows) await sql.raw(`DROP TRIGGER "${row.name.replace(/"/g, '""')}"`).execute(db)
  return rows
}

async function restoreTriggers(db: Kysely<any>, triggers: TriggerDefinition[]): Promise<void> {
  for (const trigger of triggers) await sql.raw(trigger.sql).execute(db)
}

const CREATE_TEST_SETS = `
  CREATE TABLE test_set_revisions_031 (
    id integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    test_set_id varchar(255) NOT NULL,
    revision integer NOT NULL,
    project_id varchar(255) NOT NULL,
    generation_id varchar(255) NOT NULL UNIQUE,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version IN (1, 2, 3)),
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
    CONSTRAINT uq_test_set_project_revision UNIQUE (project_id, revision),
    CHECK (
      (schema_version = 1
        AND source_observation_id IS NOT NULL
        AND observation_run_id IS NULL
        AND support_seal_hash IS NULL
        AND characterization_policy_id IS NULL
        AND characterization_policy_version IS NULL)
      OR
      (schema_version IN (2, 3)
        AND source_observation_id IS NULL
        AND observation_run_id IS NOT NULL
        AND length(support_seal_hash) = 64
        AND support_seal_hash NOT GLOB '*[^a-f0-9]*'
        AND characterization_policy_id IS NOT NULL
        AND characterization_policy_version IS NOT NULL)
    )
  )
`

const CREATE_EXECUTIONS = `
  CREATE TABLE executions_031 (
    execution_id varchar(255) NOT NULL PRIMARY KEY,
    project_id varchar(255) NOT NULL,
    accepted_at varchar(50) NOT NULL,
    test_set_id varchar(255) NOT NULL,
    test_set_revision integer NOT NULL CHECK (test_set_revision > 0),
    definition_schema_version integer NOT NULL DEFAULT 1 CHECK (definition_schema_version IN (1, 2, 3)),
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
    execution_intent_key varchar(128) CHECK (execution_intent_key IS NULL OR (
      length(execution_intent_key) BETWEEN 1 AND 128
      AND substr(execution_intent_key, 1, 1) GLOB '[A-Za-z0-9]'
      AND execution_intent_key NOT GLOB '*[^A-Za-z0-9._:-]*'
    )),
    execution_intent_fingerprint varchar(64) CHECK (execution_intent_fingerprint IS NULL OR (
      length(execution_intent_fingerprint) = 64
      AND execution_intent_fingerprint NOT GLOB '*[^a-f0-9]*'
    )),
    CHECK (
      (definition_schema_version = 1 AND source_observation_id IS NOT NULL
        AND support_seal_hash IS NULL AND route_evidence_identity_hash IS NULL
        AND authentication_expectation_identity_hash IS NULL)
      OR
      (definition_schema_version IN (2, 3) AND source_observation_id IS NULL
        AND length(support_seal_hash) = 64 AND support_seal_hash NOT GLOB '*[^a-f0-9]*'
        AND length(route_evidence_identity_hash) = 64 AND route_evidence_identity_hash NOT GLOB '*[^a-f0-9]*'
        AND length(authentication_expectation_identity_hash) = 64 AND authentication_expectation_identity_hash NOT GLOB '*[^a-f0-9]*')
    )
  )
`

export async function up(db: Kysely<any>): Promise<void> {
  if (currentMigrationDialect() !== 'sqlite') {
    throw new Error('Migration 031 is governed for SQLite workspace databases only.')
  }
  await sql`PRAGMA defer_foreign_keys = ON`.execute(db)
  await assertKnownExecutionGraph(db)
  const triggers = await suspendTriggers(db)
  const dependents = await preserveTables(db)
  const sequences = await readSequences(db)
  await dropPreservedTables(db, dependents)
  await sql.raw(CREATE_TEST_SETS).execute(db)
  await sql.raw(`INSERT INTO test_set_revisions_031 SELECT * FROM test_set_revisions ORDER BY id`).execute(db)
  await sql`DROP TABLE test_set_revisions`.execute(db)
  await sql`ALTER TABLE test_set_revisions_031 RENAME TO test_set_revisions`.execute(db)
  await sql`CREATE INDEX idx_test_set_project_newest ON test_set_revisions (project_id, revision)`.execute(db)

  await sql.raw(CREATE_EXECUTIONS).execute(db)
  await sql.raw(`INSERT INTO executions_031 SELECT * FROM executions ORDER BY accepted_at, execution_id`).execute(db)
  await sql`DROP TABLE executions`.execute(db)
  await sql`ALTER TABLE executions_031 RENAME TO executions`.execute(db)
  await sql`CREATE INDEX idx_executions_project_accepted ON executions (project_id, accepted_at)`.execute(db)
  await sql.raw(`CREATE UNIQUE INDEX uq_executions_project_intent ON executions (project_id, execution_intent_key) WHERE execution_intent_key IS NOT NULL`).execute(db)
  await restorePreservedTables(db, dependents)
  await restoreSequences(db, sequences)
  await restoreTriggers(db, triggers)
  await assertPreservedRelationships(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  void db
  throw new Error('Migration 031 is intentionally irreversible because v3 Test Set and Execution authority cannot be safely coerced to v2.')
}
