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
  FailureAnalysisInput,
  LocalProvider,
  LocalProviderConfiguration,
  ProviderInvocation,
  TestGapAnalysisInput,
  failureAnalysisCapability,
  readAiGatewayConfiguration,
  testGapAnalysisCapability,
} from '../src/core/ai/gateway'

const localConfiguration: LocalProviderConfiguration = {
  enabled: true,
  runtime: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen3:8b',
  timeoutMs: 300_000,
  thinking: false,
}

const invocation: ProviderInvocation = {
  requestId: 'local-request',
  capability: 'analyze-failure',
  systemPrompt: 'System instruction',
  userPrompt: 'User evidence',
  outputSchemaId: 'forge.ai.failure-analysis.v1',
  outputSchema: failureAnalysisCapability.outputSchema,
  maxOutputTokens: 600,
  timeoutMs: 90_000,
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const failureInput: FailureAnalysisInput = {
  appName: 'inventory-portal',
  baseUrl: 'http://127.0.0.1:3000',
  suiteName: 'inventory',
  priority: 'P1',
  testTitle: 'rejects a duplicate inventory identifier',
  errorMessage: 'Expected duplicate identifier message, received timeout',
  errorStack: 'Error: timeout\n at inventory.spec.ts:21',
  duration: 30_000,
  retries: 0,
  isTaggedFlaky: false,
  isTaggedSlow: false,
  browserName: 'chromium',
  file: 'inventory.spec.ts',
}

function gatewayRequest(): AiCapabilityRequest<FailureAnalysisInput> {
  return {
    requestId: 'local-gateway-request',
    capability: 'analyze-failure',
    input: failureInput,
    outputSchemaId: failureAnalysisCapability.outputSchemaId,
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'local-only',
    timeoutMs: 90_000,
    allowedProviders: ['local'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: 'inventory-portal' },
  }
}

test('local configuration requires explicit selection and defaults to Ollama qwen3:8b with thinking off', () => {
  const unconfigured = readAiGatewayConfiguration({})
  assert.equal(unconfigured.primaryProvider, null)
  assert.equal(unconfigured.local.enabled, false)

  const configured = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local',
    FORGE_AI_LOCAL_RUNTIME: 'ollama',
  })
  assert.equal(configured.primaryProvider, 'local')
  assert.deepEqual(configured.fallbackProviders, [])
  assert.equal(configured.local.model, 'qwen3:8b')
  assert.equal(configured.local.baseUrl, 'http://127.0.0.1:11434')
  assert.equal(configured.local.timeoutMs, 300_000)
  assert.equal(configured.local.thinking, false)

  const unsupportedThinking = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local',
    FORGE_AI_LOCAL_RUNTIME: 'ollama',
    FORGE_AI_LOCAL_THINKING: 'true',
  })
  assert.equal(unsupportedThinking.local.enabled, false)
})

test('Ollama request uses native structured output and never requests thinking', async () => {
  let capturedUrl = ''
  let capturedBody: Record<string, any> = {}
  let capturedRedirect: RequestRedirect | undefined
  const provider = new LocalProvider(localConfiguration, async (input, init) => {
    capturedUrl = String(input)
    capturedBody = JSON.parse(String(init?.body))
    capturedRedirect = init?.redirect
    return response({
      model: 'qwen3:8b', done: true,
      response: JSON.stringify({
        verdict: 'insufficient-evidence', confidence: 'Low', evidence: '',
        reasoning: 'The timeout alone is inconclusive.', suggestedAction: 'Inspect the trace.',
      }),
      prompt_eval_count: 12, eval_count: 8,
    })
  })
  const result = await provider.invoke(invocation)
  assert.equal(result.status, 'SUCCESS')
  assert.equal(capturedUrl, 'http://127.0.0.1:11434/api/generate')
  assert.equal(capturedBody.model, 'qwen3:8b')
  assert.equal(capturedBody.stream, false)
  assert.equal(capturedBody.think, false)
  assert.equal(capturedRedirect, 'error')
  assert.deepEqual(capturedBody.format, failureAnalysisCapability.outputSchema)
  assert.deepEqual(capturedBody.options, { temperature: 0, num_predict: 600 })
  assert.doesNotMatch(JSON.stringify(result), /thinking|chain.of.thought/i)
  assert.equal(result.providerRuntime, 'ollama')
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 8, totalTokens: 20 })
})

