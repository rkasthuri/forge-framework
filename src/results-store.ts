/**
 * results-store.ts
 * ─────────────────────────────────────────────────────────────
 * Step 2 — Results Store
 * Personal AI-Augmented Testing Framework
 *
 * Reads:   reports/test-results.json   (Playwright output)
 *          reports/triage-report.json  (Step 1 RCA output)
 * Writes:  reports/run-history.json    (append-only store)
 *          reports/trends.json         (live trend summary)
 *
 * Run:     automatically chained after triage (see package.json)
 *          or manually: npx tsx src/results-store.ts
 * ─────────────────────────────────────────────────────────────
 */

import * as fs   from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────

type RCAVerdict = 'Flaky' | 'Environment' | 'Bug' | 'Unknown';

interface RunRecord {
  runId:      string;
  timestamp:  string;
  durationMs: number;
  stats: {
    total:    number;
    passed:   number;
    failed:   number;
    flaky:    number;
    skipped:  number;
    passRate: string;
  };
  failures:   FailureRecord[];
  flakyTests: FlakyRecord[];
}

interface FailureRecord {
  testTitle:       string;
  suiteName:       string;
  file:            string;
  browser:         string;
  priority:        string;
  verdict:         RCAVerdict;
  confidence:      string;
  reasoning:       string;
  suggestedAction: string;
  errorMessage:    string;
}

interface FlakyRecord {
  testTitle:  string;
  file:       string;
  browser:    string;
  retries:    number;
  durationMs: number;
}

interface TrendEntry {
  testTitle:       string;
  file:            string;
  totalRuns:       number;
  failureCount:    number;
  flakyCount:      number;
  lastVerdict:     RCAVerdict | 'passed' | 'flaky';
  lastSeen:        string;
  consecutiveFails: number;
  riskLevel:       'High' | 'Medium' | 'Low';
}

interface TrendStore {
  lastUpdated: string;
  totalRuns:   number;
  tests:       Record<string, TrendEntry>;
}

interface RunHistory {
  created:    string;
  runs:       RunRecord[];
}

// ── Playwright JSON types (only what we need) ─────────────────

interface PWResult {
  status:   string;
  duration: number;
  retry:    number;
  error?:   { message: string };
}

interface PWTest {
  projectName: string;
  results:     PWResult[];
  status:      string;
}

interface PWSpec {
  title: string;
  file:  string;
  ok:    boolean;
  tests: PWTest[];
}

interface PWSuite {
  title:   string;
  suites?: PWSuite[];
  specs?:  PWSpec[];
}

interface PWStats {
  startTime:  string;
  duration:   number;
  expected:   number;
  unexpected: number;
  flaky:      number;
  skipped:    number;
}

interface PWReport {
  stats:  PWStats;
  suites: PWSuite[];
}

// ── Triage report types ───────────────────────────────────────

interface TriageResult {
  verdict:         RCAVerdict;
  confidence:      string;
  reasoning:       string;
  suggestedAction: string;
  test: {
    testTitle:    string;
    suiteName:    string;
    file:         string;
    browserName:  string;
    priority:     string;
    errorMessage: string;
  };
}

interface TriageReport {
  runTimestamp: string;
  results:      TriageResult[];
}

// ── Config ───────────────────────────────────────────────────

const PATHS = {
  testResults:  'reports/test-results.json',
  triageReport: 'reports/triage-report.json',
  runHistory:   'reports/run-history.json',
  trends:       'reports/trends.json',
};

// ── Entry point ───────────────────────────────────────────────

function main() {
  console.log('\n📦 Results Store — persisting run...\n');

  if (!fs.existsSync(PATHS.testResults)) {
    console.error(`❌ No test results at ${PATHS.testResults}. Run tests first.`);
    process.exit(1);
  }

  const pw: PWReport = JSON.parse(fs.readFileSync(PATHS.testResults, 'utf-8'));

  // Triage report is optional — store still works without it
  let triage: TriageReport | null = null;
  if (fs.existsSync(PATHS.triageReport)) {
    triage = JSON.parse(fs.readFileSync(PATHS.triageReport, 'utf-8'));
  } else {
    console.log('  ⚠️  No triage report found — storing results without RCA data.');
  }

  const record = buildRunRecord(pw, triage);
  appendToHistory(record);
  updateTrends(record);

  printSummary(record);
}

// ── Build run record ──────────────────────────────────────────

function buildRunRecord(pw: PWReport, triage: TriageReport | null): RunRecord {
  const { stats } = pw;
  const total   = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
  const passed  = stats.expected;
  const failed  = stats.unexpected;
  const flaky   = stats.flaky;
  const skipped = stats.skipped;
  const passRate = total > 0
    ? (((passed + flaky) / total) * 100).toFixed(1) + '%'
    : '0%';

  // Build failure records from triage (or empty if no triage)
  const failures: FailureRecord[] = (triage?.results ?? []).map(r => ({
    testTitle:       r.test.testTitle,
    suiteName:       r.test.suiteName,
    file:            r.test.file,
    browser:         r.test.browserName,
    priority:        r.test.priority,
    verdict:         r.verdict,
    confidence:      r.confidence,
    reasoning:       r.reasoning,
    suggestedAction: r.suggestedAction,
    errorMessage:    r.test.errorMessage.slice(0, 200),
  }));

  // Extract flaky tests directly from Playwright results
  const flakyTests: FlakyRecord[] = [];
  function walkSuite(suite: PWSuite) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          if (test.status === 'flaky') {
            flakyTests.push({
              testTitle:  spec.title,
              file:       spec.file,
              browser:    test.projectName,
              retries:    test.results.length - 1,
              durationMs: test.results.reduce((sum, r) => sum + (r.duration ?? 0), 0),
            });
          }
        }
      }
    }
    if (suite.suites) suite.suites.forEach(walkSuite);
  }
  pw.suites.forEach(walkSuite);

  return {
    runId:      stats.startTime.replace(/[:.]/g, '-').slice(0, 19),
    timestamp:  stats.startTime,
    durationMs: Math.round(stats.duration),
    stats:      { total, passed, failed, flaky, skipped, passRate },
    failures,
    flakyTests,
  };
}

