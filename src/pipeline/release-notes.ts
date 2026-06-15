/**
 * release-notes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3.5 – Auto-Generated Release Notes
 * FORGE — Autonomous Quality Engineering
 *
 * Reads run-history.json + trends.json + git log, then uses Claude AI to
 * synthesize a professional release notes document covering test health,
 * flakiness changes, pass rate trends, and risk deltas.
 *
 * Usage:
 *   npx tsx src/release-notes.ts                  ← last run vs previous
 *   npx tsx src/release-notes.ts --sprint         ← last 5 runs summary
 *   npx tsx src/release-notes.ts --runs=10        ← last N runs summary
 *   npx tsx src/release-notes.ts --sprint --open  ← open HTML after generating
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs     from 'fs';
import * as path   from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { RunRepository }   from '../core/storage/repositories/RunRepository'
import { TrendRepository } from '../core/storage/repositories/TrendRepository'
import { aiCall }          from '../core/ai/AiClient'
import { getAppName, getBaseUrl } from '../core/config/appConfig'
dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunStats {
  total:    number;
  passed:   number;
  failed:   number;
  flaky:    number;
  skipped:  number;
  passRate: string;
}

interface RunFailure {
  testTitle:    string;
  suiteName:    string;
  file:         string;
  browser:      string;
  priority:     string;
  verdict:      string;
  errorMessage: string;
}

interface Run {
  runId:      string;
  timestamp:  string;
  durationMs: number;
  stats:      RunStats;
  failures:   RunFailure[];
  flakyTests: string[];
}

interface RunHistory {
  runs: Run[];
}

interface TrendEntry {
  testTitle:        string;
  file:             string;
  totalRuns:        number;
  failureCount:     number;
  flakyCount:       number;
  lastVerdict:      string;
  lastSeen:         string;
  consecutiveFails: number;
  riskLevel:        'Low' | 'Medium' | 'High';
}

interface TrendsFile {
  lastUpdated: string;
  totalRuns:   number;
  tests:       Record<string, TrendEntry>;
}

interface ReleaseSection {
  title:   string;
  content: string;
}

interface ReleaseNotes {
  version:        string;
  period:         string;
  runsAnalysed:   number;
  generatedAt:    string;
  headline:       string;
  healthScore:    number;        // 0–100
  trend:          'Improving' | 'Stable' | 'Degrading';
  sections:       ReleaseSection[];
  gitCommits:     string[];
  rawMarkdown:    string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_PATH = path.join('reports', 'run-history.json');
const TRENDS_PATH  = path.join('reports', 'trends.json');
const MD_PATH      = path.join('reports', 'release-notes.md');
const HTML_PATH    = path.join('reports', 'release-notes.html');
const JSON_PATH    = path.join('reports', 'release-notes.json');

// ── Git Helpers ───────────────────────────────────────────────────────────────

function getGitLog(since?: string): string[] {
  try {
    const sinceFlag = since ? `--since="${since}"` : '-20';
    const cmd       = since
      ? `git log ${sinceFlag} --oneline --no-merges`
      : `git log -20 --oneline --no-merges`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return ['(git log unavailable)'];
  }
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'main';
  }
}

function getGitVersion(): string {
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (tag) return tag;
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    return `sha-${sha}`;
  } catch {
    return 'v0.0.0';
  }
}

// ── Data Analysis ─────────────────────────────────────────────────────────────

function analyseRuns(runs: Run[]): {
  avgPassRate:      number;
  passRateTrend:    'Improving' | 'Stable' | 'Degrading';
  totalTests:       number;
  totalFailures:    number;
  uniqueFailures:   Set<string>;
  newFailures:      string[];
  resolvedFailures: string[];
  flakyTests:       Set<string>;
  avgDurationMs:    number;
  worstRun:         Run;
  bestRun:          Run;
} {
  const passRates = runs.map(r => parseFloat(r.stats.passRate));
  const avgPassRate = passRates.reduce((a, b) => a + b, 0) / passRates.length;

  // Trend: compare first half vs second half
  const mid       = Math.floor(runs.length / 2);
  const earlyAvg  = passRates.slice(0, mid).reduce((a, b) => a + b, 0) / (mid || 1);
  const lateAvg   = passRates.slice(mid).reduce((a, b) => a + b, 0)   / (runs.length - mid || 1);
  const passRateTrend: 'Improving' | 'Stable' | 'Degrading' =
    lateAvg > earlyAvg + 1  ? 'Improving' :
    lateAvg < earlyAvg - 1  ? 'Degrading' : 'Stable';

  const allFailures  = runs.flatMap(r => r.failures.map(f => f.testTitle));
  const uniqueFailures = new Set(allFailures);
  const flakyTests    = new Set(runs.flatMap(r => r.flakyTests ?? []));

  // New failures = in last run but not in first run
  const firstRunFails = new Set(runs[0]?.failures.map(f => f.testTitle) ?? []);
  const lastRunFails  = new Set(runs[runs.length - 1]?.failures.map(f => f.testTitle) ?? []);
  const newFailures      = [...lastRunFails].filter(t => !firstRunFails.has(t));
  const resolvedFailures = [...firstRunFails].filter(t => !lastRunFails.has(t));

  const totalFailures = runs.reduce((a, r) => a + r.stats.failed, 0);
  const avgDurationMs = runs.reduce((a, r) => a + r.durationMs, 0) / runs.length;

  const worstRun = runs.reduce((a, b) => a.stats.failed > b.stats.failed ? a : b);
  const bestRun  = runs.reduce((a, b) => a.stats.passed > b.stats.passed ? a : b);

  return {
    avgPassRate,
    passRateTrend,
    totalTests:    runs[runs.length - 1]?.stats.total ?? 0,
    totalFailures,
    uniqueFailures,
    newFailures,
    resolvedFailures,
    flakyTests,
    avgDurationMs,
    worstRun,
    bestRun,
  };
}

function computeHealthScore(analysis: ReturnType<typeof analyseRuns>): number {
  let score = analysis.avgPassRate; // base: 0–100

  // Penalise new failures
  score -= analysis.newFailures.length * 5;

  // Reward resolved failures
  score += analysis.resolvedFailures.length * 3;

  // Trend bonus/penalty
  if (analysis.passRateTrend === 'Improving') score += 3;
  if (analysis.passRateTrend === 'Degrading') score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Claude AI Synthesis ───────────────────────────────────────────────────────

async function synthesiseWithClaude(
  runs:      Run[],
  trends:    TrendsFile,
  gitLog:    string[],
  analysis:  ReturnType<typeof analyseRuns>,
  sprintMode: boolean,
): Promise<string> {
  const highRiskTests = Object.entries(trends.tests)
    .filter(([, e]) => e.riskLevel === 'High')
    .map(([, e]) => e.testTitle);

  const recentFailures = [...new Set(
    runs.slice(-3).flatMap(r => r.failures.map(f => f.testTitle))
  )];

  const prompt = `You are a senior QA engineering lead writing professional release notes for a QA test automation framework.

CONTEXT:
- Framework: FORGE — Autonomous Quality Engineering
- Test target: ${getAppName()} (${getBaseUrl()})
- Period: ${sprintMode ? `Last ${runs.length} runs (sprint summary)` : 'Last run vs previous run'}
- Branch: ${getGitBranch()}

RUN DATA:
- Runs analysed: ${runs.length}
- Date range: ${runs[0]?.timestamp?.slice(0, 10)} → ${runs[runs.length - 1]?.timestamp?.slice(0, 10)}
- Average pass rate: ${analysis.avgPassRate.toFixed(1)}%
- Pass rate trend: ${analysis.passRateTrend}
- Total test suite size: ${analysis.totalTests} tests
- Total failures across window: ${analysis.totalFailures}
- Unique failing tests: ${analysis.uniqueFailures.size}
- New failures (appeared in latest run): ${analysis.newFailures.join(', ') || 'None'}
- Resolved failures (fixed since first run): ${analysis.resolvedFailures.join(', ') || 'None'}
- High risk tests: ${highRiskTests.join(', ') || 'None'}
- Recent failures (last 3 runs): ${recentFailures.join(', ') || 'None'}
- Average run duration: ${Math.round(analysis.avgDurationMs / 1000)}s
- Best run: ${analysis.bestRun.stats.passed} passed / ${analysis.bestRun.stats.total} total
- Worst run: ${analysis.worstRun.stats.failed} failed / ${analysis.worstRun.stats.total} total

GIT COMMITS (recent):
${gitLog.slice(0, 15).join('\n')}

TRENDS SUMMARY:
${Object.entries(trends.tests)
  .filter(([, e]) => e.riskLevel !== 'Low')
  .map(([, e]) => `- ${e.testTitle}: ${e.failureCount}/${e.totalRuns} failures, Risk=${e.riskLevel}, Consecutive=${e.consecutiveFails}`)
  .join('\n')}

Write comprehensive, professional release notes in Markdown. Include ALL of these sections:

## 🏥 Health Summary
Overall framework health narrative. Be specific about numbers.

## 📊 Pass Rate Analysis  
Trend analysis with specific run data. Comment on trajectory.

## ✅ What's Working Well
Stable tests, consistent areas, positive patterns.

## ⚠️ Risk Areas
Tests at risk, patterns of concern, what needs attention.

## 🐛 Failures & Flakiness
Specific failing tests, root cause hypotheses, patterns.

## 🔧 Recommended Actions
Prioritised action items (P0/P1/P2) with specific test IDs.

## 📈 Trend Insights
What the data predicts going forward. Be analytical.

## 🚀 Framework Highlights
Notable capabilities active in this period (AI triage, visual regression, cross-browser, API testing, flaky predictor).

Write with confidence and specificity. Use exact test IDs (TC007, EC001, AB001 etc) where relevant. 
This will be read by engineering managers and QA leads — make it count.`;

  const aiResp = await aiCall({
    operation: 'release-notes',
    appName:   getAppName(),
    messages:  [{ role: 'user', content: prompt }],
    maxTokens: 4096,
  })

  return aiResp.content.trim();
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.*)/gm,   '<h2>$1</h2>')
    .replace(/^### (.*)/gm,  '<h3>$1</h3>')
    .replace(/^#### (.*)/gm, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/`(.*?)`/g,       '<code>$1</code>')
    .replace(/^- (.*)/gm,      '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/^\d+\. (.*)/gm,  '<li>$1</li>')
    .replace(/^---$/gm,        '<hr />')
    .replace(/\n\n/g,          '</p><p>')
    .replace(/^(?!<[hul]|<li|<hr|<\/)/gm, '')
    .replace(/<p><\/p>/g, '');
}

function generateHtmlReport(notes: ReleaseNotes): void {
  const trendColor = {
    Improving: '#22c55e',
    Stable:    '#38bdf8',
    Degrading: '#ef4444',
  }[notes.trend];

  const trendIcon = {
    Improving: '📈',
    Stable:    '➡️',
    Degrading: '📉',
  }[notes.trend];

  const healthColor =
    notes.healthScore >= 90 ? '#22c55e' :
    notes.healthScore >= 75 ? '#84cc16' :
    notes.healthScore >= 60 ? '#f59e0b' : '#ef4444';

  const commitsHTML = notes.gitCommits.length
    ? notes.gitCommits.map(c => `<div class="commit"><code>${c}</code></div>`).join('')
    : '<div class="commit"><code>(no recent commits)</code></div>';

  const bodyContent = markdownToHtml(notes.rawMarkdown);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FORGE Release Notes — ${notes.version}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');
    :root {
      --bg:      #0d0f14;
      --surface: #13161d;
      --border:  #1e2330;
      --text:    #e2e8f0;
      --muted:   #64748b;
      --accent:  #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0d0f14, #111827, #0d0f14);
      border-bottom: 1px solid var(--border);
      padding: 2.5rem 2rem 2rem;
      position: relative; overflow: hidden;
    }
    .header::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 80% at 50% -20%, rgba(56,189,248,0.08), transparent 70%);
    }
    .header-inner { max-width: 1100px; margin: 0 auto; position: relative; }
    .logo { font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 0.4rem; }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
    h1 span { color: var(--accent); }
    .version-badge { display: inline-block; margin-top: 0.5rem; padding: 0.2rem 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: 100px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--accent); }
    .header-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; }

    /* KPI Strip */
    .kpi-strip { display: flex; gap: 1rem; margin-top: 1.8rem; flex-wrap: wrap; }
    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0.8rem 1.4rem; text-align: center; min-width: 100px; }
    .kpi-value { font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; line-height: 1; }
    .kpi-label { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem; }

    /* Layout */
    .layout { max-width: 1100px; margin: 2rem auto 4rem; padding: 0 2rem; display: grid; grid-template-columns: 1fr 300px; gap: 2rem; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }

    /* Main content */
    .main-content { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; }
    .main-content h2 { font-size: 1.15rem; font-weight: 700; margin: 1.8rem 0 0.8rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); color: var(--accent); }
    .main-content h2:first-child { margin-top: 0; }
    .main-content h3 { font-size: 0.95rem; font-weight: 600; margin: 1.2rem 0 0.5rem; }
    .main-content h4 { font-size: 0.85rem; font-weight: 600; color: var(--muted); margin: 1rem 0 0.4rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .main-content p { font-size: 0.88rem; line-height: 1.7; color: var(--text); margin: 0.5rem 0; }
    .main-content ul { margin: 0.5rem 0 0.5rem 1.2rem; }
    .main-content li { font-size: 0.88rem; line-height: 1.6; margin-bottom: 0.25rem; }
    .main-content strong { color: #f1f5f9; }
    .main-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; background: rgba(56,189,248,0.08); padding: 0.1rem 0.4rem; border-radius: 4px; color: var(--accent); }
    .main-content hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }

    /* Sidebar */
    .sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .sidebar-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; }
    .sidebar-card h3 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 0.8rem; }
    .health-ring { text-align: center; padding: 0.5rem 0; }
    .health-number { font-size: 3rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; line-height: 1; }
    .health-sub { font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem; }
    .trend-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 100px; font-size: 0.8rem; font-weight: 600; margin-top: 0.5rem; }
    .commit { padding: 0.3rem 0; border-bottom: 1px solid var(--border); }
    .commit:last-child { border-bottom: none; }
    .commit code { font-size: 0.72rem; color: var(--muted); word-break: break-all; }
    .period-info { font-size: 0.8rem; color: var(--text); line-height: 1.6; }
    .period-info span { color: var(--muted); font-size: 0.72rem; display: block; }

    /* Footer */
    .page-footer { text-align: center; padding: 2rem; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--muted); border-top: 1px solid var(--border); }
  </style>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <div class="logo">FORGE — Phase 3.5</div>
    <h1>Release <span>Notes</span></h1>
    <div class="version-badge">${notes.version}</div>
    <div class="header-meta">${notes.period} &nbsp;·&nbsp; ${notes.runsAnalysed} runs analysed &nbsp;·&nbsp; Generated ${notes.generatedAt}</div>
    <div class="kpi-strip">
      <div class="kpi">
        <div class="kpi-value" style="color:${healthColor}">${notes.healthScore}</div>
        <div class="kpi-label">Health Score</div>
      </div>
      <div class="kpi">
        <div class="kpi-value" style="color:${trendColor}">${trendIcon}</div>
        <div class="kpi-label">${notes.trend}</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${notes.runsAnalysed}</div>
        <div class="kpi-label">Runs</div>
      </div>
    </div>
  </div>
