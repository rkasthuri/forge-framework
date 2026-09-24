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

import {
  AiCapabilityDefinition,
  AiCapabilityFailure,
  AiCapabilityRequest,
  AiCapabilityResult,
  AiGatewayFailureCode,
  AiGatewayProvenance,
  AiProviderAdapter,
  AiProviderId,
  ProviderFailure,
} from './contracts'
import { AiGatewayConfiguration } from './configuration'

type Clock = () => Date

function failureMessage(code: AiGatewayFailureCode): string {
  const messages: Record<AiGatewayFailureCode, string> = {
    UNKNOWN_CAPABILITY: 'The requested AI capability is not registered.',
    NO_CONFIGURED_PROVIDER: 'No configured AI provider is available.',
    NO_ALLOWED_PROVIDER: 'No configured provider is allowed by this request.',
    PROVIDER_UNAVAILABLE: 'The selected AI provider is unavailable.',
    AUTHENTICATION_FAILED: 'AI provider authentication failed.',
    CREDIT_EXHAUSTED: 'AI provider credit is exhausted.',
    QUOTA_EXCEEDED: 'AI provider quota is unavailable.',
    RATE_LIMITED: 'The AI provider rate limit was reached.',
    TIMEOUT: 'The AI provider request timed out.',
    INVALID_RESPONSE: 'The AI provider returned an invalid response.',
    SCHEMA_VIOLATION: 'The AI provider response violated the capability schema.',
    POLICY_BLOCKED: 'Gateway policy blocked the AI request.',
  }
  return messages[code]
}

function safeProviderCode(value: string | undefined): string | undefined {
  return value && /^[a-zA-Z0-9_.-]{1,64}$/.test(value) ? value : undefined
}

export class AiGateway {
  private readonly adapters = new Map<AiProviderId, AiProviderAdapter>()
  private readonly capabilities = new Map<string, AiCapabilityDefinition<any, any>>()

  constructor(
    private readonly configuration: AiGatewayConfiguration,
    adapters: readonly AiProviderAdapter[],
    capabilities: readonly AiCapabilityDefinition<any, any>[],
    private readonly clock: Clock = () => new Date(),
  ) {
    for (const adapter of adapters) this.adapters.set(adapter.id, adapter)
    for (const capability of capabilities) this.capabilities.set(capability.capability, capability)
  }