// ── Append to run history ─────────────────────────────────────

function appendToHistory(record: RunRecord) {
  let history: RunHistory;

  if (fs.existsSync(PATHS.runHistory)) {
    history = JSON.parse(fs.readFileSync(PATHS.runHistory, 'utf-8'));
  } else {
    history = { created: new Date().toISOString(), runs: [] };
  }

  // Avoid duplicate runs (same runId)
  const exists = history.runs.some(r => r.runId === record.runId);
  if (exists) {
    console.log(`  ℹ️  Run ${record.runId} already stored — skipping duplicate.`);
    return;
  }

  history.runs.push(record);

  // Keep last 100 runs max
  if (history.runs.length > 100) {
    history.runs = history.runs.slice(-100);
  }

  fs.writeFileSync(PATHS.runHistory, JSON.stringify(history, null, 2), 'utf-8');
  console.log(`  ✅ Run stored: ${record.runId} (${history.runs.length} total runs in history)`);
}

// ── Update trends ─────────────────────────────────────────────

function updateTrends(record: RunRecord) {
  let store: TrendStore;

  if (fs.existsSync(PATHS.trends)) {
    store = JSON.parse(fs.readFileSync(PATHS.trends, 'utf-8'));
  } else {
    store = { lastUpdated: new Date().toISOString(), totalRuns: 0, tests: {} };
  }

  store.totalRuns++;
  store.lastUpdated = new Date().toISOString();

  // Process failures
  for (const f of record.failures) {
    const key = `${f.file}::${f.testTitle}::${f.browser}`;
    const entry = store.tests[key] ?? newTrendEntry(f.testTitle, f.file);

    entry.totalRuns++;
    entry.failureCount++;
    entry.consecutiveFails++;
    entry.lastVerdict = f.verdict;
    entry.lastSeen    = record.timestamp;
    entry.riskLevel   = calcRisk(entry);

    store.tests[key] = entry;
  }

  // Process flaky tests
  for (const f of record.flakyTests) {
    const key = `${f.file}::${f.testTitle}::${f.browser}`;
    const entry = store.tests[key] ?? newTrendEntry(f.testTitle, f.file);

    entry.totalRuns++;
    entry.flakyCount++;
    entry.consecutiveFails = 0; // passed eventually
    entry.lastVerdict = 'flaky';
    entry.lastSeen    = record.timestamp;
    entry.riskLevel   = calcRisk(entry);

    store.tests[key] = entry;
  }

  // Reset consecutiveFails for tests that passed this run
  const failedKeys = new Set([
    ...record.failures.map(f => `${f.file}::${f.testTitle}::${f.browser}`),
    ...record.flakyTests.map(f => `${f.file}::${f.testTitle}::${f.browser}`),
  ]);

  for (const key of Object.keys(store.tests)) {
    if (!failedKeys.has(key)) {
      store.tests[key].consecutiveFails = 0;
    }
  }

  fs.writeFileSync(PATHS.trends, JSON.stringify(store, null, 2), 'utf-8');
  console.log(`  ✅ Trends updated — ${Object.keys(store.tests).length} test(s) tracked`);
}

function newTrendEntry(testTitle: string, file: string): TrendEntry {
  return {
    testTitle,
    file,
    totalRuns:        0,
    failureCount:     0,
    flakyCount:       0,
    lastVerdict:      'passed',
    lastSeen:         new Date().toISOString(),
    consecutiveFails: 0,
    riskLevel:        'Low',
  };
}

function calcRisk(entry: TrendEntry): 'High' | 'Medium' | 'Low' {
  if (entry.consecutiveFails >= 3)                          return 'High';
  if (entry.consecutiveFails >= 2)                          return 'Medium';
  if (entry.flakyCount >= 3)                                return 'Medium';
  if ((entry.failureCount + entry.flakyCount) >= 5)         return 'Medium';
  return 'Low';
}

// ── Console summary ───────────────────────────────────────────

function printSummary(record: RunRecord) {
  const { stats } = record;
  console.log('\n──────────────────────────────────');
  console.log('  RESULTS STORED');
  console.log('──────────────────────────────────');
  console.log(`  Run ID:    ${record.runId}`);
  console.log(`  Total:     ${stats.total} tests`);
  console.log(`  ✅ Passed:  ${stats.passed}`);
  console.log(`  🟡 Flaky:   ${stats.flaky}`);
  console.log(`  ❌ Failed:  ${stats.failed}`);
  console.log(`  Pass rate: ${stats.passRate}`);
  console.log(`  Duration:  ${(record.durationMs / 1000).toFixed(1)}s`);
  console.log('──────────────────────────────────');
  console.log(`  📚 ${PATHS.runHistory}`);
  console.log(`  📈 ${PATHS.trends}`);
  console.log('──────────────────────────────────\n');
}

main();
