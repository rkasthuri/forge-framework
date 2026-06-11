import { Kysely } from 'kysely';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_PATH = path.resolve(process.cwd(), 'reports/run-history.json');
const TRENDS_PATH  = path.resolve(process.cwd(), 'reports/trends.json');
const HEAL_PATH    = path.resolve(process.cwd(), 'reports/heal-store.json');

export async function up(db: Kysely<any>): Promise<void> {

  // ── run-history.json ──────────────────────────────────────────────────────
  if (fs.existsSync(HISTORY_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      const runs: any[] = Array.isArray(raw) ? raw : (raw.runs ?? []);
      let imported = 0;
      for (const r of runs) {
        await db.insertInto('runs')
          .values({
            run_id:           r.runId           ?? r.run_id           ?? `legacy-${Date.now()}-${Math.random()}`,
            app_name:         r.appName         ?? r.app_name         ?? 'saucedemo',
            branch:           r.branch          ?? 'unknown',
            commit_sha:       r.commitSha       ?? r.commit_sha       ?? 'unknown',
            environment:      r.environment     ?? 'local',
            base_url:         r.baseUrl         ?? r.base_url         ?? '',
            triggered_by:     r.triggeredBy     ?? r.triggered_by     ?? 'manual',
            reporter_version: r.reporterVersion ?? r.reporter_version ?? 'legacy',
            status:           r.status          ?? 'unknown',
            total_tests:      r.stats?.total    ?? r.totalTests       ?? r.total ?? 0,
            passed:           r.stats?.passed   ?? r.passed           ?? 0,
            failed:           r.stats?.failed   ?? r.failed           ?? 0,
            skipped:          r.stats?.skipped  ?? r.skipped          ?? 0,
            duration_ms:      r.durationMs      ?? r.duration_ms      ?? r.duration ?? 0,
            started_at:       r.startTime       ?? r.started_at       ?? r.timestamp ?? new Date().toISOString(),
            completed_at:     r.endTime         ?? r.completed_at     ?? new Date().toISOString(),
            metadata:         JSON.stringify(r.metadata ?? {}),
          })
          .onConflict(oc => oc.column('run_id').doNothing())
          .execute();
        imported++;
      }
      console.log(`[migration 004] Imported ${imported} run(s) from run-history.json`);
    } catch (e) {
      console.warn('[migration 004] Could not import run-history.json:', (e as Error).message);
    }
  } else {
    console.log('[migration 004] run-history.json not found — skipping');
  }

  // ── heal-store.json ───────────────────────────────────────────────────────
  if (fs.existsSync(HEAL_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HEAL_PATH, 'utf-8'));
      const entries = Object.values(raw) as any[];
      let healCount = 0;
      for (const e of entries) {
        await db.insertInto('heal_events')
          .values({
            run_id:            e.runId            ?? 'legacy-import',
            page:              e.page             ?? 'unknown',
            element:           e.element          ?? e.key ?? 'unknown',
            original_strategy: e.originalStrategy ?? e.original_strategy ?? '',
            healed_strategy:   e.healedSelector   ?? e.healed_strategy   ?? '',
            heal_type:         e.source           ?? e.heal_type         ?? 'smart-locator',
            confidence:        e.confidence       ?? 1.0,
            consecutive_count: e.consecutiveSuccesses ?? e.consecutive_count ?? 0,
            promoted:          e.promoted ? 1 : 0,
            healed_at:         e.firstHealed      ?? e.healed_at         ?? new Date().toISOString(),
          })
          .execute();
        healCount++;
      }
      console.log(`[migration 004] Imported ${healCount} heal event(s) from heal-store.json`);
    } catch (e) {
      console.warn('[migration 004] Could not import heal-store.json:', (e as Error).message);
    }
  } else {
    console.log('[migration 004] heal-store.json not found — skipping');
  }

  // ── trends.json ───────────────────────────────────────────────────────────
  if (fs.existsSync(TRENDS_PATH)) {
    try {
      const raw   = JSON.parse(fs.readFileSync(TRENDS_PATH, 'utf-8'));
      const period = new Date().toISOString().slice(0, 10);
      await db.insertInto('trends')
        .values({
          app_name:        'saucedemo',
          period,
          total_runs:      raw.totalRuns       ?? 0,
          pass_rate:       0,
          avg_duration_ms: 0,
          flaky_count:     0,
          heal_count:      0,
          coverage_delta:  0,
          computed_at:     raw.lastUpdated     ?? new Date().toISOString(),
        })
        .onConflict(oc => oc.columns(['app_name', 'period']).doNothing())
        .execute();
      console.log('[migration 004] Imported trends.json summary');
    } catch (e) {
      console.warn('[migration 004] Could not import trends.json:', (e as Error).message);
    }
  } else {
    console.log('[migration 004] trends.json not found — skipping');
  }
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Intentional no-op — legacy JSON files are not restored on rollback.
}
