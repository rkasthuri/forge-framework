import * as path from 'path';
import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import { Database } from './types';

let _db: Kysely<Database> | null = null;
/** The SQLite path _db was materialized with (null before first getDb() and under Postgres). */
let _dbPath: string | null = null;
/** Path requested via initDb() — consumed by getDb() at materialization (TD-114). */
let _initPath: string | null = null;

/**
 * TD-114 — scope the singleton to a specific SQLite path BEFORE it materializes.
 *
 * Per-app DB isolation without a DI refactor: all 16 repositories keep calling
 * getDb(); this seam only decides WHERE that singleton lives. CrawlRunner (via
 * DatabaseFactory.openProjectDatabase) calls this with workspace.dbPath()
 * before anything touches getDb().
 *
 * Rules:
 *   - singleton already open at the SAME path  → no-op (idempotent)
 *   - singleton already open at a DIFFERENT path → THROW (no silent
 *     cross-project bleed; call closeDb() first)
 *   - not yet materialized → record the path (last call wins pre-open)
 *   - DB_URL (Postgres) set → explicit operator choice takes precedence;
 *     WARN that project-scoped SQLite is bypassed — visible, never silent
 *
 * Legacy flows that never call initDb() are byte-identical to pre-TD-114:
 * DB_PATH env var or './forge-framework.db' (cwd-relative) default.
 */
export function initDb(dbPath: string): void {
  const resolved = path.resolve(dbPath);
  if (process.env.DB_URL) {
    console.warn(`[DatabaseFactory] DB_URL is set (PostgreSQL) — project-scoped SQLite path '${resolved}' is bypassed.`);
    return;
  }
  if (_db) {
    if (_dbPath && path.resolve(_dbPath) === resolved) return;   // idempotent re-open
    throw new Error(
      `[DatabaseFactory] DB already open at ${_dbPath}. ` +
      `Cannot re-initialize for ${resolved}. Call closeDb() first.`,
    );
  }
  _initPath = resolved;
}

/**
 * Returns a singleton Kysely<Database> instance.
 *
 * Dialect selection order:
 *   1. DB_URL set          → PostgreSQL via pg.Pool
 *   2. better-sqlite3 available (native build compiled) → SQLite via SqliteDialect
 *   3. Fallback            → SQLite via kysely-wasm + node-sqlite3-wasm (pure JS,
 *                            useful in CI or sandboxes where node-gyp cannot compile)
 *
 * DB_PATH defaults to ./forge-framework.db (relative to process.cwd()).
 */
export function getDb(): Kysely<Database> {
  if (_db) return _db;

  const dbUrl  = process.env.DB_URL;
  // TD-114: an initDb()-scoped path wins over the legacy env/default resolution.
  const dbPath = _initPath ?? (process.env.DB_PATH || './forge-framework.db');

  if (dbUrl) {
    // ── PostgreSQL ────────────────────────────────────────────────────────────
    const { Pool } = require('pg');
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: dbUrl }),
      }),
    });
    console.log('[storage] Using PostgreSQL:', dbUrl.replace(/:\/\/[^@]+@/, '://***@'));
  } else {
    // ── SQLite (native first, wasm fallback) ──────────────────────────────────
    try {
      const BetterSqlite3 = require('better-sqlite3');
      _db = new Kysely<Database>({
        dialect: new SqliteDialect({
          database: new BetterSqlite3(dbPath),
        }),
      });
      _dbPath = dbPath;
      console.log('[storage] Using SQLite (better-sqlite3):', dbPath);
    } catch {
      // better-sqlite3 native module not compiled — use pure-JS wasm build
      const { NodeWasmDialect } = require('kysely-wasm');
      const { Database: WasmDatabase } = require('node-sqlite3-wasm');
      _db = new Kysely<Database>({
        dialect: new NodeWasmDialect({
          database: new WasmDatabase(dbPath),
        }),
      } as any);
      _dbPath = dbPath;
      console.log('[storage] Using SQLite (node-sqlite3-wasm fallback):', dbPath);
    }
  }

  return _db!;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
    _dbPath = null;
    _initPath = null;   // TD-114: closeDb() clears the scoping — initDb() may re-scope after
  }
}
