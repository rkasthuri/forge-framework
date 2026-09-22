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

import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { sql, type Kysely } from 'kysely'
import { closeDb, getDb, initDb } from '../src/core/storage/db'
import { runSqliteMigrationCoordinator } from '../src/core/storage/migrate'
import { up as migrate027, type Migration027TestHooks } from '../src/core/storage/migrations/027_canonical_v2_execution_authority'

const GRAPH_COLUMNS: Record<string, string[]> = {
  executions: ['execution_id', 'project_id', 'accepted_at', 'test_set_id', 'test_set_revision', 'model_row_id', 'model_version', 'source_observation_id', 'manifest_hash', 'max_run_attempts', 'dispatch_mode', 'stop_rule'],
  execution_items: ['execution_id', 'item_ordinal', 'definition_id', 'executable_plan_hash'],
  execution_events: ['id', 'execution_id', 'project_id', 'event_type', 'outcome', 'occurred_at', 'process_instance_id', 'safe_code', 'safe_message', 'execution_plan_hash', 'lifecycle'],
  execution_locks: ['project_id', 'execution_id', 'process_instance_id', 'acquired_at', 'last_heartbeat_at'],
  runs: ['id', 'run_id', 'app_name', 'branch', 'commit_sha', 'environment', 'base_url', 'triggered_by', 'reporter_version', 'status', 'total_tests', 'passed', 'failed', 'skipped', 'duration_ms', 'started_at', 'completed_at', 'metadata', 'input_health', 'input_health_reason', 'lifecycle', 'execution_id', 'origin', 'attempt_ordinal'],
  test_results: ['id', 'run_id', 'test_id', 'title', 'suite', 'status', 'duration_ms', 'retry_count', 'error_msg', 'browser', 'tier', 'started_at', 'worker_index', 'tags', 'flaky_history', 'screenshot_path', 'video_path', 'metadata', 'result_id', 'execution_item_ordinal', 'definition_id', 'executable_plan_hash'],
}
const GRAPH_ORDER: Record<string, string> = {
  executions: 'execution_id', execution_items: 'execution_id, item_ordinal', execution_events: 'id',
  execution_locks: 'project_id', runs: 'id', test_results: 'id',
}
const UNAFFECTED_HISTORY = ['test_set_revisions', 'app_models', 'observations']
const MIGRATION_027 = '027_canonical_v2_execution_authority'

