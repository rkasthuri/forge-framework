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
 * Opt-in real-router evaluation of the hosted-open provider. It uses the exact
 * bounded cases shared with the local Ollama evaluator and writes no Product state.
 */

import {
  AiCapabilityRequest,
  AiCapabilityResult,
  AdaptiveFixSuggestionOutput,
  FailureAnalysisOutput,
  TestGapAnalysisOutput,
  TrendNarrativeOutput,
  createAiGatewayFromEnvironment,
  groundedTrendNarrative,
} from '../src/core/ai/gateway'
import {
  adaptiveFixCases,
  hasGroundedRcaEvidence,
  rcaCases,
  testGapCases,
  trendNarrativeCases,
} from './ai-gateway-bounded-evaluation-cases'

type Readiness = 'HOSTED_OPEN_CAPABLE' | 'HOSTED_OPEN_NOT_CAPABLE' | 'HOSTED_OPEN_NEEDS_MORE_EVAL'
type RouteIdentityStatus = 'PROVEN' | 'UNAVAILABLE'

interface CaseResult {
  id: string
  capability: 'analyze-failure' | 'analyze-test-gaps' | 'suggest-test-fix' | 'generate-trend-narrative'
  expected: string
  status: 'PASS' | 'SEMANTIC_MISMATCH' | 'FAILURE'
  output?: unknown
  failure?: unknown
  evidenceGrounded?: boolean
  routeIdentityStatus: RouteIdentityStatus
  provenance: unknown
}

interface CapabilitySummary {
  casesAttempted: number
  structuredOutputSuccesses: number
  schemaFailures: number
  evidenceGroundingFailures: number
  evidenceGroundingNotEvaluated: number
  semanticMismatches: number
  latencyMs: { minimum: number; maximum: number; mean: number }
  usageActuallySupplied: {
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    costUsd: number | null
    estimatedCostUsd: number | null
  }
  readiness: Readiness
}

function baseRequest<TInput>(
  id: string,
  capability: 'analyze-failure' | 'analyze-test-gaps' | 'suggest-test-fix' | 'generate-trend-narrative',
  outputSchemaId: string,
  input: TInput,
): AiCapabilityRequest<TInput> {
  return {
    requestId: `hosted-open-eval:${id}`,
    capability,
    input,
    outputSchemaId,
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 90_000,
    allowedProviders: ['hosted-open'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: 'evaluation-app' },
  }
}

function providerProof(result: AiCapabilityResult<unknown>, configuredModel: string): boolean {
  return result.provenance.provider === 'hosted-open'
    && result.provenance.providerRuntime === 'hugging-face-router'
    && result.provenance.configuredModel === configuredModel
    && typeof result.provenance.responseModel === 'string'
    && result.provenance.responseModel.trim() !== ''
    && typeof result.provenance.routedProvider === 'string'
    && result.provenance.routedProvider.trim() !== ''
    && result.provenance.attemptedProviders.join(',') === 'hosted-open'
    && result.provenance.fallbackOccurred === false
}

function readiness(cases: CaseResult[]): Readiness {
  if (cases.some(item => item.status === 'FAILURE')) return 'HOSTED_OPEN_NOT_CAPABLE'
  if (cases.some(item => item.status === 'SEMANTIC_MISMATCH')) return 'HOSTED_OPEN_NEEDS_MORE_EVAL'
  if (cases.some(item => item.routeIdentityStatus === 'UNAVAILABLE')) return 'HOSTED_OPEN_NEEDS_MORE_EVAL'
  return 'HOSTED_OPEN_CAPABLE'
}

function suppliedTotal(
  cases: CaseResult[],
  field: 'inputTokens' | 'outputTokens' | 'totalTokens' | 'costUsd' | 'estimatedCostUsd',
): number | null {
  const values = cases.flatMap(item => {
    const usage = (item.provenance as { usage?: Record<string, unknown> }).usage
    const value = usage?.[field]
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? [value] : []
  })
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0)
}

function capabilitySummary(cases: CaseResult[]): CapabilitySummary {
  const latencies = cases.map(item => {
    const provenance = item.provenance as { durationMs?: unknown }
    return typeof provenance.durationMs === 'number' ? provenance.durationMs : 0
  })
  return {
    casesAttempted: cases.length,
    structuredOutputSuccesses: cases.filter(item => item.status !== 'FAILURE').length,
    schemaFailures: cases.filter(item => (item.failure as { code?: unknown } | undefined)?.code === 'SCHEMA_VIOLATION').length,
    evidenceGroundingFailures: cases.filter(item => item.evidenceGrounded === false).length,
    evidenceGroundingNotEvaluated: cases.filter(item => item.evidenceGrounded === undefined).length,
    semanticMismatches: cases.filter(item => item.status === 'SEMANTIC_MISMATCH').length,
    latencyMs: {
      minimum: Math.min(...latencies),
      maximum: Math.max(...latencies),
      mean: Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length),
    },
    usageActuallySupplied: {
      inputTokens: suppliedTotal(cases, 'inputTokens'),
      outputTokens: suppliedTotal(cases, 'outputTokens'),
      totalTokens: suppliedTotal(cases, 'totalTokens'),
      costUsd: suppliedTotal(cases, 'costUsd'),
      estimatedCostUsd: suppliedTotal(cases, 'estimatedCostUsd'),
    },
    readiness: readiness(cases),
  }
}

