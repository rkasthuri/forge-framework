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

import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { CURRENT_PRODUCT_MIGRATION_CEILING, productWorkspaceDatabaseAuthority } from './DatabaseAuthority'

export const WORKSPACE_PRESERVATION_SCHEMA_VERSION = 'forge-workspace-preservation/v1' as const

export type PreservationClassification =
  | 'PROJECT_SELECTION_REQUIRED'
  | 'PROJECT_NOT_REGISTERED'
  | 'WORKSPACE_NOT_FOUND'
  | 'DATABASE_NOT_FOUND'
  | 'WORKSPACE_PATH_ESCAPE'
  | 'STALE_REGISTRY_METADATA'
  | 'UNSUPPORTED_STORAGE_BACKEND'
  | 'ACTIVE_WRITER_UNRESOLVED'
  | 'QUIESCENCE_UNKNOWN'
  | 'SOURCE_CHANGED_DURING_CAPTURE'
  | 'SQLITE_SIDECAR_INCOHERENT'
  | 'RAW_PRESERVATION_FAILED'
  | 'LOGICAL_SNAPSHOT_FAILED'
  | 'SQLITE_INTEGRITY_FAILED'
  | 'FOREIGN_KEY_VIOLATION'
  | 'MIGRATION_HISTORY_UNRECOGNIZED'
  | 'DISPOSABLE_DESTINATION_UNSAFE'
  | 'PRESERVATION_READY'

export type QuiescenceClassification =
  | 'QUIESCENT'
  | 'ACTIVE_PRODUCT_WRITER'
  | 'EXTERNAL_WRITER_UNRESOLVED'
  | 'SOURCE_CHANGED_DURING_CAPTURE'
  | 'QUIESCENCE_UNKNOWN'

export interface CapturedProjectRegistryEntry {
  appName: string
  url: string
  workspacePath: string
  createdAt: string
  lastOpenedAt: string
}

export interface FileReceipt {
  path: string
  exists: boolean
  required: boolean
  byteSize: number | null
  modifiedAt: string | null
  sha256: string | null
  fileIdentity: string | null
}

export interface CanonicalTableReceipt {
  table: string
  exists: boolean
  rowCount: number | null
  identitySha256: string | null
}

export interface IntegrityReceipt {
  quickCheck: string | null
  integrityCheck: string | null
  foreignKeyViolationCount: number | null
  reopenReadStable: boolean
}

export type SourceStabilityClassification =
  | 'UNCHANGED'
  | 'TRANSIENT_SQLITE_METADATA_TOUCH'
  | 'SOURCE_CHANGED_DURING_CAPTURE'

export interface SourceStabilityReceipt {
  stable: boolean | null
  classification: SourceStabilityClassification | 'NOT_EVALUATED'
  semanticMutation: 'NO' | 'UNKNOWN'
  authoritativeContentMutation: boolean | null
  metadataChanged: boolean | null
  before: FileReceipt[]
  after: FileReceipt[]
}

export interface WorkspacePreservationReceipt {
  schemaVersion: typeof WORKSPACE_PRESERVATION_SCHEMA_VERSION
  timestamp: string
  productSourceSha: string
  productSourceSnapshotSha256: string
  appName: string | null
  projectRegistryMembership: boolean
  registryEntry: CapturedProjectRegistryEntry | null
  registryEntrySha256: string | null
  canonicalProjectsRoot: string
  workspaceResolver: { identity: string; version: string }
  normalizedWorkspaceRoot: string | null
  workspaceContainment: 'within_canonical_root' | 'failed' | 'not_evaluated'
  canonicalDatabasePath: string | null
  backend: string
  sqliteRuntimeVersion: string | null
  databaseExists: boolean
  components: { database: FileReceipt | null; wal: FileReceipt | null; shm: FileReceipt | null }
  journalMode: string | null
  migrationNames: string[]
  migrationHistorySha256: string | null
  migrationHistoryRecognized: boolean
  canonicalTables: CanonicalTableReceipt[]
  quiescence: QuiescenceClassification
  registryPathConsistency: 'MATCH' | 'STALE_REGISTRY_METADATA' | 'NOT_EVALUATED'
  sourceStability: SourceStabilityReceipt
  rawPreservation: { status: 'not_requested' | 'blocked' | 'passed' | 'failed'; destination: string | null; components: FileReceipt[] }
  logicalSnapshot: {
    status: 'not_requested' | 'passed' | 'failed'
    path: string | null
    sha256: string | null
    integrity: IntegrityReceipt | null
    migrationNames: string[]
    migrationHistorySha256: string | null
    canonicalTables: CanonicalTableReceipt[]
  }
  blockers: Array<{ code: PreservationClassification; message: string }>
  safeNextAction: string
  classification: PreservationClassification
}

