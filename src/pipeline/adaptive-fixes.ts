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

/**
 * Adaptive Fixes produces advisory, provider-neutral repair candidates.
 * It writes reports only. It has no authority to modify test source or persist
 * an executed repair; those actions belong to a future governed capability.
 */

import { createHash, randomUUID } from 'crypto'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'
import {
  AdaptiveFixCategory,
  AdaptiveFixRisk,
  AdaptiveFixSuggestionInput,
  AdaptiveFixSuggestionOutput,
  AiGateway,
  AiGatewayFailureCode,
  AiGatewayProvenance,
  createAiGatewayFromEnvironment,
} from '../core/ai/gateway'
import { getAppName, getBaseUrl } from '../core/config/appConfig'
import { AiTriageRepository } from '../core/storage/repositories/AiTriageRepository'
import {
  ALL_TRIAGE_CATEGORIES,
  TriageCategory,
  TRIAGE_DISPLAY,
} from '../core/triage/taxonomy'

dotenv.config()

export interface TriageFailure {
  verdict: TriageCategory
  confidence: string
  reasoning: string
  suggestedAction: string
  test: {
    testTitle: string
    suiteName: string
    file: string
    browserName: string
    priority: string
    errorMessage: string
    errorStack: string
    retries: number
    isTaggedFlaky: boolean
    isTaggedSlow: boolean
    runId?: string
  }
}

export interface TriageReport {
  runId: string | null
  runTimestamp: string
  totalFailed: number
  summary: Record<TriageCategory, number>
  results: TriageFailure[]
}

export type TestSourceEvidence = {
  availability: 'available'
  source: string
  resolvedRepositoryPath: string
} | {
  availability: 'unavailable'
  source: ''
}

export interface FixSuggestion {
  testTitle: string
  file: string
  browser: string
  verdict: TriageCategory
  fixCategory: AdaptiveFixCategory | 'unavailable'
  risk: AdaptiveFixRisk
  explanation: string
  currentCode: string
  suggestedCode: string
  autoApplied: false
  advisoryStatus: 'CANDIDATE' | 'BLOCKED_AI'
  aiFailure?: {
    code: AiGatewayFailureCode
    message: string
  }
  provenance: AiGatewayProvenance
  inputEvidence: AdaptiveFixSuggestionInput
  sourceBinding: {
    availability: TestSourceEvidence['availability']
    resolvedRepositoryPath?: string
    exactTestSnippetSha256: string
  }
}

interface StoredTriageRow {
  test_id: string
  failure_category: string
  confidence: number
  root_cause: string
  suggested_fix: string
}

interface TriageLookup {
  findByRun(runId: string): Promise<StoredTriageRow[]>
}

const CONFIG = {
  triageReport: 'reports/triage-report.json',
  outputMd: 'reports/suggested-fixes.md',
  outputJson: 'reports/suggested-fixes.json',
}

export async function main(): Promise<void> {
  console.log('\n🔧 Adaptive Fixes — generating advisory suggestions...\n')

  const triage = await loadTriageReport()
  if (!triage.results?.length) {
    console.log('✅ No failures in triage report — nothing to analyze.\n')
    return
  }

  const uniqueFailures = deduplicateByTest(triage.results)
  console.log(`📋 ${triage.results.length} failure(s) → ${uniqueFailures.length} unique test(s) to analyze\n`)

  const gateway = createAiGatewayFromEnvironment(process.env)
  if (!triage.runId) {
    console.warn('⚠️  Canonical triage runId unavailable; Adaptive Fix requests will be explicitly unbound.')
  }
  const suggestions: FixSuggestion[] = []
  for (let index = 0; index < uniqueFailures.length; index += 1) {
    const failure = uniqueFailures[index]
    const icon = TRIAGE_DISPLAY[failure.verdict]?.icon ?? '❓'
    console.log(`  [${index + 1}/${uniqueFailures.length}] ${icon} ${failure.test.testTitle}`)
    suggestions.push(await generateFix(gateway, failure, resolveTestSource(failure.test.file)))
  }

  fs.mkdirSync(path.dirname(CONFIG.outputMd), { recursive: true })
  fs.writeFileSync(CONFIG.outputMd, buildMarkdown(triage, suggestions), 'utf-8')
  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(suggestions, null, 2), 'utf-8')
  printSummary(suggestions)
}

