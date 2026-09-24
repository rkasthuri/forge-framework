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
  AiCapabilityRequest,
  AiGateway,
  AiGatewayConfiguration,
  AiGatewayFailureCode,
  AiProviderAdapter,
  AiProviderId,
  ProviderInvocation,
  ProviderResult,
  TestGapAnalysisInput,
  TestGapAnalysisOutput,
  testGapAnalysisCapability,
} from '../src/core/ai/gateway'
import {
  analyzeTestGapsWithGateway,
  TestEntry,
} from '../src/pipeline/coverage-gap'

const input: TestGapAnalysisInput = {
  appName: 'inventory-portal',
  analysisScope: { area: 'Orders', operatorQuery: null },
  evidenceBoundary: 'supplied-test-inventory',
  testEvidence: [{
    evidenceRef: 'orders.spec.ts:12',
    testId: 'TC101',
    title: 'TC101 P0 submits an observed order',
    file: 'orders.spec.ts',
    line: 12,
    priority: 'P0',
    tags: [],
  }],
}

const completeOutput: TestGapAnalysisOutput = {
  analysisStatus: 'COMPLETE',
  coveredEvidenceRefs: ['orders.spec.ts:12'],
  gaps: [{
    category: 'negative-path',
    affectedBehavior: 'Order submission rejection behavior lacks supplied test evidence.',
    rationale: 'The supplied inventory contains only a successful submission scenario.',
    supportingEvidenceRefs: ['orders.spec.ts:12'],
    proposedTestIntent: 'Exercise an observed rejection path and assert its Product-owned outcome.',
    priority: 'P1',
    basis: 'evidence-supported',
    uncertainty: 'The supplied evidence does not establish which rejection conditions exist.',
  }],
  limitations: ['Only supplied test inventory was analyzed.'],
}

function configuration(
  primaryProvider: AiProviderId | null = 'openai',
  fallbackProviders: AiProviderId[] = [],
): AiGatewayConfiguration {
  return {
    primaryProvider,
    fallbackProviders,
    openai: { apiKey: 'configured', model: 'openai-test-model', timeoutMs: 1000 },
    anthropic: { apiKey: 'configured', model: 'anthropic-test-model', timeoutMs: 1000 },
    localEnabled: false,
  }
}

function request(
  overrides: Partial<AiCapabilityRequest<TestGapAnalysisInput>> = {},
): AiCapabilityRequest<TestGapAnalysisInput> {
  return {
    requestId: 'test-gap-request-1',
    capability: 'analyze-test-gaps',
    input,
    outputSchemaId: 'forge.ai.test-gap-analysis.v1',
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 1000,
    allowedProviders: ['openai', 'anthropic'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: 'inventory-portal' },
    ...overrides,
  }
}

class FakeProvider implements AiProviderAdapter {
  readonly configuredModel: string | null
  calls = 0

  constructor(
    readonly id: AiProviderId,
    private readonly result: ProviderResult,
    private readonly configured = true,
  ) {
    this.configuredModel = result.configuredModel
  }

  isConfigured(): boolean {
    return this.configured
  }

  async invoke(_request: ProviderInvocation): Promise<ProviderResult> {
    this.calls++
    return this.result
  }
}

function successProvider(output: unknown = completeOutput, id: AiProviderId = 'openai'): FakeProvider {
  return new FakeProvider(id, {
    status: 'SUCCESS',
    provider: id,
    configuredModel: `${id}-configured-model`,
    responseModel: `${id}-response-model`,
    output,
    providerRequestId: `${id}-request-id`,
    usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
  })
}

function failureProvider(code: AiGatewayFailureCode, id: AiProviderId = 'openai'): FakeProvider {
  assert.notEqual(code, 'UNKNOWN_CAPABILITY')
  assert.notEqual(code, 'NO_CONFIGURED_PROVIDER')
  assert.notEqual(code, 'NO_ALLOWED_PROVIDER')
  assert.notEqual(code, 'POLICY_BLOCKED')
  return new FakeProvider(id, {
    status: 'FAILURE',
    provider: id,
    configuredModel: `${id}-configured-model`,
    code: code as Exclude<AiGatewayFailureCode,
      'UNKNOWN_CAPABILITY' | 'NO_CONFIGURED_PROVIDER' | 'NO_ALLOWED_PROVIDER' | 'POLICY_BLOCKED'>,
    message: 'raw provider detail must not escape',
  })
}

