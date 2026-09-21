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
import BetterSqlite3 from 'better-sqlite3'
import {
  classifySourceStability,
  DisposableDestinationGuard,
  WorkspacePreservationService,
  type FileReceipt,
  type WorkspacePreservationRequest,
} from '../src/core/storage/WorkspacePreservationService'
import { productWorkspaceDatabaseAuthority } from '../src/core/storage/DatabaseAuthority'
import { WorkspaceResolver } from '../forge-ui/server/context/WorkspaceResolver'
import { ProjectRegistry } from '../forge-ui/server/registry/ProjectRegistry'
import { SelectedWorkspacePreservationController } from '../forge-ui/server/context/SelectedWorkspacePreservationController'

const SOURCE_SHA = '7098d5ba36b93ff067d6255720b88df8a19cb82e'
const SOURCE_SNAPSHOT = 'a'.repeat(64)
const FIXED_TIME = new Date('2026-09-21T12:00:00.000Z')

function migrationNames(count = 25): string[] {
  return fs.readdirSync(path.join(__dirname, '..', 'src', 'core', 'storage', 'migrations'))
    .map(name => /^(\d{3}_[^.]+)\.ts$/.exec(name)?.[1] ?? null)
    .filter((name): name is string => name !== null)
    .sort()
    .slice(0, count)
}

function cleanup(root: string): void {
  if (!fs.existsSync(root)) return
  for (const item of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!item.isFile()) continue
    const parent = 'parentPath' in item ? String(item.parentPath) : root
    try { fs.chmodSync(path.join(parent, item.name), 0o666) } catch { /* best effort for fixture cleanup */ }
  }
  fs.rmSync(root, { recursive: true, force: true })
}

interface Fixture {
  root: string
  projectsRoot: string
  workspaceRoot: string
  databasePath: string
  allowlistedParent: string
  request(overrides?: Partial<WorkspacePreservationRequest>): WorkspacePreservationRequest
}