export interface WorkspacePreservationRequest {
  productSourceSha: string
  productSourceSnapshotSha256: string
  appName: unknown
  registryEntry: CapturedProjectRegistryEntry | null
  canonicalProjectsRoot: string
  workspaceResolver: { identity: string; version: string }
  resolvedWorkspaceRoot: string | null
  backend: string
  productWriterState: 'inactive' | 'active' | 'unknown'
  sourceBoundary: 'selected-live-readonly' | 'owned-disposable-fixture'
  createArtifacts?: boolean
  allowlistedParent?: string
  disposableRoot?: string
  databasePathOverride?: string
}

export interface WorkspacePreservationHooks {
  afterRawComponentCopy?(sourcePath: string, destinationPath: string): void | Promise<void>
  afterLogicalBackup?(destinationPath: string): void | Promise<void>
  backup?(source: BetterSqlite3.Database, destinationPath: string): Promise<unknown>
  now?(): Date
}

const APP_NAME = /^[a-z0-9][a-z0-9-]*$/
const HASH = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/
const TABLE_IDENTITIES: ReadonlyArray<readonly [string, string]> = [
  ['app_models', 'CAST(id AS TEXT)'],
  ['test_set_revisions', "project_id || ':' || test_set_id || ':' || CAST(revision AS TEXT)"],
  ['executions', 'execution_id'],
  ['runs', 'run_id'],
  ['test_results', "COALESCE(result_id, 'legacy:' || CAST(id AS TEXT))"],
  ['observations', 'observation_id'],
]

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hashFile(filePath: string): string {
  const handle = fs.openSync(filePath, 'r')
  const hash = crypto.createHash('sha256')
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  try {
    for (;;) {
      const count = fs.readSync(handle, buffer, 0, buffer.length, null)
      if (count === 0) break
      hash.update(buffer.subarray(0, count))
    }
    return hash.digest('hex')
  } finally {
    fs.closeSync(handle)
  }
}

