import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_trends_app_period_unique
    ON trends (app_name, period)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_trends_app_period_unique`.execute(db);
}
