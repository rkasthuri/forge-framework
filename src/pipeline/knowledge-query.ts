/**
 * knowledge-query.ts
 * ─────────────────────────────────────────────────────────────
 * Step 7 — Knowledge Base + Natural Language Query
 * Personal AI-Augmented Testing Framework
 *
 * Builds a structured knowledge index from your run history
 * and lets you query it in plain English.
 *
 * Usage:
 *   npx tsx src/knowledge-query.ts                          ← interactive REPL
 *   npx tsx src/knowledge-query.ts --q "which tests failed most?"
 *   npx tsx src/knowledge-query.ts --rebuild               ← force index rebuild
 *
 * Examples:
 *   "Which tests failed most in the last 7 days?"
 *   "What is our webkit failure rate?"
 *   "Show me all Bug verdicts"
 *   "What was the worst run?"
 *   "How has our pass rate trended?"
 *   "Which suite has the most failures?"
 *   "What should I fix first?"
 * ─────────────────────────────────────────────────────────────
 */

import * as fs        from 'fs';
import * as readline  from 'readline';
import * as dotenv    from 'dotenv';
import { RunRepository }   from '../core/storage/repositories/RunRepository'
import { TrendRepository } from '../core/storage/repositories/TrendRepository'
import { aiCall }          from '../core/ai/AiClient'
import { getAppName, getBaseUrl } from '../core/config/appConfig'

dotenv.config();

// ── Types ────────────────────────────────────────────────────

interface RunFailure {
  testTitle: string; file: string; browser: string;
  priority: string; verdict: string; confidence: string;
  reasoning: string; suggestedAction: string; errorMessage: string;
}
interface FlakyTest {
  testTitle: string; file: string; browser: string;
  retries: number; durationMs: number;
}
interface RunStats {
  total: number; passed: number; failed: number;
  flaky: number; skipped: number; passRate: string;
}
interface RunRecord {
  runId: string; timestamp: string; durationMs: number;
  stats: RunStats; failures: RunFailure[]; flakyTests: FlakyTest[];
}
interface TrendEntry {
  testTitle: string; file: string; totalRuns: number;
  failureCount: number; flakyCount: number;
  lastVerdict: string; consecutiveFails: number; riskLevel: string;
}
interface RunHistory { runs: RunRecord[] }
interface TrendStore { totalRuns: number; tests: Record<string, TrendEntry> }

// Knowledge index — structured summary Claude queries against
interface KnowledgeIndex {
  built:          string;
  totalRuns:      number;
  dateRange:      { first: string; last: string };
  overallStats: {
    avgPassRate:        string;
    bestRun:            { id: string; passRate: string };
    worstRun:           { id: string; passRate: string; failures: number };
    currentStreak:      number;
    totalFailureEvents: number;
    totalFlakyEvents:   number;
    avgDurationSec:     number;
    fastestRunSec:      number;
    slowestRunSec:      number;
  };
  verdictBreakdown: Record<string, number>;
  browserStats: {
    chromium: { failures: number; flaky: number };
    webkit:   { failures: number; flaky: number };
    other:    { failures: number; flaky: number };
  };
  suiteStats:   Record<string, { failures: number; flaky: number; tests: string[] }>;
  topFailures:  { testTitle: string; file: string; browser: string;
                  totalFails: number; verdict: string; riskLevel: string;
                  suggestedAction: string }[];
  recentFailures: RunFailure[];
  allFailurePatterns: {
    testTitle: string; file: string; browser: string;
    verdict: string; reasoning: string; suggestedAction: string;
    runsAffected: number;
  }[];
  runTimeline: {
    runId: string; timestamp: string; passRate: string;
    failed: number; flaky: number; durationSec: number;
    verdicts: string[];
  }[];
}

// ── Config ───────────────────────────────────────────────────

const CONFIG = {
  runHistory:  'reports/run-history.json',
  trends:      'reports/trends.json',
  indexPath:   'reports/knowledge-index.json',
  model:       'claude-sonnet-4-5' as const,
  rebuild:     process.argv.includes('--rebuild'),
  question:    getArg('--q'),
};


// ── Entry point ───────────────────────────────────────────────

async function main() {
  console.log('\n🧠 Knowledge Base — NL Query Interface\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set.\n'); process.exit(1);
  }
  const runRepo = new RunRepository()
  const dbRuns  = await runRepo.findByApp(getAppName(), 1)
  if (!dbRuns.length && !fs.existsSync(CONFIG.runHistory)) {
    console.error('❌ No run history found. Run npm run test:all first.\n'); process.exit(1);
  }

  // Build or load index
  const index = await buildOrLoadIndex();

  console.log(`  📚 Knowledge base ready:`);
  console.log(`     ${index.totalRuns} runs indexed`);
  console.log(`     ${index.topFailures.length} unique failure patterns`);
  console.log(`     Date range: ${new Date(index.dateRange.first).toLocaleDateString()} → ${new Date(index.dateRange.last).toLocaleDateString()}`);
  console.log('');

  // Single question mode
  if (CONFIG.question) {
    await answerQuestion(index, CONFIG.question);
    return;
  }

  // Interactive REPL mode
  console.log('  Ask anything about your test suite in plain English.');
  console.log('  Type "exit" to quit, "examples" to see sample questions.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question('  ❓ Your question: ', async (input) => {
      const q = input.trim();

      if (!q) { ask(); return; }
      if (q.toLowerCase() === 'exit') {
        console.log('\n  Goodbye!\n'); rl.close(); return;
      }
      if (q.toLowerCase() === 'examples') {
        printExamples(); ask(); return;
      }
      if (q.toLowerCase() === 'rebuild') {
        await buildIndex(); console.log('  ✅ Index rebuilt.\n'); ask(); return;
      }

      await answerQuestion(index, q);
      ask();
    });
  };
  ask();
}