function samePath(left: string, right: string): boolean {
  const a = path.resolve(left)
  const b = path.resolve(right)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

function within(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`
}

function missingFileReceipt(filePath: string, required: boolean): FileReceipt {
  return { path: filePath, exists: false, required, byteSize: null, modifiedAt: null, sha256: null, fileIdentity: null }
}

function captureFile(filePath: string, required: boolean): FileReceipt {
  if (!fs.existsSync(filePath)) return missingFileReceipt(filePath, required)
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) return missingFileReceipt(filePath, required)
  return {
    path: filePath,
    exists: true,
    required,
    byteSize: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sha256: hashFile(filePath),
    fileIdentity: Number.isFinite(stat.dev) && Number.isFinite(stat.ino) ? `${stat.dev}:${stat.ino}` : null,
  }
}

function captureComponents(databasePath: string): FileReceipt[] {
  return [
    captureFile(databasePath, true),
    captureFile(`${databasePath}-wal`, false),
    captureFile(`${databasePath}-shm`, false),
  ]
}

function sameContentIdentity(before: FileReceipt[], after: FileReceipt[]): boolean {
  return before.length === after.length && before.every((item, index) => {
    const other = after[index]
    return item.exists === other.exists
      && item.byteSize === other.byteSize
      && item.sha256 === other.sha256
  })
}

function sameFilesystemMetadata(left: FileReceipt, right: FileReceipt): boolean {
  return left.modifiedAt === right.modifiedAt && left.fileIdentity === right.fileIdentity
}

export function classifySourceStability(before: FileReceipt[], after: FileReceipt[]): SourceStabilityReceipt {
  const contentStable = sameContentIdentity(before, after)
  const metadataChanged = before.length !== after.length || before.some((item, index) => {
    const other = after[index]
    return !other || !sameFilesystemMetadata(item, other)
  })
  if (!contentStable) {
    return {
      stable: false,
      classification: 'SOURCE_CHANGED_DURING_CAPTURE',
      semanticMutation: 'UNKNOWN',
      authoritativeContentMutation: true,
      metadataChanged,
      before,
      after,
    }
  }
  if (!metadataChanged) {
    return {
      stable: true,
      classification: 'UNCHANGED',
      semanticMutation: 'NO',
      authoritativeContentMutation: false,
      metadataChanged: false,
      before,
      after,
    }
  }
  const onlyShmMetadataChanged = before.every((item, index) => {
    const other = after[index]
    return sameFilesystemMetadata(item, other) || item.path.endsWith('-shm')
  })
  return {
    stable: onlyShmMetadataChanged,
    classification: onlyShmMetadataChanged ? 'TRANSIENT_SQLITE_METADATA_TOUCH' : 'SOURCE_CHANGED_DURING_CAPTURE',
    semanticMutation: onlyShmMetadataChanged ? 'NO' : 'UNKNOWN',
    authoritativeContentMutation: false,
    metadataChanged: true,
    before,
    after,
  }
}

function knownMigrationNames(): string[] {
  const directory = path.join(__dirname, 'migrations')
  if (!fs.existsSync(directory)) return []
  return [...new Set(fs.readdirSync(directory)
    .map(name => /^(\d{3}_[^.]+)\.(?:ts|js)$/.exec(name)?.[1] ?? null)
    .filter((name): name is string => name !== null))].sort()
}

function migrationHistoryRecognized(names: string[]): boolean {
  const known = knownMigrationNames()
  if (names.length === 0 || known.length === 0 || names.length > known.length) return false
  return names.every((name, index) => name === known[index])
    && known.includes(CURRENT_PRODUCT_MIGRATION_CEILING)
}

function tableExists(db: BetterSqlite3.Database, table: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
}

function canonicalTableReceipts(db: BetterSqlite3.Database): CanonicalTableReceipt[] {
  return TABLE_IDENTITIES.map(([table, expression]) => {
    if (!tableExists(db, table)) return { table, exists: false, rowCount: null, identitySha256: null }
    const quoted = `"${table.replace(/"/g, '""')}"`
    const count = Number((db.prepare(`SELECT COUNT(*) AS count FROM ${quoted}`).get() as { count: number }).count)
    const identities = (db.prepare(`SELECT ${expression} AS identity FROM ${quoted} ORDER BY identity COLLATE BINARY`).all() as Array<{ identity: unknown }>).map(row => String(row.identity))
    return { table, exists: true, rowCount: count, identitySha256: sha256(canonicalJson(identities)) }
  })
}

function sameCanonicalTables(source: CanonicalTableReceipt[], destination: CanonicalTableReceipt[]): boolean {
  return canonicalJson(source) === canonicalJson(destination)
}

function migrationNamesFrom(db: BetterSqlite3.Database): string[] {
  if (!tableExists(db, 'kysely_migration')) return []
  return (db.prepare('SELECT name FROM kysely_migration ORDER BY rowid').all() as Array<{ name: string }>).map(row => row.name)
}

