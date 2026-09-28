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
  AiProviderAdapter,
  AiResponseDiagnostics,
  AiUsageReceipt,
  ProviderFailure,
  ProviderInvocation,
  ProviderResult,
} from '../contracts'
import { HostedOpenProviderConfiguration } from '../configuration'

export type HostedOpenProviderFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>

interface ChatCompletionResponse {
  id?: unknown
  model?: unknown
  provider?: unknown
  choices?: unknown
  usage?: unknown
}

interface ChatCompletionChoice {
  finish_reason?: unknown
  message?: unknown
}

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,64}$/.test(value)
    ? value
    : undefined
}

function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function tokenCount(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : undefined
}

function endpoint(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'https:') return null
    url.pathname = `${url.pathname.replace(/\/$/, '')}/chat/completions`
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function usageReceipt(value: unknown): AiUsageReceipt | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const usage = value as Record<string, unknown>
  const inputTokens = tokenCount(usage.prompt_tokens)
  const outputTokens = tokenCount(usage.completion_tokens)
  const totalTokens = tokenCount(usage.total_tokens)
  const costUsd = nonNegativeNumber(usage.cost)
  const estimatedCostUsd = nonNegativeNumber(usage.estimated_cost)
  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined
    && costUsd === undefined && estimatedCostUsd === undefined) return undefined
  return { inputTokens, outputTokens, totalTokens, costUsd, estimatedCostUsd }
}

function failure(
  model: string,
  code: ProviderFailure['code'],
  message: string,
  providerCode?: string,
  routedProvider?: string,
  responseModel?: string | null,
  providerRequestId?: string,
  usage?: AiUsageReceipt,
  responseDiagnostics?: AiResponseDiagnostics,
): ProviderFailure {
  return {
    status: 'FAILURE',
    provider: 'hosted-open',
    providerRuntime: 'hugging-face-router',
    routedProvider,
    configuredModel: model,
    responseModel,
    providerRequestId,
    usage,
    responseDiagnostics,
    code,
    message,
    providerCode,
  }
}

