/**
 * TD-120 — per-test row extraction from Playwright's JSON report.
 *
 * Extracted from results-store.ts for testability: that file auto-runs main()
 * at module load (and exits without a results file), so its internals can't be
 * imported by unit tests. results-store's walkSuite delegates here — one
 * source of truth for the vocabulary map and the row shape.
 *
 * Structural types only — callers pass Playwright's parsed JSON shapes.
 */
import { NewTestResult } from '../storage/types'
import { makeResultKey } from '../identity/resultKey'

/**
 * Playwright's JSON reporter uses EXPECTATION vocabulary on spec.tests[].status
 * ('expected'/'unexpected'), not result vocabulary. test_results stores the
 * normalized form every consumer filters on (status === 'failed' etc.).
 * Verified against a real reports/test-results.json (TD-120 Step-0 finding E).
 */
export function normalizeStatus(s: string): 'passed' | 'failed' | 'flaky' | 'skipped' {
  switch (s) {
    case 'expected':   return 'passed'
    case 'unexpected': return 'failed'
    case 'flaky':      return 'flaky'
    case 'skipped':    return 'skipped'
    default:           return 'failed'   // safe default — unknown vocab reads as a problem, never silently "passed"
  }
}

// Minimal structural slices of Playwright's JSON report.
export interface ExtractableResult {
  status: string
  duration: number
  error?: { message: string }
  startTime?: string
  workerIndex?: number
}
export interface ExtractableTest {
  projectName: string
  status: string
  results: ExtractableResult[]
}
export interface ExtractableSpec {
  title: string
  file: string
  tests: ExtractableTest[]
}
export interface ExtractableSuite {
  title: string
  suites?: ExtractableSuite[]
  specs?: ExtractableSpec[]
}

/**
 * One test_results row per test per browser/project, for EVERY status —
 * passed, failed, flaky, AND skipped (skipped rows are stored; the analysis
 * layer excludes them from denominators — Nova Q2). Before TD-120 only flaky
 * tests were captured, which is why test_results stayed empty forever.
 */
export function extractTestResults(suites: ExtractableSuite[], runId: string): NewTestResult[] {
  const rows: NewTestResult[] = []
  function walk(suite: ExtractableSuite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        rows.push({
          run_id:        runId,
          test_id:       makeResultKey(spec.file, spec.title, test.projectName),
          title:         spec.title,
          suite:         suite.title ?? '',
          status:        normalizeStatus(test.status),
          duration_ms:   Math.round(test.results.reduce((sum, r) => sum + (r.duration ?? 0), 0)),
          retry_count:   Math.max(0, test.results.length - 1),
          browser:       test.projectName ?? 'unknown',
          started_at:    test.results[0]?.startTime ?? new Date().toISOString(),
          worker_index:  test.results[0]?.workerIndex ?? 0,
          tier:          'ui',
          tags:          '[]',
          flaky_history: 0,
          metadata:      '{}',
          error_msg:     test.results.find(r => r.error)?.error?.message ?? null,
        })
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  suites.forEach(walk)
  return rows
}