export async function loadTriageReport(
  reportPath = CONFIG.triageReport,
  repository: TriageLookup = new AiTriageRepository(),
): Promise<TriageReport> {
  const fileReport = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as TriageReport
    : null
  const runId = canonicalRunId(fileReport?.runId)
  const dbRows = runId ? await repository.findByRun(runId) : []

  if (runId && dbRows.length) {
    return {
      runId,
      runTimestamp: fileReport?.runTimestamp ?? '',
      totalFailed: dbRows.length,
      summary: Object.fromEntries(ALL_TRIAGE_CATEGORIES.map(category => [
        category,
        dbRows.filter(row => row.failure_category === category).length,
      ])) as Record<TriageCategory, number>,
      results: dbRows.map(row => ({
        verdict: row.failure_category as TriageCategory,
        confidence: String(row.confidence),
        reasoning: row.root_cause,
        suggestedAction: row.suggested_fix,
        test: {
          testTitle: row.test_id.split('::')[1] ?? row.test_id,
          suiteName: '',
          file: row.test_id.split('::')[0] ?? '',
          browserName: row.test_id.split('::')[2] ?? 'unknown',
          priority: 'Unknown',
          errorMessage: '',
          errorStack: '',
          retries: 0,
          isTaggedFlaky: false,
          isTaggedSlow: false,
          runId,
        },
      })),
    }
  }
  if (fileReport) {
    return {
      ...fileReport,
      runId,
      results: fileReport.results.map(result => bindCanonicalRunId(result, runId)),
    }
  }
  throw new Error('No triage data available. Run triage first.')
}

function canonicalRunId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function bindCanonicalRunId(failure: TriageFailure, runId: string | null): TriageFailure {
  const test = { ...failure.test }
  delete test.runId
  if (runId) test.runId = runId
  return { ...failure, test }
}

