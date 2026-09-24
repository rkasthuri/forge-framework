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

import OpenAI from 'openai'
import {
  AiProviderAdapter,
  ProviderFailure,
  ProviderInvocation,
  ProviderResult,
} from '../contracts'
import { ProviderConfiguration } from '../configuration'

interface OpenAiResponse {
  id?: string
  model?: string
  output_text?: string
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number }
}

interface OpenAiClient {
  responses: {
    create(body: Record<string, unknown>, options?: { timeout?: number }): Promise<OpenAiResponse>
  }
}

function failure(
  configuredModel: string,
  code: ProviderFailure['code'],
  message: string,
  providerCode?: string,
): ProviderFailure {
  return { status: 'FAILURE', provider: 'openai', configuredModel, code, message, providerCode }
}

function classifyOpenAiError(error: unknown, model: string): ProviderFailure {
  const value = error as { status?: number; name?: string; code?: string; message?: string }
  const providerCode = typeof value?.code === 'string' && /^[a-zA-Z0-9_.-]{1,64}$/.test(value.code)
    ? value.code
    : undefined
  const normalized = `${value?.code ?? ''} ${value?.message ?? ''}`.toLowerCase()
  if (value?.status === 401 || value?.name === 'AuthenticationError') {
    return failure(model, 'AUTHENTICATION_FAILED', 'OpenAI authentication failed.', providerCode)
  }
  if (value?.status === 429 || value?.name === 'RateLimitError') {
    if (/credit|quota|billing/.test(normalized)) {
      return failure(model, 'QUOTA_EXCEEDED', 'OpenAI quota or credit is unavailable.', providerCode)
    }
    return failure(model, 'RATE_LIMITED', 'OpenAI rate limit was reached.', providerCode)
  }
  if (/timeout/i.test(value?.name ?? '') || /timed?\s*out/.test(normalized)) {
    return failure(model, 'TIMEOUT', 'OpenAI request timed out.', providerCode)
  }
  return failure(model, 'PROVIDER_UNAVAILABLE', 'OpenAI provider is unavailable.', providerCode)
}

export class OpenAiProvider implements AiProviderAdapter {
  readonly id = 'openai' as const
  readonly configuredModel: string
  private readonly client: OpenAiClient | null

  constructor(
    private readonly configuration: ProviderConfiguration,
    client?: OpenAiClient,
  ) {
    this.configuredModel = configuration.model
    this.client = client ?? (configuration.apiKey
      ? new OpenAI({
          apiKey: configuration.apiKey,
          timeout: configuration.timeoutMs,
          maxRetries: 0,
        }) as unknown as OpenAiClient
      : null)
  }

  isConfigured(): boolean {
    return this.client !== null && Boolean(this.configuration.apiKey)
  }

  async invoke(request: ProviderInvocation): Promise<ProviderResult> {
    if (!this.client || !this.configuration.apiKey) {
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'OpenAI provider is not configured.')
    }

    try {
      const response = await this.client.responses.create({
        model: this.configuredModel,
        instructions: request.systemPrompt,
        input: request.userPrompt,
        max_output_tokens: request.maxOutputTokens,
        text: {
          format: {
            type: 'json_schema',
            name: request.outputSchemaId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
            strict: true,
            schema: request.outputSchema,
          },
        },
      }, { timeout: Math.min(request.timeoutMs, this.configuration.timeoutMs) })

      if (typeof response.output_text !== 'string' || response.output_text.trim() === '') {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'OpenAI returned no structured output.')
      }

      let output: unknown
      try {
        output = JSON.parse(response.output_text)
      } catch {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'OpenAI returned malformed structured output.')
      }

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
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      }
    } catch (error) {
      return classifyOpenAiError(error, this.configuredModel)
    }
  }
}
