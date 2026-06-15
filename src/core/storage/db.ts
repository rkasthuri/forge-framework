import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import { Database } from './types';

let _db: Kysely<Database> | null = null;

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
  const dbPath = process.env.DB_PATH || './forge-framework.db';

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
      console.log('[storage] Using SQLite (node-sqlite3-wasm fallback):', dbPath);
    }
  }

  return _db!;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}
