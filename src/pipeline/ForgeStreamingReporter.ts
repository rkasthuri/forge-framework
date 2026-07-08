/**
 * ForgeStreamingReporter — FORGE's Result Ingestion Layer, Playwright adapter.
 *
 * Nova-approved (TD-126 design review). The first adapter in what becomes a
 * broader ingestion architecture (JUnit XML, remote agents, manual upload…).
 *
 * Reporter = INGESTION ONLY. It never analyzes. AnalysisPipeline runs in
 * onEnd, AFTER persistence (Nova Q5). Row schema is identical to the batch
 * path (Nova Q5a, TD-120) — makeResultKey + normalizeStatus reused verbatim.
 *
 * Run lifecycle (TD-126, orthogonal to test-outcome `status`):
 *   onBegin   → INSERT run (lifecycle: 'running')
 *   onTestEnd → queue a test_results row (streaming; queue drains async)
 *   onEnd     → UPDATE run (lifecycle: 'completed'|'failed'|'interrupted')
 *               + stats + outcome status; then run AnalysisPipeline
 *
 * DB path priority (Nova Q1):
 *   1. reporter option { dbPath }
 *   2. workspace auto-discovery (.forge/forge.db, walking up from cwd)
 *   3. DB_PATH env var
 *   4. ./forge-framework.db (legacy fixture default — last resort)
 */
import * as fs from 'fs'
import * as path from 'path'
import type {
  Reporter, TestCase, TestResult, FullConfig, Suite, FullResult,
} from '@playwright/test/reporter'

import { initDb, getDb, closeDb } from '../core/storage/db'
import { runMigrations } from '../core/storage/migrate'
import { RunRepository } from '../core/storage/repositories/RunRepository'
import { TestResultRepository } from '../core/storage/repositories/TestResultRepository'
import { NewTestResult } from '../core/storage/types'
import { RunLifecycle } from '../core/types'
import { makeResultKey } from '../core/identity/resultKey'
import { AnalysisPipeline } from '../core/pipeline/AnalysisPipeline'
import { FlakyPredictorStage } from '../core/pipeline/stages/FlakyPredictorStage'

export type ReporterOptions = {
  dbPath?: string
  appName?: string
}

const STALE_RUN_MINUTES = 120   // 2 hours (Nova: on-next-run cleanup)
const FLUSH_WINDOW_MS   = 100   // batch rapid onTestEnd calls

/**
 * Map Playwright's per-attempt `result.status` → the test_results vocab.
 * NOT normalizeStatus: that maps the OUTCOME vocab (expected|unexpected|flaky|
 * skipped) used by the batch's JSON report; `result.status` is a different axis
 * (passed|failed|timedOut|skipped|interrupted). 'flaky' is a test-level
 * property FlakyPredictorStage derives from retry history — not a per-attempt
 * status — so it never appears on a streamed row.
 */
function normResultStatus(s: string): 'passed' | 'failed' | 'skipped' {
  if (s === 'passed') return 'passed'
  if (s === 'skipped') return 'skipped'
  return 'failed'   // failed | timedOut | interrupted
}

/** Reliable project (browser) name — walk up the suite chain to the project. */
function projectName(test: TestCase): string {
  let s: any = (test as any).parent
  while (s) {
    if (typeof s.project === 'function') {
      const p = s.project()
      if (p && p.name) return p.name
    }
    s = s.parent
  }
  return 'unknown'
}

export class ForgeStreamingReporter implements Reporter {
  private runId = ''
  private appName = ''
  private dbPath = ''
  private testCount = 0
  private startTime = 0
  private passed = 0
  private failed = 0
  private skipped = 0

  private writeQueue: NewTestResult[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  private readonly runs = new RunRepository()
  private readonly results = new TestResultRepository()
  // TD-126: `--list` runs the reporter lifecycle (onBegin/onEnd) with no tests —
  // persisting then would create phantom empty runs. Ingest only for real runs.
  private readonly listMode = process.argv.includes('--list')

  constructor(options: ReporterOptions = {}) {
    this.dbPath = options.dbPath
      ?? this.discoverWorkspaceDb()
      ?? process.env.DB_PATH
      ?? './forge-framework.db'
    this.appName = options.appName ?? process.env.APP_NAME ?? 'unknown'
  }

  /** Walk up from cwd to find .forge/forge.db (TD-097: runtime resolution only). */
  private discoverWorkspaceDb(): string | undefined {
    let dir = process.cwd()
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, '.forge', 'forge.db')
      if (fs.existsSync(candidate)) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return undefined
  }

