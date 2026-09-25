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
  AiProviderAdapter,
  AiProviderId,
  AnthropicProvider,
  failureAnalysisCapability,
  FailureAnalysisInput,
  OpenAiProvider,
  ProviderInvocation,
  ProviderResult,
} from '../src/core/ai/gateway'
import { triageWithGateway } from '../src/pipeline/ai-triage'

const validOutput = {
  verdict: 'test-defect' as const,
  confidence: 'High' as const,
  evidence: 'The locator matches two elements.',
  reasoning: 'A strict-mode violation identifies a non-unique test locator.',
  suggestedAction: 'Use a unique observed locator.',
}

const failureInput: FailureAnalysisInput = {
  appName: 'saucedemo',
  baseUrl: 'https://www.saucedemo.com',
  suiteName: 'checkout',
  priority: 'P1',
  testTitle: 'completes checkout',
  errorMessage: 'strict mode violation',
  errorStack: 'Error: strict mode violation\n at checkout.spec.ts:10',
  duration: 1200,
  retries: 0,
  isTaggedFlaky: false,
  isTaggedSlow: false,
  browserName: 'chromium',
  file: 'checkout.spec.ts',
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
    local: {
      enabled: false, runtime: 'ollama', baseUrl: 'http://127.0.0.1:11434',
      model: 'qwen3:8b', timeoutMs: 300_000, thinking: false,
    },
  }
}

function request(
  overrides: Partial<AiCapabilityRequest<FailureAnalysisInput>> = {},
): AiCapabilityRequest<FailureAnalysisInput> {
  return {
    requestId: 'request-1',
    capability: 'analyze-failure',
    input: failureInput,
    outputSchemaId: 'forge.ai.failure-analysis.v1',
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 1000,
    allowedProviders: ['openai', 'anthropic'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: 'saucedemo', runId: 'run-1' },
    ...overrides,
  }
}

class FakeProvider implements AiProviderAdapter {
  readonly configuredModel: string
  calls = 0

  constructor(
    readonly id: AiProviderId,
    private readonly result: ProviderResult,
    private readonly configured = true,
  ) {
    this.configuredModel = result.configuredModel ?? `${id}-configured-model`
  }

  isConfigured(): boolean {
    return this.configured
  }

  async invoke(_request: ProviderInvocation): Promise<ProviderResult> {
    this.calls++
    return this.result
  }
}

function successProvider(id: AiProviderId): FakeProvider {
  return new FakeProvider(id, {
    status: 'SUCCESS',
    provider: id,
    configuredModel: `${id}-configured-model`,
    responseModel: `${id}-response-model`,
    output: validOutput,
    providerRequestId: `${id}-request`,
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  })
}

function failedProvider(id: AiProviderId, code: 'PROVIDER_UNAVAILABLE' | 'AUTHENTICATION_FAILED'): FakeProvider {
  return new FakeProvider(id, {
    status: 'FAILURE', provider: id, configuredModel: `${id}-configured-model`, code,
    message: `${id} unavailable`,
  })
}