function inspectIntegrity(dbPath: string): {
  integrity: IntegrityReceipt
  migrationNames: string[]
  migrationHistorySha256: string
  canonicalTables: CanonicalTableReceipt[]
} {
  const first = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true })
  let quickCheck: string
  let integrityCheck: string
  let foreignKeyViolationCount: number
  let firstTables: CanonicalTableReceipt[]
  let firstMigrationNames: string[]
  try {
    quickCheck = String(first.pragma('quick_check', { simple: true }))
    integrityCheck = String(first.pragma('integrity_check', { simple: true }))
    foreignKeyViolationCount = (first.pragma('foreign_key_check') as unknown[]).length
    firstMigrationNames = migrationNamesFrom(first)
    firstTables = canonicalTableReceipts(first)
  } finally {
    first.close()
  }
  const second = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true })
  let secondTables: CanonicalTableReceipt[]
  let secondMigrationNames: string[]
  try {
    secondMigrationNames = migrationNamesFrom(second)
    secondTables = canonicalTableReceipts(second)
  } finally {
    second.close()
  }
  return {
    integrity: {
      quickCheck,
      integrityCheck,
      foreignKeyViolationCount,
      reopenReadStable: sameCanonicalTables(firstTables, secondTables)
        && canonicalJson(firstMigrationNames) === canonicalJson(secondMigrationNames),
    },
    migrationNames: firstMigrationNames,
    migrationHistorySha256: sha256(canonicalJson(firstMigrationNames)),
    canonicalTables: firstTables,
  }
}

function emptyReceipt(request: WorkspacePreservationRequest, timestamp: string): WorkspacePreservationReceipt {
  return {
    schemaVersion: WORKSPACE_PRESERVATION_SCHEMA_VERSION,
    timestamp,
    productSourceSha: request.productSourceSha,
    productSourceSnapshotSha256: request.productSourceSnapshotSha256,
    appName: typeof request.appName === 'string' ? request.appName : null,
    projectRegistryMembership: request.registryEntry !== null,
    registryEntry: request.registryEntry,
    registryEntrySha256: request.registryEntry ? sha256(canonicalJson(request.registryEntry)) : null,
    canonicalProjectsRoot: path.resolve(request.canonicalProjectsRoot),
    workspaceResolver: request.workspaceResolver,
    normalizedWorkspaceRoot: request.resolvedWorkspaceRoot ? path.resolve(request.resolvedWorkspaceRoot) : null,
    workspaceContainment: 'not_evaluated',
    canonicalDatabasePath: null,
    backend: request.backend,
    sqliteRuntimeVersion: null,
    databaseExists: false,
    components: { database: null, wal: null, shm: null },
    journalMode: null,
    migrationNames: [],
    migrationHistorySha256: null,
    migrationHistoryRecognized: false,
    canonicalTables: [],
    quiescence: 'QUIESCENCE_UNKNOWN',
    registryPathConsistency: 'NOT_EVALUATED',
    sourceStability: {
      stable: null,
      classification: 'NOT_EVALUATED',
      semanticMutation: 'UNKNOWN',
      authoritativeContentMutation: null,
      metadataChanged: null,
      before: [],
      after: [],
    },
    rawPreservation: { status: 'not_requested', destination: null, components: [] },
    logicalSnapshot: {
      status: 'not_requested', path: null, sha256: null, integrity: null,
      migrationNames: [], migrationHistorySha256: null, canonicalTables: [],
    },
    blockers: [],
    safeNextAction: 'Correct the reported blocker and request a new read-only assessment.',
    classification: 'QUIESCENCE_UNKNOWN',
  }
}

function fail(receipt: WorkspacePreservationReceipt, code: PreservationClassification, message: string, nextAction?: string): WorkspacePreservationReceipt {
  receipt.classification = code
  receipt.blockers.push({ code, message })
  if (nextAction) receipt.safeNextAction = nextAction
  return receipt
}

