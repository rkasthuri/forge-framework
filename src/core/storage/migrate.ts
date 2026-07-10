/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

import * as path from 'path';
import * as fs from 'fs';
import { getDb, closeDb } from './db';

// Kysely's Migrator and migration types live in a subpath export (kysely/migration)
// that is not declared as a types path in kysely's package.json exports map under
// "moduleResolution": "node". We load it at runtime via require() and type it with
// `any` so that this file compiles cleanly without tsconfig changes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Migrator } = require('kysely/migration') as { Migrator: new (args: any) => any };

/**
 * CJS-safe migration provider.
 *
 * Kysely's built-in FileMigrationProvider uses dynamic import() which can
 * fail in ts-node / tsx CJS mode. This provider uses require() instead,
 * which works correctly when executed via `tsx src/storage/migrate.ts`.
 */
class TsxMigrationProvider {
  constructor(private readonly migrationsDir: string) {}

  async getMigrations(): Promise<Record<string, { up: (db: any) => Promise<void>; down?: (db: any) => Promise<void> }>> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();

    const migrations: Record<string, any> = {};
    for (const file of files) {
      const name = file.replace(/\.(ts|js)$/, '');
      const fullPath = path.join(this.migrationsDir, file);
      migrations[name] = require(fullPath);
    }
    return migrations;
  }
}

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const migrationsDir = path.resolve(__dirname, 'migrations');

  const migrator = new Migrator({
    db,
    provider: new TsxMigrationProvider(migrationsDir),
  });

  const { error, results } = (await migrator.migrateToLatest()) as {
    error: unknown;
    results: Array<{ migrationName: string; status: 'Success' | 'Error' | 'NotMigrated' }>;
  };

  if (results && results.length > 0) {
    for (const r of results) {
      if (r.status === 'Success') {
        console.log(`[migration] ✓ ${r.migrationName}`);
      } else if (r.status === 'Error') {
        console.error(`[migration] ✗ ${r.migrationName}`);
      }
    }
  } else {
    console.log('[migration] Already up to date.');
  }

  if (error) {
    console.error('[migration] Fatal error:', error);
    throw error;
  }
}

// ── CLI entry-point ───────────────────────────────────────────────────────────
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[migration] Done.');
      return closeDb();
    })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[migration] Unhandled error:', err);
      process.exit(1);
    });
}
