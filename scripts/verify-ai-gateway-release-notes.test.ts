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
  groundedReleaseNotes,
  HostedOpenProvider,
  LocalProvider,
  ProviderInvocation,
  ProviderResult,
  releaseNotesCapability,
  ReleaseNotesInput,
} from '../src/core/ai/gateway'
import {
  buildReleaseNotes,
  generateHtmlReport,
  RunSummary,
} from '../src/pipeline/release-notes'

const runs: RunSummary[] = [
  { runId: 'run-1', startedAt: '2026-09-21T00:00:00.000Z', durationMs: 120_000, total: 10, passed: 8, failed: 2, skipped: 0, passRate: 80 },
  { runId: 'run-2', startedAt: '2026-09-22T00:00:00.000Z', durationMs: 110_000, total: 10, passed: 9, failed: 1, skipped: 0, passRate: 90 },
  { runId: 'run-3', startedAt: '2026-09-23T00:00:00.000Z', durationMs: 100_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-4', startedAt: '2026-09-24T00:00:00.000Z', durationMs: 90_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-5', startedAt: '2026-09-25T00:00:00.000Z', durationMs: 80_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
  { runId: 'run-6', startedAt: '2026-09-26T00:00:00.000Z', durationMs: 70_000, total: 10, passed: 10, failed: 0, skipped: 0, passRate: 100 },
]

const input: ReleaseNotesInput = {
  appName: 'FORGE test app',
  evidenceBoundary: 'run-level-release-notes-evidence',
  period: '2026-09-21 → 2026-09-26',
  runsAnalysed: 6,
  averagePassRatePercent: 95,
  passRateTrend: 'Improving',
  totalSuiteSize: 10,
  totalFailures: 3,
  averageDurationMs: 95_000,
  bestRun: { passed: 10, total: 10 },
  worstRun: { failed: 2, total: 10 },
  healthScore: 98,
  branch: 'codex/test',
  version: 'v1.2.3',
  recentRuns: [],
  gitCommits: ['abc123 bounded change'],
  limitations: ['Per-test detail is unavailable (TD-056).'],
}
const validOutput = groundedReleaseNotes(input)

function configuration(primaryProvider: AiProviderId, fallbackProviders: AiProviderId[] = []): AiGatewayConfiguration {
  return {
    primaryProvider,
    fallbackProviders,
    openai: { apiKey: 'configured', model: 'openai-test-model', timeoutMs: 1_000 },
    anthropic: { apiKey: undefined, model: 'anthropic-test-model', timeoutMs: 1_000 },
    local: { enabled: true, runtime: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'local-test-model', timeoutMs: 1_000, thinking: false },
    hostedOpen: { apiKey: 'configured', baseUrl: 'https://router.huggingface.co/v1', model: 'hosted-open-test-model', timeoutMs: 1_000 },
  }
}

class FakeProvider implements AiProviderAdapter {
  calls = 0
  invocation: ProviderInvocation | null = null
  readonly configuredModel: string | null
  constructor(readonly id: AiProviderId, private readonly result: ProviderResult) {
    this.configuredModel = result.configuredModel
  }
  isConfigured(): boolean { return true }
  async invoke(invocation: ProviderInvocation): Promise<ProviderResult> {
    this.calls += 1
    this.invocation = invocation
    return this.result
  }
}

function successProvider(id: AiProviderId, output: unknown = validOutput, includeUsage = true): FakeProvider {
  return new FakeProvider(id, {
    status: 'SUCCESS',
    provider: id,
    providerRuntime: id === 'hosted-open' ? 'hugging-face-router' : id === 'local' ? 'ollama' : undefined,
    routedProvider: id === 'hosted-open' ? 'hf-inference' : undefined,
    configuredModel: `${id}-configured-model`,
    responseModel: `${id}-response-model`,
    output,
    providerRequestId: `${id}-request-id`,
    ...(includeUsage ? { usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 } } : {}),
    ...(id === 'hosted-open' ? { responseDiagnostics: {
      httpStatus: 200,
      finishReason: 'stop',
      contentPresent: true,
      contentLength: JSON.stringify(output).length,
      structuredParseResult: 'SUCCEEDED' as const,
      configuredOutputTokenLimit: releaseNotesCapability.maxOutputTokens,
    } } : {}),
  })
}

