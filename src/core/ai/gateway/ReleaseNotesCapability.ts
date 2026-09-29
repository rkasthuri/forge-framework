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
  deterministicAdvisoryProjection: ReleaseNotesDeterministicProjection
}

export interface ReleaseNotesDeterministicProjection {
  healthEmphasis: 'health-score' | 'pass-rate' | 'trend'
  riskEmphasis: 'failure-volume' | 'duration' | 'trend'
  trendOutlook: 'continue-monitoring' | 'investigate-degradation' | 'validate-improvement'
  recommendedActionCodes: Array<
    'review-run-failures' | 'compare-run-duration' | 'inspect-git-changes' | 'collect-per-test-evidence'
  >
}

export interface ReleaseNotesOutput {
  healthNarrative: string
  riskNarrative: string
  trendNarrative: string
  recommendedActionsNarrative: string
}

const outputKeys: Array<keyof ReleaseNotesOutput> = [
  'healthNarrative',
  'riskNarrative',
  'trendNarrative',
  'recommendedActionsNarrative',
]

export const releaseNotesSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    healthNarrative: { type: 'string', minLength: 1, maxLength: 320 },
    riskNarrative: { type: 'string', minLength: 1, maxLength: 320 },
    trendNarrative: { type: 'string', minLength: 1, maxLength: 320 },
    recommendedActionsNarrative: { type: 'string', minLength: 1, maxLength: 320 },
  },
  required: outputKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * FORGE, not an AI provider, owns this projection of Product facts.
 */
export function groundedReleaseNotes(
  input: Pick<ReleaseNotesInput, 'passRateTrend' | 'totalFailures'>,
): ReleaseNotesDeterministicProjection {
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

type ReleaseNotesNarrativeChoices = Record<keyof ReleaseNotesOutput, readonly string[]>

/**
 * The provider may select phrasing, but it may not introduce claims. Keeping
 * the accepted narratives closed makes grounding decidable without rewriting
 * or normalising provider output after generation.
 */
export function allowedReleaseNotesNarratives(input: ReleaseNotesInput): ReleaseNotesNarrativeChoices {
  const projection = groundedReleaseNotes(input)
  const actions = projection.recommendedActionCodes.join(' and ')
  return {
    healthNarrative: [
      `The ${projection.healthEmphasis} emphasis keeps this advisory anchored to supplied run-level health evidence.`,
      `The ${projection.healthEmphasis} emphasis frames supplied run-level health evidence without changing Product facts.`,
    ],
    riskNarrative: [
      `The ${projection.riskEmphasis} emphasis keeps this advisory anchored to supplied run-level risk evidence.`,
      `The ${projection.riskEmphasis} emphasis frames supplied run-level risk evidence without adding unsupported causes.`,
    ],
    trendNarrative: [
      `The Product-owned ${input.passRateTrend} trend supports the deterministic ${projection.trendOutlook} outlook.`,
      `The deterministic ${projection.trendOutlook} outlook explains the Product-owned ${input.passRateTrend} trend without changing it.`,
    ],
    recommendedActionsNarrative: [
      `The deterministic ${actions} actions remain advisory and require human review.`,
      `FORGE recommends ${actions} as advisory follow-up without executing any action.`,
    ],
  }
}

export function isReleaseNotesOutput(
  value: unknown,
  input: ReleaseNotesInput,
): value is ReleaseNotesOutput {
  if (!isRecord(value)) return false
  if (Object.keys(value).sort().join('|') !== [...outputKeys].sort().join('|')) return false
  const narratives = outputKeys.map(key => value[key])
  if (!narratives.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 320)) return false

  const projection = groundedReleaseNotes(input)
  if (JSON.stringify(input.deterministicAdvisoryProjection) !== JSON.stringify(projection)) return false
  const allowed = allowedReleaseNotesNarratives(input)
  return outputKeys.every(key => allowed[key].includes(value[key] as string))
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
    const allowedNarratives = allowedReleaseNotesNarratives(input)
    return {
      systemPrompt: `You are the FORGE advisory release-notes narrator. FORGE has already computed the immutable deterministic advisory projection. Select exactly one supplied allowed narrative for each response field, reproducing it verbatim. Do not compose, alter, or add text. This closed narrative vocabulary prevents new facts, causes, test details, browser claims, or release-readiness decisions. Per-test evidence is unavailable under TD-056. Return only the four strings required by the structured response schema.`,
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
      }, null, 2)}\n\nImmutable deterministic FORGE advisory projection:\n${JSON.stringify(input.deterministicAdvisoryProjection, null, 2)}\n\nAllowed narrative values:\n${JSON.stringify(allowedNarratives, null, 2)}\n\nFor each response field, choose exactly one of that field's allowed narrative values and reproduce it verbatim.`,
    }
  },
  validateOutput: isReleaseNotesOutput,
}