test('gateway preserves Ollama runtime provenance and validates the capability schema', async () => {
  const provider = new LocalProvider(localConfiguration, async () => response({
    model: 'qwen3:8b', done: true,
    response: JSON.stringify({
      verdict: 'insufficient-evidence', confidence: 'Low', evidence: '',
      reasoning: 'The evidence is inconclusive.', suggestedAction: 'Inspect the trace.',
    }),
  }))
  const configuration = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local', FORGE_AI_LOCAL_RUNTIME: 'ollama',
  })
  const result = await new AiGateway(
    configuration, [provider], [failureAnalysisCapability],
  ).execute(gatewayRequest())
  assert.equal(result.status, 'SUCCESS')
  assert.equal(result.provenance.provider, 'local')
  assert.equal(result.provenance.providerRuntime, 'ollama')
  assert.deepEqual(result.provenance.attemptedProviders, ['local'])
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('schema-invalid local output fails closed at the gateway', async () => {
  const provider = new LocalProvider(localConfiguration, async () => response({
    model: 'qwen3:8b', done: true, response: JSON.stringify({ verdict: 'app-bug' }),
  }))
  const configuration = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local', FORGE_AI_LOCAL_RUNTIME: 'ollama',
  })
  const result = await new AiGateway(
    configuration, [provider], [failureAnalysisCapability],
  ).execute(gatewayRequest())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.status === 'FAILURE' ? result.failure.code : null, 'SCHEMA_VIOLATION')
  assert.equal(result.provenance.providerRuntime, 'ollama')
})