function failureProvider(code: AiGatewayFailureCode, id: AiProviderId = 'hosted-open'): FakeProvider {
  assert.ok(!['UNKNOWN_CAPABILITY', 'NO_CONFIGURED_PROVIDER', 'NO_ALLOWED_PROVIDER', 'POLICY_BLOCKED'].includes(code))
  return new FakeProvider(id, {
    status: 'FAILURE',
    provider: id,
    providerRuntime: id === 'hosted-open' ? 'hugging-face-router' : id === 'local' ? 'ollama' : undefined,
    configuredModel: `${id}-configured-model`,
    code: code as Exclude<AiGatewayFailureCode, 'UNKNOWN_CAPABILITY' | 'NO_CONFIGURED_PROVIDER' | 'NO_ALLOWED_PROVIDER' | 'POLICY_BLOCKED'>,
    message: 'raw provider detail must not escape',
  })
}

function gateway(primary: AiProviderId, providers: FakeProvider[], fallbacks: AiProviderId[] = []): AiGateway {
  return new AiGateway(configuration(primary, fallbacks), providers, [releaseNotesCapability])
}

async function notesFor(provider: FakeProvider, primary: AiProviderId = provider.id) {
  return buildReleaseNotes(runs, 'codex/test', 'v1.2.3', ['abc123 bounded change'], gateway(primary, [provider]))
}

test('successful structured Release Notes synthesis preserves HostedOpen provenance and diagnostics', async () => {
  const provider = successProvider('hosted-open')
  const notes = await notesFor(provider)
  assert.equal(notes.aiAdvisory.status, 'AI_GENERATED')
  assert.equal(notes.aiAdvisory.status === 'AI_GENERATED' ? notes.aiAdvisory.provenance.providerRuntime : null, 'hugging-face-router')
  assert.equal(notes.aiAdvisory.status === 'AI_GENERATED' ? notes.aiAdvisory.provenance.routedProvider : null, 'hf-inference')
  assert.equal(notes.aiAdvisory.status === 'AI_GENERATED' ? notes.aiAdvisory.provenance.responseDiagnostics?.structuredParseResult : null, 'SUCCEEDED')
  assert.equal(provider.invocation?.outputSchemaId, 'forge.ai.release-notes.v1')
  assert.deepEqual(provider.invocation?.outputSchema, releaseNotesCapability.outputSchema)
})

test('Release Notes remains compatible with LocalProvider and Ollama runtime identity', async () => {
  const notes = await notesFor(successProvider('local'))
  assert.equal(notes.aiAdvisory.status, 'AI_GENERATED')
  assert.equal(notes.aiAdvisory.status === 'AI_GENERATED' ? notes.aiAdvisory.provenance.provider : null, 'local')
  assert.equal(notes.aiAdvisory.status === 'AI_GENERATED' ? notes.aiAdvisory.provenance.providerRuntime : null, 'ollama')
})

