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
  AiProviderAdapter,
  FailureAnalysisInput,
  HostedOpenProvider,
  HostedOpenProviderConfiguration,
  ProviderFailure,
  ProviderInvocation,
  ProviderResult,
  TestGapAnalysisInput,
  failureAnalysisCapability,
  readAiGatewayConfiguration,
  testGapAnalysisCapability,
} from '../src/core/ai/gateway'
import { hasGroundedRcaEvidence } from './ai-gateway-bounded-evaluation-cases'

const hostedConfiguration: HostedOpenProviderConfiguration = {
  apiKey: 'hf_secret_test_token',
  baseUrl: 'https://router.huggingface.co/v1',
  model: 'openai/gpt-oss-120b:cheapest',
  timeoutMs: 90_000,
}

const failureInput: FailureAnalysisInput = {
  appName: 'inventory-portal', baseUrl: 'https://inventory.example.test',
  suiteName: 'inventory', priority: 'P1', testTitle: 'uses one submit control',
  errorMessage: 'strict mode violation: selector resolved to 2 elements',
  errorStack: 'Error: strict mode violation\n at inventory.spec.ts:10',
  duration: 500, retries: 0, isTaggedFlaky: false, isTaggedSlow: false,
  browserName: 'chromium', file: 'inventory.spec.ts',
}

const validFailureOutput = {
  verdict: 'test-defect' as const,
  confidence: 'High' as const,
  evidence: 'strict mode violation: selector resolved to 2 elements',
  reasoning: 'The supplied failure shows a non-unique test locator.',
  suggestedAction: 'Use a unique observed locator.',
}

const invocation: ProviderInvocation = {
  requestId: 'hosted-open-provider-1', capability: 'analyze-failure',
  systemPrompt: 'Return bounded structured evidence.', userPrompt: 'Supplied evidence only.',
  outputSchemaId: failureAnalysisCapability.outputSchemaId,
  outputSchema: failureAnalysisCapability.outputSchema,
  maxOutputTokens: failureAnalysisCapability.maxOutputTokens,
  timeoutMs: 90_000,
}

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function failureRequest(): AiCapabilityRequest<FailureAnalysisInput> {
  return {
    requestId: 'hosted-open-gateway-1', capability: 'analyze-failure', input: failureInput,
    outputSchemaId: failureAnalysisCapability.outputSchemaId,
    reasoningClass: 'bounded-analysis', budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed', timeoutMs: 90_000,
    allowedProviders: ['hosted-open'], fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory', metadata: { appName: failureInput.appName },
  }
}

test('bounded RCA grounding accepts source-anchored paraphrase but rejects generic prose', () => {
  const anchors = ['strict mode', 'getByRole']
  assert.equal(hasGroundedRcaEvidence(
    'The selector getByRole matched two elements, violating strict mode.', anchors,
  ), true)
  assert.equal(hasGroundedRcaEvidence('The selector may be ambiguous.', anchors), false)
})

test('hosted-open configuration is explicit, token-backed, configurable, and adds no fallback', () => {
  const configured = readAiGatewayConfiguration({ HF_TOKEN: 'configured' })
  assert.equal(configured.primaryProvider, 'hosted-open')
  assert.deepEqual(configured.fallbackProviders, [])
  assert.equal(configured.hostedOpen.baseUrl, 'https://router.huggingface.co/v1')
  assert.equal(configured.hostedOpen.model, 'openai/gpt-oss-120b:cheapest')
  assert.equal(configured.hostedOpen.timeoutMs, 90_000)

  const customized = readAiGatewayConfiguration({
    HF_TOKEN: 'configured', FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
    FORGE_AI_HOSTED_OPEN_BASE_URL: 'https://router.example.test/v2',
    FORGE_AI_HOSTED_OPEN_MODEL: 'org/open-model:preferred',
    FORGE_AI_HOSTED_OPEN_TIMEOUT_MS: '12345',
  })
  assert.equal(customized.hostedOpen.baseUrl, 'https://router.example.test/v2')
  assert.equal(customized.hostedOpen.model, 'org/open-model:preferred')
  assert.equal(customized.hostedOpen.timeoutMs, 12_345)
})

