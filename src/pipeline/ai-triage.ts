/**
 * ai-triage.ts
 * ─────────────────────────────────────────────────────────────
 * Step 1 — AI Triage / RCA
 * Personal AI-Augmented Testing Framework
 *
 * Reads:   reports/test-results.json  (Playwright JSON reporter)
 * Writes:  reports/triage-report.json
 *          reports/triage-report.md
 *
 * Run:
 *   npm run triage
 *   npm run triage:verbose
 * ─────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { AiTriageRepository } from '../core/storage/repositories/AiTriageRepository'
import { aiCall }             from '../core/ai/AiClient'
import { getAppName, getBaseUrl } from '../core/config/appConfig'
import { TriageCategory, TRIAGE_CATEGORIES, ALL_TRIAGE_CATEGORIES, TRIAGE_DISPLAY } from '../core/triage/taxonomy'
import { makeResultKey } from '../core/identity/resultKey'

dotenv.config();

// ── Unknown-rate gate config (TD-053) ─────────────────────────
// An all-Unknown run almost always means the AI/API layer failed (connection
// drops), not that the failures are genuinely unclassifiable — fail the step
// instead of exiting clean. Only the API-failure Unknown subtype counts.
const UNKNOWN_RATE_THRESHOLD = 0.80;
const UNKNOWN_FLOOR          = 5;

// ── Types ────────────────────────────────────────────────────

type RCAVerdict = TriageCategory;
type Priority   = 'P0' | 'P1' | 'P2' | 'Unknown';
type Confidence = 'High' | 'Medium' | 'Low';
// TD-066 — provenance of `confidence`, so a fallback value is not surfaced as if
// the model produced it. 'model' = the model returned a confidence; 'fallback' =
// we supplied a default (model omitted it, or an API/parse error path).
// Room to extend later (e.g. 'heuristic' | 'user') — not wired now.
type ConfidenceSource = 'model' | 'fallback';

interface FailedTest {
  suiteName:     string;
  priority:      Priority;
  testTitle:     string;
  errorMessage:  string;
  errorStack:    string;
  duration:      number;
  retries:       number;
  isTaggedFlaky: boolean;
  isTaggedSlow:  boolean;
  browserName:   string;
  file:          string;
}

interface TriageResult {
  verdict:          RCAVerdict;
  confidence:       Confidence;
  confidenceSource: ConfidenceSource;
  evidence:         string;
  reasoning:        string;
  suggestedAction:  string;
  test:             FailedTest;
}

interface TriageReport {
  runTimestamp: string;
  totalTests:   number;
  totalFailed:  number;
  summary: Record<TriageCategory, number>;
  results:      TriageResult[];
}

// ── Playwright JSON types (actual reporter format) ────────────
// Structure: suite → spec → tests[] (one per browser/project)
// title & ok live on SPEC, projectName lives on TEST

interface PWResult {
  status:   string;
  duration: number;
  retry:    number;
  error?:   { message: string; stack?: string };
}

interface PWTest {
  projectName: string;
  status:      string;
  results:     PWResult[];
  annotations?: { type: string; description?: string }[];
}

interface PWSpec {
  title: string;
  file:  string;
  ok:    boolean;
  tests: PWTest[];
}

interface PWSuite {
  title:   string;
  file?:   string;
  suites?: PWSuite[];
  specs?:  PWSpec[];
}

interface PWReport {
  stats:  {
    total?: number;
    expected?: number;
    unexpected: number;
    flaky?: number;
    skipped?: number;
  };
  suites: PWSuite[];
}

// ── Config ───────────────────────────────────────────────────

const CONFIG = {
  inputPath:  'reports/test-results.json',
  outputJson: 'reports/triage-report.json',
  outputMd:   'reports/triage-report.md',
  model:      'claude-sonnet-4-5' as const,
  verbose:    process.argv.includes('--verbose'),
};


// ── Entry point ───────────────────────────────────────────────

async function main() {
  console.log('\n🔍 AI Triage — RCA Analysis starting...\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found. Add it to your .env file.\n');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.inputPath)) {
    console.error(`❌ No test results at: ${CONFIG.inputPath}`);
    console.error('   Run your tests first:  npm test\n');
    process.exit(1);
  }

  const report: PWReport = JSON.parse(fs.readFileSync(CONFIG.inputPath, 'utf-8'));
  const failedTests = extractFailedTests(report);

if (failedTests.length === 0) {
  console.log('✅ All tests passed — nothing to triage!\n');
  const emptyReport = {
    runTimestamp: new Date().toISOString(),
    totalTests: report.stats.total ?? report.stats.expected ?? 0,
    totalFailed: 0,
    summary: emptySummary(),
    results: []
  };
   fs.writeFileSync('reports/triage-report.json',
    JSON.stringify(emptyReport, null, 2), 'utf-8');
  process.exit(0);
}

  console.log(`📋 ${failedTests.length} failure(s) found. Sending to Claude for RCA...\n`);

  const results: TriageResult[] = [];

  for (let i = 0; i < failedTests.length; i++) {
    const test = failedTests[i];
    const pIcon = test.priority === 'P0' ? '🔴' : test.priority === 'P1' ? '🟡' : '🟢';
    console.log(`  [${i + 1}/${failedTests.length}] ${pIcon} ${test.priority} · ${test.testTitle} (${test.browserName})`);

    const result = await triageWithClaude(test);
    results.push(result);

    console.log(`         → ${verdictIcon(result.verdict)} ${result.verdict} (${result.confidence} confidence)`);
    if (CONFIG.verbose) {
      console.log(`         → ${result.reasoning}`);
      console.log(`         → Action: ${result.suggestedAction}\n`);
    }

    if (i < failedTests.length - 1) await sleep(400);
  }

  const triageReport = buildReport(report, results);
  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(triageReport, null, 2), 'utf-8');
  fs.writeFileSync(CONFIG.outputMd,   buildMarkdown(triageReport),             'utf-8');

  // Parallel DB write
  const triageRepo = new AiTriageRepository()
  // TD-070 step 2: consume the canonical run id established once at run-start
  // (src/run.ts) or carried by the CI ai-pipeline job env. Never mint a synthetic
  // id — that re-forks the non-joinable run_id TD-069 describes.
  const runId = process.env.CURRENT_RUN_ID;
  if (!runId) {
    throw new Error(
      'ai-triage: CURRENT_RUN_ID is not set. The canonical run id must be established ' +
      'at run-start (src/run.ts) or carried by the CI ai-pipeline job env. ' +
      'Refusing to mint a synthetic id (TD-070).',
    );
  }
  for (const r of results) {
    try {
      await triageRepo.insert({
        run_id:            runId,
        test_id:           makeResultKey(r.test.file, r.test.testTitle, r.test.browserName),
        failure_category:  r.verdict,
        confidence:        r.confidence.toLowerCase() as any,
        confidence_source: r.confidenceSource,
        root_cause:        r.reasoning,
        suggested_fix:     r.suggestedAction,
        similar_failures:  '',
        triage_model:      '',
        tokens_used:       0,
        triaged_at:        new Date().toISOString(),
      })
    } catch { /* non-fatal */ }
  }

  printSummary(triageReport);

  // ── Unknown-rate gate (TD-053) ───────────────────────────────
  // Fires only on the API-failure Unknown subtype (reasoning set by the aiCall
  // catch in triageWithClaude), never on genuinely-unclassifiable Unknowns.
  const apiFailureUnknowns = results.filter(
    r => r.verdict === TRIAGE_CATEGORIES.INSUFFICIENT_EVIDENCE && /API call failed/i.test(r.reasoning)
  ).length;
  const totalTriaged = results.length;
  const unknownRate  = totalTriaged > 0 ? apiFailureUnknowns / totalTriaged : 0;

  if (totalTriaged >= UNKNOWN_FLOOR && unknownRate >= UNKNOWN_RATE_THRESHOLD) {
    console.error(
      `\n❌ AI Triage failed: ${apiFailureUnknowns}/${totalTriaged} verdicts ` +
      `(${(unknownRate * 100).toFixed(0)}%) are API-failure Unknowns — at or above the ` +
      `${(UNKNOWN_RATE_THRESHOLD * 100).toFixed(0)}% threshold (floor ${UNKNOWN_FLOOR}). ` +
      `This indicates an AI/API connection failure, not real triage. Failing the step.\n`
    );
    process.exit(1);
  }
}

