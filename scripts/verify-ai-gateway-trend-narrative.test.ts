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

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import {
  AiGateway,
  AiGatewayConfiguration,
  AiGatewayFailureCode,
  AiProviderAdapter,
  AiProviderId,
  ProviderInvocation,
  ProviderResult,
  trendNarrativeCapability,
} from '../src/core/ai/gateway'
import {
  buildDashboard,
  buildMarkdown,
  buildSummary,
  RunSummary,
} from '../src/pipeline/trend-analysis'

const runs: RunSummary[] = [
  { runId: 'run-1', startedAt: '2026-09-21T00:00:00.000Z', durationMs: 120_000, total: 10, passed: 8, failed: 2, skipped: 0, passRate: 80 },
  { runId: 'run-2', startedAt: '2026-09-22T00:00:00.000Z', durationMs: 110_000, total: 10, passed: 9, failed: 1, skipped: 0, passRate: 90 },
  { runId: 'run-3', startedAt: '2026-09-23T00:00:00.000Z', durationMs: 100_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-4', startedAt: '2026-09-24T00:00:00.000Z', durationMs: 90_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-5', startedAt: '2026-09-25T00:00:00.000Z', durationMs: 80_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-6', startedAt: '2026-09-26T00:00:00.000Z', durationMs: 70_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
]

const validOutput = {
  narrative: 'Across the supplied recent runs, pass rates range from 90.0% to 100.0%, run-level failure counts range from 0 to 1, and the clean-run streak is 4. The average pass rate is 95.0%, while recent average duration is 80000 ms with a faster trend (27.0% change).',
}

function configuration(
  primaryProvider: AiProviderId,
  fallbackProviders: AiProviderId[] = [],
): AiGatewayConfiguration {
  return {
    primaryProvider,
    fallbackProviders,
    openai: { apiKey: 'configured', model: 'openai-test-model', timeoutMs: 1_000 },
    anthropic: { apiKey: undefined, model: 'anthropic-test-model', timeoutMs: 1_000 },
    local: {
      enabled: true,
      runtime: 'ollama',
      baseUrl: 'http://127.0.0.1:11434',
      model: 'local-test-model',
      timeoutMs: 1_000,
      thinking: false,
    },
    hostedOpen: {
      apiKey: 'configured',
      baseUrl: 'https://router.huggingface.co/v1',
      model: 'hosted-open-test-model',
      timeoutMs: 1_000,
    },
  }
}

class FakeProvider implements AiProviderAdapter {
  calls = 0
  invocation: ProviderInvocation | null = null
  readonly configuredModel: string | null

  constructor(
    readonly id: AiProviderId,
    private readonly result: ProviderResult,
  ) {
    this.configuredModel = result.configuredModel
  }

  isConfigured(): boolean {
    return true
  }

  async invoke(invocation: ProviderInvocation): Promise<ProviderResult> {
    this.calls += 1
    this.invocation = invocation
    return this.result
  }
}

function successProvider(
  id: AiProviderId,
  output: unknown = validOutput,
  includeUsage = true,
): FakeProvider {
  return new FakeProvider(id, {
    status: 'SUCCESS',
    provider: id,
    providerRuntime: id === 'hosted-open'
      ? 'hugging-face-router'
      : id === 'local'
        ? 'ollama'
        : undefined,
    routedProvider: id === 'hosted-open' ? 'hf-inference' : undefined,
    configuredModel: `${id}-configured-model`,
    responseModel: `${id}-response-model`,
    output,
    providerRequestId: `${id}-request-id`,
    ...(includeUsage ? { usage: { inputTokens: 60, outputTokens: 30, totalTokens: 90 } } : {}),
    ...(id === 'hosted-open' ? {
      responseDiagnostics: {
        httpStatus: 200,
        finishReason: 'stop',
        contentPresent: true,
        contentLength: JSON.stringify(output).length,
        structuredParseResult: 'SUCCEEDED' as const,
        configuredOutputTokenLimit: trendNarrativeCapability.maxOutputTokens,
      },
    } : {}),
  })
}

function failureProvider(code: AiGatewayFailureCode, id: AiProviderId): FakeProvider {
  assert.ok(!['UNKNOWN_CAPABILITY', 'NO_CONFIGURED_PROVIDER', 'NO_ALLOWED_PROVIDER', 'POLICY_BLOCKED'].includes(code))
  return new FakeProvider(id, {
    status: 'FAILURE',
    provider: id,
    providerRuntime: id === 'hosted-open'
      ? 'hugging-face-router'
      : id === 'local'
        ? 'ollama'
        : undefined,
    configuredModel: `${id}-configured-model`,
    code: code as Exclude<AiGatewayFailureCode,
      'UNKNOWN_CAPABILITY' | 'NO_CONFIGURED_PROVIDER' | 'NO_ALLOWED_PROVIDER' | 'POLICY_BLOCKED'>,
    message: 'raw provider detail must not escape',
  })
}

function gateway(primary: AiProviderId, providers: FakeProvider[]): AiGateway {
  return new AiGateway(configuration(primary), providers, [trendNarrativeCapability])
}

test('successful structured Trend Narrative preserves hosted-open provenance and diagnostics', async () => {
  const provider = successProvider('hosted-open')
  const summary = await buildSummary(runs, gateway('hosted-open', [provider]))
  assert.equal(summary.narrative.status, 'AI_GENERATED')
  assert.equal(summary.narrative.content, validOutput.narrative)
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.provider : null, 'hosted-open')
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.providerRuntime : null, 'hugging-face-router')
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.routedProvider : null, 'hf-inference')
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.responseDiagnostics?.structuredParseResult : null, 'SUCCEEDED')
  assert.equal(provider.invocation?.outputSchemaId, 'forge.ai.trend-narrative.v1')
  assert.deepEqual(provider.invocation?.outputSchema, trendNarrativeCapability.outputSchema)
})

