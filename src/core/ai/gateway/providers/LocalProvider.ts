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

import { AiProviderAdapter, ProviderInvocation, ProviderResult } from '../contracts'

export type LocalProviderExecutor = (request: ProviderInvocation) => Promise<ProviderResult>

/**
 * Seam only. Slice scope deliberately provides no local inference runtime.
 */
export class LocalProvider implements AiProviderAdapter {
  readonly id = 'local' as const
  readonly configuredModel: string | null

  constructor(
    configuredModel: string | null = null,
    private readonly executor?: LocalProviderExecutor,
  ) {
    this.configuredModel = configuredModel
  }

  isConfigured(): boolean {
    return Boolean(this.executor)
  }

  async invoke(request: ProviderInvocation): Promise<ProviderResult> {
    if (!this.executor) {
      return {
        status: 'FAILURE',
        provider: this.id,
        configuredModel: this.configuredModel,
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Local AI provider is not configured.',
      }
    }
    return this.executor(request)
  }
}