test('real HostedOpenProvider and LocalProvider adapters accept the Release Notes schema', async () => {
  const hosted = new HostedOpenProvider(configuration('hosted-open').hostedOpen, async () => new Response(JSON.stringify({
    id: 'hosted-request', model: 'hosted-response-model', provider: 'hf-inference',
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validOutput) } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  const local = new LocalProvider(configuration('local').local, async () => new Response(JSON.stringify({
    model: 'local-response-model', response: JSON.stringify(validOutput), done: true,
    prompt_eval_count: 10, eval_count: 5,
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
  for (const [id, provider] of [['hosted-open', hosted], ['local', local]] as const) {
    const notes = await buildReleaseNotes(runs, 'codex/test', 'v1.2.3', [],
      new AiGateway(configuration(id), [provider], [releaseNotesCapability]))
    assert.equal(notes.aiAdvisory.status, 'AI_GENERATED')
  }
})

test('real HostedOpenProvider malformed transport remains INVALID_RESPONSE', async () => {
  const provider = new HostedOpenProvider(configuration('hosted-open').hostedOpen,
    async () => new Response('{', { status: 200 }))
  const notes = await buildReleaseNotes(runs, 'codex/test', 'v1.2.3', [],
    new AiGateway(configuration('hosted-open'), [provider], [releaseNotesCapability]))
  assert.equal(notes.aiAdvisory.status === 'AI_UNAVAILABLE' ? notes.aiAdvisory.failure.code : null, 'INVALID_RESPONSE')
})

test('bounded prompt includes only five run summaries, git metadata, and the TD-056 limitation', async () => {
  const provider = successProvider('hosted-open')
  await notesFor(provider)
  const prompt = provider.invocation?.userPrompt ?? ''
  assert.match(prompt, /run-level-release-notes-evidence/)
  assert.match(prompt, /Per-test detail is unavailable \(TD-056\)/)
  assert.match(prompt, /"runId": "run-2"/)
  assert.doesNotMatch(prompt, /"runId": "run-1"/)
  assert.doesNotMatch(prompt, /testId|testTitle|browserName|selector|errorStack/i)
})

test('malformed response and schema violations remain explicit and preserve deterministic reports', async () => {
  const invalid = await notesFor(failureProvider('INVALID_RESPONSE'))
  assert.equal(invalid.aiAdvisory.status, 'AI_UNAVAILABLE')
  assert.equal(invalid.aiAdvisory.status === 'AI_UNAVAILABLE' ? invalid.aiAdvisory.failure.code : null, 'INVALID_RESPONSE')
  const violated = await notesFor(successProvider('hosted-open', { ...validOutput, healthSummary: 'A fabricated checkout failure is flaky.' }))
  assert.equal(violated.aiAdvisory.status, 'AI_UNAVAILABLE')
  assert.equal(violated.aiAdvisory.status === 'AI_UNAVAILABLE' ? violated.aiAdvisory.failure.code : null, 'SCHEMA_VIOLATION')
  assert.match(violated.rawMarkdown, /Deterministic Product Facts/)
  assert.match(violated.rawMarkdown, /AI Advisory — Unavailable/)
  assert.doesNotMatch(violated.rawMarkdown, /fabricated checkout/)
})

for (const code of ['PROVIDER_UNAVAILABLE', 'CREDIT_EXHAUSTED', 'TIMEOUT'] as const) {
  test(`${code} leaves truthful deterministic Release Notes usable`, async () => {
    const notes = await notesFor(failureProvider(code))
    assert.equal(notes.healthScore, 98)
    assert.equal(notes.trend, 'Improving')
    assert.equal(notes.deterministicFacts.totalFailures, 3)
    assert.match(notes.rawMarkdown, new RegExp(`AI status: BLOCKED \\(${code}\\)`))
    assert.match(notes.rawMarkdown, /No AI-authored synthesis is presented/)
    assert.doesNotMatch(notes.rawMarkdown, /AI-Generated Advisory Synthesis/)
    assert.match(generateHtmlReport(notes), new RegExp(`AI advisory unavailable — ${code}`))
  })
}

test('fallback remains forbidden even when a secondary provider is configured', async () => {
  const primary = failureProvider('PROVIDER_UNAVAILABLE')
  const secondary = successProvider('local')
  const notes = await buildReleaseNotes(runs, 'codex/test', 'v1.2.3', [], gateway('hosted-open', [primary, secondary], ['local']))
  assert.equal(notes.aiAdvisory.status, 'AI_UNAVAILABLE')
  assert.equal(primary.calls, 1)
  assert.equal(secondary.calls, 0)
  assert.deepEqual(notes.aiAdvisory.status === 'AI_UNAVAILABLE' ? notes.aiAdvisory.failure.provenance.attemptedProviders : null, ['hosted-open'])
  assert.equal(notes.aiAdvisory.status === 'AI_UNAVAILABLE' ? notes.aiAdvisory.failure.provenance.fallbackOccurred : null, false)
})

test('reports distinguish deterministic Product facts from advisory content and preserve honest provenance', async () => {
  const notes = await notesFor(successProvider('hosted-open', validOutput, false))
  const json = JSON.stringify(notes)
  assert.match(notes.rawMarkdown, /Deterministic Product Facts/)
  assert.match(notes.rawMarkdown, /AI Advisory Synthesis/)
  assert.match(json, /"deterministicFacts"/)
  assert.match(json, /"aiAdvisory"/)
  assert.match(json, /"configuredModel":"hosted-open-configured-model"/)
  assert.match(json, /"responseModel":"hosted-open-response-model"/)
  assert.match(json, /"gatewayPolicy":"ai-gateway-foundation-v1"/)
  assert.match(json, /"outputSchemaId":"forge.ai.release-notes.v1"/)
  assert.doesNotMatch(json, /"usage"|costUsd|estimatedCostUsd/)
})

test('Release Notes has no legacy client, Anthropic key requirement, direct provider wording, or provider branding', () => {
  const source = fs.readFileSync('src/pipeline/release-notes.ts', 'utf8')
  assert.doesNotMatch(source, /AiClient|aiCall|ANTHROPIC_API_KEY|synthesiseWithClaude|Powered by Claude|Claude AI/)
  assert.match(source, /createAiGatewayFromEnvironment/)
  assert.match(source, /capability: 'generate-release-notes'/)
  assert.match(source, /fallbackPolicy: 'forbid'/)
})

test('Release Notes synthesis cannot mutate Product-owned run evidence', async () => {
  const original = structuredClone(runs)
  await notesFor(successProvider('local'))
  assert.deepEqual(runs, original)
})