  async onBegin(_config: FullConfig, suite: Suite): Promise<void> {
    if (this.listMode) {
      console.log('[ForgeStreamingReporter] --list mode — ingestion disabled (no DB writes).')
      return
    }
    initDb(this.dbPath)
    await runMigrations()
    console.log(`[ForgeStreamingReporter] Bound to DB: ${this.dbPath}`)

    // On-next-run cleanup: mark stale RUNNING runs INTERRUPTED (no daemon).
    await this.cleanupStaleRuns()

    this.runId = process.env.CURRENT_RUN_ID ?? `stream-${Date.now()}`
    this.startTime = Date.now()
    this.testCount = suite.allTests().length

    await this.runs.insert({
      run_id:           this.runId,
      app_name:         this.appName,
      branch:           process.env.GITHUB_REF_NAME || 'local',
      commit_sha:       process.env.GITHUB_SHA       || 'local',
      environment:      process.env.CI ? 'ci' : 'local',
      base_url:         process.env.BASE_URL || '',
      triggered_by:     process.env.TRIGGERED_BY || 'manual',
      reporter_version: 'stream-1',
      status:           'unknown',        // outcome unknown until onEnd (S2)
      lifecycle:        'running',        // lifecycle: the run is in flight
      total_tests:      this.testCount,
      passed: 0, failed: 0, skipped: 0,
      duration_ms:      0,
      started_at:       new Date().toISOString(),
      metadata:         JSON.stringify({ reporter: 'streaming' }),
    })

    console.log(`[ForgeStreamingReporter] Run ${this.runId} started (${this.testCount} tests)`)
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (this.listMode) return
    const browser = projectName(test)
    const norm = normResultStatus(result.status)
    if (norm === 'passed') this.passed++
    else if (norm === 'skipped') this.skipped++
    else this.failed++   // failed | flaky both count as non-pass for the run tally

    this.writeQueue.push({
      run_id:       this.runId,
      test_id:      makeResultKey(test.location.file, test.title, browser),
      title:        test.title,
      suite:        test.parent?.title ?? '',
      status:       norm,
      duration_ms:  result.duration,
      retry_count:  result.retry,
      browser,
      started_at:   result.startTime?.toISOString() ?? new Date().toISOString(),
      worker_index: result.workerIndex ?? 0,
      tier:         'ui',
      tags:         '[]',
      flaky_history: 0,
      metadata:     '{}',
      error_msg:    result.errors?.[0]?.message ?? null,
    })
    this.scheduleFlush()
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.listMode) return
    await this.drainQueue()

    const duration = Date.now() - this.startTime
    // Lifecycle (Nova S2): did the run FINISH? Outcome (passed/failed) is a
    // SEPARATE axis written to `status`. NOTE: the brief mapped FullResult
    // 'failed' → lifecycle 'failed'; that would mark every run-with-a-failing-
    // test as lifecycle:'failed', overlapping `status` and breaking S2
    // orthogonality. A run that reached onEnd DID complete — so 'failed'/
    // 'timedout' → lifecycle 'completed' with status:'failed'; only a genuine
    // interruption → 'interrupted'. Flagged for review.
    const lifecycle: RunLifecycle =
      result.status === 'interrupted' || result.status === 'timedout'
        ? 'interrupted'
        : 'completed'
    const outcomeStatus = this.failed > 0 ? 'failed' : 'passed'

    await this.runs.updateStats(this.runId, {
      total_tests: this.testCount,
      passed:      this.passed,
      failed:      this.failed,
      skipped:     this.skipped,
      duration_ms: duration,
    })
    await this.runs.updateStatus(this.runId, outcomeStatus)   // outcome axis
    await this.runs.updateLifecycle(                          // lifecycle axis
      this.runId, lifecycle,
      lifecycle === 'interrupted' ? undefined : new Date().toISOString(),
    )
    console.log(`[ForgeStreamingReporter] Run ${this.runId} → ${lifecycle.toUpperCase()} (status: ${outcomeStatus})`)

    // AnalysisPipeline AFTER persistence — reporter persists, never analyzes.
    // Skip on interrupted (partial data isn't a basis for flaky scoring).
    if (lifecycle !== 'interrupted') {
      await new AnalysisPipeline()
        .addStage(new FlakyPredictorStage())
        .run({ runId: this.runId, appName: this.appName, db: getDb() })
    }

    await closeDb()
  }

  // ── write queue ─────────────────────────────────────────────────────────────

  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => { void this.drainQueue() }, FLUSH_WINDOW_MS)
  }

  private async drainQueue(): Promise<void> {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null }
    if (this.writeQueue.length === 0) return
    const batch = this.writeQueue.splice(0)
    try {
      await this.results.insertBatch(batch)
    } catch (err) {
      // Never crash the test run over an ingestion write — log and continue
      // (the batch verifier reconciles any gap afterward). Rule 5: never silent.
      console.warn(`[ForgeStreamingReporter] Batch insert of ${batch.length} row(s) failed: ${err}`)
    }
  }

  private async cleanupStaleRuns(): Promise<void> {
    const stale = await this.runs.findStaleRunning(this.appName, STALE_RUN_MINUTES)
    for (const run of stale) {
      await this.runs.updateLifecycle(run.run_id, 'interrupted')
      console.log(`[ForgeStreamingReporter] Marked stale run ${run.run_id} as INTERRUPTED`)
    }
  }
}

export default ForgeStreamingReporter