// ── Extract failed tests ──────────────────────────────────────

function extractFailedTests(report: PWReport): FailedTest[] {
  const failed: FailedTest[] = [];

  function walkSuite(suite: PWSuite, suitePath: string[] = []) {
    const current = suite.title ? [...suitePath, suite.title] : suitePath;

    // Process specs at this level
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.ok) continue; // all browsers passed — skip

        const suiteStr = current.join(' > ');
        const priority = detectPriority(suiteStr);
        const titleLower = (spec.title ?? '').toLowerCase();
        const isTaggedFlaky = titleLower.includes('@flaky') || titleLower.includes('flaky');
        const isTaggedSlow  = titleLower.includes('@slow')  || titleLower.includes('slow');

        // Each entry in spec.tests is one browser/project run
        for (const test of spec.tests) {
          const lastResult = test.results?.[test.results.length - 1];
          if (!lastResult) continue;
          if (lastResult.status === 'expected' || lastResult.status === 'skipped') continue;

          failed.push({
            suiteName:     suiteStr || 'Root',
            priority,
            testTitle:     spec.title,
            errorMessage:  lastResult.error?.message ?? 'No error captured',
            errorStack:    lastResult.error?.stack   ?? '',
            duration:      lastResult.duration       ?? 0,
            retries:       (test.results?.length ?? 1) - 1,
            isTaggedFlaky,
            isTaggedSlow,
            browserName:   test.projectName          ?? 'unknown',
            file:          spec.file,
          });
        }
      }
    }

    // Recurse into nested suites
    if (suite.suites) {
      for (const child of suite.suites) walkSuite(child, current);
    }
  }

  for (const suite of report.suites) walkSuite(suite);
  return failed;
}

