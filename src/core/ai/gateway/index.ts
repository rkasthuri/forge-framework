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

import { AiGateway } from './AiGateway'
import { failureAnalysisCapability } from './FailureAnalysisCapability'
import { testGapAnalysisCapability } from './TestGapAnalysisCapability'
import { adaptiveFixSuggestionCapability } from './AdaptiveFixSuggestionCapability'
import { readAiGatewayConfiguration } from './configuration'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { HostedOpenProvider } from './providers/HostedOpenProvider'
import { LocalProvider } from './providers/LocalProvider'
import { OpenAiProvider } from './providers/OpenAiProvider'

export * from './contracts'
export * from './configuration'
export * from './FailureAnalysisCapability'
export * from './TestGapAnalysisCapability'
export * from './AdaptiveFixSuggestionCapability'
export * from './AiGateway'
export * from './providers/AnthropicProvider'
export * from './providers/HostedOpenProvider'
export * from './providers/LocalProvider'
export * from './providers/OpenAiProvider'

export function createAiGatewayFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AiGateway {
  const configuration = readAiGatewayConfiguration(env)
  return new AiGateway(
    configuration,
    [
      new OpenAiProvider(configuration.openai),
      new AnthropicProvider(configuration.anthropic),
      new LocalProvider(configuration.local),
      new HostedOpenProvider(configuration.hostedOpen),
    ],
    [failureAnalysisCapability, testGapAnalysisCapability, adaptiveFixSuggestionCapability],
  )
}
