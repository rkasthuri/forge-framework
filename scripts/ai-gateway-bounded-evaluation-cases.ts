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
  AdaptiveFixSuggestionInput,
  AdaptiveFixSuggestionOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  TestGapAnalysisInput,
  TestGapAnalysisOutput,
} from '../src/core/ai/gateway'

export const adaptiveFixCases: Array<{
  id: string
  expectedCategory: AdaptiveFixSuggestionOutput['fixCategory']
  input: AdaptiveFixSuggestionInput
}> = [{
  id: 'adaptive-fix-bounded-timeout',
  expectedCategory: 'timeout',
  input: {
    appName: 'evaluation-app',
    baseUrl: 'http://127.0.0.1:3000',
    failure: {
      verdict: 'test-defect',
      confidence: 'high',
      reasoning: 'The observed action exceeded its bounded wait.',
      suggestedAction: 'Review a bounded timeout adjustment.',
      test: {
        testTitle: 'loads observed inventory', suiteName: 'bounded evaluation',
        file: 'inventory.spec.ts', browserName: 'chromium', priority: 'P1',
        errorMessage: 'locator.click: Timeout 15000ms exceeded',
        errorStack: 'at inventory.spec.ts:2:58', retries: 1,
        isTaggedFlaky: false, isTaggedSlow: false,
      },
    },
    source: {
      availability: 'available',
      exactTestSnippet: `test('loads observed inventory', async ({ page }) => {
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(page.getByText('Inventory')).toBeVisible()
})`,
    },
  },
}]

export const rcaCases: Array<{
  id: string
  expectedVerdict: FailureAnalysisOutput['verdict']
  evidenceAnchors: readonly string[]
  input: FailureAnalysisInput
}> = [
  {
    id: 'rca-non-unique-selector',
    expectedVerdict: 'test-defect',
    evidenceAnchors: ['strict mode', 'getByRole'],
    input: {
      appName: 'evaluation-app', baseUrl: 'http://127.0.0.1:3000',
      suiteName: 'bounded local evaluation', priority: 'P1',
      testTitle: 'selects the unique submit control',
      errorMessage: 'strict mode violation: getByRole("button", { name: "Submit" }) resolved to 2 elements',
      errorStack: 'Error: strict mode violation\n at evaluation.spec.ts:12:5',
      duration: 450, retries: 0, isTaggedFlaky: false, isTaggedSlow: false,
      browserName: 'chromium', file: 'evaluation.spec.ts',
    },
  },
  {
    id: 'rca-network-refusal',
    expectedVerdict: 'infra-defect',
    evidenceAnchors: ['ERR_CONNECTION_REFUSED', '127.0.0.1:3000'],
    input: {
      appName: 'evaluation-app', baseUrl: 'http://127.0.0.1:3000',
      suiteName: 'bounded local evaluation', priority: 'P1',
      testTitle: 'loads the application entry point',
      errorMessage: 'page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/',
      errorStack: 'Error: net::ERR_CONNECTION_REFUSED\n at evaluation.spec.ts:4:5',
      duration: 30_000, retries: 1, isTaggedFlaky: false, isTaggedSlow: false,
      browserName: 'chromium', file: 'evaluation.spec.ts',
    },
  },
]

export function hasGroundedRcaEvidence(
  evidence: string,
  anchors: readonly string[],
): boolean {
  const normalizedEvidence = evidence.toLocaleLowerCase('en-US')
  return anchors.length > 0
    && anchors.every(anchor => normalizedEvidence.includes(anchor.toLocaleLowerCase('en-US')))
}

export const testGapCases: Array<{
  id: string
  expectedStatus: TestGapAnalysisOutput['analysisStatus']
  input: TestGapAnalysisInput
}> = [
  {
    id: 'test-gap-bounded-inventory',
    expectedStatus: 'COMPLETE',
    input: {
      appName: 'evaluation-app',
      analysisScope: { area: 'Authentication', operatorQuery: 'Assess only the supplied sign-in evidence.' },
      evidenceBoundary: 'supplied-test-inventory',
      testEvidence: [{
        evidenceRef: 'auth.spec.ts:10', testId: 'AUTH-001',
        title: 'signs in with observed valid credentials', file: 'auth.spec.ts', line: 10,
        priority: 'P0', tags: ['authentication'],
      }],
    },
  },
  {
    id: 'test-gap-no-evidence',
    expectedStatus: 'INSUFFICIENT_EVIDENCE',
    input: {
      appName: 'evaluation-app',
      analysisScope: { area: 'Checkout', operatorQuery: null },
      evidenceBoundary: 'supplied-test-inventory', testEvidence: [],
    },
  },
]