test('valid Test-Gap request routes through the gateway with structured provenance', async () => {
  const provider = successProvider()
  const gateway = new AiGateway(configuration(), [provider], [testGapAnalysisCapability])
  const result = await gateway.execute<TestGapAnalysisOutput>(request())
  assert.equal(result.status, 'SUCCESS')
  assert.equal(provider.calls, 1)
  assert.deepEqual(result.status === 'SUCCESS' ? result.output : null, completeOutput)
  assert.equal(result.provenance.capability, 'analyze-test-gaps')
  assert.equal(result.provenance.provider, 'openai')
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('capability prompt is provider-neutral, app-agnostic, bounded, and advisory', () => {
  const prompts = testGapAnalysisCapability.buildPrompts(input)
  assert.match(prompts.systemPrompt, /supplied/i)
  assert.match(prompts.systemPrompt, /advisory/i)
  assert.match(prompts.userPrompt, /inventory-portal/)
  assert.doesNotMatch(prompts.systemPrompt, /SauceDemo|Anthropic|OpenAI|Claude|shopping cart/i)
  assert.doesNotMatch(prompts.userPrompt, /API_KEY|secret/i)
})

test('malformed provider output fails explicitly as SCHEMA_VIOLATION', async () => {
  const gateway = new AiGateway(configuration(), [successProvider({ gaps: [] })], [testGapAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.status === 'FAILURE' ? result.failure.code : null, 'SCHEMA_VIOLATION')
})

test('unknown and hallucinated evidence references are rejected', async () => {
  const hallucinated = {
    ...completeOutput,
    coveredEvidenceRefs: ['unknown.spec.ts:99'],
  }
  const gateway = new AiGateway(configuration(), [successProvider(hallucinated)], [testGapAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.status === 'FAILURE' ? result.failure.code : null, 'SCHEMA_VIOLATION')
})

test('evidence-supported candidates require a supplied evidence reference', async () => {
  const unsupported = {
    ...completeOutput,
    gaps: [{ ...completeOutput.gaps[0], supportingEvidenceRefs: [] }],
  }
  const gateway = new AiGateway(configuration(), [successProvider(unsupported)], [testGapAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.status === 'FAILURE' ? result.failure.code : null, 'SCHEMA_VIOLATION')
})

test('missing evidence can only produce explicit insufficient-evidence', async () => {
  const noEvidence = { ...input, testEvidence: [] }
  const insufficient: TestGapAnalysisOutput = {
    analysisStatus: 'INSUFFICIENT_EVIDENCE',
    coveredEvidenceRefs: [],
    gaps: [],
    limitations: ['No test evidence was supplied.'],
  }
  const validGateway = new AiGateway(configuration(), [successProvider(insufficient)], [testGapAnalysisCapability])
  assert.equal((await validGateway.execute(request({ input: noEvidence }))).status, 'SUCCESS')

  const falseNoGaps = { ...insufficient, analysisStatus: 'COMPLETE' as const, limitations: [] }
  const invalidGateway = new AiGateway(configuration(), [successProvider(falseNoGaps)], [testGapAnalysisCapability])
  const invalid = await invalidGateway.execute(request({ input: noEvidence }))
  assert.equal(invalid.status, 'FAILURE')
  assert.equal(invalid.status === 'FAILURE' ? invalid.failure.code : null, 'SCHEMA_VIOLATION')
})

test('successful zero candidates remains distinct from provider failure', async () => {
  const zero: TestGapAnalysisOutput = {
    analysisStatus: 'COMPLETE', coveredEvidenceRefs: ['orders.spec.ts:12'], gaps: [], limitations: [],
  }
  const success = await new AiGateway(
    configuration(), [successProvider(zero)], [testGapAnalysisCapability],
  ).execute(request())
  assert.equal(success.status, 'SUCCESS')
  assert.deepEqual(success.status === 'SUCCESS' ? success.output.gaps : null, [])

  const failure = await new AiGateway(
    configuration(), [failureProvider('PROVIDER_UNAVAILABLE')], [testGapAnalysisCapability],
  ).execute(request())
  assert.equal(failure.status, 'FAILURE')
})

test('provider failure taxonomy remains explicit and sanitized', async t => {
  const codes: AiGatewayFailureCode[] = [
    'AUTHENTICATION_FAILED',
    'CREDIT_EXHAUSTED',
    'RATE_LIMITED',
    'TIMEOUT',
    'PROVIDER_UNAVAILABLE',
    'INVALID_RESPONSE',
    'SCHEMA_VIOLATION',
  ]
  for (const code of codes) {
    await t.test(code, async () => {
      const gateway = new AiGateway(configuration(), [failureProvider(code)], [testGapAnalysisCapability])
      const result = await gateway.execute(request())
      assert.equal(result.status, 'FAILURE')
      assert.equal(result.status === 'FAILURE' ? result.failure.code : null, code)
      assert.doesNotMatch(result.status === 'FAILURE' ? result.failure.message : '', /raw provider detail/)
    })
  }
})

test('forbidden fallback never contacts a second provider', async () => {
  const first = failureProvider('CREDIT_EXHAUSTED')
  const second = successProvider(completeOutput, 'anthropic')
  const gateway = new AiGateway(
    configuration('openai', ['anthropic']), [first, second], [testGapAnalysisCapability],
  )
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(first.calls, 1)
  assert.equal(second.calls, 0)
  assert.deepEqual(result.provenance.attemptedProviders, ['openai'])
})

test('migrated caller maps schema-valid advisory evidence without materializing authority', async () => {
  const gateway = new AiGateway(configuration(), [successProvider()], [testGapAnalysisCapability])
  const tests: TestEntry[] = [{
    id: 'TC101', title: 'TC101 P0 submits an observed order', file: 'orders.spec.ts',
    area: 'Other', priority: 'P0', tags: [], line: 12,
  }]
  const result = await analyzeTestGapsWithGateway(gateway, 'Other', tests, 102, 1)
  assert.equal(result.analysisStatus, 'COMPLETE')
  assert.equal(result.coverageScore, null)
  assert.deepEqual(result.coveredScenarios, ['TC101 P0 submits an observed order'])
  assert.deepEqual(result.gaps, [{
    scenario: 'Order submission rejection behavior lacks supplied test evidence.',
    priority: 'P1',
    suggestedId: 'TC102',
    reasoning: 'The supplied inventory contains only a successful submission scenario.',
    codeHint: 'Exercise an observed rejection path and assert its Product-owned outcome.',
    category: 'negative-path',
    supportingEvidenceRefs: ['orders.spec.ts:12'],
    basis: 'evidence-supported',
    uncertainty: 'The supplied evidence does not establish which rejection conditions exist.',
  }])
})

test('migrated caller returns BLOCKED_AI and never fabricates no-gaps', async () => {
  const gateway = new AiGateway(
    configuration(), [failureProvider('CREDIT_EXHAUSTED')], [testGapAnalysisCapability],
  )
  const result = await analyzeTestGapsWithGateway(gateway, 'Other', [], 1, 1)
  assert.equal(result.analysisStatus, 'BLOCKED_AI')
  assert.equal(result.aiFailure, 'CREDIT_EXHAUSTED')
  assert.deepEqual(result.gaps, [])
  assert.match(result.limitations[0], /no no-gap conclusion/i)
})

test('migrated caller has no provider SDK, secret, vendor model, or vendor response parsing', () => {
  const source = fs.readFileSync('src/pipeline/coverage-gap.ts', 'utf8')
  assert.doesNotMatch(source, /@anthropic-ai\/sdk|@openai|new Anthropic|new OpenAI/)
  assert.doesNotMatch(source, /ANTHROPIC_API_KEY|OPENAI_API_KEY|claude-sonnet|response\.content/)
  assert.match(source, /createAiGatewayFromEnvironment/)
  assert.match(source, /capability: 'analyze-test-gaps'/)
})

test('Test-Gap remains advisory and outside materialization and Product verdict authority', () => {
  const source = fs.readFileSync('src/pipeline/coverage-gap.ts', 'utf8')
  assert.doesNotMatch(source, /TestSetRepository|DefinitionRepository|ApplicationReadiness|verdict\s*=/)
  assert.doesNotMatch(source, /gap-to-test/)
  assert.equal(testGapAnalysisCapability.capability, 'analyze-test-gaps')
})
