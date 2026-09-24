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

import { AiProviderId } from './contracts'

export interface ProviderConfiguration {
  apiKey?: string
  model: string
  timeoutMs: number
}

export interface AiGatewayConfiguration {
  primaryProvider: AiProviderId | null
  fallbackProviders: AiProviderId[]
  openai: ProviderConfiguration
  anthropic: ProviderConfiguration
  localEnabled: boolean
}

const providerIds: AiProviderId[] = ['openai', 'anthropic', 'local']

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function providerId(value: string | undefined): AiProviderId | null {
  return providerIds.includes(value as AiProviderId) ? value as AiProviderId : null
}

export function readAiGatewayConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): AiGatewayConfiguration {
  const explicitPrimary = env.FORGE_AI_PRIMARY_PROVIDER
  const primaryProvider = explicitPrimary !== undefined
    ? providerId(explicitPrimary)
    : env.OPENAI_API_KEY
      ? 'openai'
      : env.ANTHROPIC_API_KEY
        ? 'anthropic'
        : env.FORGE_LOCAL_AI_ENABLED === 'true'
          ? 'local'
          : null

  const fallbackProviders = (env.FORGE_AI_FALLBACK_PROVIDERS ?? '')
    .split(',')
    .map(value => providerId(value.trim()))
    .filter((value): value is AiProviderId => value !== null)
    .filter((value, index, values) => value !== primaryProvider && values.indexOf(value) === index)

  return {
    primaryProvider,
    fallbackProviders,
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? 'gpt-5',
      timeoutMs: positiveInteger(env.OPENAI_TIMEOUT_MS, 90_000),
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL ?? env.AI_MODEL ?? 'claude-sonnet-4-5',
      timeoutMs: positiveInteger(env.ANTHROPIC_TIMEOUT_MS, 90_000),
    },
    localEnabled: env.FORGE_LOCAL_AI_ENABLED === 'true',
  }
}