test('Trend Narrative remains compatible with the local Ollama provider identity', async () => {
  const provider = successProvider('local')
  const summary = await buildSummary(runs, gateway('local', [provider]))
  assert.equal(summary.narrative.status, 'AI_GENERATED')
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.provider : null, 'local')
  assert.equal(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.providerRuntime : null, 'ollama')
  assert.deepEqual(summary.narrative.status === 'AI_GENERATED' ? summary.narrative.provenance.attemptedProviders : null, ['local'])
})

test('Trend Narrative prompt contains only bounded run-level evidence and the TD-056 limitation', async () => {
  const provider = successProvider('hosted-open')
  await buildSummary(runs, gateway('hosted-open', [provider]))
  const prompt = provider.invocation?.userPrompt ?? ''
  assert.match(prompt, /run-level-trend-evidence/)
  assert.match(prompt, /Per-test trend data not yet available/)
  assert.match(prompt, /"runId": "run-2"/)
  assert.doesNotMatch(prompt, /"runId": "run-1"/)
  assert.doesNotMatch(prompt, /testTitle|browserName|file|selector|errorStack|flaky count/i)
})

test('schema-invalid and per-test hallucinated provider output are rejected', async () => {
  const malformed = await buildSummary(runs, gateway('hosted-open', [successProvider('hosted-open', { narrative: 42 })]))
  assert.equal(malformed.narrative.status, 'DETERMINISTIC_FALLBACK')
  assert.equal(malformed.narrative.status === 'DETERMINISTIC_FALLBACK' ? malformed.narrative.aiFailure.code : null, 'SCHEMA_VIOLATION')

  for (const narrative of [
    'The checkout test has a growing failure trend.',
    'The observed behavior is flaky and unstable.',
    'Chromium shows browser bias across recent runs.',
    'A specific failure is worsening over time.',
    'Checkout repeatedly failed across recent runs.',
    'Login failures are increasing.',
    'Recent runs improved to 100%, but checkout is regressing.',
  ]) {
    const hallucinated = await buildSummary(runs, gateway('hosted-open', [successProvider('hosted-open', {
      narrative,
    })]))
    assert.equal(hallucinated.narrative.status, 'DETERMINISTIC_FALLBACK')
    assert.equal(hallucinated.narrative.status === 'DETERMINISTIC_FALLBACK' ? hallucinated.narrative.aiFailure.code : null, 'SCHEMA_VIOLATION')
  }
})