// ── Build or load index ───────────────────────────────────────

async function buildOrLoadIndex(): Promise<KnowledgeIndex> {
  const historyMtime = fs.statSync(CONFIG.runHistory).mtimeMs;
  const indexExists  = fs.existsSync(CONFIG.indexPath);

  if (!CONFIG.rebuild && indexExists) {
    const indexMtime = fs.statSync(CONFIG.indexPath).mtimeMs;
    if (indexMtime >= historyMtime) {
      console.log('  📖 Loading existing knowledge index...\n');
      return JSON.parse(fs.readFileSync(CONFIG.indexPath, 'utf-8'));
    }
  }

  console.log('  🔨 Building knowledge index from run history...');
  const index = await buildIndex();
  console.log('  ✅ Index built and cached.\n');
  return index;
}

async function buildIndex(): Promise<KnowledgeIndex> {
  const runRepo2   = new RunRepository()
  const dbRuns2    = await runRepo2.findByApp(getAppName(), 100)
  const history = { created: new Date().toISOString(), runs: dbRuns2 as any } as any as RunHistory
  const trends: TrendStore  = { totalRuns: dbRuns2.length, tests: {}, lastUpdated: new Date().toISOString() } as any

  const runs = history.runs as any[]
  if (!runs.length) throw new Error('No runs in database');

  // Overall stats
  const rates       = runs.map(r => parseFloat(r.stats.passRate));
  const avgRate     = (rates.reduce((a,b) => a+b,0) / rates.length).toFixed(1) + '%';
  const bestRun     = runs.reduce((a,b) => parseFloat(a.stats.passRate) >= parseFloat(b.stats.passRate) ? a : b);
  const worstRun    = runs.reduce((a,b) => a.stats.failed >= b.stats.failed ? a : b);
  const avgDur      = Math.round(runs.reduce((s,r) => s + r.durationMs, 0) / runs.length / 1000);
  const fastestRun  = Math.round(Math.min(...runs.map(r => r.durationMs)) / 1000);
  const slowestRun  = Math.round(Math.max(...runs.map(r => r.durationMs)) / 1000);

  let streak = 0;
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].stats.failed === 0 && runs[i].stats.flaky === 0) streak++;
    else break;
  }

  const allFailures   = runs.flatMap(r => r.failures);
  const allFlakyTests = runs.flatMap(r => r.flakyTests);

  // Verdict breakdown
  const verdictBreakdown: Record<string,number> = {};
  allFailures.forEach(f => {
    verdictBreakdown[f.verdict] = (verdictBreakdown[f.verdict] ?? 0) + 1;
  });

  // Browser stats
  const browserStats = { chromium:{failures:0,flaky:0}, webkit:{failures:0,flaky:0}, other:{failures:0,flaky:0} };
  allFailures.forEach(f => {
    const b = f.browser === 'chromium' ? 'chromium' : f.browser === 'webkit' ? 'webkit' : 'other';
    browserStats[b].failures++;
  });
  allFlakyTests.forEach(f => {
    const b = f.browser === 'chromium' ? 'chromium' : f.browser === 'webkit' ? 'webkit' : 'other';
    browserStats[b].flaky++;
  });

  // Suite stats
  const suiteStats: Record<string,{failures:number;flaky:number;tests:string[]}> = {};
  allFailures.forEach(f => {
    const suite = f.file || 'unknown';
    if (!suiteStats[suite]) suiteStats[suite] = { failures:0, flaky:0, tests:[] };
    suiteStats[suite].failures++;
    if (!suiteStats[suite].tests.includes(f.testTitle)) {
      suiteStats[suite].tests.push(f.testTitle);
    }
  });
  allFlakyTests.forEach(f => {
    const suite = f.file || 'unknown';
    if (!suiteStats[suite]) suiteStats[suite] = { failures:0, flaky:0, tests:[] };
    suiteStats[suite].flaky++;
  });

  // Top failures — deduplicated by test+browser
  const failMap: Record<string, {
    testTitle:string; file:string; browser:string; totalFails:number;
    verdict:string; riskLevel:string; suggestedAction:string;
  }> = {};
  allFailures.forEach(f => {
    const key = `${f.testTitle}::${f.browser}`;
    if (!failMap[key]) {
      const trendKey = Object.keys(trends.tests).find(k => k.includes(f.testTitle) && k.includes(f.browser));
      const risk = trendKey ? trends.tests[trendKey].riskLevel : 'Unknown';
      failMap[key] = { testTitle:f.testTitle, file:f.file, browser:f.browser,
        totalFails:0, verdict:f.verdict, riskLevel:risk, suggestedAction:f.suggestedAction };
    }
    failMap[key].totalFails++;
  });
  const topFailures = Object.values(failMap)
    .sort((a,b) => b.totalFails - a.totalFails)
    .slice(0, 15);

  // Recent failures (last 3 runs)
  const recentFailures = runs.slice(-3).flatMap(r => r.failures);

  // All unique failure patterns with reasoning
  const patternMap: Record<string,{
    testTitle:string; file:string; browser:string; verdict:string;
    reasoning:string; suggestedAction:string; runsAffected:number;
  }> = {};
  allFailures.forEach(f => {
    const key = `${f.testTitle}::${f.browser}::${f.verdict}`;
    if (!patternMap[key]) {
      patternMap[key] = { testTitle:f.testTitle, file:f.file, browser:f.browser,
        verdict:f.verdict, reasoning:f.reasoning, suggestedAction:f.suggestedAction, runsAffected:0 };
    }
    patternMap[key].runsAffected++;
  });

  // Run timeline
  const runTimeline = runs.map(r => ({
    runId:       r.runId,
    timestamp:   r.timestamp,
    passRate:    r.stats.passRate,
    failed:      r.stats.failed,
    flaky:       r.stats.flaky,
    durationSec: Math.round(r.durationMs / 1000),
    verdicts:    [...new Set(r.failures.map((f: any) => f.verdict as string))] as string[],
  }));

  const index: KnowledgeIndex = {
    built:    new Date().toISOString(),
    totalRuns: runs.length,
    dateRange: {
      first: runs[0].timestamp,
      last:  runs[runs.length-1].timestamp,
    },
    overallStats: {
      avgPassRate:        avgRate,
      bestRun:            { id: bestRun.runId, passRate: bestRun.stats.passRate },
      worstRun:           { id: worstRun.runId, passRate: worstRun.stats.passRate, failures: worstRun.stats.failed },
      currentStreak:      streak,
      totalFailureEvents: allFailures.length,
      totalFlakyEvents:   allFlakyTests.length,
      avgDurationSec:     avgDur,
      fastestRunSec:      fastestRun,
      slowestRunSec:      slowestRun,
    },
    verdictBreakdown,
    browserStats,
    suiteStats,
    topFailures,
    recentFailures,
    allFailurePatterns: Object.values(patternMap),
    runTimeline,
  };

  fs.writeFileSync(CONFIG.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

// ── Answer a question ─────────────────────────────────────────

async function answerQuestion(index: KnowledgeIndex, question: string) {
  process.stdout.write('\n  🤖 Thinking...');

  try {
    const aiResp = await aiCall({
      operation: 'knowledge-qa',
      appName:   getAppName(),
      system:    buildSystemPrompt(),
      messages:  [{
        role:    'user',
        content: `Knowledge base:\n${JSON.stringify(index, null, 1)}\n\nQuestion: ${question}`,
      }],
      maxTokens: 512,
    })

    const answer = aiResp.content
    process.stdout.write('\r' + ' '.repeat(20) + '\r');
    console.log('\n  ' + answer.split('\n').join('\n  '));
    console.log('');

  } catch (err) {
    process.stdout.write('\r');
    console.error(`\n  ❌ Error: ${err}\n`);
  }
}

// ── System prompt ─────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a QA intelligence assistant for a Playwright E2E testing framework running against ${getAppName()} (${getBaseUrl()}).

You have access to a structured knowledge index of all test runs, failures, trends, and RCA data.

Rules:
- Answer in plain English — no markdown headers, no bullet points unless listing items
- Be specific: use real test IDs (TC007, TC036), real numbers, real dates from the data
- For "which tests" questions, name them specifically
- For "why" questions, use the reasoning field from RCA data
- For "what should I fix" questions, prioritize by riskLevel then failureCount
- Keep answers concise — 3-6 sentences max unless a list is genuinely needed
- If a question can't be answered from the data, say so clearly
- Never make up data not in the knowledge base`;
}

// ── Print examples ────────────────────────────────────────────

function printExamples() {
  const examples = [
    'Which tests failed the most?',
    'What is our webkit failure rate?',
    'Show me all Bug verdicts',
    'What was the worst run and why?',
    'How has our pass rate trended over time?',
    'Which suite has the most failures?',
    'What should I fix first?',
    'How much faster are we running now vs when we started?',
    'Are there any tests that have never passed?',
    'What is the most common error message?',
    'Which tests are flaky on webkit but not chromium?',
    'Give me a health summary of the framework',
  ];

  console.log('\n  Sample questions:\n');
  examples.forEach(e => console.log(`    • ${e}`));
  console.log('');
}

// ── Helpers ───────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
