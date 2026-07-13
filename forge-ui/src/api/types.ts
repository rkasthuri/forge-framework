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

// API request/response types — mirror the engine + API.md contract.

export interface DetectionField {
  value: string
  confidence: string
  source: string
}

export interface Detection {
  appType:       DetectionField
  authType:      DetectionField
  crawlStrategy: DetectionField
  appName:       DetectionField
}

export interface Project {
  appName:       string
  url:           string
  appType:       string
  crawlStrategy: string
  authType:      string
  createdAt:     string
  lastOpenedAt:  string
  workspacePath: string   // '' for fixture fallbacks (not yet crawled)
}

export interface OnboardRequest {
  url:       string
  appName:   string
  username?: string
  password?: string
  dryRun?:   boolean
  jobId?:    string            // TD-UI-011 — client-generated, keys the log buffer
  detectionResult?: Detection  // Step 4 — save-after-dry-run fast path
}

export interface OnboardResponse {
  project:   Project
  detection: Detection
  dryRun:    boolean
}

/** Server envelope: { data, error, timestamp }. */
export interface Envelope<T> {
  data:      T
  error:     string | null
  timestamp: string
}

// --- TD-UI-002 Crawl tab (ADR-012, Phase 1) ---

export interface CrawlRequest {
  appName:  string
  force?:   boolean
  aiBudget?: number
}

/** A page from app-model.json, mapped for the table (audit ruling; no depth). */
export interface DiscoveredPage {
  id:               string
  url:              string          // app.baseUrl + urlPattern
  urlPattern:       string
  module:           string          // 'Unknown' when unclassified
  moduleConfidence: string | null
  elements:         number
  roles:            string[]
}

export interface CrawlStatus {
  jobId:       string
  status:      'running' | 'completed' | 'failed'
  complete:    boolean
  lines:       string[]             // Mission Timeline
  strategy:    string | null        // user-friendly label
  strategyRaw: string | null        // engine term, for the tooltip
  pagesFound:  number
  pages:       DiscoveredPage[]      // [] until complete
  error:       string | null
  startedAt:   string
  completedAt: string | null
}

// --- TD-UI-003 Test Cases tab — generation manifest ---
// STRUCTURAL mirror of the engine's GenerationManifest (src/core/onboarding/
// GenerationManifest.ts). Redeclared here, NOT imported from src/: forge-ui's
// one-directional boundary (forge-ui → src, never a static src import). Same
// discipline as JobResult/ResolvedWorkspace and TestFileResolver's local shape.

export type TestFileType = 'spec' | 'pom' | 'fixture' | 'api-client' | 'api-spec'
export type FlowConfidenceTier = 'observed' | 'partial' | 'unknown'

export interface ManifestFile {
  id:           string   // opaque handle — the ONLY thing the file route accepts
  relativePath: string
  type:         TestFileType
  reason:       string
  flowId?:      string
  pageId?:      string
}

export interface ManifestFlow {
  id:                string
  displayName:       string
  confidence:        FlowConfidenceTier
  source:            string
  groundingWarnings: string[]
  specFile:          string
}

export interface ManifestPage {
  id:               string
  urlPattern:       string
  moduleConfidence: string   // 'high' | 'medium' | 'low' | 'unknown'
  pomFile:          string
}

export interface GenerationManifest {
  schemaVersion:       number
  generatorVersion:    string
  appName:             string
  generatedAt:         string
  durationMs:          number
  classificationRunId?: string
  specCount:           number
  pomCount:            number
  fixtureCount:        number
  filesWritten:        number
  observedFlows:       number
  partialFlows:        number
  unknownFlows:        number
  flows:               ManifestFlow[]
  pages:               ManifestPage[]
  files:               ManifestFile[]
}

/** GET /api/v1/projects/:appName/tests/file/:fileId — one generated file's content. */
export interface TestFileContent {
  id:           string
  relativePath: string
  language:     string   // 'typescript'
  content:      string
  lastModified: string   // ISO — file mtime
  generatedAt:  string   // ISO — from the manifest
}
