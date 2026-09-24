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

export type TestGapCategory =
  | 'uncovered-behavior'
  | 'boundary-condition'
  | 'negative-path'
  | 'state-transition'
  | 'evidence-gap'

export type TestGapPriority = 'P0' | 'P1' | 'P2'
export type TestGapBasis = 'evidence-supported' | 'model-suggestion'

export interface TestGapEvidence {
  evidenceRef: string
  testId: string | null
  title: string
  file: string
  line: number
  priority: TestGapPriority | null
  tags: string[]
}

export interface TestGapAnalysisInput {
  appName: string
  analysisScope: {
    area: string
    operatorQuery: string | null
  }
  evidenceBoundary: 'supplied-test-inventory'
  testEvidence: TestGapEvidence[]
}

export interface TestGapCandidate {
  category: TestGapCategory
  affectedBehavior: string
  rationale: string
  supportingEvidenceRefs: string[]
  proposedTestIntent: string
  priority: TestGapPriority
  basis: TestGapBasis
  uncertainty: string
}

export interface TestGapAnalysisOutput {
  analysisStatus: 'COMPLETE' | 'INSUFFICIENT_EVIDENCE'
  coveredEvidenceRefs: string[]
  gaps: TestGapCandidate[]
  limitations: string[]
}

const categories: TestGapCategory[] = [
  'uncovered-behavior',
  'boundary-condition',
  'negative-path',
  'state-transition',
  'evidence-gap',
]
const priorities: TestGapPriority[] = ['P0', 'P1', 'P2']
const bases: TestGapBasis[] = ['evidence-supported', 'model-suggestion']
const outputKeys = ['analysisStatus', 'coveredEvidenceRefs', 'gaps', 'limitations']
const gapKeys = [
  'category',
  'affectedBehavior',
  'rationale',
  'supportingEvidenceRefs',
  'proposedTestIntent',
  'priority',
  'basis',
  'uncertainty',
]

export const testGapAnalysisSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    analysisStatus: { type: 'string', enum: ['COMPLETE', 'INSUFFICIENT_EVIDENCE'] },
    coveredEvidenceRefs: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
    gaps: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          category: { type: 'string', enum: categories },
          affectedBehavior: { type: 'string' },
          rationale: { type: 'string' },
          supportingEvidenceRefs: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          proposedTestIntent: { type: 'string' },
          priority: { type: 'string', enum: priorities },
          basis: { type: 'string', enum: bases },
          uncertainty: { type: 'string' },
        },
        required: gapKeys,
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: outputKeys,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join('|') === [...keys].sort().join('|')
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(isNonEmptyString)
    && new Set(value).size === value.length
}

export function isTestGapAnalysisOutput(
  value: unknown,
  input: TestGapAnalysisInput,
): value is TestGapAnalysisOutput {
  if (!isRecord(value) || !hasExactKeys(value, outputKeys)) return false
  if (value.analysisStatus !== 'COMPLETE' && value.analysisStatus !== 'INSUFFICIENT_EVIDENCE') return false
  if (!isStringArray(value.coveredEvidenceRefs)
    || !Array.isArray(value.gaps)
    || value.gaps.length > 6
    || !isStringArray(value.limitations)) return false

  const suppliedRefs = new Set(input.testEvidence.map(item => item.evidenceRef))
  if (value.coveredEvidenceRefs.some(ref => !suppliedRefs.has(ref))) return false
  if (input.testEvidence.length === 0
    && (value.analysisStatus !== 'INSUFFICIENT_EVIDENCE' || value.gaps.length > 0)) return false
  if (value.analysisStatus === 'INSUFFICIENT_EVIDENCE'
    && (value.gaps.length > 0 || value.limitations.length === 0)) return false

  return value.gaps.every(gap => {
    if (!isRecord(gap) || !hasExactKeys(gap, gapKeys)) return false
    if (!categories.includes(gap.category as TestGapCategory)
      || !priorities.includes(gap.priority as TestGapPriority)
      || !bases.includes(gap.basis as TestGapBasis)
      || !isNonEmptyString(gap.affectedBehavior)
      || !isNonEmptyString(gap.rationale)
      || !isStringArray(gap.supportingEvidenceRefs)
      || !isNonEmptyString(gap.proposedTestIntent)
      || !isNonEmptyString(gap.uncertainty)) return false
    if (gap.supportingEvidenceRefs.some(ref => !suppliedRefs.has(ref))) return false
    return gap.basis !== 'evidence-supported' || gap.supportingEvidenceRefs.length > 0
  })
}

export const testGapAnalysisCapability: AiCapabilityDefinition<
  TestGapAnalysisInput,
  TestGapAnalysisOutput
> = {
  capability: 'analyze-test-gaps',
  outputSchemaId: 'forge.ai.test-gap-analysis.v1',
  outputSchema: testGapAnalysisSchema,
  maxOutputTokens: 1800,
  buildPrompts(input) {
    const systemPrompt = `You are a FORGE advisory test-gap analyst.

Analyze only the Product and test evidence supplied in this request. Identify meaningful missing coverage without inventing screens, endpoints, controls, business rules, test identities, execution outcomes, or coverage percentages.

Every evidence reference must exactly match a supplied evidenceRef. Use basis "evidence-supported" only when at least one supplied reference supports the claim. Use "model-suggestion" for a bounded candidate whose existence is not established by the supplied evidence, and state that limitation explicitly. If the supplied evidence is not sufficient to perform the requested analysis, return INSUFFICIENT_EVIDENCE, no gaps, and explicit limitations. A successful COMPLETE response with zero gaps is permitted only when the supplied evidence supports that conclusion.

The result is advisory. Do not create tests, alter Definitions, approve readiness, or claim Product authority. Return only the requested structured response.`

    const userPrompt = `Analyze the supplied FORGE test evidence for advisory gaps.

Application identity: ${input.appName}
Analysis area: ${input.analysisScope.area}
Operator scope: ${input.analysisScope.operatorQuery ?? 'not supplied'}
Evidence boundary: ${input.evidenceBoundary}

Supplied test evidence:
${JSON.stringify(input.testEvidence, null, 2)}`

    return { systemPrompt, userPrompt }
  },
  validateOutput: isTestGapAnalysisOutput,
}
