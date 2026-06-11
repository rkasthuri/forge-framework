/**
 * flaky-predictor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3.4 – Flaky Test Predictor
 * RYQ AI-Augmented E2E Testing Framework
 *
 * Reads run-history.json + trends.json, scores every test with a flakiness
 * probability (0–100%), predicts which tests are about to become flaky BEFORE
 * they start failing in CI, and uses Claude AI for root cause prediction.
 *
 * Usage:
 *   npx tsx src/flaky-predictor.ts             ← full analysis + report
 *   npx tsx src/flaky-predictor.ts --summary   ← terminal summary only
 *   npx tsx src/flaky-predictor.ts --threshold=60 ← custom alert threshold
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs    from 'fs';
import * as path  from 'path';
import * as dotenv from 'dotenv';
import { FlakyAnalysisRepository } from '../core/storage/repositories/FlakyAnalysisRepository'
import { RunRepository }           from '../core/storage/repositories/RunRepository'
import { TrendRepository }         from '../core/storage/repositories/TrendRepository'
import { aiCall }                  from '../core/ai/AiClient'
import { getAppName } from '../core/config/appConfig'
dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface RunFailure {
  testTitle:       string;
  suiteName:       string;
  file:            string;
  browser:         string;
  priority:        string;
  verdict:         string;
  errorMessage:    string;
}

interface Run {
  runId:     string;
  timestamp: string;
  stats:     { total: number; passed: number; failed: number; flaky: number };
  failures:  RunFailure[];
}

interface RunHistory {
  runs: Run[];
}

interface TrendsFile {
  lastUpdated: string;
  totalRuns:   number;
  tests:       Record<string, TrendEntry>;
}

type RiskCategory = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WATCH' | 'STABLE';

interface PredictorResult {
  key:              string;
  testTitle:        string;
  file:             string;
  browser:          string;
  flakinesScore:    number;          // 0–100
  riskCategory:     RiskCategory;
  signals:          string[];        // what drove the score
  aiPrediction:     string;
  aiRootCause:      string;
  recommendation:   string;
  totalRuns:        number;
  failureCount:     number;
  failureRate:      number;          // 0–1
  consecutiveFails: number;
  trend:            'Worsening' | 'Stable' | 'Improving' | 'New';
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_PATH  = path.join('reports', 'run-history.json');
const TRENDS_PATH   = path.join('reports', 'trends.json');
const REPORT_PATH   = path.join('reports', 'flaky-prediction-report.html');
const JSON_PATH     = path.join('reports', 'flaky-predictions.json');

// ── Score Engine ──────────────────────────────────────────────────────────────

function scoreTest(key: string, entry: TrendEntry, history: Run[]): {
  score: number;
  signals: string[];
  trend: PredictorResult['trend'];
} {
  let score   = 0;
  const signals: string[] = [];

  // 1. Raw failure rate (0–40 pts)
  const failureRate = entry.totalRuns > 0 ? entry.failureCount / entry.totalRuns : 0;
  const failurePts  = Math.round(failureRate * 40);
  score += failurePts;
  if (failurePts > 0) signals.push(`Failure rate ${Math.round(failureRate * 100)}% (${entry.failureCount}/${entry.totalRuns} runs)`);

  // 2. Consecutive failures (0–25 pts)
  if (entry.consecutiveFails >= 3) {
    score += 25;
    signals.push(`${entry.consecutiveFails} consecutive failures — escalating pattern`);
  } else if (entry.consecutiveFails === 2) {
    score += 15;
    signals.push(`${entry.consecutiveFails} consecutive failures`);
  } else if (entry.consecutiveFails === 1) {
    score += 8;
    signals.push(`Most recent run failed`);
  }

  // 3. Existing risk level from trends (0–15 pts)
  if (entry.riskLevel === 'High') {
    score += 15;
    signals.push(`Already classified High risk in trend tracker`);
  } else if (entry.riskLevel === 'Medium') {
    score += 8;
    signals.push(`Medium risk in trend tracker`);
  }

  // 4. Flaky tag detection (0–10 pts)
  if (entry.testTitle.toLowerCase().includes('@flaky') ||
      entry.testTitle.toLowerCase().includes('@slow')) {
    score += 10;
    signals.push(`Tagged @slow/@flaky — known instability`);
  }

  // 5. Recent failure acceleration — did failures increase in last 3 runs? (0–10 pts)
  const recentRuns = history.slice(-3);
  const recentFailures = recentRuns.filter(run =>
    run.failures.some(f => f.testTitle === entry.testTitle)
  ).length;
  if (recentFailures >= 2) {
    score += 10;
    signals.push(`Failed in ${recentFailures}/3 most recent runs — accelerating`);
  } else if (recentFailures === 1) {
    score += 4;
    signals.push(`Failed in 1/3 most recent runs`);
  }

  // 6. Sample size penalty — low runs = less confidence, slight boost to watch (0–5 pts)
  if (entry.totalRuns < 3 && entry.failureCount > 0) {
    score += 5;
    signals.push(`Low sample size (${entry.totalRuns} runs) with failures — needs monitoring`);
  }

  // Trend detection
  const earlyRuns  = history.slice(0, Math.floor(history.length / 2));
  const lateRuns   = history.slice(Math.floor(history.length / 2));
  const earlyFails = earlyRuns.filter(r => r.failures.some(f => f.testTitle === entry.testTitle)).length;
  const lateFails  = lateRuns.filter(r  => r.failures.some(f => f.testTitle === entry.testTitle)).length;

  let trend: PredictorResult['trend'] = 'Stable';
  if (entry.totalRuns < 2)          trend = 'New';
  else if (lateFails > earlyFails)  trend = 'Worsening';
  else if (lateFails < earlyFails)  trend = 'Improving';

  return { score: Math.min(score, 100), signals, trend };
}

function toRiskCategory(score: number): RiskCategory {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  if (score >= 25) return 'WATCH';
  return 'STABLE';
}

// ── Claude AI Analysis ────────────────────────────────────────────────────────

async function analyseWithClaude(
  results: PredictorResult[],
): Promise<void> {
  const highRisk = results.filter(r => r.flakinesScore >= 45);
  if (highRisk.length === 0) {
    results.forEach(r => {
      r.aiPrediction  = 'No significant flakiness risk detected.';
      r.aiRootCause   = 'Test appears stable based on historical data.';
      r.recommendation = 'Continue monitoring.';
    });
    return;
  }

  console.log(`\n🤖 Claude AI analysing ${highRisk.length} at-risk tests...`);

  const prompt = `You are a senior QA engineer and flaky test expert. Analyse these at-risk tests and predict root causes.

Tests requiring analysis:
${highRisk.map(r => `
Test: ${r.testTitle}
File: ${r.file} | Browser: ${r.browser}
Flakiness Score: ${r.flakinesScore}/100 | Category: ${r.riskCategory}
Failure Rate: ${Math.round(r.failureRate * 100)}% (${r.failureCount}/${r.totalRuns} runs)
Consecutive Failures: ${r.consecutiveFails}
Trend: ${r.trend}
Signals: ${r.signals.join('; ')}
`).join('\n---')}

For each test respond ONLY with valid JSON array (no markdown, no backticks):
[
  {
    "testTitle": "exact test title",
    "prediction": "one sentence predicting what will happen if not addressed",
    "rootCause": "most likely root cause of the flakiness",
    "recommendation": "specific actionable fix"
  }
]`;

  try {
    const aiResp = await aiCall({
      operation: 'flaky-score',
      appName:   getAppName(),
      messages:  [{ role: 'user', content: prompt }],
      maxTokens: 2048,
    })

    const raw     = aiResp.content.trim();
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const analyses = JSON.parse(cleaned) as Array<{
      testTitle:      string;
      prediction:     string;
      rootCause:      string;
      recommendation: string;
    }>;

    // Map back to results
    analyses.forEach(a => {
      const match = results.find(r => r.testTitle === a.testTitle);
      if (match) {
        match.aiPrediction   = a.prediction;
        match.aiRootCause    = a.rootCause;
        match.recommendation = a.recommendation;
      }
    });

    // Fill in stable tests
    results
      .filter(r => r.flakinesScore < 45)
      .forEach(r => {
        r.aiPrediction   = 'Test is stable — no intervention needed.';
        r.aiRootCause    = 'No recurring failure pattern detected.';
        r.recommendation = 'Continue monitoring with current configuration.';
      });

  } catch (err) {
    console.error(`  ⚠️  Claude analysis error: ${err}`);
    results.forEach(r => {
      if (!r.aiPrediction) {
        r.aiPrediction   = 'Analysis unavailable — manual review recommended.';
        r.aiRootCause    = 'Could not determine root cause automatically.';
        r.recommendation = 'Review failure logs manually.';
      }
    });
  }
}

// ── HTML Report ───────────────────────────────────────────────────────────────

function generateReport(results: PredictorResult[], totalRuns: number): void {
  const timestamp = new Date().toLocaleString();

  const categoryColor: Record<RiskCategory, string> = {
    CRITICAL: '#dc2626',
    HIGH:     '#ef4444',
    MEDIUM:   '#f59e0b',
    WATCH:    '#3b82f6',
    STABLE:   '#22c55e',
  };
  const categoryBg: Record<RiskCategory, string> = {
    CRITICAL: '#fff1f2',
    HIGH:     '#fef2f2',
    MEDIUM:   '#fffbeb',
    WATCH:    '#eff6ff',
    STABLE:   '#f0fdf4',
  };
  const trendIcon: Record<string, string> = {
    Worsening: '📈',
    Stable:    '➡️',
    Improving: '📉',
    New:       '🆕',
  };

  const counts = {
    CRITICAL: results.filter(r => r.riskCategory === 'CRITICAL').length,
    HIGH:     results.filter(r => r.riskCategory === 'HIGH').length,
    MEDIUM:   results.filter(r => r.riskCategory === 'MEDIUM').length,
    WATCH:    results.filter(r => r.riskCategory === 'WATCH').length,
    STABLE:   results.filter(r => r.riskCategory === 'STABLE').length,
  };

  const cardsHTML = results.map(r => {
    const scoreBar = `
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${r.flakinesScore}%; background:${categoryColor[r.riskCategory]}"></div>
      </div>`;

    const signalsHTML = r.signals.map(s => `<li>${s}</li>`).join('');

    return `
    <div class="card" data-category="${r.riskCategory}">
      <div class="card-header" style="border-left:4px solid ${categoryColor[r.riskCategory]}; background:${categoryBg[r.riskCategory]}">
        <div class="card-title-row">
          <div>
            <span class="badge" style="background:${categoryColor[r.riskCategory]}">${r.riskCategory}</span>
            <span class="trend-badge">${trendIcon[r.trend]} ${r.trend}</span>
          </div>
          <div class="score-display" style="color:${categoryColor[r.riskCategory]}">${r.flakinesScore}<span class="score-label">/100</span></div>
        </div>
        <h3 class="card-title">${r.testTitle}</h3>
        <div class="card-meta">${r.file} &nbsp;·&nbsp; ${r.browser} &nbsp;·&nbsp; ${r.failureCount}/${r.totalRuns} runs failed (${Math.round(r.failureRate * 100)}%)</div>
        ${scoreBar}
      </div>
      <div class="card-body">
        <div class="card-section">
          <h4>Signals Detected</h4>
          <ul class="signals">${signalsHTML || '<li>No risk signals detected</li>'}</ul>
        </div>
        <div class="card-section">
          <h4>🤖 AI Root Cause</h4>
          <p class="ai-text">${r.aiRootCause}</p>
        </div>
        <div class="card-section">
          <h4>🔮 Prediction</h4>
          <p class="ai-text">${r.aiPrediction}</p>
        </div>
        <div class="card-section recommendation">
          <h4>✅ Recommendation</h4>
          <p class="ai-text">${r.recommendation}</p>
        </div>
      </div>
    </div>`;
  }).join('\n');

  const filterBtns = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'WATCH', 'STABLE'].map(c => `
    <button class="filter-btn ${c === 'All' ? 'active' : ''}" onclick="filterCards('${c}')">${c}</button>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RYQ Flaky Test Predictor</title>
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
    .header-inner { max-width: 1200px; margin: 0 auto; position: relative; }
    .logo { font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; color: var(--accent); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 0.4rem; }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
    h1 span { color: var(--accent); }
    .header-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; }

    /* Stats */
    .stats { display: flex; gap: 1rem; margin-top: 1.8rem; flex-wrap: wrap; }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0.8rem 1.2rem; min-width: 90px; text-align: center; }
    .stat-number { font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; line-height: 1; }
    .stat-label  { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.2rem; }

    /* Filters */
    .filters { max-width: 1200px; margin: 1.5rem auto 0; padding: 0 2rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 0.4rem 1rem; font-family: 'Syne', sans-serif; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover, .filter-btn.active { background: var(--accent); border-color: var(--accent); color: #000; }

    /* Cards */
    .cards { max-width: 1200px; margin: 1.5rem auto 3rem; padding: 0 2rem; display: flex; flex-direction: column; gap: 1.2rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .card.hidden { display: none; }

    .card-header { padding: 1.2rem 1.5rem 1rem; }
    .card-title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; }
    .badge { padding: 0.2rem 0.7rem; border-radius: 100px; font-size: 0.7rem; font-weight: 700; color: #fff; letter-spacing: 0.06em; }
    .trend-badge { margin-left: 0.5rem; font-size: 0.78rem; color: var(--muted); }
    .score-display { font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700; line-height: 1; }
    .score-label { font-size: 0.85rem; color: var(--muted); }
    .card-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.3rem; line-height: 1.3; }
    .card-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--muted); margin-bottom: 0.8rem; }

    /* Score bar */
    .score-bar-wrap { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .score-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }

    /* Card body */
    .card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid var(--border); }
    .card-section { padding: 1rem 1.5rem; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .card-section:nth-child(even) { border-right: none; }
    .card-section:nth-last-child(-n+2) { border-bottom: none; }
    .card-section h4 { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 0.5rem; }
    .signals { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; }
    .signals li { font-size: 0.8rem; padding-left: 1rem; position: relative; line-height: 1.4; }
    .signals li::before { content: '▸'; position: absolute; left: 0; color: var(--accent); }
    .ai-text { font-size: 0.82rem; line-height: 1.5; color: var(--text); }
    .recommendation { background: rgba(56,189,248,0.04); }

    /* Footer */
    .page-footer { text-align: center; padding: 2rem; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--muted); border-top: 1px solid var(--border); }

    @media (max-width: 768px) {
      .card-body { grid-template-columns: 1fr; }
      .card-section { border-right: none !important; }
      h1 { font-size: 1.4rem; }
    }
  </style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <div class="logo">RYQ AI Testing Framework — Phase 3.4</div>
    <h1>Flaky Test <span>Predictor</span></h1>
    <div class="header-meta">Generated: ${timestamp} &nbsp;·&nbsp; Based on ${totalRuns} historical runs &nbsp;·&nbsp; ${results.length} tests analysed</div>
    <div class="stats">
      <div class="stat"><div class="stat-number">${totalRuns}</div><div class="stat-label">Runs</div></div>
      <div class="stat"><div class="stat-number" style="color:#dc2626">${counts.CRITICAL}</div><div class="stat-label">Critical</div></div>
      <div class="stat"><div class="stat-number" style="color:#ef4444">${counts.HIGH}</div><div class="stat-label">High</div></div>
      <div class="stat"><div class="stat-number" style="color:#f59e0b">${counts.MEDIUM}</div><div class="stat-label">Medium</div></div>
      <div class="stat"><div class="stat-number" style="color:#3b82f6">${counts.WATCH}</div><div class="stat-label">Watch</div></div>
      <div class="stat"><div class="stat-number" style="color:#22c55e">${counts.STABLE}</div><div class="stat-label">Stable</div></div>
    </div>
  </div>
