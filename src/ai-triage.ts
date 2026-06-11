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
import { AiTriageRepository } from './storage/repositories/AiTriageRepository'
import { aiCall }             from './ai/AiClient'

dotenv.config();

// ── Types ────────────────────────────────────────────────────

type RCAVerdict = 'Flaky' | 'Environment' | 'Bug' | 'Unknown';
type Priority   = 'P0' | 'P1' | 'P2' | 'Unknown';
type Confidence = 'High' | 'Medium' | 'Low';

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
  verdict:         RCAVerdict;
  confidence:      Confidence;
  reasoning:       string;
  suggestedAction: string;
  test:            FailedTest;
}

interface TriageReport {
  runTimestamp: string;
  totalTests:   number;
  totalFailed:  number;
  summary: { Flaky: number; Environment: number; Bug: number; Unknown: number };
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
    summary: { Flaky: 0, Environment: 0, Bug: 0, Unknown: 0 },
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
  const runId = `${new Date().toISOString().slice(0,19).replace('T','-')}-triage`
  for (const r of results) {
    try {
      await triageRepo.insert({
        run_id:            runId,
        test_id:           `${r.test.file}::${r.test.testTitle}::${r.test.browserName}`,
        failure_category:  r.verdict,
        confidence:        r.confidence.toLowerCase() as any,
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

const SYSTEM_PROMPT = `You are a senior QA automation engineer performing Root Cause Analysis on failing Playwright tests against SauceDemo (https://www.saucedemo.com).

Framework: Playwright 1.49+ · TypeScript · Page Object Model · Self-healing selectors
Browsers: Chromium and WebKit. Retries: 1 (local), 2 (CI).

Known patterns in this suite:
- performance_glitch_user and problem_user tests are inherently slow/unstable
- Tests tagged @slow or @flaky are expected to be intermittent
- Timeout errors on saucedemo.com are usually Flaky or Environment, not Bug

Classify each failure into EXACTLY ONE category:

FLAKY       — Intermittent. App is fine, test is unstable.
              Signs: timeout, animation delay, @slow/@flaky tag, performance_glitch_user.

ENVIRONMENT — Config or infra problem.
              Signs: network failure, missing env var, browser launch error, stale element.

BUG         — Genuine app defect. Test correctly asserts behaviour app fails to deliver.

Respond ONLY in this exact JSON (no markdown, no preamble):
{
  "verdict": "Flaky" | "Environment" | "Bug",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "One clear sentence.",
  "suggestedAction": "One concrete next step."
}`;

// ── Claude RCA call ───────────────────────────────────────────

async function triageWithClaude(test: FailedTest): Promise<TriageResult> {
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
      appName:   'saucedemo',
      system:    SYSTEM_PROMPT,
      messages:  [{ role: 'user', content: prompt }],
      maxTokens: 256,
    })

    const content = aiResp.content
    return parseResponse(content, test);

  } catch (err) {
    console.warn(`  ⚠️  Claude API error for "${test.testTitle}": ${err}`);
    return {
      verdict: 'Unknown', confidence: 'Low',
      reasoning: 'API call failed — manual review required.',
      suggestedAction: 'Check ANTHROPIC_API_KEY and retry.',
      test,
    };
  }
}

function parseResponse(content: string, test: FailedTest): TriageResult {
  try {
    const clean  = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const valid: RCAVerdict[] = ['Flaky', 'Environment', 'Bug'];
    return {
      verdict:         valid.includes(parsed.verdict) ? parsed.verdict : 'Unknown',
      confidence:      parsed.confidence      ?? 'Medium',
      reasoning:       parsed.reasoning       ?? 'No reasoning provided.',
      suggestedAction: parsed.suggestedAction ?? 'Review manually.',
      test,
    };
  } catch {
    return {
      verdict: 'Unknown', confidence: 'Low',
      reasoning: `Parse error: ${content.slice(0, 80)}`,
      suggestedAction: 'Review manually.',
      test,
    };
  }
}

// ── Build report ──────────────────────────────────────────────

function buildReport(pw: PWReport, results: TriageResult[]): TriageReport {
  const summary = { Flaky: 0, Environment: 0, Bug: 0, Unknown: 0 };
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
    `| 🐛 Bug | ${summary.Bug} | File ticket / fix code |`,
    `| 🔴 Environment | ${summary.Environment} | Fix config / infra |`,
    `| 🟡 Flaky | ${summary.Flaky} | Add retry or ignore |`,
    `| ❓ Unknown | ${summary.Unknown} | Manual review |`,
    '', '---', '', '## Findings', '',
  ];

  const groups: Record<RCAVerdict, TriageResult[]> = { Bug: [], Environment: [], Flaky: [], Unknown: [] };
  for (const r of results) groups[r.verdict].push(r);

  for (const verdict of ['Bug', 'Environment', 'Flaky', 'Unknown'] as RCAVerdict[]) {
    const group = groups[verdict];
    if (!group.length) continue;
    lines.push(`### ${verdictIcon(verdict)} ${verdict} (${group.length})`, '');
    for (const r of group) {
      lines.push(
        `#### \`${r.test.testTitle}\``,
        `- **Priority:** ${r.test.priority} · **Browser:** ${r.test.browserName}`,
        `- **Suite:** ${r.test.suiteName}`,
        `- **Confidence:** ${r.confidence}`,
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
  console.log(`  🐛 Bug:         ${summary.Bug}`);
  console.log(`  🔴 Environment: ${summary.Environment}`);
  console.log(`  🟡 Flaky:       ${summary.Flaky}`);
  console.log(`  ❓ Unknown:     ${summary.Unknown}`);
  console.log('──────────────────────────────');
  console.log(`  📄 ${CONFIG.outputJson}`);
  console.log(`  📝 ${CONFIG.outputMd}`);
  console.log('──────────────────────────────\n');
}

function verdictIcon(v: RCAVerdict) {
  return { Bug: '🐛', Environment: '🔴', Flaky: '🟡', Unknown: '❓' }[v] ?? '❓';
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(err => { console.error('\n\u274c Fatal:', err); process.exit(1); });