export class DisposableDestinationGuard {
  static validateNewRoot(allowlistedParent: string, disposableRoot: string): { parent: string; root: string } {
    const parent = fs.realpathSync.native(path.resolve(allowlistedParent))
    const root = path.resolve(disposableRoot)
    if (!within(parent, root) || fs.existsSync(root)) throw new Error('DISPOSABLE_DESTINATION_UNSAFE')
    return { parent, root }
  }

  static assertWrite(root: string, target: string): string {
    const normalizedRoot = path.resolve(root)
    const normalizedTarget = path.resolve(target)
    if (!within(normalizedRoot, normalizedTarget)) throw new Error('DISPOSABLE_DESTINATION_UNSAFE')
    return normalizedTarget
  }

  static assertDeletion(root: string, target: string): string {
    return this.assertWrite(root, target)
  }
}

export class WorkspacePreservationService {
  constructor(private readonly hooks: WorkspacePreservationHooks = {}) {}

  async capture(request: WorkspacePreservationRequest): Promise<WorkspacePreservationReceipt> {
    const receipt = await this.captureInternal(request)
    const ownedRoot = receipt.rawPreservation.destination
      ? path.dirname(receipt.rawPreservation.destination)
      : receipt.logicalSnapshot.path
        ? path.dirname(path.dirname(receipt.logicalSnapshot.path))
        : null
    if (ownedRoot && request.disposableRoot && samePath(ownedRoot, request.disposableRoot)) {
      const receiptPath = DisposableDestinationGuard.assertWrite(ownedRoot, path.join(ownedRoot, 'receipt.json'))
      fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
      fs.chmodSync(receiptPath, 0o444)
    }
    return receipt
  }

