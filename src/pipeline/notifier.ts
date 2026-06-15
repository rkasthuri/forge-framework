/**
 * notifier.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3.6 – Slack + Email Notifications
 * FORGE — Autonomous Quality Engineering
 *
 * Sends notifications to #all-ryq (Slack) and raj.s.kasthuri@gmail.com
 * with three message levels based on run outcome:
 *
 *   INFO     — all tests passed (green run)
 *   WARNING  — flaky tests detected, pass rate dropped
 *   CRITICAL — bug-verdict failures, CI blocking failures
 *
 * Usage (standalone):
 *   npx tsx src/notifier.ts                  ← auto-detect level from reports
 *   npx tsx src/notifier.ts --level=critical ← force level
 *   npx tsx src/notifier.ts --slack-only     ← skip email
 *   npx tsx src/notifier.ts --email-only     ← skip Slack
 *   npx tsx src/notifier.ts --ci             ← CI mode (only notify on warn/critical)
 *
 * Called automatically by run.ts as Step 6.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs      from 'fs';
import * as path    from 'path';
import * as dotenv  from 'dotenv';
import * as nodemailer from 'nodemailer';
import { RunRepository }     from '../core/storage/repositories/RunRepository'
import { AiTriageRepository } from '../core/storage/repositories/AiTriageRepository'
dotenv.config();

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifyLevel = 'info' | 'warning' | 'critical';

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
  file:         string;
  browser:      string;
  verdict:      string;
  errorMessage: string;
}

interface TriageReport {
  totalFailed: number;
  summary:     { Bug?: number; Flaky?: number; Environment?: number };
  failures?:   RunFailure[];
}

interface NotifyPayload {
  level:       NotifyLevel;
  passRate:    string;
  totalTests:  number;
  passed:      number;
  failed:      number;
  flaky:       number;
  bugs:        number;
  envErrors:   number;
  flakyCount:  number;
  failures:    RunFailure[];
  runId:       string;
  branch:      string;
  durationMs:  number;
  healthScore: number;
  trend:       string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_PATH = path.join('reports', 'run-history.json');
const TRIAGE_PATH  = path.join('reports', 'triage-report.json');
const NOTES_PATH   = path.join('reports', 'release-notes.json');

const SLACK_WEBHOOK  = process.env.SLACK_WEBHOOK_URL ?? '';
const EMAIL_TO       = process.env.NOTIFY_EMAIL_TO   ?? 'raj.s.kasthuri@gmail.com';
const EMAIL_FROM     = process.env.NOTIFY_EMAIL_FROM ?? 'raj.s.kasthuri@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? '';
const SLACK_CHANNEL  = '#all-ryq';

// ── Level detection ───────────────────────────────────────────────────────────

function detectLevel(payload: Omit<NotifyPayload, 'level'>): NotifyLevel {
  if (payload.bugs > 0)                     return 'critical';
  if (payload.failed > 0)                   return 'critical';
  if (payload.envErrors > 0)                return 'warning';
  if (payload.flakyCount > 0)               return 'warning';
  if (parseFloat(payload.passRate) < 90)    return 'warning';
  return 'info';
}

// ── Load report data ──────────────────────────────────────────────────────────

async function loadPayload(): Promise<Omit<NotifyPayload, 'level'>> {
  // Run history
  let stats: RunStats     = { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, passRate: '100%' };
  let runId               = new Date().toISOString().slice(0, 19);
  let durationMs          = 0;

  const runRepo = new RunRepository()
  const dbRuns  = await runRepo.findRecent(10)
  if (dbRuns.length > 0) {
    const last = dbRuns[0]  // findRecent returns desc order
    runId      = last.run_id
    durationMs = last.duration_ms ?? 0
    stats = {
      total:    last.total_tests ?? 0,
      passed:   last.passed      ?? 0,
      failed:   last.failed      ?? 0,
      flaky:    0,
      skipped:  last.skipped     ?? 0,
      passRate: (last.total_tests ?? 0) > 0
        ? `${(((last.passed ?? 0) / last.total_tests) * 100).toFixed(1)}%`
        : '100%',
    }
  }

  // Triage report
  let bugs       = 0;
  let envErrors  = 0;
  let flakyCount = 0;
  let failures:  RunFailure[] = [];

  const triageRepo = new AiTriageRepository()
  const triageRows = await triageRepo.findByRun(runId)
  bugs       = triageRows.filter(r => r.failure_category === 'Bug').length
  envErrors  = triageRows.filter(r => r.failure_category === 'Environment').length
  flakyCount = triageRows.filter(r => r.failure_category === 'Flaky').length
  failures   = []  // detailed RunFailure shape not stored in ai_triage

  // Release notes for health score + trend
  let healthScore = 100;
  let trend       = 'Stable';

  if (fs.existsSync(NOTES_PATH)) {
    const notes = JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
    healthScore = notes.healthScore ?? 100;
    trend       = notes.trend       ?? 'Stable';
  }

  // Git branch
  let branch = 'main';
  try {
    const { execSync } = require('child_process');
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch { /* ignore */ }

  return {
    passRate:   stats.passRate,
    totalTests: stats.total,
    passed:     stats.passed,
    failed:     stats.failed,
    flaky:      stats.flaky,
    bugs,
    envErrors,
    flakyCount,
    failures:   failures.slice(0, 5),  // cap at 5 for readability
    runId,
    branch,
    durationMs,
    healthScore,
    trend,
  };
}

