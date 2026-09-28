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

export interface TrendNarrativeRunEvidence {
  runId: string
  passRatePercent: number
  failureCount: number
}

export interface TrendNarrativeInput {
  appName: string
  evidenceBoundary: 'run-level-trend-evidence'
  recentRuns: TrendNarrativeRunEvidence[]
  cleanRunStreak: number
  averagePassRatePercent: number
  durationTrend: {
    direction: 'faster' | 'slower' | 'stable'
    changePercent: number
    recentAverageDurationMs: number
  }
  limitations: ['Per-test trend data not yet available.']
}

export interface TrendNarrativeOutput {
  narrative: string
}

const outputKeys = ['narrative']
export const trendNarrativeSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    narrative: { type: 'string', minLength: 1, maxLength: 800 },
  },
  required: outputKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join('|') === [...keys].sort().join('|')
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value)
}

/**
 * The provider may choose whether it can return this advisory narrative, but it
 * may not add prose beyond the supplied evidence. Keeping the accepted text a
 * deterministic projection of the structured input makes unsupported per-test
 * or causal claims structurally unrepresentable in a successful response.
 */
export function groundedTrendNarrative(input: TrendNarrativeInput): string {
  const passRates = input.recentRuns.map(run => run.passRatePercent)
  const failureCounts = input.recentRuns.map(run => run.failureCount)
  const minimumPassRate = Math.min(...passRates)
  const maximumPassRate = Math.max(...passRates)
  const minimumFailureCount = Math.min(...failureCounts)
  const maximumFailureCount = Math.max(...failureCounts)
  const durationChange = Math.abs(input.durationTrend.changePercent)

  return `Across the supplied recent runs, pass rates range from ${formatPercent(minimumPassRate)}% to ${formatPercent(maximumPassRate)}%, run-level failure counts range from ${minimumFailureCount} to ${maximumFailureCount}, and the clean-run streak is ${input.cleanRunStreak}. The average pass rate is ${formatPercent(input.averagePassRatePercent)}%, while recent average duration is ${input.durationTrend.recentAverageDurationMs} ms with a ${input.durationTrend.direction} trend (${formatPercent(durationChange)}% change).`
}

export function isTrendNarrativeOutput(
  value: unknown,
  input: TrendNarrativeInput,
): value is TrendNarrativeOutput {
  if (!isRecord(value) || !hasExactKeys(value, outputKeys)) return false
  if (typeof value.narrative !== 'string') return false
  const narrative = value.narrative.trim()
  return narrative.length > 0
    && narrative.length <= 800
    && input.recentRuns.length > 0
    && narrative === groundedTrendNarrative(input)
}

export const trendNarrativeCapability: AiCapabilityDefinition<
  TrendNarrativeInput,
  TrendNarrativeOutput
> = {
  capability: 'generate-trend-narrative',
  outputSchemaId: 'forge.ai.trend-narrative.v1',
  outputSchema: trendNarrativeSchema,
  maxOutputTokens: 600,
  buildPrompts(input) {
    const expectedNarrative = groundedTrendNarrative(input)
    const systemPrompt = `You are a FORGE advisory trend narrator.

Return the exact two-sentence narrative supplied by the user in the narrative field of the structured response. Do not add, remove, paraphrase, or reinterpret any text. The narrative is a bounded projection of Product-owned deterministic facts and cannot alter Product state or release-readiness decisions.

Per-test evidence is unavailable. Do not claim individual unstable or flaky tests, browser bias, specific failing-test trends, test identities, root causes, or any other per-test fact. Refer to supplied failure counts as run-level failures. Return only the requested structured response.`

    const userPrompt = `Generate the bounded advisory trend narrative.

Application: ${input.appName}
Evidence boundary: ${input.evidenceBoundary}
Recent run evidence:
${JSON.stringify(input.recentRuns, null, 2)}
Clean-run streak: ${input.cleanRunStreak}
Average pass rate: ${input.averagePassRatePercent}%
Duration trend: ${JSON.stringify(input.durationTrend)}
Known limitation: ${input.limitations[0]}
Exact narrative to return: ${expectedNarrative}`

    return { systemPrompt, userPrompt }
  },
  validateOutput: isTrendNarrativeOutput,
}