  private async captureInternal(request: WorkspacePreservationRequest): Promise<WorkspacePreservationReceipt> {
    const timestamp = (this.hooks.now?.() ?? new Date()).toISOString()
    const receipt = emptyReceipt(request, timestamp)
    if (!HASH.test(request.productSourceSha)) return fail(receipt, 'QUIESCENCE_UNKNOWN', 'Product source SHA is absent or malformed.')
    if (!SHA256.test(request.productSourceSnapshotSha256)) return fail(receipt, 'QUIESCENCE_UNKNOWN', 'Product source snapshot SHA-256 is absent or malformed.')
    if (typeof request.appName !== 'string' || request.appName.length === 0) return fail(receipt, 'PROJECT_SELECTION_REQUIRED', 'An explicit appName is required.')
    if (!APP_NAME.test(request.appName)) return fail(receipt, 'WORKSPACE_PATH_ESCAPE', 'The selected appName is not one safe path segment.')
    if (!request.registryEntry || request.registryEntry.appName !== request.appName) return fail(receipt, 'PROJECT_NOT_REGISTERED', 'The selected appName is not a ProjectRegistry member.')
    if (request.backend !== 'native-sqlite') return fail(receipt, 'UNSUPPORTED_STORAGE_BACKEND', 'Slice 0 supports native SQLite only.')
    if (!request.resolvedWorkspaceRoot) return fail(receipt, 'WORKSPACE_NOT_FOUND', 'WorkspaceResolver did not resolve a workspace.')

    const projectsRoot = path.resolve(request.canonicalProjectsRoot)
    const workspaceRoot = path.resolve(request.resolvedWorkspaceRoot)
    const expectedWorkspace = path.join(projectsRoot, request.appName)
    receipt.normalizedWorkspaceRoot = workspaceRoot
    if (!samePath(workspaceRoot, expectedWorkspace) || !within(projectsRoot, workspaceRoot)) {
      receipt.workspaceContainment = 'failed'
      return fail(receipt, 'WORKSPACE_PATH_ESCAPE', 'WorkspaceResolver output is outside the canonical project root.')
    }
    if (!fs.existsSync(workspaceRoot) || !fs.statSync(workspaceRoot).isDirectory()) return fail(receipt, 'WORKSPACE_NOT_FOUND', 'The resolver-derived workspace does not exist.')

    const realProjectsRoot = fs.realpathSync.native(projectsRoot)
    const realWorkspaceRoot = fs.realpathSync.native(workspaceRoot)
    if (!samePath(realWorkspaceRoot, path.join(realProjectsRoot, request.appName))) {
      receipt.workspaceContainment = 'failed'
      return fail(receipt, 'WORKSPACE_PATH_ESCAPE', 'The workspace resolves through a symlink or junction outside canonical authority.')
    }
    receipt.workspaceContainment = 'within_canonical_root'

    if (!samePath(request.registryEntry.workspacePath, workspaceRoot)) {
      receipt.registryPathConsistency = 'STALE_REGISTRY_METADATA'
      return fail(receipt, 'STALE_REGISTRY_METADATA', 'Registry workspacePath differs from WorkspaceResolver authority.', 'Correct registry metadata through a separately authorized registry operation; do not follow the stale path.')
    }
    receipt.registryPathConsistency = 'MATCH'

    const expectedDatabase = productWorkspaceDatabaseAuthority(workspaceRoot).sqlitePath
    const databasePath = request.databasePathOverride ? path.resolve(request.databasePathOverride) : expectedDatabase
    receipt.canonicalDatabasePath = expectedDatabase
    if (!samePath(databasePath, expectedDatabase)) {
      receipt.workspaceContainment = 'failed'
      return fail(receipt, 'WORKSPACE_PATH_ESCAPE', 'An alternate database path was refused.')
    }
    if (!fs.existsSync(databasePath) || !fs.statSync(databasePath).isFile()) return fail(receipt, 'DATABASE_NOT_FOUND', 'The canonical workspace database does not exist.')

    const forgeDirectory = path.dirname(databasePath)
    const realForgeDirectory = fs.realpathSync.native(forgeDirectory)
    const realDatabasePath = fs.realpathSync.native(databasePath)
    if (!samePath(realForgeDirectory, path.join(realWorkspaceRoot, '.forge')) || !samePath(realDatabasePath, path.join(realForgeDirectory, 'forge.db'))) {
      receipt.workspaceContainment = 'failed'
      return fail(receipt, 'WORKSPACE_PATH_ESCAPE', 'The canonical database resolves through an alternate directory or file.')
    }

    const before = captureComponents(databasePath)
    receipt.databaseExists = before[0].exists
    receipt.components = { database: before[0], wal: before[1], shm: before[2] }
    receipt.sourceStability.before = before
    if (before[2].exists && !before[1].exists) return fail(receipt, 'SQLITE_SIDECAR_INCOHERENT', 'A shared-memory sidecar exists without its WAL sidecar.')

    if (request.productWriterState === 'active') {
      receipt.quiescence = 'ACTIVE_PRODUCT_WRITER'
      return fail(receipt, 'ACTIVE_WRITER_UNRESOLVED', 'A Product-owned writer is active.')
    }
    if (request.productWriterState === 'unknown') {
      receipt.quiescence = 'QUIESCENCE_UNKNOWN'
      return fail(receipt, 'QUIESCENCE_UNKNOWN', 'Product writer state could not be established.')
    }
    receipt.quiescence = request.sourceBoundary === 'owned-disposable-fixture' ? 'QUIESCENT' : 'EXTERNAL_WRITER_UNRESOLVED'

    let destinationRoot: string | null = null
    if (request.createArtifacts) {
      if (!request.allowlistedParent || !request.disposableRoot) return fail(receipt, 'DISPOSABLE_DESTINATION_UNSAFE', 'Artifact creation requires an explicit allowlisted parent and new disposable root.')
      try {
        destinationRoot = DisposableDestinationGuard.validateNewRoot(request.allowlistedParent, request.disposableRoot).root
        fs.mkdirSync(destinationRoot)
      } catch {
        return fail(receipt, 'DISPOSABLE_DESTINATION_UNSAFE', 'The disposable destination is preexisting or outside its allowlisted parent.')
      }
    }

    let source: BetterSqlite3.Database | null = null
    try {
      source = new BetterSqlite3(databasePath, { readonly: true, fileMustExist: true })
      receipt.sqliteRuntimeVersion = String((source.prepare('SELECT sqlite_version() AS version').get() as { version: string }).version)
      receipt.journalMode = String(source.pragma('journal_mode', { simple: true }))
      if (!tableExists(source, 'kysely_migration')) return fail(receipt, 'MIGRATION_HISTORY_UNRECOGNIZED', 'The canonical migration history table is absent.')
      receipt.migrationNames = (source.prepare('SELECT name FROM kysely_migration ORDER BY rowid').all() as Array<{ name: string }>).map(row => row.name)
      receipt.migrationHistorySha256 = sha256(canonicalJson(receipt.migrationNames))
      receipt.migrationHistoryRecognized = migrationHistoryRecognized(receipt.migrationNames)
      if (!receipt.migrationHistoryRecognized) return fail(receipt, 'MIGRATION_HISTORY_UNRECOGNIZED', 'Migration history is not an exact prefix of the Product migration set.')
      receipt.canonicalTables = canonicalTableReceipts(source)
      const sourceQuick = String(source.pragma('quick_check', { simple: true }))
      const sourceIntegrity = String(source.pragma('integrity_check', { simple: true }))
      if (sourceQuick !== 'ok' || sourceIntegrity !== 'ok') return fail(receipt, 'SQLITE_INTEGRITY_FAILED', 'The source SQLite integrity checks did not pass.')
      if ((source.pragma('foreign_key_check') as unknown[]).length > 0) return fail(receipt, 'FOREIGN_KEY_VIOLATION', 'The source SQLite foreign-key check found violations.')

      if (request.createArtifacts && destinationRoot) {
        if (request.sourceBoundary === 'owned-disposable-fixture') {
          const rawDirectory = DisposableDestinationGuard.assertWrite(destinationRoot, path.join(destinationRoot, 'raw'))
          fs.mkdirSync(rawDirectory)
          receipt.rawPreservation = { status: 'passed', destination: rawDirectory, components: [] }
          try {
            for (const component of before.filter(item => item.exists)) {
              const destination = DisposableDestinationGuard.assertWrite(destinationRoot, path.join(rawDirectory, path.basename(component.path)))
              fs.copyFileSync(component.path, destination, fs.constants.COPYFILE_EXCL)
              await this.hooks.afterRawComponentCopy?.(component.path, destination)
              const copied = captureFile(destination, component.required)
              receipt.rawPreservation.components.push(copied)
              if (copied.sha256 !== component.sha256 || copied.byteSize !== component.byteSize) throw new Error('component mismatch')
              fs.chmodSync(destination, 0o444)
            }
          } catch {
            receipt.rawPreservation.status = 'failed'
            return fail(receipt, 'RAW_PRESERVATION_FAILED', 'Raw preservation did not produce byte-identical components.')
          }
        } else {
          receipt.rawPreservation = { status: 'blocked', destination: null, components: [] }
        }

        const logicalDirectory = DisposableDestinationGuard.assertWrite(destinationRoot, path.join(destinationRoot, 'logical'))
        fs.mkdirSync(logicalDirectory)
        const logicalPath = DisposableDestinationGuard.assertWrite(destinationRoot, path.join(logicalDirectory, 'forge.db'))
        receipt.logicalSnapshot.path = logicalPath
        try {
          await (this.hooks.backup ? this.hooks.backup(source, logicalPath) : source.backup(logicalPath))
          await this.hooks.afterLogicalBackup?.(logicalPath)
          const inspected = inspectIntegrity(logicalPath)
          receipt.logicalSnapshot = {
            status: 'passed', path: logicalPath, sha256: hashFile(logicalPath),
            integrity: inspected.integrity,
            migrationNames: inspected.migrationNames,
            migrationHistorySha256: inspected.migrationHistorySha256,
            canonicalTables: inspected.canonicalTables,
          }
          if (inspected.integrity.quickCheck !== 'ok' || inspected.integrity.integrityCheck !== 'ok' || !inspected.integrity.reopenReadStable) {
            receipt.logicalSnapshot.status = 'failed'
            return fail(receipt, 'SQLITE_INTEGRITY_FAILED', 'The logical snapshot did not pass repeatable SQLite integrity checks.')
          }
          if (inspected.integrity.foreignKeyViolationCount !== 0) {
            receipt.logicalSnapshot.status = 'failed'
            return fail(receipt, 'FOREIGN_KEY_VIOLATION', 'The logical snapshot contains foreign-key violations.')
          }
          if (!sameCanonicalTables(receipt.canonicalTables, inspected.canonicalTables)) {
            receipt.logicalSnapshot.status = 'failed'
            return fail(receipt, 'LOGICAL_SNAPSHOT_FAILED', 'The logical snapshot changed canonical row counts or identities.')
          }
          if (canonicalJson(receipt.migrationNames) !== canonicalJson(inspected.migrationNames)
            || receipt.migrationHistorySha256 !== inspected.migrationHistorySha256) {
            receipt.logicalSnapshot.status = 'failed'
            return fail(receipt, 'LOGICAL_SNAPSHOT_FAILED', 'The logical snapshot changed migration history.')
          }
        } catch (cause) {
          if (receipt.classification === 'SQLITE_INTEGRITY_FAILED' || receipt.classification === 'FOREIGN_KEY_VIOLATION') return receipt
          receipt.logicalSnapshot.status = 'failed'
          return fail(receipt, 'LOGICAL_SNAPSHOT_FAILED', `SQLite Online Backup failed: ${cause instanceof Error ? cause.message : 'unknown failure'}.`)
        }
      }
    } catch (cause) {
      return fail(receipt, 'SQLITE_INTEGRITY_FAILED', `The source SQLite database could not be inspected safely: ${cause instanceof Error ? cause.message : 'unknown failure'}.`)
    } finally {
      source?.close()
      const after = captureComponents(databasePath)
      receipt.sourceStability = classifySourceStability(before, after)
      if (receipt.sourceStability.classification === 'SOURCE_CHANGED_DURING_CAPTURE') {
        receipt.quiescence = 'SOURCE_CHANGED_DURING_CAPTURE'
        receipt.classification = 'SOURCE_CHANGED_DURING_CAPTURE'
        receipt.blockers.push({ code: 'SOURCE_CHANGED_DURING_CAPTURE', message: 'Source database or sidecar identity changed during capture.' })
        receipt.safeNextAction = 'Stop and identify the writer; do not rely on created artifacts.'
      }
    }

    if (receipt.classification === 'SOURCE_CHANGED_DURING_CAPTURE') return receipt
    if (request.sourceBoundary === 'selected-live-readonly') {
      return fail(receipt, 'ACTIVE_WRITER_UNRESOLVED', 'External-writer exclusion is not proven for the selected live workspace.', 'Retain the logical snapshot as disposable evidence; exercise raw recovery only after a separately approved live maintenance gate exists.')
    }
    if (!request.createArtifacts) return fail(receipt, 'QUIESCENCE_UNKNOWN', 'Assessment completed without creating preservation artifacts.')
    if (receipt.rawPreservation.status !== 'passed') return fail(receipt, 'RAW_PRESERVATION_FAILED', 'Raw preservation did not pass.')
    if (receipt.logicalSnapshot.status !== 'passed') return fail(receipt, 'LOGICAL_SNAPSHOT_FAILED', 'Logical snapshot did not pass.')
    receipt.classification = 'PRESERVATION_READY'
    receipt.safeNextAction = 'Use only the coherent logical snapshot for disposable migration certification; retain raw files for recovery.'
    return receipt
  }
}