</header>

<div class="layout">
  <div class="main-content">
    ${bodyContent}
  </div>
  <aside class="sidebar">
    <div class="sidebar-card">
      <h3>Framework Health</h3>
      <div class="health-ring">
        <div class="health-number" style="color:${healthColor}">${notes.healthScore}</div>
        <div class="health-sub">out of 100</div>
        <div class="trend-pill" style="background:${trendColor}22; color:${trendColor}">
          ${trendIcon} ${notes.trend}
        </div>
      </div>
    </div>

    <div class="sidebar-card">
      <h3>Period</h3>
      <div class="period-info">
        ${notes.period}
        <span>${notes.runsAnalysed} runs in window</span>
      </div>
    </div>

    <div class="sidebar-card">
      <h3>Recent Commits</h3>
      ${commitsHTML}
    </div>
  </aside>
</div>

<footer class="page-footer">
  FORGE — Autonomous Quality Engineering &nbsp;·&nbsp; Phase 3.5 Release Notes &nbsp;·&nbsp; Powered by Claude AI
</footer>
</body>
</html>`;

  fs.writeFileSync(HTML_PATH, html, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args       = process.argv.slice(2);
  const sprintMode = args.includes('--sprint');
  const openFlag   = args.includes('--open');
  const runsFlag   = parseInt(args.find(a => a.startsWith('--runs='))?.split('=')[1] ?? '0');

  console.log('═══════════════════════════════════════════════════');
  console.log('  FORGE Phase 3.5 — Release Notes Generator');
  console.log('═══════════════════════════════════════════════════');

  // Load data
  const runRepo   = new RunRepository()
  const dbRuns    = await runRepo.findByApp(getAppName(), 100)
  const trendRepo = new TrendRepository()
  const trendRows = await trendRepo.findByApp(getAppName(), 30)
  const allRuns: any[] = dbRuns as any[]
  const trends: TrendsFile = { lastUpdated: new Date().toISOString(), totalRuns: dbRuns.length, tests: {} }

  if (allRuns.length === 0) {
    console.error('❌ No runs found in database. Run npm run test first.');
    process.exit(1);
  }

  // Determine window
  let windowSize: number;
  if (runsFlag > 0)      windowSize = runsFlag;
  else if (sprintMode)   windowSize = 5;
  else                   windowSize = 2; // last run vs previous

  const runs = allRuns.slice(-Math.min(windowSize, allRuns.length));

  const modeLabel = runsFlag > 0   ? `Last ${windowSize} runs`  :
                    sprintMode      ? `Sprint (last ${windowSize} runs)` :
                                      'Last run vs previous';

  console.log(`\n📂 Mode: ${modeLabel}`);
  console.log(`📊 Runs in window: ${runs.length} of ${allRuns.length} total`);
  console.log(`📅 Period: ${runs[0]?.timestamp?.slice(0, 10)} → ${runs[runs.length - 1]?.timestamp?.slice(0, 10)}\n`);

  // Analyse
  const analysis    = analyseRuns(runs);
  const healthScore = computeHealthScore(analysis);
  const gitLog      = getGitLog(runs[0]?.timestamp);
  const version     = getGitVersion();
  const branch      = getGitBranch();

  console.log(`📈 Avg pass rate: ${analysis.avgPassRate.toFixed(1)}%`);
  console.log(`🏥 Health score:  ${healthScore}/100`);
  console.log(`📉 Trend:         ${analysis.passRateTrend}`);
  console.log(`🔀 Branch:        ${branch}`);

  // Claude AI synthesis
  if (!process.env.ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY not set'); process.exit(1); }

  console.log('\n🤖 Claude AI synthesising release notes...');
  const rawMarkdown = await synthesiseWithClaude(runs, trends, gitLog, analysis, sprintMode || runsFlag > 0);

  // Build notes object
  const notes: ReleaseNotes = {
    version,
    period:       `${runs[0]?.timestamp?.slice(0, 10)} → ${runs[runs.length - 1]?.timestamp?.slice(0, 10)}`,
    runsAnalysed: runs.length,
    generatedAt:  new Date().toLocaleString(),
    headline:     `${analysis.passRateTrend} — avg pass rate ${analysis.avgPassRate.toFixed(1)}%`,
    healthScore,
    trend:        analysis.passRateTrend,
    sections:     [],
    gitCommits:   gitLog,
    rawMarkdown,
  };

  // Save outputs
  fs.writeFileSync(MD_PATH,   rawMarkdown, 'utf8');
  fs.writeFileSync(JSON_PATH, JSON.stringify(notes, null, 2), 'utf8');
  generateHtmlReport(notes);

  console.log(`\n✅ Release notes generated:`);
  console.log(`   📝 Markdown: ${MD_PATH}`);
  console.log(`   🌐 HTML:     ${HTML_PATH}`);
  console.log(`   📁 JSON:     ${JSON_PATH}`);

  // Terminal preview
  console.log('\n── HEADLINE ─────────────────────────────────────────');
  console.log(`   ${notes.headline}`);
  console.log(`   Health: ${healthScore}/100 | Trend: ${analysis.passRateTrend}`);
  console.log('─────────────────────────────────────────────────────\n');

  // Open
  if (openFlag || sprintMode || runsFlag > 0) {
    const { exec } = await import('child_process');
    const absPath   = path.resolve(HTML_PATH);
    const open      = process.platform === 'win32' ? `start "" "${absPath}"` :
                      process.platform === 'darwin' ? `open "${absPath}"` : `xdg-open "${absPath}"`;
    exec(open);
    console.log('🌐 Opening report in browser...\n');
  } else {
    console.log(`Run with --open to view HTML report, or open manually:\n  ${HTML_PATH}\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