</header>

<div class="filters">${filterBtns}</div>

<div class="cards" id="cards">${cardsHTML}</div>

<footer class="page-footer">
  RYQ AI-Augmented E2E Testing Framework &nbsp;·&nbsp; Phase 3.4 Flaky Test Predictor &nbsp;·&nbsp; Powered by Claude AI
</footer>

<script>
  function filterCards(category) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.card').forEach(card => {
      card.classList.toggle('hidden', category !== 'All' && card.dataset.category !== category);
    });
  }
</script>
</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html, 'utf8');
  console.log(`\n📊 Report saved: ${REPORT_PATH}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args       = process.argv.slice(2);
  const summaryOnly = args.includes('--summary');
  const threshold   = parseInt(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? '25');

  console.log('═══════════════════════════════════════════════════');
  console.log('  RYQ Phase 3.4 — Flaky Test Predictor');
  console.log('═══════════════════════════════════════════════════');

  // Load data
  const runRepo   = new RunRepository()
  const dbRuns    = await runRepo.findByApp(getAppName(), 100)
  const trendRepo = new TrendRepository()
  const trendRows = await trendRepo.findByApp(getAppName(), 30)
  if (!dbRuns.length) {
    console.error('❌ No run data in database. Run npm run test first.');
    process.exit(1);
  }
  const runs: any[] = dbRuns as any[]
  const trends: TrendsFile = { lastUpdated: new Date().toISOString(), totalRuns: dbRuns.length, tests: {} }

  console.log(`\n📂 Loaded ${runs.length} runs | ${Object.keys(trends.tests).length} tracked tests\n`);

  // Score every test
  const results: PredictorResult[] = Object.entries(trends.tests)
    .map(([key, entry]) => {
      const [,, browser] = key.split('::');
      const { score, signals, trend } = scoreTest(key, entry, runs);
      return {
        key,
        testTitle:        entry.testTitle,
        file:             entry.file,
        browser:          browser ?? 'unknown',
        flakinesScore:    score,
        riskCategory:     toRiskCategory(score),
        signals,
        aiPrediction:     '',
        aiRootCause:      '',
        recommendation:   '',
        totalRuns:        entry.totalRuns,
        failureCount:     entry.failureCount,
        failureRate:      entry.totalRuns > 0 ? entry.failureCount / entry.totalRuns : 0,
        consecutiveFails: entry.consecutiveFails,
        trend,
      } as PredictorResult;
    })
    // Sort by score descending
    .sort((a, b) => b.flakinesScore - a.flakinesScore);

  // Claude AI analysis
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }
  await analyseWithClaude(results);

  // Save JSON
  fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2), 'utf8');
  console.log(`📁 Predictions saved: ${JSON_PATH}`);

  // Parallel DB write
  const flakyRepo = new FlakyAnalysisRepository()
  const today = new Date().toISOString().slice(0, 10)
  for (const r of results) {
    try {
      await flakyRepo.upsert({
        test_id:            r.key,
        app_name:           getAppName(),
        analysis_date:      today,
        flaky_score:        r.flakinesScore,
        signal_timing:      r.signals.some(s => /timeout|slow/i.test(s)) ? 1 : 0,
        signal_selector:    r.signals.some(s => /selector/i.test(s)) ? 1 : 0,
        signal_data:        r.signals.some(s => /data/i.test(s)) ? 1 : 0,
        signal_env:         r.signals.some(s => /env|config/i.test(s)) ? 1 : 0,
        signal_concurrency: 0,
        signal_network:     r.signals.some(s => /network/i.test(s)) ? 1 : 0,
        sample_size:        r.totalRuns,
        recommendation:     r.recommendation || 'Review manually',
        trend:              r.trend.toLowerCase(),
      })
    } catch { /* non-fatal */ }
  }

  // Terminal summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  FLAKINESS PREDICTION SUMMARY');
  console.log('═══════════════════════════════════════════════════');

  const icon: Record<RiskCategory, string> = {
    CRITICAL: '💥', HIGH: '🔴', MEDIUM: '🟠', WATCH: '🔵', STABLE: '✅',
  };

  results.forEach(r => {
    const bar = '█'.repeat(Math.round(r.flakinesScore / 10)).padEnd(10, '░');
    console.log(`  ${icon[r.riskCategory]} [${String(r.flakinesScore).padStart(3)}] ${bar}  ${r.testTitle} (${r.browser})`);
  });

  const atRisk = results.filter(r => r.flakinesScore >= threshold);
  console.log('\n  ─────────────────────────────────────────────────');
  console.log(`  Total: ${results.length} tests | At-risk (≥${threshold}): ${atRisk.length} | Stable: ${results.length - atRisk.length}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (summaryOnly) return;

  // Generate HTML report
  generateReport(results, runs.length);

  // Open report
  const { exec } = await import('child_process');
  const absPath  = path.resolve(REPORT_PATH);
  const open     = process.platform === 'win32' ? `start "" "${absPath}"` :
                   process.platform === 'darwin' ? `open "${absPath}"` : `xdg-open "${absPath}"`;
  exec(open);
  console.log('🌐 Opening report in browser...\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
