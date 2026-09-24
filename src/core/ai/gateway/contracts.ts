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

/**
 * Provider-neutral contracts for FORGE advisory AI capabilities.
 * Product callers request capabilities; only provider adapters know vendor SDKs.
 */

export type AiCapability = 'analyze-failure' | 'analyze-test-gaps'

export type AiProviderId = 'openai' | 'anthropic' | 'local'
export type AiProviderRuntime = 'ollama'

export type AiReasoningClass = 'bounded-analysis'
export type AiBudgetClass = 'bounded-low' | 'no-ai-spend'
export type AiPrivacyPolicy = 'remote-allowed' | 'local-only'
export type AiFallbackPolicy = 'forbid' | 'allow-explicit'
export type AiAuthoritySensitivity = 'advisory' | 'authority-sensitive'

export type AiGatewayFailureCode =
  | 'UNKNOWN_CAPABILITY'
  | 'NO_CONFIGURED_PROVIDER'
  | 'NO_ALLOWED_PROVIDER'
  | 'PROVIDER_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'CREDIT_EXHAUSTED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'SCHEMA_VIOLATION'
  | 'POLICY_BLOCKED'

export interface AiCapabilityRequest<TInput = unknown> {
  requestId: string
  capability: string
  input: TInput
  outputSchemaId: string
  reasoningClass: AiReasoningClass
  budgetClass: AiBudgetClass
  privacyPolicy: AiPrivacyPolicy
  timeoutMs: number
  allowedProviders: readonly AiProviderId[]
  fallbackPolicy: AiFallbackPolicy
  authoritySensitivity: AiAuthoritySensitivity
  metadata: {
    appName: string
    runId?: string
  }
}

export interface AiUsageReceipt {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
}

export interface AiGatewayProvenance {
  requestId: string
  capability: string
  provider: AiProviderId | null
  providerRuntime: AiProviderRuntime | null
  configuredModel: string | null
  responseModel: string | null
  gatewayPolicy: 'ai-gateway-foundation-v1'
  outputSchemaId: string
  startedAt: string
  completedAt: string
  durationMs: number
  attemptedProviders: AiProviderId[]
  fallbackOccurred: boolean
  providerRequestId?: string
  usage?: AiUsageReceipt
}

export interface AiCapabilitySuccess<TOutput> {
  status: 'SUCCESS'
  output: TOutput
  provenance: AiGatewayProvenance
}

export interface AiCapabilityFailure {
  status: 'FAILURE'
  failure: {
    code: AiGatewayFailureCode
    message: string
    providerCode?: string
  }
  provenance: AiGatewayProvenance
}

export type AiCapabilityResult<TOutput> =
  | AiCapabilitySuccess<TOutput>
  | AiCapabilityFailure

export interface ProviderInvocation {
  requestId: string
  capability: AiCapability
  systemPrompt: string
  userPrompt: string
  outputSchemaId: string
  outputSchema: Record<string, unknown>
  maxOutputTokens: number
  timeoutMs: number
}

export interface ProviderSuccess {
  status: 'SUCCESS'
  provider: AiProviderId
  providerRuntime?: AiProviderRuntime
  configuredModel: string
  responseModel: string | null
  output: unknown
  providerRequestId?: string
  usage?: AiUsageReceipt
}

export interface ProviderFailure {
  status: 'FAILURE'
  provider: AiProviderId
  providerRuntime?: AiProviderRuntime
  configuredModel: string | null
  code: Exclude<AiGatewayFailureCode,
    'UNKNOWN_CAPABILITY' | 'NO_CONFIGURED_PROVIDER' | 'NO_ALLOWED_PROVIDER' | 'POLICY_BLOCKED'>
  message: string
  providerCode?: string
}

export type ProviderResult = ProviderSuccess | ProviderFailure

export interface AiProviderAdapter {
  readonly id: AiProviderId
  readonly configuredModel: string | null
  isConfigured(): boolean
  invoke(request: ProviderInvocation): Promise<ProviderResult>
}

export interface AiCapabilityDefinition<TInput = unknown, TOutput = unknown> {
  readonly capability: AiCapability
  readonly outputSchemaId: string
  readonly outputSchema: Record<string, unknown>
  readonly maxOutputTokens: number
  buildPrompts(input: TInput): { systemPrompt: string; userPrompt: string }
  validateOutput(output: unknown, input: TInput): output is TOutput
}