test('malformed transport and structured output are explicit INVALID_RESPONSE failures', async t => {
  await t.test('transport JSON', async () => {
    const provider = new LocalProvider(localConfiguration, async () => new Response('{', { status: 200 }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
  })
  await t.test('structured JSON', async () => {
    const provider = new LocalProvider(localConfiguration, async () => response({
      model: 'qwen3:8b', done: true, response: '{',
    }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
  })
})

test('runtime unavailable, model missing, and timeout classifications are deterministic', async t => {
  await t.test('runtime unavailable', async () => {
    const provider = new LocalProvider(localConfiguration, async () => { throw new TypeError('secret connection detail') })
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
    assert.doesNotMatch(JSON.stringify(result), /secret connection detail/)
  })
  await t.test('model missing', async () => {
    const provider = new LocalProvider(localConfiguration, async () => response({ error: 'secret model path' }, 404))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
    assert.equal(result.providerCode, 'model_not_found')
    assert.doesNotMatch(JSON.stringify(result), /secret model path/)
  })
  await t.test('timeout', async () => {
    const timeoutInvocation = { ...invocation, timeoutMs: 5 }
    const provider = new LocalProvider(localConfiguration, async (_input, init) => {
      await new Promise<void>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
      return response({})
    })
    const result = await provider.invoke(timeoutInvocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'TIMEOUT')
  })
})

test('LocalProvider refuses redirect escape instead of retransmitting Product evidence', async () => {
  let redirectMode: RequestRedirect | undefined
  const provider = new LocalProvider(localConfiguration, async (_input, init) => {
    redirectMode = init?.redirect
    throw new TypeError('fetch failed because redirect mode is error')
  })
  const result = await provider.invoke(invocation)
  assert.equal(redirectMode, 'error')
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
  assert.doesNotMatch(JSON.stringify(result), /User evidence|redirect mode/)
})

test('explicit local selection never adds or attempts automatic fallback', async () => {
  const configuration = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local', FORGE_AI_LOCAL_RUNTIME: 'ollama',
    OPENAI_API_KEY: 'must-not-be-selected', ANTHROPIC_API_KEY: 'must-not-be-selected',
  })
  const local = new LocalProvider(localConfiguration, async () => { throw new TypeError('offline') })
  const result = await new AiGateway(
    configuration, [local], [failureAnalysisCapability],
  ).execute(gatewayRequest())
  assert.equal(result.status, 'FAILURE')
  assert.deepEqual(result.provenance.attemptedProviders, ['local'])
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('LocalProvider refuses a non-loopback endpoint before transport', async () => {
  let contacted = false
  const provider = new LocalProvider(
    { ...localConfiguration, baseUrl: 'https://external.example.invalid' },
    async () => { contacted = true; return response({}) },
  )
  assert.equal(provider.isConfigured(), false)
  const result = await provider.invoke(invocation)
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
  assert.equal(contacted, false)
})

test('both approved capabilities retain provider-neutral structured schemas', () => {
  const gapInput: TestGapAnalysisInput = {
    appName: 'inventory-portal',
    analysisScope: { area: 'Inventory', operatorQuery: null },
    evidenceBoundary: 'supplied-test-inventory',
    testEvidence: [],
  }
  assert.equal(failureAnalysisCapability.capability, 'analyze-failure')
  assert.equal(testGapAnalysisCapability.capability, 'analyze-test-gaps')
  assert.match(failureAnalysisCapability.buildPrompts(failureInput).systemPrompt, /structured/i)
  assert.match(testGapAnalysisCapability.buildPrompts(gapInput).systemPrompt, /advisory/i)
})

test('LocalProvider executes Test-Gap and gateway rejects hallucinated evidence references', async () => {
  const gapInput: TestGapAnalysisInput = {
    appName: 'inventory-portal',
    analysisScope: { area: 'Inventory', operatorQuery: null },
    evidenceBoundary: 'supplied-test-inventory',
    testEvidence: [{
      evidenceRef: 'inventory.spec.ts:10', testId: 'INV-001',
      title: 'shows the observed inventory', file: 'inventory.spec.ts', line: 10,
      priority: 'P0', tags: [],
    }],
  }
  const provider = new LocalProvider(localConfiguration, async () => response({
    model: 'qwen3:8b', done: true,
    response: JSON.stringify({
      analysisStatus: 'COMPLETE',
      coveredEvidenceRefs: ['inventory.spec.ts:10'],
      gaps: [],
      limitations: ['Only the supplied inventory was analyzed.'],
    }),
  }))
  const configuration = readAiGatewayConfiguration({
    FORGE_AI_PRIMARY_PROVIDER: 'local', FORGE_AI_LOCAL_RUNTIME: 'ollama',
  })
  const gapRequest: AiCapabilityRequest<TestGapAnalysisInput> = {
    requestId: 'local-test-gap', capability: 'analyze-test-gaps', input: gapInput,
    outputSchemaId: testGapAnalysisCapability.outputSchemaId,
    reasoningClass: 'bounded-analysis', budgetClass: 'bounded-low', privacyPolicy: 'local-only',
    timeoutMs: 90_000, allowedProviders: ['local'], fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory', metadata: { appName: gapInput.appName },
  }
  const success = await new AiGateway(
    configuration, [provider], [testGapAnalysisCapability],
  ).execute(gapRequest)
  assert.equal(success.status, 'SUCCESS')
  assert.equal(success.provenance.providerRuntime, 'ollama')

  const hallucinatingProvider = new LocalProvider(localConfiguration, async () => response({
    model: 'qwen3:8b', done: true,
    response: JSON.stringify({
      analysisStatus: 'COMPLETE', coveredEvidenceRefs: ['invented.spec.ts:99'],
      gaps: [], limitations: [],
    }),
  }))
  const rejected = await new AiGateway(
    configuration, [hallucinatingProvider], [testGapAnalysisCapability],
  ).execute(gapRequest)
  assert.equal(rejected.status, 'FAILURE')
  assert.equal(rejected.status === 'FAILURE' ? rejected.failure.code : null, 'SCHEMA_VIOLATION')
})

test('existing RCA caller permits explicit local selection without enabling fallback', () => {
  const source = fs.readFileSync('src/pipeline/ai-triage.ts', 'utf8')
  assert.match(source, /allowedProviders: \['openai', 'anthropic', 'local'\]/)
  assert.match(source, /fallbackPolicy: 'forbid'/)
  assert.match(source, /timeoutMs: 300_000/)
  assert.doesNotMatch(source, /OLLAMA_BASE_URL|FORGE_AI_LOCAL_MODEL|\/api\/generate/)
})