function responseFailure(
  status: number,
  model: string,
  providerCode: string | undefined,
  routedProvider: string | undefined,
  errorText: string,
  responseModel?: string | null,
  providerRequestId?: string,
  usage?: AiUsageReceipt,
  configuredOutputTokenLimit?: number,
): ProviderFailure {
  const responseDiagnostics: AiResponseDiagnostics | undefined = configuredOutputTokenLimit === undefined
    ? undefined
    : {
        httpStatus: status,
        structuredParseResult: 'NOT_ATTEMPTED',
        configuredOutputTokenLimit,
        failureClassification: 'TRANSPORT_REJECTION',
      }
  const normalized = `${providerCode ?? ''} ${errorText}`.toLowerCase()
  if (status === 401 || status === 403) {
    return failure(model, 'AUTHENTICATION_FAILED', 'Hosted open-model authentication failed.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
  }
  if (status === 402 || /credit|billing|payment/.test(normalized)) {
    return failure(model, 'CREDIT_EXHAUSTED', 'Hosted open-model credit is exhausted.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
  }
  if (status === 429) {
    if (/quota/.test(normalized)) {
      return failure(model, 'QUOTA_EXCEEDED', 'Hosted open-model quota is unavailable.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
    }
    return failure(model, 'RATE_LIMITED', 'Hosted open-model rate limit was reached.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
  }
  if (status === 408 || status === 504) {
    return failure(model, 'TIMEOUT', 'Hosted open-model request timed out.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
  }
  if (status === 404 || status >= 500) {
    return failure(model, 'PROVIDER_UNAVAILABLE', 'The hosted open-model provider is unavailable.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
  }
  return failure(model, 'INVALID_RESPONSE', 'The hosted open-model router rejected the structured request.', providerCode, routedProvider, responseModel, providerRequestId, usage, responseDiagnostics)
}

function routeFrom(response: Response, payload?: ChatCompletionResponse): string | undefined {
  return safeIdentifier(response.headers.get('x-inference-provider'))
    ?? safeIdentifier(payload?.provider)
}

function responseModelFrom(payload?: ChatCompletionResponse): string | null {
  return typeof payload?.model === 'string' && payload.model.trim() !== ''
    ? payload.model
    : null
}

function requestIdFrom(response: Response, payload?: ChatCompletionResponse): string | undefined {
  return safeIdentifier(payload?.id) ?? safeIdentifier(response.headers.get('inference-id'))
}

/** Provider-neutral adapter for Hugging Face Inference Providers routing. */
export class HostedOpenProvider implements AiProviderAdapter {
  readonly id = 'hosted-open' as const
  readonly configuredModel: string
  private readonly chatCompletionEndpoint: string | null

  constructor(
    private readonly configuration: HostedOpenProviderConfiguration,
    private readonly fetchImplementation: HostedOpenProviderFetch = globalThis.fetch,
  ) {
    this.configuredModel = configuration.model
    this.chatCompletionEndpoint = endpoint(configuration.baseUrl)
  }

  isConfigured(): boolean {
    return Boolean(this.configuration.apiKey)
      && this.configuredModel.trim() !== ''
      && this.chatCompletionEndpoint !== null
  }

  async invoke(request: ProviderInvocation): Promise<ProviderResult> {
    if (!this.isConfigured() || !this.chatCompletionEndpoint || !this.configuration.apiKey) {
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'Hosted open-model provider is not configured.')
    }

    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(request.timeoutMs, this.configuration.timeoutMs),
    )
    try {
      const response = await this.fetchImplementation(this.chatCompletionEndpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          authorization: `Bearer ${this.configuration.apiKey}`,
          'content-type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.configuredModel,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          stream: false,
          temperature: 0,
          max_tokens: request.maxOutputTokens,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: request.outputSchemaId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
              strict: true,
              schema: request.outputSchema,
            },
          },
        }),
      })

      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          errorBody = undefined
        }
        const errorPayload = typeof errorBody === 'object' && errorBody !== null
          ? errorBody as ChatCompletionResponse & { error?: { code?: unknown; type?: unknown; message?: unknown } }
          : undefined
        const error = errorPayload?.error
        const providerCode = safeIdentifier(error?.code) ?? safeIdentifier(error?.type)
        const errorText = typeof error?.message === 'string' ? error.message.slice(0, 256) : ''
        return responseFailure(
          response.status,
          this.configuredModel,
          providerCode,
          routeFrom(response, errorPayload),
          errorText,
          responseModelFrom(errorPayload),
          requestIdFrom(response, errorPayload),
          usageReceipt(errorPayload?.usage),
          request.maxOutputTokens,
        )
      }

      let payload: ChatCompletionResponse | undefined
      try {
        const responseBody: unknown = await response.json()
        payload = typeof responseBody === 'object' && responseBody !== null && !Array.isArray(responseBody)
          ? responseBody as ChatCompletionResponse
          : undefined
      } catch {
        return failure(
          this.configuredModel,
          'INVALID_RESPONSE',
          'Hosted open-model router returned malformed transport JSON.',
          undefined,
          routeFrom(response),
          null,
          requestIdFrom(response),
          undefined,
          {
            httpStatus: response.status,
            structuredParseResult: 'NOT_ATTEMPTED',
            configuredOutputTokenLimit: request.maxOutputTokens,
            failureClassification: 'MALFORMED_TRANSPORT_JSON',
          },
        )
      }
      const choices = Array.isArray(payload?.choices) ? payload.choices : []
      const first = choices[0] as ChatCompletionChoice | undefined
      const message = typeof first?.message === 'object' && first.message !== null
        && !Array.isArray(first.message)
        ? first.message as Record<string, unknown>
        : undefined
      const content = message?.content
      const finishReason = safeIdentifier(first?.finish_reason)
      const responseDiagnostics = {
        httpStatus: response.status,
        ...(finishReason === undefined ? {} : { finishReason }),
        contentPresent: typeof content === 'string' && content.length > 0,
        ...(typeof content === 'string' ? { contentLength: content.length } : {}),
        configuredOutputTokenLimit: request.maxOutputTokens,
      }
      if (!first || !message || !Object.hasOwn(message, 'content')) {
        return failure(
          this.configuredModel,
          'INVALID_RESPONSE',
          'Hosted open-model router returned no structured output.',
          undefined,
          routeFrom(response, payload),
          responseModelFrom(payload),
          requestIdFrom(response, payload),
          usageReceipt(payload?.usage),
          {
            ...responseDiagnostics,
            structuredParseResult: 'NOT_ATTEMPTED',
            failureClassification: 'MISSING_CHOICES_OR_MESSAGE',
          },
        )
      }
      if (typeof content !== 'string' || content.trim() === '') {
        return failure(
          this.configuredModel,
          'INVALID_RESPONSE',
          'Hosted open-model router returned no structured output.',
          undefined,
          routeFrom(response, payload),
          responseModelFrom(payload),
          requestIdFrom(response, payload),
          usageReceipt(payload?.usage),
          {
            ...responseDiagnostics,
            structuredParseResult: 'NOT_ATTEMPTED',
            failureClassification: finishReason === 'length'
              ? 'TRUNCATED_OUTPUT'
              : 'EMPTY_CONTENT',
          },
        )
      }

      let output: unknown
      try {
        output = JSON.parse(content)
      } catch {
        return failure(
          this.configuredModel,
          'INVALID_RESPONSE',
          'Hosted open-model router returned malformed structured output.',
          undefined,
          routeFrom(response, payload),
          responseModelFrom(payload),
          requestIdFrom(response, payload),
          usageReceipt(payload?.usage),
          {
            ...responseDiagnostics,
            structuredParseResult: 'FAILED',
            failureClassification: finishReason === 'length'
              ? 'TRUNCATED_OUTPUT'
              : 'MALFORMED_STRUCTURED_JSON',
          },
        )
      }

      if (finishReason === 'length') {
        return failure(
          this.configuredModel,
          'INVALID_RESPONSE',
          'Hosted open-model router returned truncated structured output.',
          undefined,
          routeFrom(response, payload),
          responseModelFrom(payload),
          requestIdFrom(response, payload),
          usageReceipt(payload?.usage),
          {
            ...responseDiagnostics,
            structuredParseResult: 'SUCCEEDED',
            failureClassification: 'TRUNCATED_OUTPUT',
          },
        )
      }

      return {
        status: 'SUCCESS',
        provider: this.id,
        providerRuntime: 'hugging-face-router',
        routedProvider: routeFrom(response, payload),
        configuredModel: this.configuredModel,
        responseModel: responseModelFrom(payload),
        output,
        providerRequestId: requestIdFrom(response, payload),
        usage: usageReceipt(payload?.usage),
        responseDiagnostics: {
          ...responseDiagnostics,
          structuredParseResult: 'SUCCEEDED',
        },
      }
    } catch (error) {
      if ((error as { name?: unknown })?.name === 'AbortError' || controller.signal.aborted) {
        return failure(this.configuredModel, 'TIMEOUT', 'Hosted open-model request timed out.')
      }
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'The hosted open-model provider is unavailable.')
    } finally {
      clearTimeout(timer)
    }
  }
}