test('Hugging Face request uses chat structured output and preserves route, model, usage, and cost provenance', async () => {
  let capturedUrl = ''
  let capturedBody: Record<string, any> = {}
  let capturedHeaders: HeadersInit | undefined
  let capturedRedirect: RequestRedirect | undefined
  const provider = new HostedOpenProvider(hostedConfiguration, async (input, init) => {
    capturedUrl = String(input)
    capturedBody = JSON.parse(String(init?.body))
    capturedHeaders = init?.headers
    capturedRedirect = init?.redirect
    return response({
      id: 'chatcmpl-test-1', model: 'openai/gpt-oss-120b',
      choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(validFailureOutput) } }],
      usage: {
        prompt_tokens: 101, completion_tokens: 29, total_tokens: 130,
        estimated_cost: 0.0042,
      },
    }, 200, { 'x-inference-provider': 'fireworks-ai', 'inference-id': 'inference-1234' })
  })
  const result = await provider.invoke(invocation)
  assert.equal(result.status, 'SUCCESS')
  assert.equal(capturedUrl, 'https://router.huggingface.co/v1/chat/completions')
  assert.equal(capturedBody.model, 'openai/gpt-oss-120b:cheapest')
  assert.equal(capturedBody.stream, false)
  assert.equal(capturedBody.temperature, 0)
  assert.equal(capturedBody.response_format.type, 'json_schema')
  assert.equal(capturedBody.response_format.json_schema.strict, true)
  assert.deepEqual(capturedBody.response_format.json_schema.schema, failureAnalysisCapability.outputSchema)
  assert.equal(capturedRedirect, 'error')
  assert.equal(new Headers(capturedHeaders).get('authorization'), 'Bearer hf_secret_test_token')
  assert.equal(result.providerRuntime, 'hugging-face-router')
  assert.equal(result.routedProvider, 'fireworks-ai')
  assert.equal(result.responseModel, 'openai/gpt-oss-120b')
  assert.equal(result.providerRequestId, 'chatcmpl-test-1')
  assert.deepEqual(result.usage, {
    inputTokens: 101, outputTokens: 29, totalTokens: 130,
    costUsd: undefined, estimatedCostUsd: 0.0042,
  })
  assert.deepEqual(result.responseDiagnostics, {
    httpStatus: 200,
    finishReason: 'stop',
    contentPresent: true,
    contentLength: JSON.stringify(validFailureOutput).length,
    structuredParseResult: 'SUCCEEDED',
    configuredOutputTokenLimit: failureAnalysisCapability.maxOutputTokens,
  })
})

test('gateway validates hosted output and retains full hosted-open provenance without fallback', async () => {
  const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
    id: 'chatcmpl-test-2', model: 'openai/gpt-oss-120b', provider: 'cerebras',
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(validFailureOutput) } }],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30, cost: 0.001 },
  }))
  const configuration = readAiGatewayConfiguration({
    HF_TOKEN: 'configured', FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
  })
  const result = await new AiGateway(
    configuration, [provider], [failureAnalysisCapability],
  ).execute(failureRequest())
  assert.equal(result.status, 'SUCCESS')
  assert.equal(result.provenance.provider, 'hosted-open')
  assert.equal(result.provenance.providerRuntime, 'hugging-face-router')
  assert.equal(result.provenance.routedProvider, 'cerebras')
  assert.equal(result.provenance.configuredModel, 'openai/gpt-oss-120b:cheapest')
  assert.equal(result.provenance.responseModel, 'openai/gpt-oss-120b')
  assert.deepEqual(result.provenance.attemptedProviders, ['hosted-open'])
  assert.equal(result.provenance.fallbackOccurred, false)
  assert.equal(result.provenance.usage?.costUsd, 0.001)
  assert.equal(result.provenance.responseDiagnostics?.finishReason, 'stop')
  assert.equal(result.provenance.responseDiagnostics?.structuredParseResult, 'SUCCEEDED')
  assert.equal(result.provenance.responseDiagnostics?.configuredOutputTokenLimit, 600)
})

