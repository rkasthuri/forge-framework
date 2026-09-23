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

/**
 * M7 Slice 2 — full-chain historical preservation, reopen, and replay proof.
 *
 * The selected-live source is never opened here. The opt-in integration proof
 * consumes only the coherent logical snapshot produced by the Slice-0
 * preservation boundary (`FORGE_SLICE2_SOURCE_DB`).
 */
import assert from 'node:assert/strict'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { Kysely, sql } from 'kysely'
import { closeDb, getProductDb, initDisposableDatabase } from '../src/core/storage/db'
import { runMigrations, runSqliteMigrationCoordinator } from '../src/core/storage/migrate'
import { ExecutionRepository } from '../src/core/storage/repositories/ExecutionRepository'
import { RunRepository } from '../src/core/storage/repositories/RunRepository'
import { TestResultRepository } from '../src/core/storage/repositories/TestResultRepository'
import {
  applyHistoricalInvalidAppModelPolicy,
  classifyAgainstBaseline,
  decodeHistoricalInvalidAppModelPolicy,
  inspectSqliteReadOnly,
  type HistoricalInvalidProductReadEvidence,
} from '../src/core/validation/ValidationBaseline'
import {
  ExecutionContext,
  M3_CERTIFICATION_EXECUTION_CONTEXT_OPT_IN,
  type ExecutionContext as ExecutionContextType,
} from '../forge-ui/server/context/ExecutionContext'
import { workspaceResolver } from '../forge-ui/server/context/WorkspaceResolver'
import { readApplicationReadiness } from '../forge-ui/server/context/ApplicationReadinessController'
import { readApplicationEvidenceInventory } from '../forge-ui/server/context/ApplicationEvidenceInventoryController'
import { presentApplicationModelHistory } from '../forge-ui/server/registry/ApplicationModelHistoryPresenter'
import {
  readCanonicalEvidenceWorkspace,
  type EvidenceWorkspaceSources,
} from '../forge-ui/server/context/CanonicalEvidenceWorkspaceController'
import { ok } from '../forge-ui/server/http'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require('better-sqlite3') as typeof import('better-sqlite3')

const PROJECT = 'saucedemo'
const MIGRATION_031 = '031_canonical_test_definition_v3'
const defaultSnapshot = path.resolve(__dirname, '../notes/review-scratch/slice2-source-capture/logical/forge.db')
const selectedSnapshot = process.env.FORGE_SLICE2_SOURCE_DB
  ? path.resolve(process.env.FORGE_SLICE2_SOURCE_DB)
  : defaultSnapshot
const selectedSnapshotAvailable = fs.existsSync(selectedSnapshot)
const historicalInvalidPolicy = decodeHistoricalInvalidAppModelPolicy(JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../docs/configuration/baselines/m7-slice2-saucedemo-historical-invalid-v1.json'),
  'utf8',
)))

const historicalTables = [
  'app_models',
  'observations',
  'test_set_revisions',
  'executions',
  'execution_items',
  'execution_events',
  'execution_locks',
  'runs',
  'test_results',
] as const

const tableOrder: Record<(typeof historicalTables)[number], string> = {
  app_models: 'id',
  observations: 'observation_id',
  test_set_revisions: 'id',
  executions: 'execution_id',
  execution_items: 'execution_id, item_ordinal',
  execution_events: 'id',
  execution_locks: 'project_id',
  runs: 'id',
  test_results: 'id',
}

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex')
}

