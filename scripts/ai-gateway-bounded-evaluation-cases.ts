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
  ReleaseNotesInput,
  TestGapAnalysisInput,
  TestGapAnalysisOutput,
  TrendNarrativeInput,
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

export const trendNarrativeCases: Array<{
  id: string
  input: TrendNarrativeInput
}> = [{
  id: 'trend-narrative-bounded-run-evidence',
  input: {
    appName: 'evaluation-app',
    evidenceBoundary: 'run-level-trend-evidence',
    recentRuns: [
      { runId: 'run-003', passRatePercent: 100, failureCount: 0 },
      { runId: 'run-002', passRatePercent: 90, failureCount: 1 },
      { runId: 'run-001', passRatePercent: 80, failureCount: 2 },
    ],
    cleanRunStreak: 1,
    averagePassRatePercent: 90,
    durationTrend: {
      direction: 'faster',
      changePercent: -8.5,
      recentAverageDurationMs: 1_200,
    },
    limitations: ['Per-test trend data not yet available.'],
  },
}]

export const releaseNotesCases: Array<{
  id: string
  input: ReleaseNotesInput
}> = [{
  id: 'release-notes-bounded-run-evidence',
  input: {
    appName: 'evaluation-app',
    evidenceBoundary: 'run-level-release-notes-evidence',
    period: '2026-09-21 → 2026-09-25',
    runsAnalysed: 5,
    averagePassRatePercent: 94,
    passRateTrend: 'Improving',
    totalSuiteSize: 10,
    totalFailures: 3,
    averageDurationMs: 90_000,
    bestRun: { passed: 10, total: 10 },
    worstRun: { failed: 2, total: 10 },
    healthScore: 97,
    branch: 'evaluation/branch',
    version: 'eval-v1',
    recentRuns: [
      { runId: 'run-001', startedAt: '2026-09-21T00:00:00.000Z', durationMs: 110_000, total: 10, passed: 8, failed: 2, skipped: 0, passRatePercent: 80 },
      { runId: 'run-002', startedAt: '2026-09-22T00:00:00.000Z', durationMs: 100_000, total: 10, passed: 9, failed: 1, skipped: 0, passRatePercent: 90 },
      { runId: 'run-003', startedAt: '2026-09-23T00:00:00.000Z', durationMs: 90_000, total: 10, passed: 10, failed: 0, skipped: 0, passRatePercent: 100 },
      { runId: 'run-004', startedAt: '2026-09-24T00:00:00.000Z', durationMs: 80_000, total: 10, passed: 10, failed: 0, skipped: 0, passRatePercent: 100 },
      { runId: 'run-005', startedAt: '2026-09-25T00:00:00.000Z', durationMs: 70_000, total: 10, passed: 10, failed: 0, skipped: 0, passRatePercent: 100 },
    ],
    gitCommits: ['abc123 bounded evaluation commit'],
    limitations: ['Per-test detail is unavailable (TD-056).'],
    deterministicAdvisoryProjection: {
      healthEmphasis: 'health-score',
      riskEmphasis: 'failure-volume',
      trendOutlook: 'validate-improvement',
      recommendedActionCodes: ['review-run-failures', 'collect-per-test-evidence'],
    },
  },
}]