function migrationsThrough(ceiling: string): Record<string, { up(db: Kysely<any>): Promise<void> }> {
  const directory = path.resolve(__dirname, '..', 'src', 'core', 'storage', 'migrations')
  return Object.fromEntries(fs.readdirSync(directory)
    .filter(file => /^\d{3}_.*\.ts$/.test(file) && file <= `${ceiling}.ts`)
    .sort()
    .map(file => [file.replace(/\.ts$/, ''), require(path.join(directory, file))]))
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function rows(db: Kysely<any>, statement: string): Promise<readonly unknown[]> {
  return (await sql.raw(statement).execute(db)).rows
}

async function projectionEvidence(db: Kysely<any>): Promise<Record<string, { count: number; sha256: string }>> {
  const evidence: Record<string, { count: number; sha256: string }> = {}
  for (const [table, columns] of Object.entries(GRAPH_COLUMNS)) {
    const value = await rows(db, `SELECT ${columns.map(quote).join(', ')} FROM ${quote(table)} ORDER BY ${GRAPH_ORDER[table]}`)
    evidence[table] = { count: value.length, sha256: digest(value) }
  }
  for (const table of UNAFFECTED_HISTORY) {
    const value = await rows(db, `SELECT * FROM ${quote(table)} ORDER BY rowid`)
    evidence[table] = { count: value.length, sha256: digest(value) }
  }
  return evidence
}

async function fullDatabaseSignature(db: Kysely<any>): Promise<string> {
  const schema = await rows(db, `SELECT type, name, tbl_name, sql FROM sqlite_schema ORDER BY type, name`)
  const tables = await rows(db, `SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name`) as Array<{ name: string }>
  const contents: Record<string, readonly unknown[]> = {}
  for (const table of tables) contents[table.name] = await rows(db, `SELECT * FROM ${quote(table.name)} ORDER BY rowid`)
  return digest({ schema, contents })
}

async function insertHistoricalFixture(db: Kysely<any>): Promise<void> {
  const at = '2026-09-21T12:00:00.000Z'
  const manifest = 'a'.repeat(64)

  for (let index = 1; index <= 8; index++) {
    await sql`INSERT INTO app_models (
      id, app_name, version, base_url, app_type, intake_mode, crawl_config_hash,
      page_count, flow_count, role_count, model_json, crawled_at, crawled_by,
      status, evidence_state, operation_id, candidate_hash,
      recovery_source_row_id, recovery_source_fingerprint
    ) VALUES (
      ${index}, ${`historical-project-${index}`}, ${`1.0.${index}`}, ${`https://example-${index}.invalid`},
      'mpa', 'crawl', ${String(index).repeat(64)}, ${index}, ${index}, 1,
      ${JSON.stringify({ row: index, retained: true })}, ${at}, 'historical-fixture',
      ${index === 8 ? 'active' : 'superseded'}, 'verified', ${`operation-${index}`},
      ${String(index).repeat(64)}, NULL, NULL
    )`.execute(db)
  }

  const observationRunId = '10000000-0000-4000-8000-000000000001'
  await sql`INSERT INTO observation_runs (
    observation_run_id, project_id, workspace_authority, operation_id, producer,
    producer_version, producer_instance_id, producer_process_id, acquisition_kind,
    started_at, terminal_at, lifecycle, completeness, safe_reason_code, safe_message,
    policy_id, policy_version, acquisition_plan_hash
  ) VALUES (
    ${observationRunId}, 'saucedemo', 'PRODUCT_WORKSPACE', 'observation-operation',
    'fixture-producer', '1', '20000000-0000-4000-8000-000000000001', 1, 'web_crawl',
    ${at}, ${at}, 'completed', 'complete', NULL, 'complete', 'fixture-policy', '1', ${'b'.repeat(64)}
  )`.execute(db)
  for (let index = 1; index <= 10; index++) {
    await sql`INSERT INTO observations (
      observation_id, observation_run_id, project_id, producer, producer_version,
      method, method_version, subject_id, predicate, outcome, observed_value_json,
      boundary_json, captured_at, idempotency_key, integrity_hash, provenance_class,
      safe_reason_code, safe_message, artifact_links_sealed
    ) VALUES (
      ${`30000000-0000-4000-8000-${String(index).padStart(12, '0')}`}, ${observationRunId},
      'saucedemo', 'fixture-producer', '1', 'browser_dom_inspection', '1',
      ${`subject-${index}`}, 'is_present', 'present', ${JSON.stringify({ value: index })},
      '{}', ${at}, ${`observation-key-${index}`}, ${index.toString(16).repeat(64).slice(0, 64)},
      'native', NULL, NULL, 0
    )`.execute(db)
  }

  for (let revision = 1; revision <= 3; revision++) {
    const payload = JSON.stringify({ schemaVersion: 1, revision, definitions: [{ id: `definition-${revision}`, retained: true }] })
    await sql`INSERT INTO test_set_revisions (
      id, test_set_id, revision, project_id, generation_id, schema_version,
      source_observation_id, model_row_id, model_version, observation_run_id,
      support_seal_hash, characterization_policy_id, characterization_policy_version,
      generated_at, outcome, definition_count, payload_json, content_hash
    ) VALUES (
      ${revision}, 'historical-test-set', ${revision}, 'saucedemo', ${`generation-${revision}`}, 1,
      ${`source-observation-${revision}`}, ${revision}, ${`1.0.${revision}`}, NULL,
      NULL, NULL, NULL, ${at}, 'completed', 1, ${payload}, ${digest(payload)}
    )`.execute(db)
  }

  for (let index = 1; index <= 4; index++) {
    await sql`INSERT INTO executions (
      execution_id, project_id, accepted_at, test_set_id, test_set_revision,
      model_row_id, model_version, source_observation_id, manifest_hash,
      max_run_attempts, dispatch_mode, stop_rule
    ) VALUES (
      ${`execution-${index}`}, 'saucedemo', ${at}, 'historical-test-set', ${Math.min(index, 3)},
      ${index}, ${`1.0.${index}`}, ${`source-observation-${Math.min(index, 3)}`}, ${manifest},
      1, 'serial', 'stop_on_first_non_completed'
    )`.execute(db)
    await sql`INSERT INTO execution_items (execution_id, item_ordinal, definition_id, executable_plan_hash)
      VALUES (${`execution-${index}`}, 1, ${`definition-${index}`}, ${manifest})`.execute(db)
    await sql`INSERT INTO execution_events (
      id, execution_id, project_id, event_type, outcome, occurred_at,
      process_instance_id, safe_code, safe_message, execution_plan_hash, lifecycle
    ) VALUES (
      ${index * 2 - 1}, ${`execution-${index}`}, 'saucedemo', 'started', NULL, ${at},
      ${`process-${index}`}, NULL, 'started', ${manifest}, 'accepted'
    )`.execute(db)
    await sql`INSERT INTO execution_events (
      id, execution_id, project_id, event_type, outcome, occurred_at,
      process_instance_id, safe_code, safe_message, execution_plan_hash, lifecycle
    ) VALUES (
      ${index * 2}, ${`execution-${index}`}, 'saucedemo', 'terminal', 'passed', ${at},
      ${`process-${index}`}, 'passed', 'passed', ${manifest}, 'completed'
    )`.execute(db)
  }
  await sql`INSERT INTO execution_events (
    id, execution_id, project_id, event_type, outcome, occurred_at,
    process_instance_id, safe_code, safe_message, execution_plan_hash, lifecycle
  ) VALUES (
    9, 'execution-4', 'saucedemo', 'cancellation_requested', NULL, ${at},
    'process-4', 'cancellation_requested', 'requested', ${manifest}, 'cancellation_requested'
  )`.execute(db)

  for (let index = 1; index <= 63; index++) {
    await sql`INSERT INTO runs (
      id, run_id, app_name, started_at, completed_at, lifecycle, origin, execution_id, attempt_ordinal
    ) VALUES (${index}, ${`legacy-run-${index}`}, 'saucedemo', ${at}, ${at}, 'completed', 'legacy', NULL, NULL)`.execute(db)
  }
  for (let index = 1; index <= 4; index++) {
    const id = 63 + index
    await sql`INSERT INTO runs (
      id, run_id, app_name, status, total_tests, passed, failed, skipped,
      duration_ms, started_at, completed_at, metadata, input_health,
      input_health_reason, lifecycle, execution_id, origin, attempt_ordinal
    ) VALUES (
      ${id}, ${`product-run-${index}`}, 'saucedemo', 'passed', 1, 1, 0, 0,
      ${index}, ${at}, ${at}, ${JSON.stringify({ retained: index })}, 'healthy', NULL,
      'completed', ${`execution-${index}`}, 'product', 1
    )`.execute(db)
    await sql`INSERT INTO test_results (
      id, run_id, test_id, title, suite, status, duration_ms, retry_count,
      error_msg, browser, tier, started_at, worker_index, tags, flaky_history,
      screenshot_path, video_path, metadata, result_id, execution_item_ordinal,
      definition_id, executable_plan_hash
    ) VALUES (
      ${index}, ${`product-run-${index}`}, ${`test-${index}`}, ${`Historical result ${index}`},
      'historical-suite', 'passed', ${index}, 0, NULL, 'chromium', 'ui', ${at}, 0,
      ${JSON.stringify([`tag-${index}`])}, 0, NULL, NULL, ${JSON.stringify({ retained: index })},
      ${`result-${index}`}, 1, ${`definition-${index}`}, ${manifest}
    )`.execute(db)
  }
  await sql.raw(`UPDATE sqlite_sequence SET seq = 99 WHERE name = 'execution_events'`).execute(db)
  await sql.raw(`UPDATE sqlite_sequence SET seq = 123 WHERE name = 'runs'`).execute(db)
  await sql.raw(`UPDATE sqlite_sequence SET seq = 77 WHERE name = 'test_results'`).execute(db)
}

async function withDatabase(body: (dbPath: string, db: Kysely<any>) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s1-027-'))
  const dbPath = path.join(root, 'forge.db')
  initDb(dbPath)
  try { await body(dbPath, getDb()) }
  finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
}

async function migrateThrough026(db: Kysely<any>): Promise<void> {
  await runSqliteMigrationCoordinator(db, migrationsThrough('026_canonical_test_definition_v2'))
}

async function run027(db: Kysely<any>, hooks: Migration027TestHooks = {}): Promise<string[]> {
  const migrations = migrationsThrough(MIGRATION_027)
  migrations[MIGRATION_027] = { up: connection => migrate027(connection, hooks) }
  return runSqliteMigrationCoordinator(db, migrations)
}

async function integrity(db: Kysely<any>): Promise<{ foreignKeys: number; quick: string; full: string }> {
  return {
    foreignKeys: (await rows(db, 'PRAGMA foreign_key_check')).length,
    quick: String(((await rows(db, 'PRAGMA quick_check'))[0] as any).quick_check),
    full: String(((await rows(db, 'PRAGMA integrity_check'))[0] as any).integrity_check),
  }
}

async function assertReopensUnchanged(dbPath: string, expectedSignature: string): Promise<void> {
  await closeDb()
  initDb(dbPath)
  assert.equal(await fullDatabaseSignature(getDb()), expectedSignature)
  assert.deepEqual(await integrity(getDb()), { foreignKeys: 0, quick: 'ok', full: 'ok' })
}

test('Migration 027 upgrades an empty supported Migration-026 database and records once', { concurrency: false }, async () => {
  await withDatabase(async (_dbPath, db) => {
    await migrateThrough026(db)
    assert.deepEqual(await run027(db), [MIGRATION_027])
    assert.deepEqual(await run027(db), [])
    const history = await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)
    assert.equal(history.length, 1)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
  })
})

test('Migration 027 preserves the exact saucedemo-shaped populated history and database identities', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await insertHistoricalFixture(db)
    const before = await projectionEvidence(db)
    const sequencesBefore = await rows(db, `SELECT name, seq FROM sqlite_sequence WHERE name IN ('execution_events', 'runs', 'test_results') ORDER BY name`)
    const objectsBefore = await rows(db, `SELECT type, name, sql FROM sqlite_schema WHERE tbl_name IN ('executions','execution_items','execution_events','execution_locks','runs','test_results') AND type IN ('index','trigger') ORDER BY type,name`)

    assert.deepEqual(Object.fromEntries(Object.entries(before).map(([name, value]) => [name, value.count])), {
      executions: 4, execution_items: 4, execution_events: 9, execution_locks: 0,
      runs: 67, test_results: 4, test_set_revisions: 3, app_models: 8, observations: 10,
    })
    assert.deepEqual(await run027(db), [MIGRATION_027])
    assert.deepEqual(await projectionEvidence(db), before)
    assert.deepEqual(await rows(db, `SELECT name, seq FROM sqlite_sequence WHERE name IN ('execution_events', 'runs', 'test_results') ORDER BY name`), sequencesBefore)
    assert.deepEqual(await rows(db, `SELECT type, name, sql FROM sqlite_schema WHERE tbl_name IN ('executions','execution_items','execution_events','execution_locks','runs','test_results') AND type IN ('index','trigger') ORDER BY type,name`), objectsBefore)
    assert.equal(Number(((await rows(db, `SELECT COUNT(*) AS count FROM executions WHERE definition_schema_version = 1 AND support_seal_hash IS NULL AND route_evidence_identity_hash IS NULL AND authentication_expectation_identity_hash IS NULL`))[0] as any).count), 4)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    assert.deepEqual(await run027(db), [])
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 1)

    const stableRead = await projectionEvidence(db)
    assert.deepEqual(await projectionEvidence(db), stableRead)
    await closeDb()
    initDb(dbPath)
    assert.deepEqual(await projectionEvidence(getDb()), stableRead)
    assert.deepEqual(await integrity(getDb()), { foreignKeys: 0, quick: 'ok', full: 'ok' })
  })
})

test('Migration 027 refuses an unknown dependent and rolls back without recording', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await sql.raw(`CREATE TABLE unknown_execution_dependent (id integer PRIMARY KEY, execution_id varchar(255) REFERENCES executions(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT)`).execute(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db), /refused foreign-key dependency graph.*unknown_execution_dependent/i)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})

test('Migration 027 refuses an unexpected Migration-026 schema and rolls back unchanged', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await sql.raw(`CREATE INDEX unexpected_execution_index ON executions (test_set_id)`).execute(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db), /refused unsupported Migration-026 schema/i)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})

test('Migration 027 refuses a changed trigger literal and rolls back unchanged', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await sql.raw(`DROP TRIGGER executions_immutable_delete`).execute(db)
    await sql.raw(`
      CREATE TRIGGER executions_immutable_delete
      BEFORE DELETE ON executions
      BEGIN
        SELECT RAISE(ABORT, 'execution roots are immutable');
      END
    `).execute(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db), /refused unsupported Migration-026 schema/i)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})

test('Migration 027 verification mismatch rolls the entire populated migration back', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await insertHistoricalFixture(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db, {
      afterReplacementCopy: async connection => { await sql.raw(`DELETE FROM test_results_027 WHERE id = 1`).execute(connection) },
    }), /replacement verification failed for test_results/i)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})

test('Migration 027 injected replacement FK inconsistency is detected and rolls back cleanly', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await insertHistoricalFixture(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db, {
      afterReplacementCopy: async connection => {
        await sql.raw('PRAGMA defer_foreign_keys = ON').execute(connection)
        await sql.raw(`DELETE FROM executions_027 WHERE execution_id = 'execution-1'`).execute(connection)
      },
    }), /replacement verification failed for executions|broken relationships|foreign_key_check/i)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})

test('Migration 027 invalid migration-defined replacement state is refused and rolled back', { concurrency: false }, async () => {
  await withDatabase(async (dbPath, db) => {
    await migrateThrough026(db)
    await insertHistoricalFixture(db)
    const before = await fullDatabaseSignature(db)
    await assert.rejects(() => run027(db, {
      afterReplacementCopy: async connection => {
        await sql.raw('PRAGMA ignore_check_constraints = ON').execute(connection)
        await sql.raw(`UPDATE executions_027 SET definition_schema_version = 2 WHERE execution_id = 'execution-1'`).execute(connection)
      },
    }), /invalid migration-defined field values/i)
    await sql.raw('PRAGMA ignore_check_constraints = OFF').execute(db)
    assert.equal(await fullDatabaseSignature(db), before)
    assert.equal((await rows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_027}'`)).length, 0)
    assert.deepEqual(await integrity(db), { foreignKeys: 0, quick: 'ok', full: 'ok' })
    await assertReopensUnchanged(dbPath, before)
  })
})
