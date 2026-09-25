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
  ProviderFailure,
  ProviderInvocation,
  ProviderResult,
} from '../contracts'
import { LocalProviderConfiguration } from '../configuration'

export type LocalProviderFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>

interface OllamaGenerateResponse {
  model?: unknown
  response?: unknown
  done?: unknown
  prompt_eval_count?: unknown
  eval_count?: unknown
}

function failure(
  model: string,
  code: ProviderFailure['code'],
  message: string,
  providerCode?: string,
): ProviderFailure {
  return {
    status: 'FAILURE', provider: 'local', providerRuntime: 'ollama',
    configuredModel: model, code, message, providerCode,
  }
}

function endpoint(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const hostname = url.hostname.toLowerCase()
    const loopback = hostname === 'localhost'
      || hostname === '::1'
      || hostname === '[::1]'
      || /^127(?:\.\d{1,3}){3}$/.test(hostname)
    if (!loopback) return null
    url.pathname = `${url.pathname.replace(/\/$/, '')}/api/generate`
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function tokenCount(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : undefined
}

/**
 * Provider-neutral adapter for a configuration-owned local Ollama runtime.
 */
export class LocalProvider implements AiProviderAdapter {
  readonly id = 'local' as const
  readonly configuredModel: string
  private readonly generateEndpoint: string | null

  constructor(
    private readonly configuration: LocalProviderConfiguration,
    private readonly fetchImplementation: LocalProviderFetch = globalThis.fetch,
  ) {
    this.configuredModel = configuration.model
    this.generateEndpoint = endpoint(configuration.baseUrl)
  }

  isConfigured(): boolean {
    return this.configuration.enabled
      && this.configuration.runtime === 'ollama'
      && this.configuration.thinking === false
      && this.configuredModel.trim() !== ''
      && this.generateEndpoint !== null
  }

  async invoke(request: ProviderInvocation): Promise<ProviderResult> {
    if (!this.isConfigured() || !this.generateEndpoint) {
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'Local Ollama provider is not configured.')
    }

    const controller = new AbortController()
    // Preserve both the caller's requested bound and the configuration-owned
    // provider ceiling. Product callers may use a longer bound for local CPU
    // inference without allowing any adapter to exceed its own configured cap.
    const timeoutMs = Math.min(request.timeoutMs, this.configuration.timeoutMs)
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await this.fetchImplementation(this.generateEndpoint, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.configuredModel,
          system: `${request.systemPrompt}\n\nReturn JSON matching this schema (${request.outputSchemaId}):\n${JSON.stringify(request.outputSchema)}`,
          prompt: request.userPrompt,
          stream: false,
          think: false,
          format: request.outputSchema,
          options: { temperature: 0, num_predict: request.maxOutputTokens },
        }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'The configured Ollama model is unavailable.', 'model_not_found')
        }
        if (response.status === 408 || response.status === 504) {
          return failure(this.configuredModel, 'TIMEOUT', 'The Ollama request timed out.')
        }
        if (response.status === 429) {
          return failure(this.configuredModel, 'RATE_LIMITED', 'The Ollama runtime is busy.')
        }
        return failure(
          this.configuredModel,
          response.status >= 500 ? 'PROVIDER_UNAVAILABLE' : 'INVALID_RESPONSE',
          response.status >= 500 ? 'The Ollama runtime is unavailable.' : 'The Ollama runtime rejected the structured request.',
        )
      }

      let payload: OllamaGenerateResponse
      try {
        payload = await response.json() as OllamaGenerateResponse
      } catch {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'Ollama returned malformed transport JSON.')
      }
      if (payload.done !== true || typeof payload.response !== 'string' || payload.response.trim() === '') {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'Ollama returned no complete structured output.')
      }

      let output: unknown
      try {
        output = JSON.parse(payload.response)
      } catch {
        return failure(this.configuredModel, 'INVALID_RESPONSE', 'Ollama returned malformed structured output.')
      }

      const inputTokens = tokenCount(payload.prompt_eval_count)
      const outputTokens = tokenCount(payload.eval_count)
      return {
        status: 'SUCCESS', provider: this.id, providerRuntime: 'ollama',
        configuredModel: this.configuredModel,
        responseModel: typeof payload.model === 'string' && payload.model.trim() !== '' ? payload.model : null,
        output,
        usage: inputTokens !== undefined || outputTokens !== undefined ? {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
        } : undefined,
      }
    } catch (error) {
      if ((error as { name?: unknown })?.name === 'AbortError' || controller.signal.aborted) {
        return failure(this.configuredModel, 'TIMEOUT', 'The Ollama request timed out.')
      }
      return failure(this.configuredModel, 'PROVIDER_UNAVAILABLE', 'The Ollama runtime is unavailable.')
    } finally {
      clearTimeout(timer)
    }
  }
}
