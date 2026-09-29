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

export interface ReleaseNotesRunEvidence {
  runId: string
  startedAt: string
  durationMs: number
  total: number
  passed: number
  failed: number
  skipped: number
  passRatePercent: number
}

export interface ReleaseNotesInput {
  appName: string
  evidenceBoundary: 'run-level-release-notes-evidence'
  period: string
  runsAnalysed: number
  averagePassRatePercent: number
  passRateTrend: 'Improving' | 'Stable' | 'Degrading'
  totalSuiteSize: number
  totalFailures: number
  averageDurationMs: number
  bestRun: { passed: number; total: number }
  worstRun: { failed: number; total: number }
  healthScore: number
  branch: string
  version: string
  recentRuns: ReleaseNotesRunEvidence[]
  gitCommits: string[]
  limitations: ['Per-test detail is unavailable (TD-056).']
}

export interface ReleaseNotesOutput {
  healthEmphasis: 'health-score' | 'pass-rate' | 'trend'
  riskEmphasis: 'failure-volume' | 'duration' | 'trend'
  trendOutlook: 'continue-monitoring' | 'investigate-degradation' | 'validate-improvement'
  recommendedActionCodes: Array<
    'review-run-failures' | 'compare-run-duration' | 'inspect-git-changes' | 'collect-per-test-evidence'
  >
}

const outputKeys: Array<keyof ReleaseNotesOutput> = [
  'healthEmphasis',
  'riskEmphasis',
  'trendOutlook',
  'recommendedActionCodes',
]

export const releaseNotesSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    healthEmphasis: { enum: ['health-score', 'pass-rate', 'trend'] },
    riskEmphasis: { enum: ['failure-volume', 'duration', 'trend'] },
    trendOutlook: { enum: ['continue-monitoring', 'investigate-degradation', 'validate-improvement'] },
    recommendedActionCodes: {
      type: 'array', minItems: 1, maxItems: 3, uniqueItems: true,
      items: { enum: ['review-run-failures', 'compare-run-duration', 'inspect-git-changes', 'collect-per-test-evidence'] },
    },
  },
  required: outputKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The accepted advisory is deliberately a bounded projection of Product facts.
 * Providers perform the structured synthesis, but cannot introduce per-test
 * evidence or replace deterministic metrics with their own values.
 */
export function groundedReleaseNotes(input: ReleaseNotesInput): ReleaseNotesOutput {
  return {
    healthEmphasis: 'health-score',
    riskEmphasis: input.totalFailures > 0 ? 'failure-volume' : 'trend',
    trendOutlook: input.passRateTrend === 'Improving'
      ? 'validate-improvement'
      : input.passRateTrend === 'Degrading' ? 'investigate-degradation' : 'continue-monitoring',
    recommendedActionCodes: input.totalFailures > 0
      ? ['review-run-failures', 'collect-per-test-evidence']
      : ['inspect-git-changes'],
  }
}

export function isReleaseNotesOutput(
  value: unknown,
  input: ReleaseNotesInput,
): value is ReleaseNotesOutput {
  if (!isRecord(value)) return false
  if (Object.keys(value).sort().join('|') !== [...outputKeys].sort().join('|')) return false
  const health = ['health-score', 'pass-rate', 'trend']
  const risk = ['failure-volume', 'duration', 'trend']
  const outlook = ['continue-monitoring', 'investigate-degradation', 'validate-improvement']
  const actions = ['review-run-failures', 'compare-run-duration', 'inspect-git-changes', 'collect-per-test-evidence']
  if (!health.includes(value.healthEmphasis as string) || !risk.includes(value.riskEmphasis as string)) return false
  if (!outlook.includes(value.trendOutlook as string) || !Array.isArray(value.recommendedActionCodes)) return false
  if (value.recommendedActionCodes.length < 1 || value.recommendedActionCodes.length > 3) return false
  if (new Set(value.recommendedActionCodes).size !== value.recommendedActionCodes.length) return false
  if (!value.recommendedActionCodes.every(action => typeof action === 'string' && actions.includes(action))) return false
  if (value.riskEmphasis === 'failure-volume' && input.totalFailures === 0) return false
  if (value.trendOutlook === 'validate-improvement' && input.passRateTrend !== 'Improving') return false
  if (value.trendOutlook === 'investigate-degradation' && input.passRateTrend !== 'Degrading') return false
  return true
}

export const releaseNotesCapability: AiCapabilityDefinition<
  ReleaseNotesInput,
  ReleaseNotesOutput
> = {
  capability: 'generate-release-notes',
  outputSchemaId: 'forge.ai.release-notes.v1',
  outputSchema: releaseNotesSchema,
  maxOutputTokens: 1_200,
  buildPrompts(input) {
    return {
      systemPrompt: `You are the FORGE advisory release-notes synthesizer. Select only from the closed structured advisory vocabulary in the response schema. Do not add facts or make a release decision. Product-computed metrics, dates, branch, version, run history, and git commits are authoritative and immutable. Per-test evidence is unavailable under TD-056: never invent test IDs, flaky or failing tests, new or resolved failures, per-test risk tiers, browser bias, or per-test trends.`,
      userPrompt: `Generate the bounded advisory Release Notes synthesis.\n\nEvidence boundary: ${input.evidenceBoundary}\nProduct-owned facts:\n${JSON.stringify({
        appName: input.appName,
        period: input.period,
        runsAnalysed: input.runsAnalysed,
        averagePassRatePercent: input.averagePassRatePercent,
        passRateTrend: input.passRateTrend,
        totalSuiteSize: input.totalSuiteSize,
        totalFailures: input.totalFailures,
        averageDurationMs: input.averageDurationMs,
        bestRun: input.bestRun,
        worstRun: input.worstRun,
        healthScore: input.healthScore,
        branch: input.branch,
        version: input.version,
        recentRuns: input.recentRuns,
        gitCommits: input.gitCommits,
        limitations: input.limitations,
      }, null, 2)}\n\nChoose the advisory emphasis, outlook, and one to three action codes solely from the structured response schema.`,
    }
  },
  validateOutput: isReleaseNotesOutput,
}