export function deduplicateByTest(results: TriageFailure[]): TriageFailure[] {
  const seen = new Set<string>()
  return results.filter(result => {
    const key = `${result.test.file}::${result.test.testTitle}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function resolveTestSource(
  reportedPath: string,
  repositoryRoot = process.cwd(),
): TestSourceEvidence {
  const normalized = reportedPath.replace(/\\/g, '/')
  if (!normalized
    || normalized.includes('\0')
    || normalized.startsWith('/')
    || /^[A-Za-z]:\//.test(normalized)) {
    return { availability: 'unavailable', source: '' }
  }

  const segments = normalized.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
    return { availability: 'unavailable', source: '' }
  }

  let realRoot: string
  try {
    realRoot = fs.realpathSync(repositoryRoot)
  } catch {
    return { availability: 'unavailable', source: '' }
  }

  const candidateSegments = [
    ['src', 'tests', ...segments],
    segments,
    ['src', 'apps', ...segments],
  ]
  const matches = new Map<string, { realPath: string; repositoryPath: string }>()
  for (const candidateParts of candidateSegments) {
    const candidate = path.resolve(realRoot, ...candidateParts)
    if (!isWithinRoot(realRoot, candidate) || !fs.existsSync(candidate)) continue
    try {
      const realPath = fs.realpathSync(candidate)
      if (!isWithinRoot(realRoot, realPath) || !fs.statSync(realPath).isFile()) continue
      const repositoryPath = path.relative(realRoot, realPath).split(path.sep).join('/')
      matches.set(realPath, { realPath, repositoryPath })
    } catch {
      continue
    }
  }

  // More than one explicit repository candidate is ambiguous. The former
  // basename-only fallback is intentionally not used for path-bearing input.
  if (matches.size !== 1) return { availability: 'unavailable', source: '' }
  const match = [...matches.values()][0]
  return {
    availability: 'available',
    source: fs.readFileSync(match.realPath, 'utf-8'),
    resolvedRepositoryPath: match.repositoryPath,
  }
}

function isWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

export async function generateFix(
  gateway: AiGateway,
  failure: TriageFailure,
  source: TestSourceEvidence,
): Promise<FixSuggestion> {
  const exactTestSnippet = source.availability === 'available'
    ? extractTestSnippet(source.source, failure.test.testTitle)
    : ''
  const boundSourceAvailability: TestSourceEvidence['availability'] = exactTestSnippet
    ? 'available'
    : 'unavailable'
  const input: AdaptiveFixSuggestionInput = {
    appName: getAppName(),
    baseUrl: getBaseUrl(),
    failure: structuredClone(failure),
    source: { availability: boundSourceAvailability, exactTestSnippet },
  }
  const result = await gateway.execute<AdaptiveFixSuggestionOutput>({
    requestId: `adaptive-fix:${failure.test.runId ?? 'unbound'}:${randomUUID()}`,
    capability: 'suggest-test-fix',
    input,
    outputSchemaId: 'forge.ai.adaptive-fix-suggestion.v1',
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 300_000,
    allowedProviders: ['hosted-open', 'local', 'openai', 'anthropic'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: getAppName(), runId: failure.test.runId },
  })
  const common = {
    testTitle: failure.test.testTitle,
    file: failure.test.file,
    browser: failure.test.browserName,
    verdict: failure.verdict,
    autoApplied: false as const,
    provenance: result.provenance,
    inputEvidence: structuredClone(input),
    sourceBinding: {
      availability: boundSourceAvailability,
      ...(boundSourceAvailability === 'available' && source.availability === 'available'
        ? { resolvedRepositoryPath: source.resolvedRepositoryPath }
        : {}),
      exactTestSnippetSha256: createHash('sha256').update(exactTestSnippet).digest('hex'),
    },
  }

  if (result.status === 'FAILURE') {
    console.warn(`  ⚠️  AI advisory unavailable (${result.failure.code}): ${result.failure.message}`)
    return {
      ...common,
      fixCategory: 'unavailable',
      risk: 'Review',
      explanation: `AI advisory unavailable (${result.failure.code}) — manual review required.`,
      currentCode: '',
      suggestedCode: '',
      advisoryStatus: 'BLOCKED_AI',
      aiFailure: { code: result.failure.code, message: result.failure.message },
    }
  }

  return { ...common, ...result.output, advisoryStatus: 'CANDIDATE' }
}

export function extractTestSnippet(source: string, testTitle: string): string {
  const sourceFile = ts.createSourceFile(
    'adaptive-fix-source.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const parseDiagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.Diagnostic[]
  }).parseDiagnostics ?? []
  if (parseDiagnostics.length > 0) return ''
  const matches: ts.CallExpression[] = []
  const isTestCallee = (expression: ts.Expression): boolean => {
    if (ts.isIdentifier(expression)) return expression.text === 'test' || expression.text === 'it'
    return ts.isPropertyAccessExpression(expression)
      && ts.isIdentifier(expression.expression)
      && (expression.expression.text === 'test' || expression.expression.text === 'it')
      && ['only', 'skip', 'fixme'].includes(expression.name.text)
  }
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      const title = node.arguments[0]
      if ((ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title))
        && title.text === testTitle) matches.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  // Duplicate exact titles are ambiguous; fail closed instead of binding a
  // candidate to whichever declaration happened to appear first.
  if (matches.length !== 1) return ''
  return source.slice(matches[0].getStart(sourceFile), matches[0].getEnd())
}

export function buildMarkdown(triage: TriageReport, suggestions: FixSuggestion[]): string {
  const safe = suggestions.filter(suggestion => suggestion.risk === 'Safe' && suggestion.advisoryStatus === 'CANDIDATE')
  const review = suggestions.filter(suggestion => suggestion.risk === 'Review' && suggestion.advisoryStatus === 'CANDIDATE')
  const blocked = suggestions.filter(suggestion => suggestion.advisoryStatus === 'BLOCKED_AI')
  const lines = [
    '# Adaptive Fix Suggestions — Advisory Only',
    '',
    '> AI-generated repair candidates are never auto-applied. Every candidate requires human review and separate authorization before any source change.',
    '',
    `**Generated:** ${new Date().toLocaleString()}  `,
    `**Based on:** ${triage.totalFailed} failure(s) from triage report`,
    '',
    '## Summary',
    '',
    '| Review class | Count |',
    '|---|---|',
    `| Safe advisory candidates (still require review) | ${safe.length} |`,
    `| Human-review candidates | ${review.length} |`,
    `| AI advisory unavailable | ${blocked.length} |`,
    `| Total | ${suggestions.length} |`,
    '',
  ]

  if (safe.length) {
    lines.push('## Safe Advisory Candidates', '', '> These are classified Safe, but have not been applied and still require human review.', '')
    for (const suggestion of safe) lines.push(...formatFixBlock(suggestion))
  }
  if (review.length) {
    lines.push('## Needs Human Review', '')
    for (const suggestion of review) lines.push(...formatFixBlock(suggestion))
  }
  if (blocked.length) {
    lines.push('## AI Advisory Unavailable', '')
    for (const suggestion of blocked) lines.push(...formatFixBlock(suggestion))
  }
  return `${lines.join('\n')}\n`
}

function formatFixBlock(suggestion: FixSuggestion): string[] {
  const lines = [
    `### \`${suggestion.testTitle}\``,
    `- **File:** \`${suggestion.file}\``,
    `- **Resolved source:** ${suggestion.sourceBinding.resolvedRepositoryPath ? `\`${suggestion.sourceBinding.resolvedRepositoryPath}\`` : 'unavailable'}`,
    `- **Exact snippet SHA-256:** \`${suggestion.sourceBinding.exactTestSnippetSha256}\``,
    `- **Verdict:** ${suggestion.verdict} · **Fix type:** ${suggestion.fixCategory} · **Risk:** ${suggestion.risk}`,
    `- **Status:** ${suggestion.advisoryStatus} · **Auto-applied:** false`,
    `- **Explanation:** ${suggestion.explanation}`,
    `- **Provider:** ${suggestion.provenance.provider ?? 'none'}`,
    `- **Runtime:** ${suggestion.provenance.providerRuntime ?? 'none'}`,
    `- **Configured model:** ${suggestion.provenance.configuredModel ?? 'none'}`,
    `- **Response model:** ${suggestion.provenance.responseModel ?? 'not supplied'}`,
    `- **Request ID:** ${suggestion.provenance.requestId}`,
    `- **Capability:** ${suggestion.provenance.capability}`,
    `- **Output schema:** ${suggestion.provenance.outputSchemaId}`,
    `- **Attempted providers:** ${suggestion.provenance.attemptedProviders.join(', ') || 'none'}`,
    `- **Fallback occurred:** ${suggestion.provenance.fallbackOccurred}`,
    `- **Duration:** ${suggestion.provenance.durationMs} ms`,
  ]
  if (suggestion.provenance.providerRequestId) {
    lines.push(`- **Provider request ID:** ${suggestion.provenance.providerRequestId}`)
  }
  if (suggestion.provenance.usage
    && [
      suggestion.provenance.usage.inputTokens,
      suggestion.provenance.usage.outputTokens,
      suggestion.provenance.usage.totalTokens,
    ].some(value => value !== undefined)) {
    const usage = suggestion.provenance.usage
    lines.push(`- **Token usage:** input=${usage.inputTokens ?? 'not supplied'}, output=${usage.outputTokens ?? 'not supplied'}, total=${usage.totalTokens ?? 'not supplied'}`)
  }
  lines.push('')
  if (suggestion.currentCode || suggestion.suggestedCode) {
    lines.push(
      '**Current code:**', '```typescript', suggestion.currentCode, '```', '',
      '**Suggested candidate:**', '```typescript', suggestion.suggestedCode, '```', '',
    )
  }
  lines.push('---', '')
  return lines
}

function printSummary(suggestions: FixSuggestion[]): void {
  const safe = suggestions.filter(suggestion => suggestion.risk === 'Safe' && suggestion.advisoryStatus === 'CANDIDATE').length
  const review = suggestions.filter(suggestion => suggestion.risk === 'Review' && suggestion.advisoryStatus === 'CANDIDATE').length
  const blocked = suggestions.filter(suggestion => suggestion.advisoryStatus === 'BLOCKED_AI').length
  console.log('\n──────────────────────────────────')
  console.log('  ADAPTIVE FIXES — ADVISORY ONLY')
  console.log('──────────────────────────────────')
  console.log(`  Safe candidates: ${safe}`)
  console.log(`  Needs review:    ${review}`)
  console.log(`  AI unavailable:  ${blocked}`)
  console.log('  Auto-applied:    0')
  console.log('──────────────────────────────────\n')
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('\n❌ Fatal:', error)
    process.exitCode = 1
  })
}
