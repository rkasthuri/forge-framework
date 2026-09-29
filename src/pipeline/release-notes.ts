/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
import { exec, execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { RunRepository } from '../core/storage/repositories/RunRepository'
import { Run as RunRow } from '../core/storage/types'
import {
  AiGateway,
  AiGatewayFailureCode,
  AiGatewayProvenance,
  createAiGatewayFromEnvironment,
  ReleaseNotesInput,
  ReleaseNotesOutput,
} from '../core/ai/gateway'
import { getAppName } from '../core/config/appConfig'

dotenv.config()

export const PER_TEST_STUB =
  'Per-test detail not available this run (requires test_results population — see TD-056)'

export interface RunSummary {
  runId: string
  startedAt: string
  durationMs: number
  total: number
  passed: number
  failed: number
  skipped: number
  passRate: number
}

export interface ReleaseNotesFacts {
  period: string
  runsAnalysed: number
  averagePassRatePercent: number
  passRateTrend: 'Improving' | 'Stable' | 'Degrading'
  totalSuiteSize: number
  totalFailures: number
  averageDurationMs: number
  bestRun: { passed: number; total: number }
  worstRun: { failed: number; total: number }
  healthScore: number
  branch: string
  version: string
  gitCommits: string[]
}

export type ReleaseNotesAdvisory =
  | { status: 'AI_GENERATED'; content: ReleaseNotesOutput; provenance: AiGatewayProvenance }
  | {
      status: 'AI_UNAVAILABLE'
      content: null
      failure: { code: AiGatewayFailureCode; message: string; provenance: AiGatewayProvenance }
    }

export interface ReleaseNotes {
  version: string
  period: string
  runsAnalysed: number
  generatedAt: string
  headline: string
  healthScore: number
  trend: 'Improving' | 'Stable' | 'Degrading'
  gitCommits: string[]
  rawMarkdown: string
  deterministicFacts: ReleaseNotesFacts
  aiAdvisory: ReleaseNotesAdvisory
}

const MD_PATH = path.join('reports', 'release-notes.md')
const HTML_PATH = path.join('reports', 'release-notes.html')
const JSON_PATH = path.join('reports', 'release-notes.json')

export function toRunSummary(run: RunRow): RunSummary {
  const total = run.total_tests ?? 0
  return {
    runId: run.run_id,
    startedAt: run.started_at,
    durationMs: run.duration_ms,
    total,
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    passRate: total > 0 ? (run.passed / total) * 100 : 0,
  }
}

export function analyseRuns(runs: RunSummary[]) {
  const passRates = runs.map(run => run.passRate)
  const avgPassRate = passRates.reduce((sum, value) => sum + value, 0) / passRates.length
  const midpoint = Math.floor(runs.length / 2)
  const earlyAverage = passRates.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / (midpoint || 1)
  const lateAverage = passRates.slice(midpoint).reduce((sum, value) => sum + value, 0) / (runs.length - midpoint || 1)
  const passRateTrend: ReleaseNotesFacts['passRateTrend'] = lateAverage > earlyAverage + 1
    ? 'Improving'
    : lateAverage < earlyAverage - 1
      ? 'Degrading'
      : 'Stable'
  return {
    avgPassRate,
    passRateTrend,
    totalTests: runs.at(-1)?.total ?? 0,
    totalFailures: runs.reduce((sum, run) => sum + run.failed, 0),
    avgDurationMs: runs.reduce((sum, run) => sum + run.durationMs, 0) / runs.length,
    worstRun: runs.reduce((worst, run) => worst.failed > run.failed ? worst : run),
    bestRun: runs.reduce((best, run) => best.passed > run.passed ? best : run),
  }
}

export function computeHealthScore(analysis: ReturnType<typeof analyseRuns>): number {
  const adjustment = analysis.passRateTrend === 'Improving' ? 3 : analysis.passRateTrend === 'Degrading' ? -5 : 0
  return Math.max(0, Math.min(100, Math.round(analysis.avgPassRate + adjustment)))
}

export async function synthesiseReleaseNotes(
  runs: RunSummary[],
  facts: ReleaseNotesFacts,
  gateway: AiGateway = createAiGatewayFromEnvironment(),
): Promise<ReleaseNotesAdvisory> {
  const appName = getAppName()
  const input: ReleaseNotesInput = {
    appName,
    evidenceBoundary: 'run-level-release-notes-evidence',
    period: facts.period,
    runsAnalysed: facts.runsAnalysed,
    averagePassRatePercent: facts.averagePassRatePercent,
    passRateTrend: facts.passRateTrend,
    totalSuiteSize: facts.totalSuiteSize,
    totalFailures: facts.totalFailures,
    averageDurationMs: facts.averageDurationMs,
    bestRun: facts.bestRun,
    worstRun: facts.worstRun,
    healthScore: facts.healthScore,
    branch: facts.branch,
    version: facts.version,
    recentRuns: runs.slice(-5).map(run => ({
      runId: run.runId,
      startedAt: run.startedAt,
      durationMs: run.durationMs,
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      passRatePercent: Number(run.passRate.toFixed(1)),
    })),
    gitCommits: facts.gitCommits.slice(0, 15),
    limitations: ['Per-test detail is unavailable (TD-056).'],
  }
  const result = await gateway.execute<ReleaseNotesOutput>({
    requestId: `release-notes:${runs.at(-1)?.runId ?? 'unbound'}:${randomUUID()}`,
    capability: 'generate-release-notes',
    input,
    outputSchemaId: 'forge.ai.release-notes.v1',
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 300_000,
    allowedProviders: ['hosted-open', 'local', 'openai', 'anthropic'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName, runId: runs.at(-1)?.runId },
  })
  if (result.status === 'SUCCESS') {
    return { status: 'AI_GENERATED', content: result.output, provenance: result.provenance }
  }
  return {
    status: 'AI_UNAVAILABLE',
    content: null,
    failure: { code: result.failure.code, message: result.failure.message, provenance: result.provenance },
  }
}

function provenance(advisory: ReleaseNotesAdvisory): AiGatewayProvenance {
  return advisory.status === 'AI_GENERATED' ? advisory.provenance : advisory.failure.provenance
}

export function buildReleaseNotesMarkdown(facts: ReleaseNotesFacts, advisory: ReleaseNotesAdvisory): string {
  const deterministic = `# FORGE Release Notes — ${facts.version}

## Deterministic Product Facts

- Period: ${facts.period}
- Runs analysed: ${facts.runsAnalysed}
- Average pass rate: ${facts.averagePassRatePercent.toFixed(1)}%
- Pass-rate trend: ${facts.passRateTrend}
- Total suite size: ${facts.totalSuiteSize}
- Total failures across window: ${facts.totalFailures}
- Average duration: ${Math.round(facts.averageDurationMs / 1000)}s
- Best run: ${facts.bestRun.passed}/${facts.bestRun.total} passed
- Worst run: ${facts.worstRun.failed}/${facts.worstRun.total} failed
- Health score: ${facts.healthScore}/100
- Branch: ${facts.branch}

## Evidence Boundary

${PER_TEST_STUB}. Per-test IDs, flaky or failing tests, new or resolved failures, risk tiers, browser bias, and per-test trends are not inferred.`
  const advisorySection = advisory.status === 'AI_UNAVAILABLE'
    ? `## AI Advisory — Unavailable

AI status: BLOCKED (${advisory.failure.code}) — ${advisory.failure.message}

No AI-authored synthesis is presented. The deterministic Product facts and git metadata remain available.`
    : `## AI Advisory Synthesis

The provider selected the bounded advisory emphasis and actions below. Product facts and prose rendering remain deterministic; this advisory does not change Product verdicts or release readiness.

### Selected Health Emphasis
${advisory.content.healthEmphasis}

### Selected Risk Emphasis
${advisory.content.riskEmphasis}

### Selected Trend Outlook
${advisory.content.trendOutlook}

### Selected Recommended Actions
${advisory.content.recommendedActionCodes.map(code => `- ${code}`).join('\n')}

### Deterministic Rendering of Product Facts

Across ${facts.runsAnalysed} runs, the Product-computed health score is ${facts.healthScore}/100, average pass rate is ${facts.averagePassRatePercent.toFixed(1)}%, and trend is ${facts.passRateTrend}. The window contains ${facts.totalFailures} run-level failures. Per-test detail remains unavailable under TD-056.`
  return `${deterministic}

${advisorySection}

## Recent Git Commits

${facts.gitCommits.map(commit => `- ${commit}`).join('\n')}

## Provider-Neutral Provenance

\`\`\`json
${JSON.stringify(provenance(advisory), null, 2)}
\`\`\`
`
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

export function generateHtmlReport(notes: ReleaseNotes): string {
  const status = notes.aiAdvisory.status === 'AI_GENERATED'
    ? 'AI advisory available'
    : `AI advisory unavailable — ${notes.aiAdvisory.failure.code}`
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FORGE Release Notes — ${escapeHtml(notes.version)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1.5rem;color:#172033}header,.card{border:1px solid #d8dee9;border-radius:10px;padding:1.2rem;margin-bottom:1rem}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.8rem}.metric{background:#f4f7fb;padding:.8rem;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere}.status{font-weight:700}</style></head>
<body><header><h1>FORGE Release Notes — ${escapeHtml(notes.version)}</h1><p>${escapeHtml(notes.period)} · ${notes.runsAnalysed} runs analysed</p><p class="status">${escapeHtml(status)}</p></header>
<section class="card"><h2>Deterministic Product Facts</h2><div class="facts"><div class="metric">Health: ${notes.healthScore}/100</div><div class="metric">Trend: ${notes.trend}</div><div class="metric">Average pass rate: ${notes.deterministicFacts.averagePassRatePercent.toFixed(1)}%</div><div class="metric">Failures: ${notes.deterministicFacts.totalFailures}</div></div></section>
<section class="card"><pre>${escapeHtml(notes.rawMarkdown)}</pre></section>
<footer>FORGE — Autonomous Quality Engineering · Provider-neutral AI advisory</footer></body></html>`
}

function gitCommand(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim() || fallback
  } catch {
    return fallback
  }
}

function getGitLog(since?: string): string[] {
  const command = since ? `git log --since="${since}" --oneline --no-merges` : 'git log -20 --oneline --no-merges'
  return gitCommand(command, '(git log unavailable)').split('\n').filter(Boolean)
}

export async function buildReleaseNotes(
  runs: RunSummary[],
  branch: string,
  version: string,
  gitCommits: string[],
  gateway: AiGateway = createAiGatewayFromEnvironment(),
): Promise<ReleaseNotes> {
  const analysis = analyseRuns(runs)
  const healthScore = computeHealthScore(analysis)
  const facts: ReleaseNotesFacts = {
    period: `${runs[0].startedAt.slice(0, 10)} → ${runs.at(-1)!.startedAt.slice(0, 10)}`,
    runsAnalysed: runs.length,
    averagePassRatePercent: Number(analysis.avgPassRate.toFixed(1)),
    passRateTrend: analysis.passRateTrend,
    totalSuiteSize: analysis.totalTests,
    totalFailures: analysis.totalFailures,
    averageDurationMs: Math.round(analysis.avgDurationMs),
    bestRun: { passed: analysis.bestRun.passed, total: analysis.bestRun.total },
    worstRun: { failed: analysis.worstRun.failed, total: analysis.worstRun.total },
    healthScore,
    branch,
    version,
    gitCommits: [...gitCommits],
  }
  const aiAdvisory = await synthesiseReleaseNotes(runs, facts, gateway)
  const rawMarkdown = buildReleaseNotesMarkdown(facts, aiAdvisory)
  return {
    version,
    period: facts.period,
    runsAnalysed: runs.length,
    generatedAt: new Date().toISOString(),
    headline: `${analysis.passRateTrend} — avg pass rate ${analysis.avgPassRate.toFixed(1)}%`,
    healthScore,
    trend: analysis.passRateTrend,
    gitCommits: [...gitCommits],
    rawMarkdown,
    deterministicFacts: facts,
    aiAdvisory,
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const sprintMode = args.includes('--sprint')
  const openFlag = args.includes('--open')
  const runsFlag = Number.parseInt(args.find(value => value.startsWith('--runs='))?.split('=')[1] ?? '0', 10)
  const repository = new RunRepository()
  const databaseRuns = await repository.findByApp(getAppName(), 100)
  if (databaseRuns.length === 0) throw new Error('No runs found in database. Run npm run test first.')
  const allRuns = [...databaseRuns].reverse().map(toRunSummary)
  const windowSize = runsFlag > 0 ? runsFlag : sprintMode ? 5 : 2
  const runs = allRuns.slice(-Math.min(windowSize, allRuns.length))
  const branch = gitCommand('git rev-parse --abbrev-ref HEAD', 'main')
  const version = gitCommand('git describe --tags --abbrev=0', `sha-${gitCommand('git rev-parse --short HEAD', 'unknown')}`)
  const notes = await buildReleaseNotes(runs, branch, version, getGitLog(runs[0].startedAt))
  fs.mkdirSync(path.dirname(MD_PATH), { recursive: true })
  fs.writeFileSync(MD_PATH, notes.rawMarkdown, 'utf8')
  fs.writeFileSync(JSON_PATH, JSON.stringify(notes, null, 2), 'utf8')
  fs.writeFileSync(HTML_PATH, generateHtmlReport(notes), 'utf8')
  console.log(`Release Notes generated: ${MD_PATH}, ${HTML_PATH}, ${JSON_PATH}`)
  console.log(notes.aiAdvisory.status === 'AI_GENERATED'
    ? `AI advisory generated by ${notes.aiAdvisory.provenance.provider ?? 'unconfigured provider'}.`
    : `AI advisory unavailable (${notes.aiAdvisory.failure.code}); deterministic report generated.`)
  if (openFlag) {
    const absolutePath = path.resolve(HTML_PATH)
    const command = process.platform === 'win32' ? `start "" "${absolutePath}"`
      : process.platform === 'darwin' ? `open "${absolutePath}"` : `xdg-open "${absolutePath}"`
    exec(command)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exitCode = 1
  })
}