test('transport, structured JSON, and capability schema failures remain distinct and explicit', async t => {
  await t.test('malformed transport', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => new Response('{', { status: 200 }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      structuredParseResult: 'NOT_ATTEMPTED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'MALFORMED_TRANSPORT_JSON',
    })
  })
  await t.test('malformed structured output', async () => {
    const malformedContent = 'private raw response {'
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-malformed-1', model: 'openai/gpt-oss-120b', provider: 'together',
      choices: [{ finish_reason: 'stop', message: { content: malformedContent } }],
      usage: { prompt_tokens: 7, completion_tokens: 2, total_tokens: 9 },
    }, 200, { 'inference-id': 'inference-malformed-1' }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.equal(result.routedProvider, 'together')
    assert.equal(result.responseModel, 'openai/gpt-oss-120b')
    assert.equal(result.providerRequestId, 'chatcmpl-malformed-1')
    assert.equal(result.usage?.totalTokens, 9)
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      finishReason: 'stop',
      contentPresent: true,
      contentLength: malformedContent.length,
      structuredParseResult: 'FAILED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'MALFORMED_STRUCTURED_JSON',
    })
    assert.doesNotMatch(JSON.stringify(result), /private raw response/)
  })
  await t.test('missing choices or message', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-missing-1', model: 'openai/gpt-oss-120b', provider: 'novita',
      choices: [],
    }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      contentPresent: false,
      structuredParseResult: 'NOT_ATTEMPTED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'MISSING_CHOICES_OR_MESSAGE',
    })
  })
  await t.test('null transport body', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response(null))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      contentPresent: false,
      structuredParseResult: 'NOT_ATTEMPTED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'MISSING_CHOICES_OR_MESSAGE',
    })
  })
  await t.test('empty content', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-empty-1', model: 'openai/gpt-oss-120b', provider: 'deepinfra',
      choices: [{ finish_reason: 'stop', message: { content: '' } }],
    }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      finishReason: 'stop',
      contentPresent: false,
      contentLength: 0,
      structuredParseResult: 'NOT_ATTEMPTED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'EMPTY_CONTENT',
    })
  })
  await t.test('truncated structured output', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-truncated-1', model: 'openai/gpt-oss-120b', provider: 'deepinfra',
      choices: [{ finish_reason: 'length', message: { content: '{' } }],
      usage: { prompt_tokens: 100, completion_tokens: 600, total_tokens: 700 },
    }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      finishReason: 'length',
      contentPresent: true,
      contentLength: 1,
      structuredParseResult: 'FAILED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'TRUNCATED_OUTPUT',
    })
    assert.deepEqual(result.usage, {
      inputTokens: 100, outputTokens: 600, totalTokens: 700,
      costUsd: undefined, estimatedCostUsd: undefined,
    })
  })
  await t.test('parseable schema-valid output with length finish reason fails closed', async () => {
    const content = JSON.stringify(validFailureOutput)
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-parseable-truncated-1', model: 'openai/gpt-oss-120b', provider: 'deepinfra',
      choices: [{ finish_reason: 'length', message: { content } }],
      usage: { prompt_tokens: 100, completion_tokens: 600, total_tokens: 700 },
    }))
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'INVALID_RESPONSE')
    assert.deepEqual(result.responseDiagnostics, {
      httpStatus: 200,
      finishReason: 'length',
      contentPresent: true,
      contentLength: content.length,
      structuredParseResult: 'SUCCEEDED',
      configuredOutputTokenLimit: 600,
      failureClassification: 'TRUNCATED_OUTPUT',
    })
  })
  await t.test('schema violation', async () => {
    const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
      id: 'chatcmpl-schema-1', model: 'openai/gpt-oss-120b', provider: 'cerebras',
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ verdict: 'app-bug' }) } }],
      usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 },
    }))
    const configuration = readAiGatewayConfiguration({
      HF_TOKEN: 'configured', FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
    })
    const result = await new AiGateway(
      configuration, [provider], [failureAnalysisCapability],
    ).execute(failureRequest())
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.failure.code, 'SCHEMA_VIOLATION')
    assert.equal(result.provenance.provider, 'hosted-open')
    assert.equal(result.provenance.routedProvider, 'cerebras')
    assert.equal(result.provenance.responseModel, 'openai/gpt-oss-120b')
    assert.equal(result.provenance.providerRequestId, 'chatcmpl-schema-1')
    assert.equal(result.provenance.usage?.totalTokens, 11)
    assert.equal(result.provenance.responseDiagnostics?.structuredParseResult, 'SUCCEEDED')
  })
})

