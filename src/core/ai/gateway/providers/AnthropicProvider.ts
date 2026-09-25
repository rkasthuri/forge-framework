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

import Anthropic from '@anthropic-ai/sdk'
import {
  AiProviderAdapter,
  ProviderFailure,
  ProviderInvocation,
  ProviderResult,
} from '../contracts'
import { ProviderConfiguration } from '../configuration'

interface AnthropicResponse {
  id?: string
  model?: string
  content?: Array<{ type: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

interface AnthropicClient {
  messages: {
    create(body: Record<string, unknown>, options?: { timeout?: number }): Promise<AnthropicResponse>
  }
}

function failure(
  configuredModel: string,
  code: ProviderFailure['code'],
  message: string,
  providerCode?: string,
): ProviderFailure {
  return { status: 'FAILURE', provider: 'anthropic', configuredModel, code, message, providerCode }
}

function classifyAnthropicError(error: unknown, model: string): ProviderFailure {
  const value = error as { status?: number; name?: string; error?: { type?: string }; message?: string }
  const providerCode = typeof value?.error?.type === 'string'
    && /^[a-zA-Z0-9_.-]{1,64}$/.test(value.error.type)
    ? value.error.type
    : undefined
  const normalized = `${providerCode ?? ''} ${value?.message ?? ''}`.toLowerCase()
  if (value?.status === 401 || value?.name === 'AuthenticationError') {
    return failure(model, 'AUTHENTICATION_FAILED', 'Anthropic authentication failed.', providerCode)
  }
  if (/credit|balance|billing/.test(normalized)) {
    return failure(model, 'CREDIT_EXHAUSTED', 'Anthropic provider credit is exhausted.', providerCode)
  }
  if (value?.status === 429 || value?.name === 'RateLimitError') {
    if (/quota/.test(normalized)) {
      return failure(model, 'QUOTA_EXCEEDED', 'Anthropic quota is unavailable.', providerCode)
    }
    return failure(model, 'RATE_LIMITED', 'Anthropic rate limit was reached.', providerCode)
  }
  if (/timeout/i.test(value?.name ?? '') || /timed?\s*out/.test(normalized)) {
    return failure(model, 'TIMEOUT', 'Anthropic request timed out.', providerCode)
  }
  return failure(model, 'PROVIDER_UNAVAILABLE', 'Anthropic provider is unavailable.', providerCode)
}

export class AnthropicProvider implements AiProviderAdapter {
  readonly id = 'anthropic' as const
  readonly configuredModel: string
  private readonly client: AnthropicClient | null

  constructor(
    private readonly configuration: ProviderConfiguration,
    client?: AnthropicClient,
  ) {
    this.configuredModel = configuration.model
    this.client = client ?? (configuration.apiKey
      ? new Anthropic({
          apiKey: configuration.apiKey,
          fetch: globalThis.fetch,
          timeout: configuration.timeoutMs,
          maxRetries: 0,
        }) as unknown as AnthropicClient
      : null)
  }

  isConfigured(): boolean {
    return this.client !== null && Boolean(this.configuration.apiKey)
  }

  async invoke(request: ProviderInvocation): Promise<ProviderResult> {
    if (!this.client || !this.configuration.apiKey) {
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'Anthropic provider is not configured.')
    }

    try {
      const response = await this.client.messages.create({
        model: this.configuredModel,
        max_tokens: request.maxOutputTokens,
        system: `${request.systemPrompt}\n\nRespond with JSON matching this schema (${request.outputSchemaId}):\n${JSON.stringify(request.outputSchema)}`,
        messages: [{ role: 'user', content: request.userPrompt }],
      }, { timeout: Math.min(request.timeoutMs, this.configuration.timeoutMs) })
      const text = (response.content ?? [])
        .filter(block => block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text)
        .join('')
        .replace(/```json|```/g, '')
        .trim()
      if (!text) {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'Anthropic returned no structured output.')
      }

      let output: unknown
      try {
        output = JSON.parse(text)
      } catch {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'Anthropic returned malformed structured output.')
      }

      const inputTokens = response.usage?.input_tokens
      const outputTokens = response.usage?.output_tokens
      return {
        status: 'SUCCESS',
        provider: this.id,
        configuredModel: this.configuredModel,
        responseModel: typeof response.model === 'string' && response.model.trim() !== ''
          ? response.model
          : null,
        output,
        providerRequestId: response.id,
        usage: response.usage ? {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens !== undefined && outputTokens !== undefined
            ? inputTokens + outputTokens
            : undefined,
        } : undefined,
      }
    } catch (error) {
      return classifyAnthropicError(error, this.configuredModel)
    }
  }
}