async function main(): Promise<void> {
  const configuredModel = process.env.FORGE_AI_HOSTED_OPEN_MODEL ?? 'openai/gpt-oss-120b:cheapest'
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
    FORGE_AI_HOSTED_OPEN_BASE_URL: process.env.FORGE_AI_HOSTED_OPEN_BASE_URL
      ?? 'https://router.huggingface.co/v1',
    FORGE_AI_HOSTED_OPEN_MODEL: configuredModel,
    FORGE_AI_HOSTED_OPEN_TIMEOUT_MS: process.env.FORGE_AI_HOSTED_OPEN_TIMEOUT_MS ?? '90000',
    FORGE_AI_FALLBACK_PROVIDERS: '',
  }
  const gateway = createAiGatewayFromEnvironment(environment)
  const results: CaseResult[] = []

  for (const item of rcaCases) {
    const result = await gateway.execute<FailureAnalysisOutput>(baseRequest(
      item.id, 'analyze-failure', 'forge.ai.failure-analysis.v1', item.input,
    ))
    const evidenceGrounded = result.status === 'SUCCESS'
      ? hasGroundedRcaEvidence(result.output.evidence, item.evidenceAnchors)
      : undefined
    const semanticPass = result.status === 'SUCCESS'
      && result.output.verdict === item.expectedVerdict
      && result.output.reasoning.trim() !== ''
      && evidenceGrounded
      && providerProof(result, configuredModel)
    results.push({
      id: item.id,
      capability: 'analyze-failure',
      expected: item.expectedVerdict,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded,
      routeIdentityStatus: result.provenance.routedProvider && result.provenance.responseModel
        ? 'PROVEN'
        : 'UNAVAILABLE',
      provenance: result.provenance,
    })
  }

  for (const item of testGapCases) {
    const result = await gateway.execute<TestGapAnalysisOutput>(baseRequest(
      item.id, 'analyze-test-gaps', 'forge.ai.test-gap-analysis.v1', item.input,
    ))
    const semanticPass = result.status === 'SUCCESS'
      && result.output.analysisStatus === item.expectedStatus
      && providerProof(result, configuredModel)
    results.push({
      id: item.id,
      capability: 'analyze-test-gaps',
      expected: item.expectedStatus,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded: result.status === 'SUCCESS' ? true : undefined,
      routeIdentityStatus: result.provenance.routedProvider && result.provenance.responseModel
        ? 'PROVEN'
        : 'UNAVAILABLE',
      provenance: result.provenance,
    })
  }

  for (const item of adaptiveFixCases) {
    const result = await gateway.execute<AdaptiveFixSuggestionOutput>(baseRequest(
      item.id, 'suggest-test-fix', 'forge.ai.adaptive-fix-suggestion.v1', item.input,
    ))
    const evidenceGrounded = result.status === 'SUCCESS'
      ? item.input.source.exactTestSnippet.includes(result.output.currentCode)
      : undefined
    const semanticPass = result.status === 'SUCCESS'
      && result.output.fixCategory === item.expectedCategory
      && evidenceGrounded
      && providerProof(result, configuredModel)
    results.push({
      id: item.id,
      capability: 'suggest-test-fix',
      expected: item.expectedCategory,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded,
      routeIdentityStatus: result.provenance.routedProvider && result.provenance.responseModel
        ? 'PROVEN'
        : 'UNAVAILABLE',
      provenance: result.provenance,
    })
  }

  for (const item of trendNarrativeCases) {
    const result = await gateway.execute<TrendNarrativeOutput>(baseRequest(
      item.id, 'generate-trend-narrative', 'forge.ai.trend-narrative.v1', item.input,
    ))
    const evidenceGrounded = result.status === 'SUCCESS'
      ? result.output.narrative === groundedTrendNarrative(item.input)
      : undefined
    const semanticPass = result.status === 'SUCCESS'
      && result.output.narrative.trim() !== ''
      && evidenceGrounded
      && providerProof(result, configuredModel)
    results.push({
      id: item.id,
      capability: 'generate-trend-narrative',
      expected: 'non-empty bounded narrative',
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded,
      routeIdentityStatus: result.provenance.routedProvider && result.provenance.responseModel
        ? 'PROVEN'
        : 'UNAVAILABLE',
      provenance: result.provenance,
    })
  }

  const rcaResults = results.filter(item => item.capability === 'analyze-failure')
  const gapResults = results.filter(item => item.capability === 'analyze-test-gaps')
  const adaptiveFixResults = results.filter(item => item.capability === 'suggest-test-fix')
  const trendNarrativeResults = results.filter(item => item.capability === 'generate-trend-narrative')
  const report = {
    reportSchema: 'forge.ai.hosted-open-evaluation.v1',
    router: 'hugging-face-inference-providers',
    configuredModel,
    comparisonBaseline: {
      evaluator: 'evaluate-ai-gateway-local-ollama.ts',
      exactSharedCaseIds: [...rcaCases, ...testGapCases, ...adaptiveFixCases, ...trendNarrativeCases]
        .map(item => item.id),
    },
    gatewayFallback: false,
    upstreamRoutingPolicy: configuredModel.endsWith(':cheapest')
      ? 'hugging-face-cheapest-dynamic-routing'
      : 'model-configuration-defined',
    persistedProductState: false,
    capabilities: {
      analyzeFailure: capabilitySummary(rcaResults),
      analyzeTestGaps: capabilitySummary(gapResults),
      suggestTestFix: capabilitySummary(adaptiveFixResults),
      generateTrendNarrative: capabilitySummary(trendNarrativeResults),
    },
    cases: results,
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = results.every(item => item.status === 'PASS') ? 0 : 1
}

void main()