test('Hugging Face HTTP failures map into the provider-neutral taxonomy without leaking detail', async t => {
  const cases: Array<[string, number, unknown, ProviderFailure['code']]> = [
    ['authentication', 401, { error: { type: 'authentication_error', message: 'secret token rejected' } }, 'AUTHENTICATION_FAILED'],
    ['credit', 402, { error: { code: 'payment_required', message: 'credit exhausted' } }, 'CREDIT_EXHAUSTED'],
    ['rate', 429, { error: { code: 'rate_limit', message: 'too many requests' } }, 'RATE_LIMITED'],
    ['quota', 429, { error: { code: 'quota_exceeded', message: 'quota unavailable' } }, 'QUOTA_EXCEEDED'],
    ['timeout', 504, { error: { code: 'gateway_timeout', message: 'upstream timed out' } }, 'TIMEOUT'],
    ['unavailable', 503, { error: { code: 'overloaded', message: 'private upstream detail' } }, 'PROVIDER_UNAVAILABLE'],
    ['rejected', 400, {
      id: 'chatcmpl-rejected-1', model: 'openai/gpt-oss-120b',
      usage: { prompt_tokens: 12, completion_tokens: 0, total_tokens: 12 },
      error: { code: 'invalid_request', message: 'private prompt excerpt' },
    }, 'INVALID_RESPONSE'],
  ]
  for (const [name, status, body, expected] of cases) {
    await t.test(name, async () => {
      const provider = new HostedOpenProvider(hostedConfiguration, async () => response(
        body, status, { 'x-inference-provider': 'groq' },
      ))
      const result = await provider.invoke(invocation)
      assert.equal(result.status, 'FAILURE')
      assert.equal(result.code, expected)
      assert.equal(result.routedProvider, 'groq')
      assert.deepEqual(result.responseDiagnostics, {
        httpStatus: status,
        structuredParseResult: 'NOT_ATTEMPTED',
        configuredOutputTokenLimit: 600,
        failureClassification: 'TRANSPORT_REJECTION',
      })
      if (name === 'rejected') {
        assert.equal(result.providerRequestId, 'chatcmpl-rejected-1')
        assert.equal(result.responseModel, 'openai/gpt-oss-120b')
        assert.equal(result.usage?.totalTokens, 12)
      }
      assert.doesNotMatch(JSON.stringify(result), /secret token|private upstream|private prompt/)
    })
  }
})

test('timeout, network failure, redirect refusal, and unsafe base URL fail closed', async t => {
  await t.test('abort timeout', async () => {
    const provider = new HostedOpenProvider(
      { ...hostedConfiguration, timeoutMs: 5 },
      async (_input, init) => {
        await new Promise<void>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('secret', 'AbortError')))
        })
        return response({})
      },
    )
    const result = await provider.invoke({ ...invocation, timeoutMs: 5 })
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'TIMEOUT')
  })
  await t.test('network detail is sanitized and redirects are disabled', async () => {
    let redirect: RequestRedirect | undefined
    const provider = new HostedOpenProvider(hostedConfiguration, async (_input, init) => {
      redirect = init?.redirect
      throw new TypeError('secret DNS and token detail')
    })
    const result = await provider.invoke(invocation)
    assert.equal(redirect, 'error')
    assert.equal(result.status, 'FAILURE')
    assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
    assert.doesNotMatch(JSON.stringify(result), /secret DNS|token detail/)
  })
  await t.test('non-HTTPS router is not configured', async () => {
    let contacted = false
    const provider = new HostedOpenProvider(
      { ...hostedConfiguration, baseUrl: 'http://router.example.test/v1' },
      async () => { contacted = true; return response({}) },
    )
    assert.equal(provider.isConfigured(), false)
    const result = await provider.invoke(invocation)
    assert.equal(result.status, 'FAILURE')
    assert.equal(contacted, false)
  })
})