function fileHash(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function migrationModulesThrough(ceiling: string): Record<string, { up(db: Kysely<any>): Promise<void> }> {
  const directory = path.resolve(__dirname, '../src/core/storage/migrations')
  return Object.fromEntries(fs.readdirSync(directory)
    .filter(file => /\.(ts|js)$/.test(file))
    .map(file => file.replace(/\.(ts|js)$/, ''))
    .filter(name => name <= ceiling)
    .sort()
    .map(name => [name, { up: (db: Kysely<any>) => require(path.join(directory, name)).up(db) }]))
}

async function queryRows(db: Kysely<any>, statement: string): Promise<readonly unknown[]> {
  return (await sql.raw(statement).execute(db)).rows
}

async function databaseSignature(db: Kysely<any>): Promise<string> {
  const schema = await queryRows(db, 'SELECT type, name, tbl_name, sql FROM sqlite_schema ORDER BY type, name')
  const tables = await queryRows(db, "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name") as Array<{ name: string }>
  const contents: Record<string, readonly unknown[]> = {}
  for (const table of tables) contents[table.name] = await queryRows(db, `SELECT * FROM ${quote(table.name)} ORDER BY rowid`)
  return digest({ schema, contents })
}

async function insertPopulated031Fixture(db: Kysely<any>): Promise<void> {
  const at = '2026-09-22T12:00:00.000Z'
  const hash = 'a'.repeat(64)
  const payload = JSON.stringify({ schemaVersion: 1, projectId: PROJECT, testSetId: 'historical-set', revision: 1, definitions: [{ id: 'definition-1' }] })
  await sql`INSERT INTO test_set_revisions (
    id, test_set_id, revision, project_id, generation_id, schema_version,
    source_observation_id, model_row_id, model_version, observation_run_id,
    support_seal_hash, characterization_policy_id, characterization_policy_version,
    generated_at, outcome, definition_count, payload_json, content_hash
  ) VALUES (
    1, 'historical-set', 1, ${PROJECT}, 'generation-1', 1,
    'historical-observation', 1, '1.0.0', NULL,
    NULL, NULL, NULL, ${at}, 'completed', 1, ${payload}, ${digest(payload)}
  )`.execute(db)
  await sql`INSERT INTO executions (
    execution_id, project_id, accepted_at, test_set_id, test_set_revision,
    model_row_id, model_version, source_observation_id, manifest_hash,
    max_run_attempts, dispatch_mode, stop_rule
  ) VALUES (
    'execution-1', ${PROJECT}, ${at}, 'historical-set', 1,
    1, '1.0.0', 'historical-observation', ${hash}, 1, 'serial', 'stop_on_first_non_completed'
  )`.execute(db)
  await sql`INSERT INTO execution_items (execution_id, item_ordinal, definition_id, executable_plan_hash)
    VALUES ('execution-1', 1, 'definition-1', ${hash})`.execute(db)
  await sql`INSERT INTO execution_events (
    id, execution_id, project_id, event_type, outcome, occurred_at, process_instance_id,
    safe_code, safe_message, execution_plan_hash, lifecycle
  ) VALUES (1, 'execution-1', ${PROJECT}, 'started', NULL, ${at}, 'process-1', NULL, 'started', ${hash}, 'accepted')`.execute(db)
  await sql`INSERT INTO runs (
    id, run_id, app_name, status, total_tests, passed, failed, skipped, duration_ms,
    started_at, completed_at, metadata, input_health, lifecycle, execution_id, origin, attempt_ordinal
  ) VALUES (1, 'run-1', ${PROJECT}, 'passed', 1, 1, 0, 0, 1, ${at}, ${at}, '{}', 'unknown', 'completed', 'execution-1', 'product', 1)`.execute(db)
  await sql`INSERT INTO test_results (
    id, run_id, test_id, title, suite, status, duration_ms, retry_count, browser, tier,
    started_at, worker_index, tags, flaky_history, metadata, result_id,
    execution_item_ordinal, definition_id, executable_plan_hash
  ) VALUES (1, 'run-1', 'test-1', 'Historical result', 'historical', 'passed', 1, 0,
    'chromium', 'ui', ${at}, 0, '[]', 0, '{}', 'result-1', 1, 'definition-1', ${hash})`.execute(db)
  await sql.raw("UPDATE sqlite_sequence SET seq = 19 WHERE name = 'test_set_revisions'").execute(db)
  await sql.raw("UPDATE sqlite_sequence SET seq = 29 WHERE name = 'execution_events'").execute(db)
  await sql.raw("UPDATE sqlite_sequence SET seq = 39 WHERE name = 'runs'").execute(db)
  await sql.raw("UPDATE sqlite_sequence SET seq = 49 WHERE name = 'test_results'").execute(db)
}

async function with031Fixture(body: (dbPath: string, db: Kysely<any>) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s2-031-'))
  const dbPath = path.join(root, 'forge.db')
  initDisposableDatabase(dbPath)
  try {
    const through026 = migrationModulesThrough('026_canonical_test_definition_v2')
    await runSqliteMigrationCoordinator(getProductDb(), through026)
    await insertPopulated031Fixture(getProductDb())
    await runSqliteMigrationCoordinator(getProductDb(), migrationModulesThrough('030_canonical_execution_start_idempotency'))
    await body(dbPath, getProductDb())
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('Migration 031 preserves a populated historical execution graph, sequences, and reopen state', { concurrency: false }, async () => {
  await with031Fixture(async (dbPath, db) => {
    const before = await databaseSignature(db)
    const sequences = await queryRows(db, "SELECT name, seq FROM sqlite_sequence WHERE name IN ('test_set_revisions','execution_events','runs','test_results') ORDER BY name")
    const projections = Object.fromEntries(await Promise.all(['test_set_revisions', 'executions', 'execution_items', 'execution_events', 'runs', 'test_results']
      .map(async table => [table, await queryRows(db, `SELECT * FROM ${quote(table)} ORDER BY rowid`)])))
    assert.deepEqual(await runSqliteMigrationCoordinator(db, migrationModulesThrough(MIGRATION_031)), [MIGRATION_031])
    assert.deepEqual(await queryRows(db, "SELECT name, seq FROM sqlite_sequence WHERE name IN ('test_set_revisions','execution_events','runs','test_results') ORDER BY name"), sequences)
    for (const [table, expected] of Object.entries(projections)) {
      const columns = (await queryRows(db, `PRAGMA table_info(${quote(table)})`) as Array<{ name: string }>).map(column => column.name)
      const sourceColumns = (expected[0] ? Object.keys(expected[0] as object) : columns).filter(column => columns.includes(column))
      assert.deepEqual(await queryRows(db, `SELECT ${sourceColumns.map(quote).join(',')} FROM ${quote(table)} ORDER BY rowid`), expected)
    }
    assert.equal((await queryRows(db, 'PRAGMA foreign_key_check')).length, 0)
    assert.equal(String((await queryRows(db, 'PRAGMA quick_check') as any[])[0].quick_check), 'ok')
    assert.notEqual(await databaseSignature(db), before)
    await closeDb()
    initDisposableDatabase(dbPath)
    assert.equal((await queryRows(getProductDb(), `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_031}'`)).length, 1)
    assert.equal((await queryRows(getProductDb(), 'PRAGMA foreign_key_check')).length, 0)
  })
})

test('Migration 031 refuses an unknown dependent and atomically preserves migration-030 state', { concurrency: false }, async () => {
  await with031Fixture(async (_dbPath, db) => {
    await sql.raw('CREATE TABLE unknown_execution_reference (id integer PRIMARY KEY, execution_id text REFERENCES executions(execution_id) ON UPDATE RESTRICT ON DELETE RESTRICT)').execute(db)
    await sql.raw("INSERT INTO unknown_execution_reference VALUES (1, 'execution-1')").execute(db)
    const before = await databaseSignature(db)
    await assert.rejects(
      () => runSqliteMigrationCoordinator(db, migrationModulesThrough(MIGRATION_031)),
      /Migration 031 refused unknown Execution dependent 'unknown_execution_reference'/,
    )
    assert.equal(await databaseSignature(db), before)
    assert.equal((await queryRows(db, `SELECT name FROM kysely_migration WHERE name = '${MIGRATION_031}'`)).length, 0)
    assert.equal((await queryRows(db, 'PRAGMA foreign_key_check')).length, 0)
  })
})

interface TableProjection { count: number; sha256: string; columns: string[] }
interface DatabaseEvidence {
  migrations: string[]
  migrationHash: string
  tables: Record<string, TableProjection>
  sequences: unknown[]
  sequencesHash: string
  schemaObjects: unknown[]
  schemaObjectsHash: string
  counts: Record<string, number>
  integrity: { quickCheck: string; integrityCheck: string; foreignKeyViolations: number }
}

function inspectDatabase(dbPath: string, sourceColumns?: Record<string, string[]>): DatabaseEvidence {
  const db = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true })
  try {
    const migrations = (db.prepare('SELECT name FROM kysely_migration ORDER BY rowid').all() as Array<{ name: string }>).map(row => row.name)
    const tables: Record<string, TableProjection> = {}
    for (const table of historicalTables) {
      const actualColumns = (db.prepare(`PRAGMA table_info(${quote(table)})`).all() as Array<{ name: string }>).map(column => column.name)
      const columns = sourceColumns?.[table] ?? actualColumns
      const rows = db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY ${tableOrder[table]}`).all()
      tables[table] = { count: rows.length, sha256: digest(rows), columns }
    }
    const sequences = db.prepare('SELECT name, seq FROM sqlite_sequence ORDER BY name').all()
    const schemaObjects = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE type IN ('index','trigger') AND sql IS NOT NULL ORDER BY type,name").all()
    const tableNames = (db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map(row => row.name)
    const counts = Object.fromEntries(tableNames.map(table => [table, Number((db.prepare(`SELECT COUNT(*) AS count FROM ${quote(table)}`).get() as { count: number }).count)]))
    return {
      migrations,
      migrationHash: digest(migrations),
      tables,
      sequences,
      sequencesHash: digest(sequences),
      schemaObjects,
      schemaObjectsHash: digest(schemaObjects),
      counts,
      integrity: {
        quickCheck: String(db.pragma('quick_check', { simple: true })),
        integrityCheck: String(db.pragma('integrity_check', { simple: true })),
        foreignKeyViolations: db.pragma('foreign_key_check').length,
      },
    }
  } finally {
    db.close()
  }
}

async function upgrade(source: string, destination: string): Promise<void> {
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL)
  initDisposableDatabase(destination)
  try {
    await runMigrations()
  } finally {
    await closeDb()
  }
}

const resolveProject = async (appName: string) => appName === PROJECT ? { appName } : undefined

async function readReadiness(context: ExecutionContextType) {
  return readApplicationReadiness(PROJECT, resolveProject, {
    observationReader: context,
    authorityReader: context,
    semanticAdmissionReader: context,
    modelReader: async (appName, query, projectResolver) => {
      const project = await projectResolver(appName)
      if (!project) return { status: 404, body: {} }
      const limit = Number(query.limit ?? 25)
      const raw = await context.readAppModelHistory(appName, { limit, cursor: null, requestedRowId: null })
      const projection = await context.readObservationProjection(appName, { limit: 50 })
      const presented = presentApplicationModelHistory(raw, { id: appName, name: project.appName }, { limit, projection: projection as any })
      return presented.kind === 'ok' ? { status: 200, body: ok(presented.value) } : { status: 422, body: {} }
    },
    evidenceReader: (appName, query, projectResolver) => readApplicationEvidenceInventory(appName, query, projectResolver, context),
  })
}

async function evidenceSources(context: ExecutionContextType, readinessBody: unknown): Promise<EvidenceWorkspaceSources> {
  return {
    readInventory: projectId => context.readTestInventory(projectId, { limit: 50, cursor: null, definitionId: null }),
    readEvidenceInventory: projectId => context.readApplicationEvidenceInventory(projectId, { limit: 50 }),
    readResults: (projectId, executionId) => context.readProductExecutionResults(projectId, executionId),
    readExactDefinition: (projectId, testSetId, revision, definitionId) => context.readExactTestDefinition(projectId, testSetId, revision, definitionId),
    readRepair: (projectId, entryId) => context.productRepairWorkflow(projectId, 'read', entryId),
    readReadiness: async () => readinessBody,
    readExactSuite: (projectId, suiteId, revision) => context.readProductSuiteRevision(projectId, suiteId, revision),
    readExactAppModel: (projectId, rowId, version, fingerprint) => context.readExactAppModel(projectId, rowId, version, fingerprint),
    readExactObservation: (projectId, observationId) => context.readExactObservation(projectId, observationId),
    now: () => '2026-09-22T18:00:00.000Z',
  }
}

async function createContext(dbPath: string): Promise<ExecutionContextType> {
  return (await ExecutionContext.createM3CertificationHarness({
    appName: PROJECT,
    sqlitePath: dbPath,
    workspaces: workspaceResolver,
    optIn: M3_CERTIFICATION_EXECUTION_CONTEXT_OPT_IN,
  })).executionContext
}

function responseData(response: any): any {
  return response?.body?.data
}

async function productReadProjection(dbPath: string): Promise<Record<string, unknown>> {
  const context = await createContext(dbPath)
  try {
    const db = getProductDb()
    const rawTestSets = await db.selectFrom('test_set_revisions').selectAll().where('project_id', '=', PROJECT).orderBy('id').execute()
    const inventory: any = await context.readTestInventory(PROJECT, { limit: 50, cursor: null, definitionId: null })
    assert.equal(inventory.total, 3)
    assert.deepEqual(inventory.history.map((item: any) => item.rowId), [3, 2, 1])
    const definitionReads: unknown[] = []
    for (const row of rawTestSets) {
      const payload = JSON.parse(row.payload_json) as { definitions: Array<{ id: string }> }
      for (const definition of payload.definitions) {
        const exact: any = await context.readExactTestDefinition(PROJECT, row.test_set_id, row.revision, definition.id)
        assert.equal(exact.rowId, row.id)
        assert.equal(exact.contentHash, row.content_hash)
        assert.equal(exact.testSet.revision, row.revision)
        assert.equal(exact.definition.definitionId ?? exact.definition.id, definition.id)
        definitionReads.push({ rowId: exact.rowId, revision: exact.testSet.revision, definitionId: definition.id, contentHash: exact.contentHash })
      }
    }
    assert.equal(await context.readExactTestDefinition(PROJECT, rawTestSets[0].test_set_id, 999, JSON.parse(rawTestSets[0].payload_json).definitions[0].id), null)
    assert.equal(await context.readExactTestDefinition(PROJECT, rawTestSets[0].test_set_id, rawTestSets[0].revision, 'missing-historical-definition'), null)

    const modelHistory: any = await context.readAppModelHistory(PROJECT, { limit: 50, cursor: null, requestedRowId: null })
    assert.equal(modelHistory.kind, 'ok')
    assert.equal(modelHistory.models.length, 8)
    const modelReads: unknown[] = []
    for (const model of modelHistory.models) {
      const exact: any = await context.readExactAppModel(PROJECT, model.rowId, model.version, model.modelFingerprint)
      assert.equal(['ok', 'integrity_invalid'].includes(exact.kind), true)
      assert.equal(exact.model.rowId, model.rowId)
      assert.equal(exact.model.version, model.version)
      assert.equal(exact.model.modelFingerprint, model.modelFingerprint)
      modelReads.push({
        rowId: model.rowId,
        appName: exact.model.appName,
        version: model.version,
        lifecycle: exact.model.lifecycle,
        validation: exact.model.validation,
        fingerprint: model.modelFingerprint,
        readKind: exact.kind,
      })
    }

    const observationRows = await db.selectFrom('observations').select(['observation_id']).where('project_id', '=', PROJECT).orderBy('observation_id').execute()
    assert.equal(observationRows.length, 10)
    for (const row of observationRows) {
      const exact: any = await context.readExactObservation(PROJECT, row.observation_id)
      assert.equal(exact.kind, 'ok')
      assert.equal(exact.observation.observationId, row.observation_id)
    }
    const observationHistory: any = await context.readObservationHistoryView(PROJECT, { limit: 50 })
    assert.equal(observationHistory.authority, 'canonical_product')

    const chains = await db.selectFrom('test_results as result')
      .innerJoin('runs as run', 'run.run_id', 'result.run_id')
      .innerJoin('executions as execution', 'execution.execution_id', 'run.execution_id')
      .select([
        'result.result_id', 'result.run_id', 'result.execution_item_ordinal', 'result.definition_id',
        'execution.execution_id', 'execution.test_set_id', 'execution.test_set_revision',
      ]).orderBy('result.id').execute()
    assert.equal(chains.length, 4)
    const executions = new ExecutionRepository()
    const runs = new RunRepository()
    const results = new TestResultRepository()
    const readiness = await readReadiness(context)
    assert.equal(readiness.status, 200)
    const readinessData = responseData(readiness)
    assert.equal(Array.isArray(readinessData.decisions), true)
    assert.equal(readinessData.decisions.some((decision: any) => decision.state === 'unknown' || decision.state === 'blocked'), true)
    const sources = await evidenceSources(context, readiness.body)
    const projectWorkspace = await readCanonicalEvidenceWorkspace(PROJECT, { context: 'project' }, resolveProject, sources)
    assert.equal(projectWorkspace.status, 200)
    assert.equal(responseData(projectWorkspace).project.projectId, PROJECT)
    const resultReads: unknown[] = []
    for (const chain of chains) {
      assert.ok(await executions.readProjectionSnapshot(PROJECT, chain.execution_id!))
      assert.equal((await runs.findById(chain.run_id))?.execution_id, chain.execution_id)
      assert.equal((await results.findByRun(chain.run_id))[0]?.result_id, chain.result_id)
      const detail: any = await context.readProductExecutionResults(PROJECT, chain.execution_id!)
      assert.equal(detail.kind, 'ok')
      assert.equal(detail.projection.execution.executionId, chain.execution_id)
      assert.equal(detail.projection.run.runId, chain.run_id)
      assert.equal(detail.projection.items[0].result.resultId, chain.result_id)
      assert.equal(detail.projection.items[0].definitionId, chain.definition_id)
      assert.equal(detail.projection.execution.definitionAuthority.testSetId, chain.test_set_id)
      assert.equal(detail.projection.execution.definitionAuthority.revision, chain.test_set_revision)
      const workspace = await readCanonicalEvidenceWorkspace(PROJECT, {
        context: 'result', execution: chain.execution_id, run: chain.run_id,
        item: String(chain.execution_item_ordinal), result: chain.result_id,
      }, resolveProject, sources)
      assert.equal(workspace.status, 200)
      const data = responseData(workspace)
      assert.deepEqual(data.context, {
        kind: 'result', executionId: chain.execution_id, runId: chain.run_id,
        itemOrdinal: chain.execution_item_ordinal, resultId: chain.result_id,
      })
      const selected = data.blocks.find((block: any) => block.blockId === 'selected-result')
      assert.equal(selected.availability, 'available')
      assert.equal(selected.scope.semanticIdentity, `${chain.execution_id}:${chain.run_id}:${chain.execution_item_ordinal}:${chain.result_id}`)
      const definition = data.blocks.find((block: any) => block.blockId === 'historical-definition')
      assert.equal(definition.availability, 'available')
      assert.equal(definition.claims.find((item: any) => item.claimId === 'definition-id').value, chain.definition_id)
      // The legacy v1 source Observation was deliberately retained only in
      // the import ledger as compatibility evidence. The workspace must keep
      // that exact gap unresolved rather than substituting one of the ten
      // later canonical Observations.
      const observationReference = definition.references.find((item: any) => item.reference.kind === 'observation')
      assert.equal(observationReference.reference.observationId, 'd8006951-5d5c-4715-8b57-7deeacb9aea9')
      assert.equal(observationReference.resolution, 'unresolved')
      resultReads.push({ chain, detail: detail.projection, workspace: data })
    }
    const resultHistory: any = await context.listProductExecutionResults(PROJECT, 50)
    assert.equal(resultHistory.kind, 'ok')
    assert.equal(resultHistory.executions.length, 4)
    assert.deepEqual(
      resultHistory.executions.map((item: any) => item.executionId).sort(),
      chains.map(chain => chain.execution_id).sort(),
    )
    const repairs: any = await context.productRepairWorkflow(PROJECT, 'list')
    assert.deepEqual(repairs, [])
    const repairCounts = await Promise.all([
      'repair_workflow_entries', 'repair_proposals', 'repair_decisions', 'execution_repair_bindings',
      'repair_effectiveness_evidence', 'repair_dispositions', 'repair_revision_origins',
    ].map(async table => Number((await sql.raw<{ count: number }>(`SELECT COUNT(*) AS count FROM ${quote(table)}`).execute(db)).rows[0].count)))
    assert.equal(repairCounts.every(count => count === 0), true)
    return {
      inventory: { total: inventory.total, history: inventory.history, current: inventory.current },
      definitions: definitionReads,
      models: modelReads,
      observations: observationRows.map(row => row.observation_id),
      observationHistory,
      results: resultReads,
      resultHistory,
      readiness: { data: readiness.body.data, error: readiness.body.error },
      projectWorkspace: responseData(projectWorkspace),
      repairContext: 'TRUTHFUL_ABSENCE',
    }
  } finally {
    await closeDb()
  }
}

test('selected logical 025 snapshot upgrades twice through 041 with exact historical Product reads', {
  concurrency: false,
  skip: selectedSnapshotAvailable ? false : 'Set FORGE_SLICE2_SOURCE_DB to the Slice-0 coherent logical snapshot.',
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s2-history-'))
  const firstPath = path.join(root, 'first.db')
  const secondPath = path.join(root, 'second.db')
  try {
    const sourceHashBefore = fileHash(selectedSnapshot)
    const before = inspectDatabase(selectedSnapshot)
    assert.equal(before.migrations.length, 25)
    assert.equal(before.migrations.at(-1), '025_historical_observation_import')
    assert.deepEqual(Object.fromEntries(historicalTables.map(table => [table, before.tables[table].count])), {
      app_models: 8, observations: 10, test_set_revisions: 3, executions: 4,
      execution_items: 4, execution_events: 9, execution_locks: 0, runs: 67, test_results: 4,
    })
    const sourceColumns = Object.fromEntries(historicalTables.map(table => [table, before.tables[table].columns]))
    await upgrade(selectedSnapshot, firstPath)
    await upgrade(selectedSnapshot, secondPath)
    const first = inspectDatabase(firstPath, sourceColumns)
    const second = inspectDatabase(secondPath, sourceColumns)
    for (const evidence of [first, second]) {
      assert.equal(evidence.migrations.length, 41)
      assert.equal(evidence.migrations.at(-1), '041_repair_workflow_entry')
      assert.deepEqual(evidence.integrity, { quickCheck: 'ok', integrityCheck: 'ok', foreignKeyViolations: 0 })
      for (const table of historicalTables) {
        assert.equal(evidence.tables[table].count, before.tables[table].count, table)
        assert.equal(evidence.tables[table].sha256, before.tables[table].sha256, table)
      }
      assert.deepEqual(evidence.sequences, before.sequences)
    }
    assert.equal(first.migrationHash, second.migrationHash)
    assert.deepEqual(first.tables, second.tables)
    assert.equal(first.sequencesHash, second.sequencesHash)
    assert.equal(first.schemaObjectsHash, second.schemaObjectsHash)
    assert.deepEqual(first.counts, second.counts)
    const sourceObjects = new Map((before.schemaObjects as Array<any>).map(item => [item.name, item]))
    const targetObjectNames = new Set((first.schemaObjects as Array<any>).map(item => item.name))
    for (const name of sourceObjects.keys()) assert.equal(targetObjectNames.has(name), true, name)

    const firstReadA = await productReadProjection(firstPath)
    const firstReadB = await productReadProjection(firstPath)
    const secondRead = await productReadProjection(secondPath)
    assert.deepEqual(firstReadA, firstReadB)
    assert.deepEqual(firstReadA, secondRead)
    assert.equal(fileHash(selectedSnapshot), sourceHashBefore)

    for (const [databasePath, readProjection] of [[firstPath, firstReadA], [secondPath, secondRead]] as const) {
      const productReads = new Map<string, HistoricalInvalidProductReadEvidence>()
      for (const model of readProjection.models as Array<any>) {
        productReads.set(`${model.appName}\u0000${model.rowId}\u0000${model.version}`, {
          kind: model.readKind,
          model: {
            rowId: model.rowId,
            appName: model.appName,
            version: model.version,
            lifecycle: model.lifecycle,
            validation: model.validation,
            modelFingerprint: model.fingerprint,
          },
        })
      }
      const classified = classifyAgainstBaseline(applyHistoricalInvalidAppModelPolicy({
        gates: inspectSqliteReadOnly(databasePath).gates,
        targetDatabasePath: databasePath,
        sourceDatabasePath: selectedSnapshot,
        policy: historicalInvalidPolicy,
        productReads,
      }))
      assert.equal(
        classified.find(gate => gate.id === 'storage.all-model-json')?.findingKind,
        'PRESERVED_HISTORICAL_INVALID',
      )
    }

    process.stdout.write(`SLICE2_CERTIFICATION_EVIDENCE=${JSON.stringify({
      source: { sha256: sourceHashBefore, migrations: before.migrations.length, migrationHash: before.migrationHash },
      first: { migrations: first.migrations.length, migrationHash: first.migrationHash, schemaObjectsHash: first.schemaObjectsHash },
      second: { migrations: second.migrations.length, migrationHash: second.migrationHash, schemaObjectsHash: second.schemaObjectsHash },
      tables: Object.fromEntries(historicalTables.map(table => [table, {
        count: before.tables[table].count, preHash: before.tables[table].sha256,
        postHash: first.tables[table].sha256,
      }])),
      sequencesHash: first.sequencesHash,
      productReadHash: digest(firstReadA),
      historicalInvalidClassification: 'PRESERVED_HISTORICAL_INVALID',
      repairContext: 'TRUTHFUL_ABSENCE',
    })}\n`)
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
})

function corruptDisposable(
  source: string,
  destination: string,
  triggerTables: readonly string[],
  statement: string,
): void {
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL)
  const db = new BetterSqlite3(destination)
  try {
    db.pragma('foreign_keys = OFF')
    const triggers = db.prepare(`SELECT name FROM sqlite_schema WHERE type='trigger' AND tbl_name IN (${triggerTables.map(() => '?').join(',')})`)
      .all(...triggerTables) as Array<{ name: string }>
    db.transaction(() => {
      for (const trigger of triggers) db.exec(`DROP TRIGGER ${quote(trigger.name)}`)
      db.exec(statement)
    })()
  } finally {
    db.close()
  }
}

test('upgraded historical reads refuse broken chains and never substitute a different Result', {
  concurrency: false,
  skip: selectedSnapshotAvailable ? false : 'Set FORGE_SLICE2_SOURCE_DB to the Slice-0 coherent logical snapshot.',
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s2-hostile-'))
  const upgraded = path.join(root, 'upgraded.db')
  try {
    await upgrade(selectedSnapshot, upgraded)
    const raw = new BetterSqlite3(upgraded, { readonly: true, fileMustExist: true })
    const chains = raw.prepare(`SELECT result.result_id, result.run_id, execution.execution_id,
      result.execution_item_ordinal, result.definition_id, execution.test_set_id, execution.test_set_revision
      FROM test_results result
      JOIN runs run ON run.run_id=result.run_id
      JOIN executions execution ON execution.execution_id=run.execution_id
      ORDER BY result.id`).all() as Array<{
        result_id: string; run_id: string; execution_id: string; execution_item_ordinal: number; definition_id: string
        test_set_id: string; test_set_revision: number
      }>
    raw.close()
    assert.equal(chains.length, 4)
    const selected = chains[0]
    const other = chains[1]

    const exactContext = await createContext(upgraded)
    try {
      const readiness = await readReadiness(exactContext)
      const sources = await evidenceSources(exactContext, readiness.body)
      const wrongResult = await readCanonicalEvidenceWorkspace(PROJECT, {
        context: 'result', execution: selected.execution_id, run: selected.run_id,
        item: String(selected.execution_item_ordinal), result: other.result_id,
      }, resolveProject, sources)
      assert.equal(wrongResult.status, 200)
      const wrongResultData = responseData(wrongResult)
      assert.equal(wrongResultData.context.resultId, other.result_id)
      assert.equal(wrongResultData.sourceFailures.some((failure: any) => failure.code === 'EXACT_RESULT_UNAVAILABLE'), true)
      assert.equal(wrongResultData.blocks.some((block: any) => block.blockId === 'selected-result' && block.availability === 'available'), false)
    } finally {
      await closeDb()
    }

    const ambiguous = path.join(root, 'ambiguous-definition.db')
    const sourceForAmbiguity = new BetterSqlite3(upgraded, { readonly: true, fileMustExist: true })
    const historicalSet = sourceForAmbiguity.prepare('SELECT payload_json FROM test_set_revisions WHERE test_set_id=? AND revision=?')
      .get(selected.test_set_id, selected.test_set_revision) as { payload_json: string }
    sourceForAmbiguity.close()
    const duplicatedPayload = JSON.parse(historicalSet.payload_json) as { definitions: unknown[] }
    duplicatedPayload.definitions.push(structuredClone(duplicatedPayload.definitions[0]))
    corruptDisposable(upgraded, ambiguous, ['test_set_revisions'], `UPDATE test_set_revisions
      SET payload_json=${literal(JSON.stringify(duplicatedPayload))}, definition_count=definition_count+1
      WHERE test_set_id=${literal(selected.test_set_id)} AND revision=${selected.test_set_revision}`)
    const ambiguityBeforeRead = inspectDatabase(ambiguous)
    const ambiguityContext = await createContext(ambiguous)
    try {
      await assert.rejects(
        () => ambiguityContext.readExactTestDefinition(PROJECT, selected.test_set_id, selected.test_set_revision, selected.definition_id),
        /Persisted test-set history could not be validated safely/,
      )
      const readiness = await readReadiness(ambiguityContext)
      const sources = await evidenceSources(ambiguityContext, readiness.body)
      const exact = await readCanonicalEvidenceWorkspace(PROJECT, {
        context: 'result', execution: selected.execution_id, run: selected.run_id,
        item: String(selected.execution_item_ordinal), result: selected.result_id,
      }, resolveProject, sources)
      assert.equal(exact.status, 200)
      const data = responseData(exact)
      assert.equal(data.sourceFailures.some((failure: any) => failure.code === 'EXACT_DEFINITION_UNAVAILABLE'), true)
      assert.equal(data.blocks.some((block: any) => block.blockId === 'historical-definition-unavailable'), true)
    } finally {
      await closeDb()
    }
    assert.deepEqual(inspectDatabase(ambiguous), ambiguityBeforeRead, 'ambiguous Definition read mutated its source')

    const hostileCases = [
      {
        name: 'broken-run-execution', tables: ['runs'],
        sql: `UPDATE runs SET execution_id='missing-historical-execution' WHERE run_id=${literal(selected.run_id)}`,
      },
      {
        name: 'broken-result-run', tables: ['test_results'],
        sql: `UPDATE test_results SET run_id='missing-historical-run' WHERE result_id=${literal(selected.result_id)}`,
      },
      {
        name: 'corrupted-definition-reference', tables: ['execution_items'],
        sql: `UPDATE execution_items SET definition_id='missing-historical-definition' WHERE execution_id=${literal(selected.execution_id)} AND item_ordinal=${selected.execution_item_ordinal}`,
      },
    ] as const
    for (const hostile of hostileCases) {
      const dbPath = path.join(root, `${hostile.name}.db`)
      corruptDisposable(upgraded, dbPath, hostile.tables, hostile.sql)
      const beforeRead = inspectDatabase(dbPath)
      const context = await createContext(dbPath)
      try {
        const read: any = await context.readProductExecutionResults(PROJECT, selected.execution_id)
        if (read.kind === 'ok') {
          assert.equal(read.projection.items.some((item: any) => item.result?.resultId === selected.result_id), false, hostile.name)
        } else {
          assert.equal(read.kind, 'integrity_invalid', hostile.name)
        }
        const history: any = await context.listProductExecutionResults(PROJECT, 50)
        assert.equal(history.kind, 'ok')
        const requested = history.executions.find((item: any) => item.executionId === selected.execution_id)
        assert.ok(requested)
        const readiness = await readReadiness(context)
        const sources = await evidenceSources(context, readiness.body)
        const exact = await readCanonicalEvidenceWorkspace(PROJECT, {
          context: 'result', execution: selected.execution_id, run: selected.run_id,
          item: String(selected.execution_item_ordinal), result: selected.result_id,
        }, resolveProject, sources)
        assert.equal(exact.status, 200)
        const data = responseData(exact)
        assert.equal(data.sourceFailures.some((failure: any) => failure.code === 'EXACT_RESULT_UNAVAILABLE'), true, hostile.name)
        assert.equal(data.blocks.some((block: any) => block.blockId === 'selected-result' && block.availability === 'available'), false, hostile.name)
      } finally {
        await closeDb()
      }
      assert.deepEqual(inspectDatabase(dbPath), beforeRead, `${hostile.name} read mutated its source`)
    }
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('migration coordinator refuses history mismatch and unsupported schema gaps without repair', {
  concurrency: false,
  skip: selectedSnapshotAvailable ? false : 'Set FORGE_SLICE2_SOURCE_DB to the Slice-0 coherent logical snapshot.',
}, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s2-migration-hostile-'))
  try {
    const mismatch = path.join(root, 'history-mismatch.db')
    fs.copyFileSync(selectedSnapshot, mismatch, fs.constants.COPYFILE_EXCL)
    const mismatchDb = new BetterSqlite3(mismatch)
    mismatchDb.prepare("UPDATE kysely_migration SET name='025_unrecognized_history' WHERE name='025_historical_observation_import'").run()
    mismatchDb.close()
    const mismatchBefore = inspectDatabase(mismatch)
    initDisposableDatabase(mismatch)
    await assert.rejects(() => runMigrations(), /migration history|history contains|ordered prefix/i)
    await closeDb()
    assert.deepEqual(inspectDatabase(mismatch), mismatchBefore)

    const gap = path.join(root, 'unsupported-schema-gap.db')
    await upgrade(selectedSnapshot, gap)
    const gapDb = new BetterSqlite3(gap)
    gapDb.exec('DROP INDEX uq_product_result_repair_link')
    gapDb.close()
    const gapBefore = inspectDatabase(gap)
    initDisposableDatabase(gap)
    await assert.rejects(() => runMigrations(), /schema and migration history disagree|repair link|index/i)
    await closeDb()
    assert.deepEqual(inspectDatabase(gap), gapBefore)
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
})