// ── Slack Notification ────────────────────────────────────────────────────────

function slackColor(level: NotifyLevel): string {
  return { info: '#22c55e', warning: '#f59e0b', critical: '#ef4444' }[level];
}

function slackIcon(level: NotifyLevel): string {
  return { info: '✅', warning: '⚠️', critical: '🚨' }[level];
}

function slackLevelLabel(level: NotifyLevel): string {
  return { info: 'PASSED', warning: 'WARNING', critical: 'CRITICAL' }[level];
}

async function sendSlack(payload: NotifyPayload): Promise<void> {
  if (!SLACK_WEBHOOK) {
    console.warn('  ⚠️  SLACK_WEBHOOK_URL not set — skipping Slack');
    return;
  }

  const icon       = slackIcon(payload.level);
  const color      = slackColor(payload.level);
  const label      = slackLevelLabel(payload.level);
  const durationS  = Math.round(payload.durationMs / 1000);
  const trendIcon  = payload.trend === 'Improving' ? '📈' : payload.trend === 'Degrading' ? '📉' : '➡️';

  const failureLines = payload.failures.length > 0
    ? payload.failures.map(f => `• \`${f.testTitle}\` [${f.browser}] — ${f.verdict}`).join('\n')
    : '• None';

  const blocks = [
    {
      type: 'header',
      text: {
        type:  'plain_text',
        text:  `${icon} FORGE Pipeline — ${label}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Pass Rate*\n${payload.passRate}` },
        { type: 'mrkdwn', text: `*Health Score*\n${payload.healthScore}/100` },
        { type: 'mrkdwn', text: `*Tests*\n${payload.passed}/${payload.totalTests} passed` },
        { type: 'mrkdwn', text: `*Trend*\n${trendIcon} ${payload.trend}` },
        { type: 'mrkdwn', text: `*Branch*\n\`${payload.branch}\`` },
        { type: 'mrkdwn', text: `*Duration*\n${durationS}s` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*🐛 Bugs*\n${payload.bugs}` },
        { type: 'mrkdwn', text: `*🔴 Env Errors*\n${payload.envErrors}` },
        { type: 'mrkdwn', text: `*🟡 Flaky*\n${payload.flakyCount}` },
        { type: 'mrkdwn', text: `*❌ Failed*\n${payload.failed}` },
      ],
    },
    ...(payload.level !== 'info' ? [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Failures Detected:*\n${failureLines}`,
      },
    }] : []),
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `FORGE · Run \`${payload.runId}\` · ${new Date().toLocaleString()}`,
      }],
    },
    { type: 'divider' },
  ];

  const body = JSON.stringify({
    channel:     SLACK_CHANNEL,
    attachments: [{ color, blocks }],
  });

  const response = await fetch(SLACK_WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Slack responded with ${response.status}: ${await response.text()}`);
  }
}

// ── Email Notification ────────────────────────────────────────────────────────

function emailSubject(payload: NotifyPayload): string {
  const icon = { info: '✅', warning: '⚠️', critical: '🚨' }[payload.level];
  return `${icon} FORGE Pipeline — ${payload.passRate} Pass Rate | ${payload.level.toUpperCase()} | ${payload.branch}`;
}

function emailHtml(payload: NotifyPayload): string {
  const color     = slackColor(payload.level);
  const durationS = Math.round(payload.durationMs / 1000);
  const trendIcon = payload.trend === 'Improving' ? '📈' : payload.trend === 'Degrading' ? '📉' : '➡️';

  const failureRows = payload.failures.length > 0
    ? payload.failures.map(f => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1e2330;font-family:monospace;font-size:13px;color:#e2e8f0">${f.testTitle}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1e2330;font-size:13px;color:#94a3b8">${f.browser}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1e2330;font-size:13px;color:${f.verdict === 'Bug' ? '#ef4444' : '#f59e0b'}">${f.verdict}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:12px;color:#64748b;text-align:center">No failures detected</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:'Segoe UI',sans-serif;color:#e2e8f0">
  <div style="max-width:640px;margin:0 auto;padding:24px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#13161d,#1e2330);border:1px solid #1e2330;border-radius:12px;padding:24px;margin-bottom:16px">
      <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#38bdf8;margin-bottom:8px">FORGE — Phase 3.6</div>
      <div style="font-size:24px;font-weight:800;margin-bottom:4px">Pipeline <span style="color:#38bdf8">Notification</span></div>
      <div style="display:inline-block;padding:4px 12px;background:${color};border-radius:100px;font-size:12px;font-weight:700;color:#fff;letter-spacing:0.05em">${payload.level.toUpperCase()}</div>
    </div>

    <!-- KPI Grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[
        { label: 'Pass Rate',     value: payload.passRate,            color: color },
        { label: 'Health Score',  value: `${payload.healthScore}/100`, color: color },
        { label: 'Tests Passed',  value: `${payload.passed}/${payload.totalTests}`, color: '#38bdf8' },
        { label: 'Trend',         value: `${trendIcon} ${payload.trend}`, color: '#94a3b8' },
        { label: '🐛 Bugs',       value: String(payload.bugs),        color: payload.bugs > 0 ? '#ef4444' : '#22c55e' },
        { label: '🔴 Env Errors', value: String(payload.envErrors),   color: payload.envErrors > 0 ? '#f59e0b' : '#22c55e' },
        { label: '🟡 Flaky',      value: String(payload.flakyCount),  color: payload.flakyCount > 0 ? '#f59e0b' : '#22c55e' },
        { label: '⏱ Duration',    value: `${durationS}s`,             color: '#94a3b8' },
      ].map(k => `
        <div style="background:#13161d;border:1px solid #1e2330;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${k.color}">${k.value}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-top:4px">${k.label}</div>
        </div>`).join('')}
    </div>

    <!-- Run Info -->
    <div style="background:#13161d;border:1px solid #1e2330;border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;margin-bottom:8px">Run Details</div>
      <div style="font-size:13px;color:#94a3b8">Run ID: <code style="color:#38bdf8">${payload.runId}</code></div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px">Branch: <code style="color:#38bdf8">${payload.branch}</code></div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px">Generated: ${new Date().toLocaleString()}</div>
    </div>

    <!-- Failures Table -->
    <div style="background:#13161d;border:1px solid #1e2330;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 16px;border-bottom:1px solid #1e2330;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b">
        Failures Detected (top 5)
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0d0f14">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Test</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Browser</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Verdict</th>
          </tr>
        </thead>
        <tbody>${failureRows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#475569;padding:16px 0">
      FORGE — Autonomous Quality Engineering &nbsp;·&nbsp; Phase 3.6 Notifications &nbsp;·&nbsp; #all-ryq
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(payload: NotifyPayload): Promise<void> {
  if (!GMAIL_PASSWORD) {
    console.warn('  ⚠️  GMAIL_APP_PASSWORD not set — skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_FROM,
      pass: GMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from:    `"FORGE Pipeline" <${EMAIL_FROM}>`,
    to:      EMAIL_TO,
    subject: emailSubject(payload),
    html:    emailHtml(payload),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args       = process.argv.slice(2);
  const forceLevel = args.find(a => a.startsWith('--level='))?.split('=')[1] as NotifyLevel | undefined;
  const slackOnly  = args.includes('--slack-only');
  const emailOnly  = args.includes('--email-only');
  const ciMode     = args.includes('--ci');

  console.log('═══════════════════════════════════════════════════');
  console.log('  FORGE Phase 3.6 — Notifications');
  console.log('═══════════════════════════════════════════════════\n');

  const base    = await loadPayload();
  const level   = forceLevel ?? detectLevel(base);
  const payload: NotifyPayload = { ...base, level };

  console.log(`  Level:      ${level.toUpperCase()}`);
  console.log(`  Pass Rate:  ${payload.passRate}`);
  console.log(`  Health:     ${payload.healthScore}/100`);
  console.log(`  Bugs:       ${payload.bugs}`);
  console.log(`  Flaky:      ${payload.flakyCount}`);
  console.log(`  Branch:     ${payload.branch}\n`);

  // CI mode — only notify on warning or critical
  if (ciMode && level === 'info') {
    console.log('  ✅ CI mode — all green, skipping notification (info level)');
    console.log('  (use --level=info to force notify on green runs)\n');
    return;
  }

  const sendToSlack = !emailOnly;
  const sendToEmail = !slackOnly;

  // Send Slack
  if (sendToSlack) {
    process.stdout.write('  📨 Sending Slack notification...');
    try {
      await sendSlack(payload);
      console.log(' ✅ Sent to #all-ryq');
    } catch (err) {
      console.error(` ❌ Failed: ${err}`);
    }
  }

  // Send Email
  if (sendToEmail) {
    process.stdout.write('  📧 Sending email notification...');
    try {
      await sendEmail(payload);
      console.log(` ✅ Sent to ${EMAIL_TO}`);
    } catch (err) {
      console.error(` ❌ Failed: ${err}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
