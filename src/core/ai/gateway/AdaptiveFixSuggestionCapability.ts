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

import { AiCapabilityDefinition } from './contracts'

export type AdaptiveFixCategory =
  | 'timeout'
  | 'selector'
  | 'logic'
  | 'config'
  | 'skip'
  | 'bug-report'

export type AdaptiveFixRisk = 'Safe' | 'Review'

export interface AdaptiveFixSuggestionInput {
  appName: string
  baseUrl: string
  failure: {
    verdict: string
    confidence: string
    reasoning: string
    suggestedAction: string
    test: {
      testTitle: string
      suiteName: string
      file: string
      browserName: string
      priority: string
      errorMessage: string
      errorStack: string
      retries: number
      isTaggedFlaky: boolean
      isTaggedSlow: boolean
    }
  }
  source: {
    availability: 'available' | 'unavailable'
    exactTestSnippet: string
  }
}

export interface AdaptiveFixSuggestionOutput {
  fixCategory: AdaptiveFixCategory
  risk: AdaptiveFixRisk
  explanation: string
  currentCode: string
  suggestedCode: string
}

const categories: AdaptiveFixCategory[] = [
  'timeout', 'selector', 'logic', 'config', 'skip', 'bug-report',
]
const risks: AdaptiveFixRisk[] = ['Safe', 'Review']
const outputKeys = ['fixCategory', 'risk', 'explanation', 'currentCode', 'suggestedCode']

export const adaptiveFixSuggestionSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fixCategory: { type: 'string', enum: categories },
    risk: { type: 'string', enum: risks },
    explanation: { type: 'string', minLength: 1 },
    currentCode: { type: 'string' },
    suggestedCode: { type: 'string' },
  },
  required: outputKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join('|') === [...keys].sort().join('|')
}

export function isAdaptiveFixSuggestionOutput(
  value: unknown,
  input: AdaptiveFixSuggestionInput,
): value is AdaptiveFixSuggestionOutput {
  if (!isRecord(value) || !hasExactKeys(value, outputKeys)) return false
  if (!categories.includes(value.fixCategory as AdaptiveFixCategory)
    || !risks.includes(value.risk as AdaptiveFixRisk)
    || typeof value.explanation !== 'string'
    || value.explanation.trim().length === 0
    || typeof value.currentCode !== 'string'
    || typeof value.suggestedCode !== 'string') return false

  if (value.fixCategory === 'bug-report') {
    return value.risk === 'Review' && value.currentCode === '' && value.suggestedCode === ''
  }
  if (value.risk === 'Safe' && value.fixCategory !== 'timeout') return false
  if (input.source.availability !== 'available') return false
  if (value.currentCode.length === 0 || value.suggestedCode.length === 0) return false
  if (!input.source.exactTestSnippet.includes(value.currentCode)) return false
  return value.currentCode !== value.suggestedCode
}

export const adaptiveFixSuggestionCapability: AiCapabilityDefinition<
  AdaptiveFixSuggestionInput,
  AdaptiveFixSuggestionOutput
> = {
  capability: 'suggest-test-fix',
  outputSchemaId: 'forge.ai.adaptive-fix-suggestion.v1',
  outputSchema: adaptiveFixSuggestionSchema,
  maxOutputTokens: 1200,
  buildPrompts(input) {
    const systemPrompt = `You are a FORGE advisory test-fix analyst.

Analyze only the supplied failure evidence and exact test snippet. Do not claim that a fix was applied, executed, verified, persisted, or approved. The result is a repair candidate for human review and has no source-changing authority.

Use risk "Safe" only for a bounded timeout or wait adjustment that preserves test intent. Selector, assertion, control-flow, configuration, skip, and bug-report candidates require "Review". currentCode must be copied exactly from the supplied snippet and suggestedCode must be its proposed replacement. If the source is unavailable, only a bug-report candidate with empty code fields is permitted.

Do not invent application behavior, selectors, requirements, or evidence. Return only the requested structured response.`

    const userPrompt = `Produce one advisory fix candidate from this supplied evidence.

Application: ${input.appName}
Base URL: ${input.baseUrl}
Failure evidence:
${JSON.stringify(input.failure, null, 2)}

Source availability: ${input.source.availability}
Exact test snippet:
${input.source.exactTestSnippet}`
    return { systemPrompt, userPrompt }
  },
  validateOutput: isAdaptiveFixSuggestionOutput,
}
