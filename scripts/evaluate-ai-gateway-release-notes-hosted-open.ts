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

/** Opt-in live Release Notes evaluation. Writes no Product or report state. */
import {
  createAiGatewayFromEnvironment,
  isReleaseNotesOutput,
  ReleaseNotesOutput,
} from '../src/core/ai/gateway'
import { releaseNotesCases } from './ai-gateway-bounded-evaluation-cases'

async function main(): Promise<void> {
  const configuredModel = process.env.FORGE_AI_HOSTED_OPEN_MODEL ?? 'openai/gpt-oss-120b:cheapest'
  const gateway = createAiGatewayFromEnvironment({
    ...process.env,
    FORGE_AI_PRIMARY_PROVIDER: 'hosted-open',
    FORGE_AI_HOSTED_OPEN_BASE_URL: process.env.FORGE_AI_HOSTED_OPEN_BASE_URL ?? 'https://router.huggingface.co/v1',
    FORGE_AI_HOSTED_OPEN_MODEL: configuredModel,
    FORGE_AI_HOSTED_OPEN_TIMEOUT_MS: process.env.FORGE_AI_HOSTED_OPEN_TIMEOUT_MS ?? '90000',
    FORGE_AI_FALLBACK_PROVIDERS: '',
  })
  const item = releaseNotesCases[0]
  const result = await gateway.execute<ReleaseNotesOutput>({
    requestId: `hosted-open-eval:${item.id}`,
    capability: 'generate-release-notes',
    input: item.input,
    outputSchemaId: 'forge.ai.release-notes.v1',
    reasoningClass: 'bounded-analysis',
    budgetClass: 'bounded-low',
    privacyPolicy: 'remote-allowed',
    timeoutMs: 90_000,
    allowedProviders: ['hosted-open'],
    fallbackPolicy: 'forbid',
    authoritySensitivity: 'advisory',
    metadata: { appName: item.input.appName, runId: item.input.recentRuns.at(-1)?.runId },
  })
  const groundingResult = result.status === 'SUCCESS'
    ? isReleaseNotesOutput(result.output, item.input)
    : null
  const report = {
    reportSchema: 'forge.ai.release-notes-hosted-open-evaluation.v1',
    caseId: item.id,
    persistedProductState: false,
    schemaResult: result.status === 'SUCCESS'
      ? 'PASS'
      : result.failure.code === 'SCHEMA_VIOLATION' ? 'FAIL' : 'NOT_EVALUATED',
    groundingResult: groundingResult === null ? 'NOT_EVALUATED' : groundingResult ? 'PASS' : 'FAIL',
    status: result.status,
    output: result.status === 'SUCCESS' ? result.output : undefined,
    failure: result.status === 'FAILURE' ? result.failure : undefined,
    provenance: result.provenance,
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = result.status === 'SUCCESS' && groundingResult ? 0 : 1
}

void main()
