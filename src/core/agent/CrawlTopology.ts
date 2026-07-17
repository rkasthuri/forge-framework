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
 * TD-013 Phase 3 (Block 2b) — CrawlTopology: the synthesizer's UNIFIED INPUT.
 *
 * A decoupled projection of "the app's shape" that the recipe-writer (2c) consumes.
 * Two producers feed it (see TopologyExtractor): a PERSISTED AppModel (pages + flows)
 * and, degenerately, a single live page's PageSignals (bootstrap = 1 node, 0
 * transitions). The synthesizer depends ONLY on this type — never on how it was
 * produced, and never on AppModel/Playwright types (kept out on purpose so the
 * projection cannot drift toward its source).
 *
 * `kind` / `action` / `appType` are plain strings here on purpose: the projection is a
 * VIEW, deliberately independent of the onboarding-layer unions it happens to mirror.
 */

export interface CrawlTopologyElement {
  id:    string
  name:  string
  kind:  string
  /** The resolved Playwright selector, or null when the element carries no strategy —
   *  an honest "selector unknown" (ADR-017 archetype-1, mirroring StateEdge.trigger's
   *  nullability). The recipe-writer must NOT act on a null-selector element; a selector
   *  is never fabricated to fill this slot. */
  selector: string | null
  href?: string | null
  observedState?: 'visible' | 'attached'
}

export interface CrawlTopologyPage {
  id:           string
  urlPattern:   string
  displayName?: string
  isAuthPage:   boolean
  elements:     CrawlTopologyElement[]
}

export interface CrawlTopologyTransition {
  fromPageId: string
  /** Nullable: mirrors FlowStep.targetPageId (a step may not resolve a destination page). */
  toPageId:   string | null
  /** Nullable: mirrors FlowStep.elementId (e.g. a navigate step has no trigger element). */
  elementId:  string | null
  action:     string
  value?:     string | null
  /** INHERITED 1:1 from FlowStep.grounding — copied by the extractor, NEVER recomputed
   *  and NEVER upgraded. 'observed' here means the crawler itself observed this exact
   *  transition; the extractor cannot mint that claim. */
  grounding:  'observed' | 'inferred'
}

export interface CrawlTopology {
  appName: string
  baseUrl: string
  appType: string
  pages:       CrawlTopologyPage[]
  /** Empty for bootstrap (the degenerate single-node case). */
  transitions: CrawlTopologyTransition[]
  /** Provenance of THIS topology — honest about where it came from. */
  source: 'app-model' | 'live-page'
}