function detectPriority(s: string): Priority {
  if (s.includes('P0')) return 'P0';
  if (s.includes('P1')) return 'P1';
  if (s.includes('P2')) return 'P2';
  return 'Unknown';
}

// ── RCA system prompt ─────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior QA automation engineer performing Root Cause Analysis on failing Playwright tests against ${getAppName()} (${getBaseUrl()}).

Framework: Playwright 1.49+ · TypeScript · Page Object Model · Self-healing selectors
Browsers: Chromium and WebKit. Retries: 1 (local), 2 (CI).

Known patterns in this suite:
- performance_glitch_user and problem_user tests are inherently slow/unstable
- Tests tagged @slow or @flaky are expected to be intermittent
- Timeout errors on ${getBaseUrl()} are usually flaky or infra-defect, not app-bug

Classify each failure into EXACTLY ONE category:

app-bug       — A genuine defect in the application under test. Classify app-bug ONLY when there is
                POSITIVE evidence of an app defect: an HTTP 5xx, an application error banner/UI, OR a
                business assertion that fails while selectors and infrastructure are verified healthy.
                If you cannot positively evidence an app defect, do NOT guess app-bug.
test-defect   — The test/spec itself is wrong: non-unique selector causing strict-mode violation,
                an assertion that contradicts the app's actual correct behavior, a wrong URL/flow
                expectation, or a bad/invalid locator in the generated test.
infra-defect  — Pipeline/environment/page-load failure, not the app and not the test: network failure,
                missing env var, browser launch error, page failed to load.
flaky         — Intermittent; app and test are fine, timing/animation/@slow/@flaky/performance_glitch_user.
insufficient-evidence — The evidence does not allow a confident classification. This is an honest,
                acceptable answer — prefer it over guessing.