function fixture(options: { migrationCount?: number; invalidForeignKey?: boolean } = {}): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m7-s0-'))
  const projectsRoot = path.join(root, 'projects')
  const workspaceRoot = path.join(projectsRoot, 'saucedemo')
  const forgeDir = path.join(workspaceRoot, '.forge')
  const databasePath = path.join(forgeDir, 'forge.db')
  const allowlistedParent = path.join(root, 'audit')
  fs.mkdirSync(forgeDir, { recursive: true })
  fs.mkdirSync(allowlistedParent)
  const db = new BetterSqlite3(databasePath)
  try {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE kysely_migration (name TEXT NOT NULL, timestamp TEXT NOT NULL);
      CREATE TABLE app_models (id INTEGER PRIMARY KEY);
      CREATE TABLE test_set_revisions (project_id TEXT, test_set_id TEXT, revision INTEGER);
      CREATE TABLE executions (execution_id TEXT PRIMARY KEY);
      CREATE TABLE runs (run_id TEXT);
      CREATE TABLE test_results (id INTEGER PRIMARY KEY, result_id TEXT);
      CREATE TABLE observations (observation_id TEXT PRIMARY KEY);
      CREATE TABLE fixture_parents (id INTEGER PRIMARY KEY);
      CREATE TABLE fixture_children (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES fixture_parents(id));
      INSERT INTO app_models VALUES (1);
      INSERT INTO test_set_revisions VALUES ('saucedemo', 'set-1', 1);
      INSERT INTO executions VALUES ('execution-1');
      INSERT INTO runs VALUES ('run-1');
      INSERT INTO test_results VALUES (1, 'result-1');
      INSERT INTO observations VALUES ('observation-1');
      INSERT INTO fixture_parents VALUES (1);
      INSERT INTO fixture_children VALUES (1, ${options.invalidForeignKey ? 999 : 1});
    `)
    const insert = db.prepare('INSERT INTO kysely_migration (name, timestamp) VALUES (?, ?)')
    for (const name of migrationNames(options.migrationCount ?? 25)) insert.run(name, FIXED_TIME.toISOString())
  } finally {
    db.close()
  }
  const registryEntry = {
    appName: 'saucedemo', url: 'https://www.saucedemo.com', workspacePath: workspaceRoot,
    createdAt: '2026-07-10T17:14:35.593Z', lastOpenedAt: '2026-07-10T17:14:35.593Z',
  }
  return {
    root, projectsRoot, workspaceRoot, databasePath, allowlistedParent,
    request(overrides = {}) {
      return {
        productSourceSha: SOURCE_SHA,
        productSourceSnapshotSha256: SOURCE_SNAPSHOT,
        appName: 'saucedemo',
        registryEntry,
        canonicalProjectsRoot: projectsRoot,
        workspaceResolver: { identity: 'WorkspaceResolver', version: '1' },
        resolvedWorkspaceRoot: workspaceRoot,
        backend: 'native-sqlite',
        productWriterState: 'inactive',
        sourceBoundary: 'owned-disposable-fixture',
        createArtifacts: false,
        ...overrides,
      }
    },
  }
}

function service(hooks: ConstructorParameters<typeof WorkspacePreservationService>[0] = {}): WorkspacePreservationService {
  return new WorkspacePreservationService({ now: () => FIXED_TIME, ...hooks })
}

function hashFile(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function component(name: 'forge.db' | 'forge.db-wal' | 'forge.db-shm', overrides: Partial<FileReceipt> = {}): FileReceipt {
  return {
    path: path.join('C:\\fixture', name),
    exists: true,
    required: name === 'forge.db',
    byteSize: 32,
    modifiedAt: '2026-09-21T12:00:00.000Z',
    sha256: 'a'.repeat(64),
    fileIdentity: `fixture:${name}`,
    ...overrides,
  }
}

test('selection: valid registered canonical identity reaches read-only assessment', async () => {
  const f = fixture()
  try {
    const result = await service().capture(f.request())
    assert.equal(result.appName, 'saucedemo')
    assert.equal(result.projectRegistryMembership, true)
    assert.equal(result.workspaceContainment, 'within_canonical_root')
    assert.equal(result.canonicalDatabasePath, f.databasePath)
    assert.equal(result.registryPathConsistency, 'MATCH')
    assert.equal(result.classification, 'QUIESCENCE_UNKNOWN')
  } finally { cleanup(f.root) }
})

test('selection: missing identity fails closed', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ appName: null }))).classification, 'PROJECT_SELECTION_REQUIRED') }
  finally { cleanup(f.root) }
})

test('selection: unregistered project fails before workspace access', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ registryEntry: null }))).classification, 'PROJECT_NOT_REGISTERED') }
  finally { cleanup(f.root) }
})

test('selection: stale registry metadata is classified and never followed', async () => {
  const f = fixture()
  const stale = path.join(f.root, 'stale-do-not-follow')
  fs.writeFileSync(stale, 'not a database')
  try {
    const result = await service().capture(f.request({ registryEntry: { ...f.request().registryEntry!, workspacePath: stale } }))
    assert.equal(result.classification, 'STALE_REGISTRY_METADATA')
    assert.equal(result.canonicalDatabasePath, null)
  } finally { cleanup(f.root) }
})

test('selection: traversal appName is refused', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ appName: '../saucedemo' }))).classification, 'WORKSPACE_PATH_ESCAPE') }
  finally { cleanup(f.root) }
})

test('selection: alternate database path is refused', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ databasePathOverride: path.join(f.root, 'other.db') }))).classification, 'WORKSPACE_PATH_ESCAPE') }
  finally { cleanup(f.root) }
})

test('selection: repository-root fallback is refused', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ resolvedWorkspaceRoot: path.join(__dirname, '..') }))).classification, 'WORKSPACE_PATH_ESCAPE') }
  finally { cleanup(f.root) }
})

test('selection: missing workspace and missing database remain distinct', async () => {
  const missingWorkspace = fixture()
  const missingDatabase = fixture()
  try {
    cleanup(missingWorkspace.workspaceRoot)
    assert.equal((await service().capture(missingWorkspace.request())).classification, 'WORKSPACE_NOT_FOUND')
    fs.rmSync(missingDatabase.databasePath)
    assert.equal((await service().capture(missingDatabase.request())).classification, 'DATABASE_NOT_FOUND')
  } finally { cleanup(missingWorkspace.root); cleanup(missingDatabase.root) }
})

test('selection: unsupported backend is explicit', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ backend: 'wasm-sqlite' }))).classification, 'UNSUPPORTED_STORAGE_BACKEND') }
  finally { cleanup(f.root) }
})

test('source identity: database-only receipt is complete', async () => {
  const f = fixture()
  try {
    const result = await service().capture(f.request({ productWriterState: 'active' }))
    assert.equal(result.components.database?.exists, true)
    assert.equal(result.components.wal?.exists, false)
    assert.equal(result.components.shm?.exists, false)
  } finally { cleanup(f.root) }
})

test('source identity: database plus WAL is represented', async () => {
  const f = fixture(); fs.writeFileSync(`${f.databasePath}-wal`, Buffer.alloc(0))
  try {
    const result = await service().capture(f.request({ productWriterState: 'active' }))
    assert.equal(result.components.wal?.exists, true)
    assert.equal(result.components.shm?.exists, false)
  } finally { cleanup(f.root) }
})

test('source identity: database plus WAL plus SHM is represented', async () => {
  const f = fixture(); fs.writeFileSync(`${f.databasePath}-wal`, Buffer.alloc(0)); fs.writeFileSync(`${f.databasePath}-shm`, Buffer.alloc(32))
  try {
    const result = await service().capture(f.request({ productWriterState: 'active' }))
    assert.equal(result.components.wal?.exists, true)
    assert.equal(result.components.shm?.exists, true)
  } finally { cleanup(f.root) }
})

test('source identity: SHM without WAL is incoherent', async () => {
  const f = fixture(); fs.writeFileSync(`${f.databasePath}-shm`, Buffer.alloc(32))
  try { assert.equal((await service().capture(f.request())).classification, 'SQLITE_SIDECAR_INCOHERENT') }
  finally { cleanup(f.root) }
})

test('quiescence: active Product writer blocks', async () => {
  const f = fixture()
  try {
    const result = await service().capture(f.request({ productWriterState: 'active' }))
    assert.equal(result.quiescence, 'ACTIVE_PRODUCT_WRITER')
    assert.equal(result.classification, 'ACTIVE_WRITER_UNRESOLVED')
  } finally { cleanup(f.root) }
})

test('quiescence: unknown Product writer state blocks', async () => {
  const f = fixture()
  try { assert.equal((await service().capture(f.request({ productWriterState: 'unknown' }))).classification, 'QUIESCENCE_UNKNOWN') }
  finally { cleanup(f.root) }
})

test('quiescence: live external writer ambiguity remains explicit after stable reads', async () => {
  const f = fixture()
  try {
    const result = await service().capture(f.request({ sourceBoundary: 'selected-live-readonly' }))
    assert.equal(result.quiescence, 'EXTERNAL_WRITER_UNRESOLVED')
    assert.equal(result.classification, 'ACTIVE_WRITER_UNRESOLVED')
    assert.equal(result.sourceStability.stable, true)
  } finally { cleanup(f.root) }
})

test('hostile stability: SHM mtime touch with identical bytes is transient metadata only', () => {
  const before = [component('forge.db'), component('forge.db-wal'), component('forge.db-shm')]
  const after = before.map(item => ({ ...item }))
  after[2].modifiedAt = '2026-09-21T12:00:01.000Z'
  const result = classifySourceStability(before, after)
  assert.equal(result.classification, 'TRANSIENT_SQLITE_METADATA_TOUCH')
  assert.equal(result.stable, true)
  assert.equal(result.semanticMutation, 'NO')
  assert.equal(result.authoritativeContentMutation, false)
})

test('hostile stability: SHM recreation identity with identical bytes is transient metadata only', () => {
  const before = [component('forge.db'), component('forge.db-wal'), component('forge.db-shm')]
  const after = before.map(item => ({ ...item }))
  after[2].fileIdentity = 'fixture:replacement-shm'
  const result = classifySourceStability(before, after)
  assert.equal(result.classification, 'TRANSIENT_SQLITE_METADATA_TOUCH')
  assert.equal(result.stable, true)
})

for (const hostile of [
  { label: 'DB byte change', index: 0 },
  { label: 'WAL byte change', index: 1 },
  { label: 'SHM byte change', index: 2 },
] as const) {
  test(`hostile stability: ${hostile.label} blocks`, () => {
    const before = [component('forge.db'), component('forge.db-wal'), component('forge.db-shm')]
    const after = before.map(item => ({ ...item }))
    after[hostile.index].sha256 = 'b'.repeat(64)
    const result = classifySourceStability(before, after)
    assert.equal(result.classification, 'SOURCE_CHANGED_DURING_CAPTURE')
    assert.equal(result.stable, false)
    assert.equal(result.authoritativeContentMutation, true)
  })
}

test('hostile stability: unexpected size change blocks', () => {
  const before = [component('forge.db'), component('forge.db-wal'), component('forge.db-shm')]
  const after = before.map(item => ({ ...item }))
  after[1].byteSize = 33
  assert.equal(classifySourceStability(before, after).classification, 'SOURCE_CHANGED_DURING_CAPTURE')
})

test('destination: valid new allowlisted root succeeds', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'valid')
  try {
    const result = await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'PRESERVATION_READY')
    assert.equal(fs.existsSync(path.join(destination, 'logical', 'forge.db')), true)
    assert.equal(fs.existsSync(path.join(destination, 'receipt.json')), true)
  } finally { cleanup(f.root) }
})

test('destination: preexisting root is rejected', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'existing'); fs.mkdirSync(destination)
  try { assert.equal((await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))).classification, 'DISPOSABLE_DESTINATION_UNSAFE') }
  finally { cleanup(f.root) }
})

test('destination: outside and traversed roots are rejected', async () => {
  const f = fixture()
  try {
    const outside = await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: path.join(f.root, 'outside') }))
    assert.equal(outside.classification, 'DISPOSABLE_DESTINATION_UNSAFE')
    const traversed = await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: path.join(f.allowlistedParent, '..', 'escape') }))
    assert.equal(traversed.classification, 'DISPOSABLE_DESTINATION_UNSAFE')
  } finally { cleanup(f.root) }
})

test('destination: deletion guard denies outside targets', () => {
  const f = fixture()
  try { assert.throws(() => DisposableDestinationGuard.assertDeletion(path.join(f.allowlistedParent, 'root'), f.databasePath), /DISPOSABLE_DESTINATION_UNSAFE/) }
  finally { cleanup(f.root) }
})

test('raw preservation: exact components are copied and marked immutable', async () => {
  const f = fixture(); const before = hashFile(f.databasePath); const destination = path.join(f.allowlistedParent, 'raw-pass')
  try {
    const result = await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.rawPreservation.status, 'passed')
    assert.equal(hashFile(path.join(destination, 'raw', 'forge.db')), before)
  } finally { cleanup(f.root) }
})

test('raw preservation: destination component mismatch refuses', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'raw-mismatch')
  try {
    const result = await service({ afterRawComponentCopy: (_source, copy) => fs.appendFileSync(copy, 'x') }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'RAW_PRESERVATION_FAILED')
  } finally { cleanup(f.root) }
})

test('raw preservation: source change during copy overrides artifact success', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'raw-source-change'); let changed = false
  try {
    const result = await service({ afterRawComponentCopy: sourcePath => {
      if (changed || sourcePath !== f.databasePath) return
      changed = true
      const writer = new BetterSqlite3(f.databasePath); writer.exec('CREATE TABLE source_drift (id INTEGER)'); writer.close()
    } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'SOURCE_CHANGED_DURING_CAPTURE')
    assert.equal(result.sourceStability.stable, false)
  } finally { cleanup(f.root) }
})

test('hostile stability: migration-history drift during capture blocks', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'migration-drift')
  try {
    const result = await service({ afterLogicalBackup: () => {
      const writer = new BetterSqlite3(f.databasePath)
      writer.prepare('UPDATE kysely_migration SET name = ? WHERE rowid = 25').run('025_changed_during_capture')
      writer.close()
    } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'SOURCE_CHANGED_DURING_CAPTURE')
    assert.equal(result.sourceStability.authoritativeContentMutation, true)
  } finally { cleanup(f.root) }
})

test('hostile stability: canonical-row drift during capture blocks', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'canonical-drift')
  try {
    const result = await service({ afterLogicalBackup: () => {
      const writer = new BetterSqlite3(f.databasePath)
      writer.prepare('INSERT INTO app_models VALUES (?)').run(2)
      writer.close()
    } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'SOURCE_CHANGED_DURING_CAPTURE')
    assert.equal(result.sourceStability.authoritativeContentMutation, true)
  } finally { cleanup(f.root) }
})

test('online backup: coherent backup passes integrity, FK, reopen and identity comparison', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'logical-pass')
  try {
    const result = await service().capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.logicalSnapshot.status, 'passed')
    assert.deepEqual(result.logicalSnapshot.integrity, { quickCheck: 'ok', integrityCheck: 'ok', foreignKeyViolationCount: 0, reopenReadStable: true })
    assert.deepEqual(result.logicalSnapshot.migrationNames, result.migrationNames)
    assert.equal(result.logicalSnapshot.migrationHistorySha256, result.migrationHistorySha256)
    assert.deepEqual(result.logicalSnapshot.canonicalTables, result.canonicalTables)
  } finally { cleanup(f.root) }
})

test('online backup: destination migration-history drift refuses', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'logical-migration-drift')
  try {
    const result = await service({ afterLogicalBackup: snapshot => {
      const db = new BetterSqlite3(snapshot)
      db.prepare('UPDATE kysely_migration SET name = ? WHERE rowid = 25').run('025_changed_in_snapshot')
      db.close()
    } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.logicalSnapshot.status, 'failed')
    assert.equal(result.classification, 'LOGICAL_SNAPSHOT_FAILED')
    assert.notEqual(result.logicalSnapshot.migrationHistorySha256, result.migrationHistorySha256)
  } finally { cleanup(f.root) }
})

test('online backup: backup failure refuses', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'logical-fail')
  try {
    const result = await service({ backup: async () => { throw new Error('forced backup failure') } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'LOGICAL_SNAPSHOT_FAILED')
  } finally { cleanup(f.root) }
})

test('online backup: destination FK failure refuses', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'logical-fk')
  try {
    const result = await service({ afterLogicalBackup: snapshot => {
      const db = new BetterSqlite3(snapshot); db.pragma('foreign_keys = OFF'); db.prepare('INSERT INTO fixture_children VALUES (?, ?)').run(2, 999); db.close()
    } }).capture(f.request({ createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.classification, 'FOREIGN_KEY_VIOLATION')
  } finally { cleanup(f.root) }
})

test('integrity: source foreign-key violations refuse before backup', async () => {
  const f = fixture({ invalidForeignKey: true })
  try { assert.equal((await service().capture(f.request())).classification, 'FOREIGN_KEY_VIOLATION') }
  finally { cleanup(f.root) }
})

test('migration history: unknown or skipped history refuses', async () => {
  const f = fixture({ migrationCount: 24 })
  const db = new BetterSqlite3(f.databasePath); db.prepare('UPDATE kysely_migration SET name = ? WHERE rowid = 24').run('024_unknown_name'); db.close()
  try { assert.equal((await service().capture(f.request())).classification, 'MIGRATION_HISTORY_UNRECOGNIZED') }
  finally { cleanup(f.root) }
})

test('receipt: migration names, hash, canonical counts and source hashes are complete', async () => {
  const f = fixture()
  try {
    const result = await service().capture(f.request())
    assert.equal(result.migrationNames.length, 25)
    assert.match(result.migrationHistorySha256!, /^[a-f0-9]{64}$/)
    assert.equal(result.canonicalTables.length, 6)
    assert.equal(result.canonicalTables.every(item => item.exists && item.rowCount === 1 && !!item.identitySha256), true)
    assert.match(result.components.database!.sha256!, /^[a-f0-9]{64}$/)
  } finally { cleanup(f.root) }
})

test('live contract: logical snapshot may pass while raw recovery remains blocked', async () => {
  const f = fixture(); const destination = path.join(f.allowlistedParent, 'live-contract')
  try {
    const result = await service().capture(f.request({ sourceBoundary: 'selected-live-readonly', createArtifacts: true, allowlistedParent: f.allowlistedParent, disposableRoot: destination }))
    assert.equal(result.rawPreservation.status, 'blocked')
    assert.equal(result.logicalSnapshot.status, 'passed')
    assert.equal(result.classification, 'ACTIVE_WRITER_UNRESOLVED')
  } finally { cleanup(f.root) }
})

test('controller: appName selects registry then resolver and supplies no caller path', async () => {
  const f = fixture(); const calls: Array<{ appName: string; input: Record<string, unknown> }> = []
  const controller = new SelectedWorkspacePreservationController(
    f.allowlistedParent,
    { find: () => f.request().registryEntry! },
    { resolve: () => ({ root: f.workspaceRoot, forgeDir: path.join(f.workspaceRoot, '.forge') }), canonicalProjectsRoot: () => f.projectsRoot, identity: () => ({ identity: 'WorkspaceResolver', version: '1' }) },
    { captureSelectedWorkspacePreservation: async (appName, input) => { calls.push({ appName, input }); return { ok: true } } },
  )
  try {
    await controller.capture({ appName: 'saucedemo', productSourceSha: SOURCE_SHA, productSourceSnapshotSha256: SOURCE_SNAPSHOT, createArtifacts: true, operationId: 'capture-1' })
    assert.equal(calls[0].appName, 'saucedemo')
    assert.equal(calls[0].input.resolvedWorkspaceRoot, f.workspaceRoot)
    assert.equal(calls[0].input.disposableRoot, path.join(f.allowlistedParent, 'capture-1'))
    assert.equal('databasePath' in calls[0].input, false)
  } finally { cleanup(f.root) }
})

test('controller: unsafe operation identity can only become an unsafe refused destination', async () => {
  const f = fixture(); let observed: Record<string, unknown> = {}
  const controller = new SelectedWorkspacePreservationController(
    f.allowlistedParent,
    { find: () => f.request().registryEntry! },
    { resolve: () => ({ root: f.workspaceRoot, forgeDir: path.join(f.workspaceRoot, '.forge') }), canonicalProjectsRoot: () => f.projectsRoot, identity: () => ({ identity: 'WorkspaceResolver', version: '1' }) },
    { captureSelectedWorkspacePreservation: async (_appName, input) => { observed = input; return null } },
  )
  try {
    await controller.capture({ appName: 'saucedemo', productSourceSha: SOURCE_SHA, productSourceSnapshotSha256: SOURCE_SNAPSHOT, createArtifacts: true, operationId: '../escape' })
    assert.equal(path.resolve(String(observed.disposableRoot)).startsWith(path.resolve(f.allowlistedParent) + path.sep), false)
  } finally { cleanup(f.root) }
})

test('regression: DatabaseAuthority still requires exact workspace .forge/forge.db', () => {
  const f = fixture()
  try {
    assert.equal(productWorkspaceDatabaseAuthority(f.workspaceRoot).sqlitePath, f.databasePath)
    assert.throws(() => productWorkspaceDatabaseAuthority(f.workspaceRoot, path.join(f.workspaceRoot, 'other.db')))
  } finally { cleanup(f.root) }
})

test('regression: WorkspaceResolver remains pure and reports its canonical root', () => {
  const root = path.join(os.tmpdir(), `m7-resolver-${crypto.randomUUID()}`)
  const resolver = new WorkspaceResolver(root)
  const resolved = resolver.resolve('saucedemo')
  assert.equal(resolved.root, path.join(root, 'saucedemo'))
  assert.equal(fs.existsSync(root), false)
  assert.equal(resolver.canonicalProjectsRoot(), path.resolve(root))
  assert.deepEqual(resolver.identity(), { identity: 'WorkspaceResolver', version: '1' })
})

test('regression: ProjectRegistry read behavior remains non-provisioning', () => {
  const source = ProjectRegistry.prototype.list.toString()
  assert.match(source, /existsSync/)
  assert.match(source, /readFileSync/)
  assert.doesNotMatch(source, /writeFileSync/)
})
