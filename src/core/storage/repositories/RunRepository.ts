import { Transaction } from 'kysely'
import { getDb } from '../db'
import { Database, Run, NewRun, UpdateRun } from '../types'
import { RunStatus } from '../../types'

export class RunRepository {

  /** TD-120: optional trx joins the caller's Kysely transaction (results-store
   *  wraps run + test_results + trend writes atomically); omitted = singleton. */
  async insert(run: NewRun, trx?: Transaction<Database>): Promise<Run> {
    const db = trx ?? getDb()
    const result = await db.insertInto('runs')
      .values(run)
      .returningAll()
      .executeTakeFirstOrThrow()
    return result
  }

  async findById(runId: string): Promise<Run | null> {
    const db = getDb()
    const result = await db.selectFrom('runs')
      .selectAll()
      .where('run_id', '=', runId)
      .executeTakeFirst()
    return result ?? null
  }

  async findByApp(appName: string, limit = 50): Promise<Run[]> {
    const db = getDb()
    return db.selectFrom('runs')
      .selectAll()
      .where('app_name', '=', appName)
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute()
  }

  async findRecent(limit = 10): Promise<Run[]> {
    const db = getDb()
    return db.selectFrom('runs')
      .selectAll()
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute()
  }

  async updateStatus(
    runId: string,
    status: RunStatus,
    completedAt?: string
  ): Promise<void> {
    const db = getDb()
    await db.updateTable('runs')
      .set({
        status,
        ...(completedAt ? { completed_at: completedAt } : {}),
      })
      .where('run_id', '=', runId)
      .execute()
  }

  async updateStats(
    runId: string,
    stats: {
      total_tests: number
      passed:      number
      failed:      number
      skipped:     number
      duration_ms: number
    }
  ): Promise<void> {
    const db = getDb()
    await db.updateTable('runs')
      .set(stats)
      .where('run_id', '=', runId)
      .execute()
  }

  async findByEnvironment(env: string, limit = 20): Promise<Run[]> {
    const db = getDb()
    return db.selectFrom('runs')
      .selectAll()
      .where('environment', '=', env)
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute()
  }

  async getPassRateSince(appName: string, since: string): Promise<number> {
    const db = getDb()
    const rows = await db.selectFrom('runs')
      .select(['status'])
      .where('app_name', '=', appName)
      .where('started_at', '>=', since)
      .execute()
    if (rows.length === 0) return 0
    const passed = rows.filter(r => r.status === 'passed').length
    return passed / rows.length
  }

  async deleteByRunId(runId: string): Promise<void> {
    const db = getDb()
    await db.deleteFrom('runs')
      .where('run_id', '=', runId)
      .execute()
  }
}
