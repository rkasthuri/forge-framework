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

import { ALL_TRIAGE_CATEGORIES, TriageCategory } from '../../triage/taxonomy'
import { AiCapabilityDefinition } from './contracts'

export type FailureAnalysisConfidence = 'High' | 'Medium' | 'Low'

export interface FailureAnalysisInput {
  appName: string
  baseUrl: string
  suiteName: string
  priority: 'P0' | 'P1' | 'P2' | 'Unknown'
  testTitle: string
  errorMessage: string
  errorStack: string
  duration: number
  retries: number
  isTaggedFlaky: boolean
  isTaggedSlow: boolean
  browserName: string
  file: string
}

export interface FailureAnalysisOutput {
  verdict: TriageCategory
  confidence: FailureAnalysisConfidence
  evidence: string
  reasoning: string
  suggestedAction: string
}

const confidenceValues: FailureAnalysisConfidence[] = ['High', 'Medium', 'Low']
const requiredKeys = ['verdict', 'confidence', 'evidence', 'reasoning', 'suggestedAction']

export const failureAnalysisSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ALL_TRIAGE_CATEGORIES },
    confidence: { type: 'string', enum: confidenceValues },
    evidence: { type: 'string' },
    reasoning: { type: 'string' },
    suggestedAction: { type: 'string' },
  },
  required: requiredKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isFailureAnalysisOutput(value: unknown): value is FailureAnalysisOutput {
  if (!isRecord(value)) return false
  if (Object.keys(value).sort().join('|') !== [...requiredKeys].sort().join('|')) return false
  return ALL_TRIAGE_CATEGORIES.includes(value.verdict as TriageCategory)
    && confidenceValues.includes(value.confidence as FailureAnalysisConfidence)
    && typeof value.evidence === 'string'
    && typeof value.reasoning === 'string'
    && typeof value.suggestedAction === 'string'
}

export const failureAnalysisCapability: AiCapabilityDefinition<FailureAnalysisInput, FailureAnalysisOutput> = {
  capability: 'analyze-failure',
  outputSchemaId: 'forge.ai.failure-analysis.v1',
  outputSchema: failureAnalysisSchema,
  maxOutputTokens: 600,
  buildPrompts(input) {
    const tags = [
      input.isTaggedFlaky ? '@flaky' : null,
      input.isTaggedSlow ? '@slow' : null,
    ].filter(Boolean).join(', ') || 'none'
    const stack = input.errorStack
      ? input.errorStack.split('\n').slice(0, 6).join('\n')
      : 'Not available'

    const systemPrompt = `You are a senior QA automation engineer performing Root Cause Analysis on failing Playwright tests against ${input.appName} (${input.baseUrl}).

Framework: Playwright 1.49+ · TypeScript · Page Object Model · Self-healing selectors
Browsers: Chromium and WebKit. Retries: 1 (local), 2 (CI).

Classify each failure into EXACTLY ONE category:

app-bug — A genuine defect in the application under test. Classify app-bug ONLY when there is positive evidence: an HTTP 5xx, an application error banner/UI, or a business assertion that fails while selectors and infrastructure are verified healthy. If positive evidence is absent, do not guess app-bug.
test-defect — The test/spec is wrong: a non-unique selector, contradictory assertion, wrong URL/flow expectation, or invalid locator.
infra-defect — Pipeline/environment/page-load failure, such as network failure, missing environment input, browser launch error, or page-load failure.
flaky — Positive evidence of intermittent timing/animation behavior, including explicit @slow or @flaky evidence. Do not infer flakiness from an application-specific user, test name, or duration alone.
insufficient-evidence — The evidence does not support a confident classification. Prefer this over guessing.

Return only the requested structured response.`

    const userPrompt = `Analyze this Playwright test failure:

Suite:    ${input.suiteName}
Priority: ${input.priority}
Title:    ${input.testTitle}
File:     ${input.file}
Browser:  ${input.browserName}
Duration: ${input.duration}ms
Retries:  ${input.retries}
Tags:     ${tags}

Error:
${input.errorMessage}

Stack (first 6 lines):
${stack}

Classify this failure.`

    return { systemPrompt, userPrompt }
  },
  validateOutput: isFailureAnalysisOutput,
}
