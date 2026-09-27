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
 * Opt-in, real-runtime evaluation for the AI Gateway capabilities approved
 * for local Ollama. This script uses bounded synthetic evidence and writes no
 * Product state. It is intentionally excluded from the deterministic test glob.
 */

import {
  AiCapabilityRequest,
  AiCapabilityResult,
  AdaptiveFixSuggestionOutput,
  FailureAnalysisOutput,
  TestGapAnalysisOutput,
  createAiGatewayFromEnvironment,
} from '../src/core/ai/gateway'
import {
  adaptiveFixCases,
  hasGroundedRcaEvidence,
  rcaCases,
  testGapCases,
} from './ai-gateway-bounded-evaluation-cases'

type Readiness = 'LOCAL_CAPABLE' | 'LOCAL_NOT_CAPABLE' | 'LOCAL_NEEDS_MORE_EVAL'

interface CaseResult {
  id: string
  capability: 'analyze-failure' | 'analyze-test-gaps' | 'suggest-test-fix'
  expected: string
  status: 'PASS' | 'SEMANTIC_MISMATCH' | 'FAILURE'
  output?: unknown
  failure?: unknown
  evidenceGrounded?: boolean
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
  readiness: Readiness
}

function baseRequest<TInput>(
  id: string,
  capability: 'analyze-failure' | 'analyze-test-gaps' | 'suggest-test-fix',
  outputSchemaId: string,
  input: TInput,
): AiCapabilityRequest<TInput> {
  return {
    requestId: `local-eval:${id}`,
    capability,
    input,
    outputSchemaId,
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'local-only',
    timeoutMs: 300_000,
    allowedProviders: ['local'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: 'evaluation-app' },
  }
}

function providerProof(result: AiCapabilityResult<unknown>): boolean {
  return result.provenance.provider === 'local'
    && result.provenance.providerRuntime === 'ollama'
    && result.provenance.configuredModel === 'qwen3:8b'
    && result.provenance.attemptedProviders.join(',') === 'local'
    && result.provenance.fallbackOccurred === false
}

function readiness(cases: CaseResult[]): Readiness {
  if (cases.some(item => item.status === 'FAILURE')) return 'LOCAL_NOT_CAPABLE'
  if (cases.some(item => item.status === 'SEMANTIC_MISMATCH')) return 'LOCAL_NEEDS_MORE_EVAL'
  return 'LOCAL_CAPABLE'
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
    readiness: readiness(cases),
  }
}

async function main(): Promise<void> {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    FORGE_AI_PRIMARY_PROVIDER: 'local',
    FORGE_AI_LOCAL_RUNTIME: 'ollama',
    FORGE_AI_LOCAL_BASE_URL: process.env.FORGE_AI_LOCAL_BASE_URL ?? 'http://127.0.0.1:11434',
    FORGE_AI_LOCAL_MODEL: process.env.FORGE_AI_LOCAL_MODEL ?? 'qwen3:8b',
    FORGE_AI_LOCAL_TIMEOUT_MS: process.env.FORGE_AI_LOCAL_TIMEOUT_MS ?? '300000',
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
      && providerProof(result)
    results.push({
      id: item.id,
      capability: 'analyze-failure',
      expected: item.expectedVerdict,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded,
      provenance: result.provenance,
    })
  }

  for (const item of testGapCases) {
    const result = await gateway.execute<TestGapAnalysisOutput>(baseRequest(
      item.id, 'analyze-test-gaps', 'forge.ai.test-gap-analysis.v1', item.input,
    ))
    const semanticPass = result.status === 'SUCCESS'
      && result.output.analysisStatus === item.expectedStatus
      && providerProof(result)
    results.push({
      id: item.id,
      capability: 'analyze-test-gaps',
      expected: item.expectedStatus,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      // Gateway schema validation rejects every reference not present in input.
      evidenceGrounded: result.status === 'SUCCESS' ? true : undefined,
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
      && providerProof(result)
    results.push({
      id: item.id,
      capability: 'suggest-test-fix',
      expected: item.expectedCategory,
      status: result.status === 'FAILURE' ? 'FAILURE' : semanticPass ? 'PASS' : 'SEMANTIC_MISMATCH',
      output: result.status === 'SUCCESS' ? result.output : undefined,
      failure: result.status === 'FAILURE' ? result.failure : undefined,
      evidenceGrounded,
      provenance: result.provenance,
    })
  }

  const rcaResults = results.filter(item => item.capability === 'analyze-failure')
  const gapResults = results.filter(item => item.capability === 'analyze-test-gaps')
  const adaptiveFixResults = results.filter(item => item.capability === 'suggest-test-fix')
  const report = {
    reportSchema: 'forge.ai.local-ollama-evaluation.v1',
    runtime: 'ollama',
    configuredModel: 'qwen3:8b',
    thinking: false,
    fallback: false,
    persistedProductState: false,
    capabilities: {
      analyzeFailure: capabilitySummary(rcaResults),
      analyzeTestGaps: capabilitySummary(gapResults),
      suggestTestFix: capabilitySummary(adaptiveFixResults),
    },
    cases: results,
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = results.some(item => item.status === 'FAILURE') ? 1 : 0
}

void main()
