/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

/**
 * GenerationManifest — first-class engine type describing the output of a
 * single GeneratorRunner.generateIntoWorkspace() invocation. Nova-approved:
 * the producer (GeneratorRunner) describes its own output; consumers (UI,
 * CLI, future cloud) never reconstruct it. Persisted to
 * <workspace>/.forge/generation-manifest.json and returned as JobResult.result
 * through ExecutionContext → JobRunner → API.
 */

import type { FlowConfidence, FlowSource, ModuleConfidence } from './types'

export type GenerationFileReason = 'new-flow' | 'regenerated' | 'unchanged'
export type GenerationFileType = 'spec' | 'pom' | 'fixture' | 'api-client' | 'api-spec'
export const GENERATION_SCHEMA_VERSION = 2

export interface GenerationFile {
  /** Stable, deterministic ID: SHA-256 of relativePath. Survives regeneration.
   *  The ID — never a path — is what clients reference. */
  id: string
  /** Relative path from workspace root e.g. tests/checkout/checkout-flow.spec.ts */
  relativePath: string
  type: GenerationFileType
  reason: GenerationFileReason
  /** flowId this file covers (undefined for fixtures) */
  flowId?: string
  /** pageId this file covers (undefined for specs and fixtures) */
  pageId?: string
}

export interface GenerationFlow {
  id: string
  displayName: string
  confidence: FlowConfidence
  source: FlowSource
  groundingWarnings: string[]
  /** Relative path of the spec file generated for this flow */
  specFile: string
}

export interface GenerationPage {
  id: string
  /** PageDefinition persists a urlPattern, not a literal crawled URL. */
  urlPattern: string
  moduleConfidence: ModuleConfidence
  /** Relative path of the POM file generated for this page */
  pomFile: string
}

export interface GenerationManifest {
  /** Schema version for future UI compatibility */
  schemaVersion: typeof GENERATION_SCHEMA_VERSION
  /** Semver of the generator that produced this manifest */
  generatorVersion: string
  appName: string
  generatedAt: string        // ISO timestamp
  durationMs: number         // performance.now() delta — generation only
  /**
   * The crawl run ID is not persisted to the AppModel today
   * (AiBudgetTracker.runId is not saved). This is the classification run that
   * produced the model snapshot — a different thing. Do not relabel it as a
   * crawl run. Threading a true crawlRunId is follow-up work.
   */
  classificationRunId?: string

  /** Counts — always derivable from arrays below but surfaced for fast UI rendering */
  specCount: number
  pomCount: number
  fixtureCount: number
  filesWritten: number

  /** Evidence breakdown */
  observedFlows: number      // confidence === 'observed'
  partialFlows: number       // confidence === 'partial'
  unknownFlows: number       // confidence === 'unknown'

  /** Full detail arrays — never omit these; summaries derive from them */
  flows: GenerationFlow[]
  pages: GenerationPage[]
  files: GenerationFile[]
}