test('gateway routes a known capability deterministically and preserves provider provenance', async () => {
  const openai = successProvider('openai')
  const anthropic = successProvider('anthropic')
  const gateway = new AiGateway(configuration('openai', ['anthropic']), [anthropic, openai], [failureAnalysisCapability])
  const result = await gateway.execute(request({ fallbackPolicy: 'allow-explicit' }))
  assert.equal(result.status, 'SUCCESS')
  assert.equal(openai.calls, 1)
  assert.equal(anthropic.calls, 0)
  assert.deepEqual(result.provenance.attemptedProviders, ['openai'])
  assert.equal(result.provenance.provider, 'openai')
  assert.equal(result.provenance.configuredModel, 'openai-configured-model')
  assert.equal(result.provenance.responseModel, 'openai-response-model')
  assert.equal(result.provenance.gatewayPolicy, 'ai-gateway-foundation-v1')
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('unknown capability refuses before any provider call', async () => {
  const openai = successProvider('openai')
  const gateway = new AiGateway(configuration(), [openai], [failureAnalysisCapability])
  const result = await gateway.execute(request({ capability: 'invented-capability' }))
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.failure.code, 'UNKNOWN_CAPABILITY')
  assert.equal(openai.calls, 0)
})

test('no configured provider refuses explicitly', async () => {
  const unavailable = new FakeProvider('openai', {
    status: 'FAILURE', provider: 'openai', configuredModel: null,
    code: 'PROVIDER_UNAVAILABLE', message: 'not configured',
  }, false)
  const gateway = new AiGateway(configuration(null), [unavailable], [failureAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.failure.code, 'NO_CONFIGURED_PROVIDER')
})

test('schema mismatch and invalid provider output fail closed', async () => {
  const provider = new FakeProvider('openai', {
    status: 'SUCCESS', provider: 'openai', configuredModel: 'configured-model', responseModel: 'response-model',
    output: { ...validOutput, confidence: 'Certain' },
  })
  const gateway = new AiGateway(configuration(), [provider], [failureAnalysisCapability])
  const wrongSchema = await gateway.execute(request({ outputSchemaId: 'wrong.schema' }))
  assert.equal(wrongSchema.status, 'FAILURE')
  assert.equal(wrongSchema.failure.code, 'SCHEMA_VIOLATION')
  assert.equal(provider.calls, 0)
  const invalidOutput = await gateway.execute(request())
  assert.equal(invalidOutput.status, 'FAILURE')
  assert.equal(invalidOutput.failure.code, 'SCHEMA_VIOLATION')
})

test('fallback is forbidden by default and provider failure remains explicit', async () => {
  const openai = failedProvider('openai', 'PROVIDER_UNAVAILABLE')
  const anthropic = successProvider('anthropic')
  const gateway = new AiGateway(configuration('openai', ['anthropic']), [openai, anthropic], [failureAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.failure.code, 'PROVIDER_UNAVAILABLE')
  assert.equal(anthropic.calls, 0)
  assert.equal(result.provenance.fallbackOccurred, false)
})

test('fallback occurs only when explicitly allowed and records both attempts', async () => {
  const openai = failedProvider('openai', 'PROVIDER_UNAVAILABLE')
  const anthropic = successProvider('anthropic')
  const gateway = new AiGateway(configuration('openai', ['anthropic']), [openai, anthropic], [failureAnalysisCapability])
  const result = await gateway.execute(request({ fallbackPolicy: 'allow-explicit' }))
  assert.equal(result.status, 'SUCCESS')
  assert.deepEqual(result.provenance.attemptedProviders, ['openai', 'anthropic'])
  assert.equal(result.provenance.fallbackOccurred, true)
  assert.equal(result.provenance.provider, 'anthropic')
})

test('authority-sensitive request never falls back even when fallback is requested', async () => {
  const openai = failedProvider('openai', 'PROVIDER_UNAVAILABLE')
  const anthropic = successProvider('anthropic')
  const gateway = new AiGateway(configuration('openai', ['anthropic']), [openai, anthropic], [failureAnalysisCapability])
  const result = await gateway.execute(request({
    fallbackPolicy: 'allow-explicit',
    authoritySensitivity: 'authority-sensitive',
  }))
  assert.equal(result.status, 'FAILURE')
  assert.equal(anthropic.calls, 0)
  assert.deepEqual(result.provenance.attemptedProviders, ['openai'])
})

test('local-only privacy policy blocks remote providers', async () => {
  const gateway = new AiGateway(configuration(), [successProvider('openai')], [failureAnalysisCapability])
  const result = await gateway.execute(request({ privacyPolicy: 'local-only' }))
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.failure.code, 'POLICY_BLOCKED')
})

test('no-spend budget policy refuses before contacting a provider', async () => {
  const openai = successProvider('openai')
  const gateway = new AiGateway(configuration(), [openai], [failureAnalysisCapability])
  const result = await gateway.execute(request({ budgetClass: 'no-ai-spend' }))
  assert.equal(result.status, 'FAILURE')
  assert.equal(result.failure.code, 'POLICY_BLOCKED')
  assert.equal(openai.calls, 0)
})

test('failure-analysis prompts remain app-agnostic for non-SauceDemo applications', () => {
  const prompts = failureAnalysisCapability.buildPrompts({
    ...failureInput,
    appName: 'inventory-portal',
    baseUrl: 'https://inventory.example.test',
    testTitle: 'problem_user can submit an order',
  })
  assert.match(prompts.systemPrompt, /inventory-portal/)
  assert.doesNotMatch(prompts.systemPrompt, /performance_glitch_user|problem_user|saucedemo/i)
  assert.match(prompts.systemPrompt, /Do not infer flakiness from an application-specific user/)
})

test('OpenAI Responses API success maps to provider-neutral structured success', async () => {
  let captured: Record<string, unknown> | undefined
  let capturedOptions: { timeout?: number } | undefined
  const provider = new OpenAiProvider(configuration().openai, {
    responses: {
      async create(body, options) {
        captured = body
        capturedOptions = options
        return {
          id: 'resp-1',
          model: 'gpt-5-2026-09-01',
          output_text: JSON.stringify(validOutput),
          usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
        }
      },
    },
  })
  const result = await provider.invoke({
    requestId: 'request-1', capability: 'analyze-failure',
    systemPrompt: 'system', userPrompt: 'user',
    outputSchemaId: 'forge.ai.failure-analysis.v1',
    outputSchema: failureAnalysisCapability.outputSchema,
    maxOutputTokens: 600, timeoutMs: 1000,
  })
  assert.equal(result.status, 'SUCCESS')
  assert.deepEqual(result.output, validOutput)
  assert.equal(result.providerRequestId, 'resp-1')
  assert.equal(result.configuredModel, 'openai-test-model')
  assert.equal(result.responseModel, 'gpt-5-2026-09-01')
  assert.deepEqual(result.usage, { inputTokens: 7, outputTokens: 3, totalTokens: 10 })
  assert.equal((captured?.text as any).format.type, 'json_schema')
  assert.equal((captured?.text as any).format.strict, true)
  assert.equal(captured?.model, 'openai-test-model')
  assert.equal(capturedOptions?.timeout, 1000)
})

test('OpenAI malformed, auth, quota, rate-limit, and timeout failures map without SDK leakage', async t => {
  const cases = [
    { name: 'malformed', response: { output_text: '{bad' }, code: 'INVALID_RESPONSE' },
    { name: 'auth', error: { status: 401, name: 'AuthenticationError', message: 'secret-key-value' }, code: 'AUTHENTICATION_FAILED' },
    { name: 'quota', error: { status: 429, name: 'RateLimitError', code: 'insufficient_quota', message: 'quota' }, code: 'QUOTA_EXCEEDED' },
    { name: 'rate', error: { status: 429, name: 'RateLimitError', message: 'slow down' }, code: 'RATE_LIMITED' },
    { name: 'timeout', error: { name: 'APIConnectionTimeoutError', message: 'timed out' }, code: 'TIMEOUT' },
  ] as const
  for (const item of cases) {
    await t.test(item.name, async () => {
      const provider = new OpenAiProvider(configuration().openai, {
        responses: { async create() {
          if ('error' in item) throw item.error
          return item.response
        } },
      })
      const result = await provider.invoke({
        requestId: 'r', capability: 'analyze-failure', systemPrompt: 's', userPrompt: 'u',
        outputSchemaId: 'schema', outputSchema: {}, maxOutputTokens: 1, timeoutMs: 1,
      })
      assert.equal(result.status, 'FAILURE')
      assert.equal(result.code, item.code)
      assert.doesNotMatch(JSON.stringify(result), /secret-key-value/)
      assert.equal('responses' in result, false)
    })
  }
})

test('Anthropic success maps through adapter without exposing Anthropic response types', async () => {
  let capturedOptions: { timeout?: number } | undefined
  const provider = new AnthropicProvider(configuration().anthropic, {
    messages: { async create(_body, options) {
      capturedOptions = options
      return {
        id: 'msg-1', model: 'claude-sonnet-4-5-20250929',
        content: [{ type: 'text', text: JSON.stringify(validOutput) }],
        usage: { input_tokens: 8, output_tokens: 4 },
      }
    } },
  })
  const result = await provider.invoke({
    requestId: 'r', capability: 'analyze-failure', systemPrompt: 's', userPrompt: 'u',
    outputSchemaId: 'schema', outputSchema: {}, maxOutputTokens: 1, timeoutMs: 1,
  })
  assert.equal(result.status, 'SUCCESS')
  assert.equal(result.configuredModel, 'anthropic-test-model')
  assert.equal(result.responseModel, 'claude-sonnet-4-5-20250929')
  assert.deepEqual(result.output, validOutput)
  assert.deepEqual(result.usage, { inputTokens: 8, outputTokens: 4, totalTokens: 12 })
  assert.equal(capturedOptions?.timeout, 1)
})

test('provider provenance never substitutes configured aliases for omitted response models', async () => {
  const invocation: ProviderInvocation = {
    requestId: 'r', capability: 'analyze-failure', systemPrompt: 's', userPrompt: 'u',
    outputSchemaId: 'schema', outputSchema: {}, maxOutputTokens: 1, timeoutMs: 1,
  }
  const openai = new OpenAiProvider(configuration().openai, {
    responses: { async create() {
      return { output_text: JSON.stringify(validOutput) }
    } },
  })
  const anthropic = new AnthropicProvider(configuration().anthropic, {
    messages: { async create() {
      return { content: [{ type: 'text', text: JSON.stringify(validOutput) }] }
    } },
  })
  const openAiResult = await openai.invoke(invocation)
  const anthropicResult = await anthropic.invoke(invocation)
  assert.equal(openAiResult.status, 'SUCCESS')
  assert.equal(openAiResult.configuredModel, 'openai-test-model')
  assert.equal(openAiResult.responseModel, null)
  assert.equal(anthropicResult.status, 'SUCCESS')
  assert.equal(anthropicResult.configuredModel, 'anthropic-test-model')
  assert.equal(anthropicResult.responseModel, null)
})

test('Anthropic credit, authentication, and malformed response failures are explicit', async t => {
  const cases = [
    { name: 'credit', error: { status: 400, message: 'Your credit balance is too low' }, code: 'CREDIT_EXHAUSTED' },
    { name: 'auth', error: { status: 401, name: 'AuthenticationError' }, code: 'AUTHENTICATION_FAILED' },
    { name: 'malformed', response: { content: [{ type: 'text', text: 'not json' }] }, code: 'INVALID_RESPONSE' },
  ] as const
  for (const item of cases) {
    await t.test(item.name, async () => {
      const provider = new AnthropicProvider(configuration().anthropic, {
        messages: { async create() {
          if ('error' in item) throw item.error
          return item.response
        } },
      })
      const result = await provider.invoke({
        requestId: 'r', capability: 'analyze-failure', systemPrompt: 's', userPrompt: 'u',
        outputSchemaId: 'schema', outputSchema: {}, maxOutputTokens: 1, timeoutMs: 1,
      })
      assert.equal(result.status, 'FAILURE')
      assert.equal(result.code, item.code)
    })
  }
})

test('triage vertical slice preserves valid consumer output through the gateway', async () => {
  const gateway = new AiGateway(configuration(), [successProvider('openai')], [failureAnalysisCapability])
  const result = await triageWithGateway(failureInput, gateway)
  assert.equal(result.verdict, 'test-defect')
  assert.equal(result.confidence, 'High')
  assert.equal(result.confidenceSource, 'model')
  assert.equal(result.triageProvider, 'openai')
  assert.equal(result.triageModel, 'openai-response-model')
  assert.equal(result.tokensUsed, 15)
  assert.equal(result.aiAdvisory, undefined)
  assert.equal(result.aiProvenance?.provider, 'openai')
  assert.equal(result.aiProvenance?.configuredModel, 'openai-configured-model')
  assert.equal(result.aiProvenance?.responseModel, 'openai-response-model')
  assert.equal(result.aiProvenance?.gatewayPolicy, 'ai-gateway-foundation-v1')
})

test('triage provider failure yields explicit blocked advisory and never fabricates a verdict', async () => {
  const gateway = new AiGateway(configuration(), [failedProvider('openai', 'AUTHENTICATION_FAILED')], [failureAnalysisCapability])
  const result = await triageWithGateway(failureInput, gateway)
  assert.equal(result.verdict, 'insufficient-evidence')
  assert.equal(result.confidenceSource, 'fallback')
  assert.equal(result.evidence, '')
  assert.deepEqual(result.aiAdvisory, {
    status: 'BLOCKED_AI', failureCode: 'AUTHENTICATION_FAILED',
  })
  assert.deepEqual(result.aiProvenance?.attemptedProviders, ['openai'])
  assert.match(result.reasoning, /manual review required/)
})

test('triage retains the Product evidence gate for an unsupported app-bug claim', async () => {
  const unsupportedAppBug = new FakeProvider('openai', {
    status: 'SUCCESS', provider: 'openai',
    configuredModel: 'openai-configured-model', responseModel: 'openai-response-model',
    output: { ...validOutput, verdict: 'app-bug', evidence: '' },
  })
  const gateway = new AiGateway(configuration(), [unsupportedAppBug], [failureAnalysisCapability])
  const result = await triageWithGateway(failureInput, gateway)
  assert.equal(result.verdict, 'insufficient-evidence')
  assert.match(result.reasoning, /evidence-gate/)
})

test('migrated Product caller has no Anthropic SDK or legacy AiClient dependency', () => {
  const source = fs.readFileSync('src/pipeline/ai-triage.ts', 'utf8')
  assert.doesNotMatch(source, /@anthropic-ai\/sdk/)
  assert.doesNotMatch(source, /core\/ai\/AiClient/)
  assert.doesNotMatch(source, /ANTHROPIC_API_KEY/)
  assert.match(source, /triageWithGateway/)
})

test('secret material never appears in gateway failure evidence', async () => {
  const secret = 'sk-super-secret-value'
  const provider = new OpenAiProvider({ ...configuration().openai, apiKey: secret }, {
    responses: { async create() { throw { status: 401, message: secret } } },
  })
  const gateway = new AiGateway(configuration(), [provider], [failureAnalysisCapability])
  const result = await gateway.execute(request())
  assert.equal(result.status, 'FAILURE')
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret))
})