Respond ONLY in this exact JSON (no markdown, no preamble):
{
  "verdict": "app-bug" | "test-defect" | "infra-defect" | "flaky" | "insufficient-evidence",
  "confidence": "High" | "Medium" | "Low",
  "evidence": "What specifically supports this verdict (required, especially for app-bug).",
  "reasoning": "One clear sentence.",
  "suggestedAction": "One concrete next step."
}`;

// ── Claude RCA call ───────────────────────────────────────────

export async function triageWithClaude(test: FailedTest): Promise<TriageResult> {
  const tags = [
    test.isTaggedFlaky ? '@flaky' : null,
    test.isTaggedSlow  ? '@slow'  : null,
  ].filter(Boolean).join(', ') || 'none';

  const stack = test.errorStack
    ? test.errorStack.split('\n').slice(0, 6).join('\n')
    : 'Not available';

  const prompt = `Analyze this Playwright test failure:

Suite:    ${test.suiteName}
Priority: ${test.priority}
Title:    ${test.testTitle}
File:     ${test.file}
Browser:  ${test.browserName}
Duration: ${test.duration}ms
Retries:  ${test.retries}
Tags:     ${tags}

Error:
${test.errorMessage}

Stack (first 6 lines):
${stack}

Classify this failure.`;

  try {
    const aiResp = await aiCall({
      operation: 'triage',
      appName:   getAppName(),
      system:    SYSTEM_PROMPT,
      messages:  [{ role: 'user', content: prompt }],
      maxTokens: 600,
    })

    const content = aiResp.content
    return parseResponse(content, test);

  } catch (err) {
    console.warn(`  ⚠️  Claude API error for "${test.testTitle}": ${err}`);
    return {
      verdict: TRIAGE_CATEGORIES.INSUFFICIENT_EVIDENCE, confidence: 'Low',
      confidenceSource: 'fallback',   // TD-066: 'Low' is honest, but the source is not the model
      evidence: '',
      reasoning: 'API call failed — manual review required.',
      suggestedAction: 'Check ANTHROPIC_API_KEY and retry.',
      test,
    };
  }
}

// Exported for the TD-066 proof test (scripts/verify-td066.test.ts) — the pure
// parse/confidence-source logic is the unit under test; no behavior change.
export function parseResponse(content: string, test: FailedTest): TriageResult {
  try {
    const clean  = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    let verdict: RCAVerdict = ALL_TRIAGE_CATEGORIES.includes(parsed.verdict)
      ? parsed.verdict
      : TRIAGE_CATEGORIES.INSUFFICIENT_EVIDENCE;
    const evidence  = typeof parsed.evidence === 'string' ? parsed.evidence : '';
    let   reasoning = parsed.reasoning ?? 'No reasoning provided.';

    // CODE INVARIANT (TD-063 evidence gate): app-bug requires positive evidence.
    // The AI supplies judgment; this code enforces the evidence requirement, so an
    // evidence-free app-bug is downgraded rather than reported as a real bug.
    if (verdict === TRIAGE_CATEGORIES.APP_BUG && evidence.trim() === '') {
      console.warn(`  ⚠️  [evidence-gate] "${test.testTitle}": app-bug downgraded to insufficient-evidence (no positive evidence supplied)`);
      verdict = TRIAGE_CATEGORIES.INSUFFICIENT_EVIDENCE;
      reasoning += ' [evidence-gate: app-bug downgraded — no positive evidence supplied]';
    }

    // TD-066: track whether the confidence came from the model or a default.
    // `??` falls back on null/undefined, so mirror that exactly for the source.
    const hasModelConfidence = parsed.confidence !== undefined && parsed.confidence !== null;
    return {
      verdict,
      confidence:       hasModelConfidence ? parsed.confidence : 'Medium',
      confidenceSource: hasModelConfidence ? 'model' : 'fallback',
      evidence,
      reasoning,
      suggestedAction: parsed.suggestedAction ?? 'Review manually.',
      test,
    };
  } catch {
    return {
      verdict: TRIAGE_CATEGORIES.INSUFFICIENT_EVIDENCE, confidence: 'Low',
      confidenceSource: 'fallback',   // TD-066: parse failed — default, not model-derived
      evidence: '',
      reasoning: `Parse error: ${content.slice(0, 80)}`,
      suggestedAction: 'Review manually.',
      test,
    };
  }
}

// ── Build report ──────────────────────────────────────────────

function emptySummary(): Record<TriageCategory, number> {
  return ALL_TRIAGE_CATEGORIES.reduce(
    (acc, c) => { acc[c] = 0; return acc; },
    {} as Record<TriageCategory, number>,
  );
}

function buildReport(pw: PWReport, results: TriageResult[]): TriageReport {
  const summary = emptySummary();
  for (const r of results) summary[r.verdict]++;
  return {
    runTimestamp: new Date().toISOString(),
    totalTests:   pw.stats.total ?? ((pw.stats.expected ?? 0) + pw.stats.unexpected + (pw.stats.flaky ?? 0) + (pw.stats.skipped ?? 0)),
    totalFailed:  results.length,
    summary,
    results,
  };
}

function buildMarkdown(report: TriageReport): string {
  const { summary, results, runTimestamp, totalTests, totalFailed } = report;
  const lines = [
    '# AI Triage Report',
    '',
    `**Run:** ${new Date(runTimestamp).toLocaleString()}  `,
    `**Tests:** ${totalTests} total · ${totalFailed} failed`,
    '',
    '## Summary',
    '',
    '| Classification | Count | Action |',
    '|---|---|---|',
    ...ALL_TRIAGE_CATEGORIES.map(
      c => `| ${TRIAGE_DISPLAY[c].icon} ${c} | ${summary[c]} | ${TRIAGE_DISPLAY[c].action} |`,
    ),
    '', '---', '', '## Findings', '',
  ];

  const groups = ALL_TRIAGE_CATEGORIES.reduce(
    (acc, c) => { acc[c] = []; return acc; },
    {} as Record<TriageCategory, TriageResult[]>,
  );
  for (const r of results) groups[r.verdict].push(r);

  for (const verdict of ALL_TRIAGE_CATEGORIES) {
    const group = groups[verdict];
    if (!group.length) continue;
    lines.push(`### ${TRIAGE_DISPLAY[verdict].icon} ${verdict} (${group.length})`, '');
    for (const r of group) {
      lines.push(
        `#### \`${r.test.testTitle}\``,
        `- **Priority:** ${r.test.priority} · **Browser:** ${r.test.browserName}`,
        `- **Suite:** ${r.test.suiteName}`,
        `- **Confidence:** ${r.confidence}${r.confidenceSource === 'fallback' ? ' (unstated by model)' : ''}`,
        `- **Evidence:** ${r.evidence || '—'}`,
        `- **Reasoning:** ${r.reasoning}`,
        `- **Action:** ${r.suggestedAction}`,
        `- **Error:** \`${r.test.errorMessage.slice(0, 120)}\``,
        '',
      );
    }
  }
  return lines.join('\n');
}

function printSummary(report: TriageReport) {
  const { summary } = report;
  console.log('\n──────────────────────────────');
  console.log('  AI TRIAGE COMPLETE');
  console.log('──────────────────────────────');
  for (const c of ALL_TRIAGE_CATEGORIES) {
    console.log(`  ${TRIAGE_DISPLAY[c].icon} ${(c + ':').padEnd(23)} ${summary[c]}`);
  }
  console.log('──────────────────────────────');
  console.log(`  📄 ${CONFIG.outputJson}`);
  console.log(`  📝 ${CONFIG.outputMd}`);
  console.log('──────────────────────────────\n');
}

function verdictIcon(v: RCAVerdict) {
  return TRIAGE_DISPLAY[v]?.icon ?? '❓';
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Only auto-run the pipeline when invoked directly (npm run triage / tsx CLI / CI).
// Guard added (TD-063 promotion verification) so the module can be imported by the
// eval harness without triggering a full triage run. Behavior-preserving for every
// real invocation \u2014 require.main === module is true when run directly.
if (require.main === module) {
  main().catch(err => { console.error('\n\u274c Fatal:', err); process.exit(1); });
}
