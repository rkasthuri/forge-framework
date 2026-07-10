import { Router } from 'express'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { ok, fail } from '../http'
import { jobRunner } from '../jobs/JobRunner'
import { workspaceResolver } from '../context/WorkspaceResolver'
import { projectRegistry } from '../registry/ProjectRegistry'

/**
 * TD-UI-002 Crawl tab (ADR-012, Phase 1 — polling).
 *  POST /api/v1/crawl               → 202 { jobId } (fires async, returns at once)
 *  GET  /api/v1/crawl/:jobId/status → Mission Timeline (live log lines) + strategy
 *                                     + structured pages (post-completion, from
 *                                     app-model.json). Client polls every 1s.
 */
const router = Router()

/** Engine crawl mode → user-friendly label (ADR-012). Raw term kept for tooltip. */
const STRATEGY_LABELS: Record<string, string> = {
  bfs:    'Link Following',
  spa:    'Click Discovery',
  hybrid: 'Hybrid Exploration',
  auto:   'Auto-detected',
}

export interface DiscoveredPage {
  id:               string
  url:              string          // app.baseUrl + urlPattern (audit ruling)
  urlPattern:       string
  module:           string          // page.module?.name ?? 'Unknown'
  moduleConfidence: string | null
  elements:         number          // page.elements?.length ?? 0
  roles:            string[]        // page.accessibleByRoles ?? []
  // depth: omitted — not present in app-model.json (audit)
}

function readJson(file: string): any {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null }
}

/** Resolve the app's start URL (CrawlRunner requires it): registry, then config. */
function resolveUrl(appName: string): string | undefined {
  const fromRegistry = projectRegistry.find(appName)?.url
  if (fromRegistry) return fromRegistry
  const ws = workspaceResolver.resolve(appName)
  return readJson(path.join(ws.forgeDir, 'config.json'))?.url
}

/** Pure map: a parsed app-model.json → table rows (audit ruling; no depth). */
export function mapModelPages(model: any): DiscoveredPage[] {
  if (!Array.isArray(model?.pages)) return []
  const baseUrl: string = model.app?.baseUrl ?? ''
  return model.pages.map((p: any): DiscoveredPage => ({
    id:               p.id ?? '',
    url:              baseUrl + (p.urlPattern ?? ''),
    urlPattern:       p.urlPattern ?? '',
    module:           p.module?.name ?? 'Unknown',
    moduleConfidence: p.module?.confidence ?? null,
    elements:         Array.isArray(p.elements) ? p.elements.length : 0,
    roles:            Array.isArray(p.accessibleByRoles) ? p.accessibleByRoles : [],
  }))
}

/** After completion, read + map the structured pages from app-model.json. */
function loadPages(appName: string): DiscoveredPage[] {
  const ws = workspaceResolver.resolve(appName)
  return mapModelPages(readJson(path.join(ws.root, 'models', appName, 'app-model.json')))
}

/** Parse the engine crawl mode from a '… | Mode: <mode> | …' log line. */
export function parseStrategy(lines: string[]): { raw: string | null; label: string | null } {
  let raw: string | null = null
  for (const l of lines) {
    // Matches BOTH '[StrategyDetector] Mode: bfs | …' and
    // '[FORGE Crawler] Role: … | Mode: bfs | …' (Issue #3). Constrained to the
    // real modes so a stray 'Mode:' line can't set a bogus strategy.
    const m = l.match(/Mode:\s*(bfs|spa|hybrid)\b/)
    if (m) raw = m[1]   // last match wins (multi-role, last-wins ruling)
  }
  return { raw, label: raw ? (STRATEGY_LABELS[raw] ?? raw) : null }
}

const DISCOVERED = /\[FORGE Crawler\] Discovered:/

/** Count the per-page '[FORGE Crawler] Discovered:' lines (live page counter). */
export function countDiscovered(lines: string[]): number {
  return lines.filter(l => DISCOVERED.test(l)).length
}

// POST /api/v1/crawl — start a crawl; 202 immediately (ADR-012 async job).
router.post('/', (req, res) => {
  const { appName, force, aiBudget } = req.body ?? {}
  if (!appName || typeof appName !== 'string')
    return res.status(400).json(fail('appName is required', 'MISSING_APP_NAME'))

  const url = resolveUrl(appName)
  if (!url)
    return res.status(404).json(fail(`Project '${appName}' not found — onboard it first`, 'NOT_FOUND'))

  // Issue #2 — Phase 1 credentials from env vars (<APPNAME>_USERNAME/_PASSWORD),
  // matching CLI behavior; unset → unauthenticated crawl. Proper per-project
  // credential storage is TD-UI-009 (keychain).
  const envPrefix = appName.toUpperCase().replace(/-/g, '_')
  const username = process.env[`${envPrefix}_USERNAME`] ?? undefined
  const password = process.env[`${envPrefix}_PASSWORD`] ?? undefined

  const jobId = randomUUID()
  // Fire WITHOUT await — 202 returns immediately; the client polls /:jobId/status.
  // JobRunner adds the resolved per-app workspace + captures console → Timeline.
  void jobRunner.submit({
    jobId,
    type: 'crawl',
    appName,
    options: { url, appName, force: !!force, aiBudget, username, password },
  })

  res.status(202).json(ok({ jobId }))
})

// GET /api/v1/crawl/:jobId/status — Mission Timeline (live) + pages (post-crawl).
router.get('/:jobId/status', (req, res) => {
  const view = jobRunner.getStatus(req.params.jobId)
  if (!view) return res.status(404).json(fail('Job not found', 'NOT_FOUND'))

  const { raw, label } = parseStrategy(view.lines)
  const pages = view.complete ? loadPages(view.appName) : []
  const pagesFound = view.complete ? pages.length : countDiscovered(view.lines)

  res.json(ok({
    jobId:       view.jobId,
    status:      view.status,      // running | completed | failed
    complete:    view.complete,
    lines:       view.lines,       // Mission Timeline
    strategy:    label,            // user-friendly (ADR-012); null until Mode line appears
    strategyRaw: raw,              // engine term, for the hover tooltip
    pagesFound,                    // live count while running; pages.length when complete
    pages,                         // [] until complete, then from app-model.json
    error:       view.error ?? null,
    startedAt:   view.startedAt,
    completedAt: view.completedAt ?? null,
  }))
})

export default router
