import { getDb } from '../db'
import { Trend, NewTrend } from '../types'

export class TrendRepository {

  async upsert(trend: NewTrend): Promise<Trend> {
    const db = getDb()
    await db.insertInto('trends')
      .values(trend)
      .onConflict(oc => oc
        .columns(['app_name', 'period'] as any)
        .doUpdateSet({
          total_runs:      trend.total_runs,
          pass_rate:       trend.pass_rate,
          avg_duration_ms: trend.avg_duration_ms,
          flaky_count:     trend.flaky_count,
          heal_count:      trend.heal_count,
          coverage_delta:  trend.coverage_delta,
          computed_at:     trend.computed_at,
        })
      )
      .execute()

    return db.selectFrom('trends')
      .selectAll()
      .where('app_name', '=', trend.app_name)
      .where('period', '=', trend.period)
      .executeTakeFirstOrThrow()
  }

  async findByApp(appName: string, days = 30): Promise<Trend[]> {
    const db = getDb()
    const since = new Date(Date.now() - days * 86400000)
      .toISOString().slice(0, 10)
    return db.selectFrom('trends')
      .selectAll()
      .where('app_name', '=', appName)
      .where('period', '>=', since)
      .orderBy('period', 'asc')
      .execute()
  }

  async getLatest(appName: string): Promise<Trend | null> {
    const db = getDb()
    const result = await db.selectFrom('trends')
      .selectAll()
      .where('app_name', '=', appName)
      .orderBy('period', 'desc')
      .executeTakeFirst()
    return result ?? null
  }

  async getPassRateTrend(
    appName: string,
    days = 14
  ): Promise<{ period: string; pass_rate: number }[]> {
    const db = getDb()
    const since = new Date(Date.now() - days * 86400000)
      .toISOString().slice(0, 10)
    return db.selectFrom('trends')
      .select(['period', 'pass_rate'])
      .where('app_name', '=', appName)
      .where('period', '>=', since)
      .orderBy('period', 'asc')
      .execute() as any
  }

  async computeAndUpsertForRun(
    appName: string,
    runId: string
  ): Promise<Trend> {
    const db     = getDb()
    const period = new Date().toISOString().slice(0, 10)

    const runs = await db.selectFrom('runs')
      .select(['status', 'duration_ms'])
      .where('app_name', '=', appName)
      .where('started_at', 'like', `${period}%`)
      .execute()

    const totalRuns   = runs.length
    const passedRuns  = runs.filter(r => r.status === 'passed').length
    const passRate    = totalRuns > 0 ? passedRuns / totalRuns : 0
    const avgDuration = totalRuns > 0
      ? Math.round(runs.reduce((s, r) => s + r.duration_ms, 0) / totalRuns)
      : 0

    const healCount = await db.selectFrom('heal_events')
      .innerJoin('runs', 'runs.run_id', 'heal_events.run_id')
      .select(['heal_events.id'])
      .where('runs.app_name', '=', appName)
      .where('heal_events.healed_at', 'like', `${period}%`)
      .execute()
      .then(r => r.length)

    const flakyCount = await db.selectFrom('test_results')
      .innerJoin('runs', 'runs.run_id', 'test_results.run_id')
      .select(['test_results.id'])
      .where('runs.app_name', '=', appName)
      .where('test_results.status', '=', 'flaky')
      .where('test_results.started_at', 'like', `${period}%`)
      .execute()
      .then(r => r.length)

    return this.upsert({
      app_name:        appName,
      period,
      total_runs:      totalRuns,
      pass_rate:       passRate,
      avg_duration_ms: avgDuration,
      flaky_count:     flakyCount,
      heal_count:      healCount,
      coverage_delta:  0,
      computed_at:     new Date().toISOString(),
    })
  }
}