  async execute<TOutput>(request: AiCapabilityRequest): Promise<AiCapabilityResult<TOutput>> {
    const started = this.clock()
    const attemptedProviders: AiProviderId[] = []
    const definition = this.capabilities.get(request.capability)
    if (!definition) {
      return this.gatewayFailure(request, started, attemptedProviders, 'UNKNOWN_CAPABILITY')
    }
    if (request.outputSchemaId !== definition.outputSchemaId) {
      return this.gatewayFailure(request, started, attemptedProviders, 'SCHEMA_VIOLATION')
    }
    if (request.budgetClass === 'no-ai-spend') {
      return this.gatewayFailure(request, started, attemptedProviders, 'POLICY_BLOCKED')
    }

    const orderedProviders = this.orderedProviders(request)
    if (orderedProviders.length === 0) {
      const configured = [...this.adapters.values()].some(adapter => adapter.isConfigured())
      const code = request.privacyPolicy === 'local-only'
        ? 'POLICY_BLOCKED'
        : configured
          ? 'NO_ALLOWED_PROVIDER'
          : 'NO_CONFIGURED_PROVIDER'
      return this.gatewayFailure(request, started, attemptedProviders, code)
    }

    const prompts = definition.buildPrompts(request.input)
    let lastFailure: ProviderFailure | null = null
    for (const providerId of orderedProviders) {
      const adapter = this.adapters.get(providerId)
      if (!adapter?.isConfigured()) continue
      attemptedProviders.push(providerId)
      let result
      try {
        result = await adapter.invoke({
          requestId: request.requestId,
          capability: definition.capability,
          systemPrompt: prompts.systemPrompt,
          userPrompt: prompts.userPrompt,
          outputSchemaId: definition.outputSchemaId,
          outputSchema: definition.outputSchema,
          maxOutputTokens: definition.maxOutputTokens,
          timeoutMs: request.timeoutMs,
        })
      } catch {
        result = {
          status: 'FAILURE' as const,
          provider: adapter.id,
          configuredModel: adapter.configuredModel,
          code: 'PROVIDER_UNAVAILABLE' as const,
          message: failureMessage('PROVIDER_UNAVAILABLE'),
        }
      }

      if (result.status === 'SUCCESS') {
        if (!definition.validateOutput(result.output, request.input)) {
          return {
            status: 'FAILURE',
            failure: {
              code: 'SCHEMA_VIOLATION',
              message: failureMessage('SCHEMA_VIOLATION'),
            },
            provenance: this.provenance(
              request,
              started,
              attemptedProviders,
              result.provider,
              result.configuredModel,
              result.responseModel,
              result.providerRequestId,
              result.usage,
            ),
          }
        }
        return {
          status: 'SUCCESS',
          output: result.output as TOutput,
          provenance: this.provenance(
            request,
            started,
            attemptedProviders,
            result.provider,
            result.configuredModel,
            result.responseModel,
            result.providerRequestId,
            result.usage,
          ),
        }
      }

      lastFailure = result
      if (request.fallbackPolicy !== 'allow-explicit'
        || request.authoritySensitivity !== 'advisory') {
        break
      }
    }

    if (!lastFailure) {
      return this.gatewayFailure(request, started, attemptedProviders, 'NO_CONFIGURED_PROVIDER')
    }
    return {
      status: 'FAILURE',
      failure: {
        code: lastFailure.code,
        message: failureMessage(lastFailure.code),
        providerCode: safeProviderCode(lastFailure.providerCode),
      },
      provenance: this.provenance(
        request,
        started,
        attemptedProviders,
        lastFailure.provider,
        lastFailure.configuredModel,
        null,
      ),
    }
  }

  private orderedProviders(request: AiCapabilityRequest): AiProviderId[] {
    const configuredOrder = [
      this.configuration.primaryProvider,
      ...(request.fallbackPolicy === 'allow-explicit'
        ? this.configuration.fallbackProviders
        : []),
    ].filter((value): value is AiProviderId => value !== null)
    return configuredOrder.filter((provider, index, values) => {
      if (values.indexOf(provider) !== index) return false
      if (!request.allowedProviders.includes(provider)) return false
      if (request.privacyPolicy === 'local-only' && provider !== 'local') return false
      return this.adapters.get(provider)?.isConfigured() === true
    })
  }

  private gatewayFailure(
    request: AiCapabilityRequest,
    started: Date,
    attemptedProviders: AiProviderId[],
    code: AiGatewayFailureCode,
  ): AiCapabilityFailure {
    return {
      status: 'FAILURE',
      failure: { code, message: failureMessage(code) },
      provenance: this.provenance(request, started, attemptedProviders, null, null, null),
    }
  }

  private provenance(
    request: AiCapabilityRequest,
    started: Date,
    attemptedProviders: AiProviderId[],
    provider: AiProviderId | null,
    configuredModel: string | null,
    responseModel: string | null,
    providerRequestId?: string,
    usage?: AiGatewayProvenance['usage'],
  ): AiGatewayProvenance {
    const completed = this.clock()
    return {
      requestId: request.requestId,
      capability: request.capability,
      provider,
      configuredModel,
      responseModel,
      gatewayPolicy: 'ai-gateway-foundation-v1',
      outputSchemaId: request.outputSchemaId,
      startedAt: started.toISOString(),
      completedAt: completed.toISOString(),
      durationMs: Math.max(0, completed.getTime() - started.getTime()),
      attemptedProviders: [...attemptedProviders],
      fallbackOccurred: attemptedProviders.length > 1,
      providerRequestId,
      usage,
    }
  }
}