test('hosted-open failure never contacts a configured fallback provider', async () => {
  const hosted = new HostedOpenProvider(hostedConfiguration, async () => response({}, 503))
  let fallbackCalls = 0
  const fallback: AiProviderAdapter = {
    id: 'openai', configuredModel: 'must-not-run', isConfigured: () => true,
    invoke: async (): Promise<ProviderResult> => {
      fallbackCalls++
      return {
        status: 'SUCCESS', provider: 'openai', configuredModel: 'must-not-run',
        responseModel: 'must-not-run', output: validFailureOutput,
      }
    },
  }
  const configuration = readAiGatewayConfiguration({
    HF_TOKEN: 'configured', OPENAI_API_KEY: 'configured',
    FORGE_AI_PRIMARY_PROVIDER: 'hosted-open', FORGE_AI_FALLBACK_PROVIDERS: 'openai',
  })
  const result = await new AiGateway(
    configuration, [hosted, fallback], [failureAnalysisCapability],
  ).execute(failureRequest())
  assert.equal(result.status, 'FAILURE')
  assert.equal(fallbackCalls, 0)
  assert.deepEqual(result.provenance.attemptedProviders, ['hosted-open'])
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('HostedOpenProvider executes Test-Gap and gateway rejects hallucinated evidence references', async () => {
  const input: TestGapAnalysisInput = {
    appName: 'inventory-portal',
    analysisScope: { area: 'Inventory', operatorQuery: null },
    evidenceBoundary: 'supplied-test-inventory',
    testEvidence: [{
      evidenceRef: 'inventory.spec.ts:10', testId: 'INV-001',
      title: 'shows observed inventory', file: 'inventory.spec.ts', line: 10,
      priority: 'P0', tags: [],
    }],
  }
  const configuration = readAiGatewayConfiguration({
    HF_TOKEN: 'configured', FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
  })
  const request: AiCapabilityRequest<TestGapAnalysisInput> = {
    requestId: 'hosted-open-gap-1', capability: 'analyze-test-gaps', input,
    outputSchemaId: testGapAnalysisCapability.outputSchemaId,
    reasoningClass: 'bounded-analysis', budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed', timeoutMs: 90_000,
    allowedProviders: ['hosted-open'], fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory', metadata: { appName: input.appName },
  }
  const provider = new HostedOpenProvider(hostedConfiguration, async () => response({
    model: 'openai/gpt-oss-120b',
    choices: [{ message: { content: JSON.stringify({
      analysisStatus: 'COMPLETE', coveredEvidenceRefs: ['inventory.spec.ts:10'],
      gaps: [], limitations: ['Only supplied inventory was analyzed.'],
    }) } }],
  }))
  const success = await new AiGateway(
    configuration, [provider], [testGapAnalysisCapability],
  ).execute(request)
  assert.equal(success.status, 'SUCCESS')

  const hallucinating = new HostedOpenProvider(hostedConfiguration, async () => response({
    model: 'openai/gpt-oss-120b',
    choices: [{ message: { content: JSON.stringify({
      analysisStatus: 'COMPLETE', coveredEvidenceRefs: ['invented.spec.ts:99'],
      gaps: [], limitations: [],
    }) } }],
  }))
  const rejected = await new AiGateway(
    configuration, [hallucinating], [testGapAnalysisCapability],
  ).execute(request)
  assert.equal(rejected.status, 'FAILURE')
  assert.equal(rejected.failure.code, 'SCHEMA_VIOLATION')
})

test('RCA and Test-Gap callers remain provider-neutral, advisory, and fallback-forbidden', () => {
  for (const file of ['src/pipeline/ai-triage.ts', 'src/pipeline/coverage-gap.ts']) {
    const source = fs.readFileSync(file, 'utf8')
    assert.match(source, /allowedProviders: \['openai', 'anthropic', 'local', 'hosted-open'\]/)
    assert.match(source, /fallbackPolicy: 'forbid'/)
    assert.doesNotMatch(source, /HF_TOKEN|router\.huggingface\.co|gpt-oss|HostedOpenProvider/)
  }
})