test('malformed provider response remains an explicit INVALID_RESPONSE failure', async () => {
  const summary = await buildSummary(runs, gateway('hosted-open', [failureProvider('INVALID_RESPONSE', 'hosted-open')]))
  assert.equal(summary.narrative.status, 'DETERMINISTIC_FALLBACK')
  assert.equal(summary.narrative.status === 'DETERMINISTIC_FALLBACK' ? summary.narrative.aiFailure.code : null, 'INVALID_RESPONSE')
})

test('provider unavailability preserves deterministic metrics and visibly distinguishes fallback reporting', async () => {
  const summary = await buildSummary(runs, gateway('hosted-open', [failureProvider('PROVIDER_UNAVAILABLE', 'hosted-open')]))
  assert.equal(summary.currentPassRate, '100.0%')
  assert.equal(summary.avgPassRate, '95.0%')
  assert.equal(summary.consecutiveCleanRuns, 4)
  assert.equal(summary.narrative.status, 'DETERMINISTIC_FALLBACK')
  assert.match(summary.narrative.content, /not AI-generated/)
  const markdown = buildMarkdown(summary)
  const html = buildDashboard(runs, summary)
  assert.match(markdown, /Deterministic Summary — AI Unavailable/)
  assert.match(markdown, /AI status:\*\* BLOCKED \(PROVIDER_UNAVAILABLE\)/)
  assert.doesNotMatch(markdown, /AI-Generated Advisory Narrative/)
  assert.match(html, /Deterministic summary — AI unavailable/)
  assert.match(html, /AI status: BLOCKED \(PROVIDER_UNAVAILABLE\)/)
})

test('fallbackPolicy remains forbid and a second configured provider is never called', async () => {
  const primary = failureProvider('PROVIDER_UNAVAILABLE', 'hosted-open')
  const secondary = successProvider('local')
  const configured = configuration('hosted-open', ['local'])
  const aiGateway = new AiGateway(configured, [primary, secondary], [trendNarrativeCapability])
  const summary = await buildSummary(runs, aiGateway)
  assert.equal(summary.narrative.status, 'DETERMINISTIC_FALLBACK')
  assert.equal(primary.calls, 1)
  assert.equal(secondary.calls, 0)
  assert.deepEqual(
    summary.narrative.status === 'DETERMINISTIC_FALLBACK'
      ? summary.narrative.aiFailure.provenance.attemptedProviders
      : null,
    ['hosted-open'],
  )
  assert.equal(
    summary.narrative.status === 'DETERMINISTIC_FALLBACK'
      ? summary.narrative.aiFailure.provenance.fallbackOccurred
      : null,
    false,
  )
})

test('Trend Analysis does not require Anthropic or retain direct provider assumptions', () => {
  const source = fs.readFileSync('src/pipeline/trend-analysis.ts', 'utf8')
  assert.doesNotMatch(source, /AiClient|aiCall|ANTHROPIC_API_KEY|claude-sonnet|Claude API/)
  assert.match(source, /createAiGatewayFromEnvironment/)
  assert.match(source, /capability: 'generate-trend-narrative'/)
})

test('Trend Narrative generation does not mutate Product-owned run evidence', async () => {
  const original = structuredClone(runs)
  await buildSummary(runs, gateway('local', [successProvider('local')]))
  assert.deepEqual(runs, original)
})

test('reports preserve supplied provenance without fabricating usage or cost', async () => {
  const summary = await buildSummary(runs, gateway('hosted-open', [successProvider('hosted-open', validOutput, false)]))
  const markdown = buildMarkdown(summary)
  assert.match(markdown, /"requestId": "trend-narrative:/)
  assert.match(markdown, /"configuredModel": "hosted-open-configured-model"/)
  assert.match(markdown, /"responseModel": "hosted-open-response-model"/)
  assert.match(markdown, /"gatewayPolicy": "ai-gateway-foundation-v1"/)
  assert.match(markdown, /"outputSchemaId": "forge.ai.trend-narrative.v1"/)
  assert.doesNotMatch(markdown, /"usage"|costUsd|estimatedCostUsd/)
})
