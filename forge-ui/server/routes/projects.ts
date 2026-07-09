import { Router } from 'express'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { ok, fail } from '../http'
import { executionContext } from '../context/ExecutionContext'
import { workspaceResolver } from '../context/WorkspaceResolver'
import { projectRegistry, type ProjectEntry } from '../registry/ProjectRegistry'
import { logBuffer } from '../registry/LogBuffer'

// Known fixture apps — last-resort fallback (fixture-specific, intentional:
// fixtures use .ts onboarding configs, not .forge/config.json, so they won't
// show up via the workspace scans below).
const KNOWN_FIXTURES = [
  { appName: 'saucedemo',      url: 'https://www.saucedemo.com' },
  { appName: 'orangehrm',      url: 'https://opensource-demo.orangehrmlive.com' },
  { appName: 'restful-booker', url: 'https://restful-booker.herokuapp.com' },
]

/** Discover onboarded apps: ~/.forge-projects/<app>/ → cwd/.forge/ → fixtures. */
async function discoverProjects(): Promise<ProjectEntry[]> {
  const found: ProjectEntry[] = []
  const now = () => new Date().toISOString()

  // 1. Scan ~/.forge-projects/<appName>/.forge/config.json
  const forgeProjects = path.join(os.homedir(), '.forge-projects')
  if (fs.existsSync(forgeProjects)) {
    for (const entry of fs.readdirSync(forgeProjects, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const c = readJson(path.join(forgeProjects, entry.name, '.forge', 'config.json'))
      if (c) {
        found.push({
          appName: c.appName ?? entry.name, url: c.url ?? '',
          workspacePath: path.join(forgeProjects, entry.name),
          createdAt: now(), lastOpenedAt: now(),
        })
      }
    }
  }

  // 2. Check cwd/.forge/config.json (standalone workspace)
  const c = readJson(path.join(process.cwd(), '.forge', 'config.json'))
  if (c?.appName) {
    found.push({
      appName: c.appName, url: c.url ?? '', workspacePath: process.cwd(),
      createdAt: now(), lastOpenedAt: now(),
    })
  }

  // 3. Hardcoded fixture fallback (workspacePath '' → not auto-registered)
  for (const fix of KNOWN_FIXTURES) {
    if (!found.find(f => f.appName === fix.appName)) {
      found.push({ ...fix, workspacePath: '', createdAt: now(), lastOpenedAt: now() })
    }
  }
  return found
}

const router = Router()

// TD-UI-011: live bootstrap/crawl progress for the Onboard log panel.
router.get('/:jobId/logs', (req, res) => {
  res.json(ok(logBuffer.get(req.params.jobId)))
})

type DetField = { value: string; confidence: string; source: string }
const field = (value: string, det: any): DetField => ({
  value: value ?? '',
  confidence: det?.confidence ?? 'unknown',
  source: det?.source ?? '',
})

function readJson(file: string): any {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null }
}

// GET /api/v1/projects — registry ∪ auto-discovered apps (Fix #11).
router.get('/', async (_req, res) => {
  const registered = projectRegistry.list()
  const discovered = await discoverProjects()
  const regNames = new Set(registered.map(p => p.appName))

  // Auto-register newly-discovered apps that have a real workspace (not fixtures).
  for (const d of discovered) {
    if (!regNames.has(d.appName) && d.workspacePath) projectRegistry.register(d)
  }

  const merged = [...registered, ...discovered.filter(d => !regNames.has(d.appName))]

  // Enrich with config values (skip when there's no real workspace, e.g. fixtures).
  const projects = merged.map(e => {
    const cfg = e.workspacePath ? readJson(path.join(e.workspacePath, '.forge', 'config.json')) ?? {} : {}
    return {
      appName:       e.appName,
      url:           e.url,
      appType:       cfg.appType ?? '',
      crawlStrategy: cfg.crawlStrategy ?? '',
      authType:      cfg.authType ?? '',
      createdAt:     e.createdAt,
      lastOpenedAt:  e.lastOpenedAt,
      workspacePath: e.workspacePath,   // '' for fixtures → greyed in the switcher
    }
  })
  res.json(ok({ projects }))
})

// GET /api/v1/projects/:appName — Fix #14: one already-onboarded app's detail.
// Enriched with config values + manifest confidences (same pattern as GET /).
// Honesty floor (TD-065/066/067): confidences come from the stored bootstrap
// manifest — never fabricated. No manifest → 'unknown', which is truthful.
router.get('/:appName', async (req, res) => {
  const { appName } = req.params
  let entry: ProjectEntry | undefined = projectRegistry.find(appName)
  if (!entry) entry = (await discoverProjects()).find(p => p.appName === appName)
  if (!entry) return res.status(404).json(fail('Project not found', 'NOT_FOUND'))

  const cfg = entry.workspacePath
    ? readJson(path.join(entry.workspacePath, '.forge', 'config.json')) ?? {}
    : {}
  const d = entry.workspacePath
    ? readJson(path.join(entry.workspacePath, '.forge', 'bootstrap-manifest.json'))?.detection ?? {}
    : {}

  const detection = {
    appType:       field(cfg.appType, d.appType),
    authType:      field(cfg.authType, d.authType),
    crawlStrategy: field(cfg.crawlStrategy, d.crawlStrategy),
    appName:       field(cfg.appName ?? entry.appName, d.appName),
  }
  const project = {
    appName: entry.appName, url: entry.url,
    appType: cfg.appType ?? '', crawlStrategy: cfg.crawlStrategy ?? '', authType: cfg.authType ?? '',
    createdAt: entry.createdAt, lastOpenedAt: entry.lastOpenedAt, workspacePath: entry.workspacePath,
  }
  res.json(ok({ project, detection }))
})

// POST /api/v1/projects — onboard a new app.
// Ruling G+H+I: run CrawlRunner (auto-bootstraps → writes config + manifest),
// then read detection from workspace files. Always dryRun:false at the engine
// (so the manifest is written); the UI "dry run" only skips registry.register().
router.post('/', async (req, res) => {
  const { url, appName, username, password, dryRun, jobId, detectionResult } = req.body ?? {}
  if (!url || typeof url !== 'string')
    return res.status(400).json(fail('url is required', 'MISSING_URL'))
  if (!appName || typeof appName !== 'string')
    return res.status(400).json(fail('appName is required', 'MISSING_APP_NAME'))

  // Fix #8: save-after-dry-run fast path — the detection was already computed in
  // the dry run, so skip Bootstrap and write the registry directly.
  if (detectionResult && !dryRun) {
    const workspacePath = path.join(os.homedir(), '.forge-projects', appName)
    const now = new Date().toISOString()
    projectRegistry.register({ appName, url, workspacePath, createdAt: now, lastOpenedAt: now })
    return res.json(ok({ project: { appName, url }, detection: detectionResult, dryRun: false }))
  }

  // TD-UI-011: capture bootstrap/crawl console output into the log buffer for
  // this jobId (in-memory, single-process — the client polls /:jobId/logs).
  if (jobId) logBuffer.create(jobId)
  const origLog = console.log
  const origWarn = console.warn
  if (jobId) {
    console.log = (...a: unknown[]) => { logBuffer.append(jobId, a.join(' ')); origLog(...a) }
    console.warn = (...a: unknown[]) => { logBuffer.append(jobId, `⚠️ ${a.join(' ')}`); origWarn(...a) }
  }

  try {
    // Engine call ALWAYS through ExecutionContext (never CrawlRunner directly).
    const job = await executionContext.submit({
      type: 'crawl',
      appName,
      options: { url, appName, username, password, force: true },
    })
    if (job.status === 'failed')
      return res.status(500).json(fail(job.error ?? 'onboarding failed', 'ENGINE_ERROR'))

    // Detection = config values (final) + manifest confidences (detection-time).
    const ws = workspaceResolver.resolve(appName)
    const config = readJson(path.join(ws.forgeDir, 'config.json'))
    if (!config)
      return res.status(500).json(fail('config not written by onboarding', 'NO_CONFIG'))
    const d = readJson(path.join(ws.forgeDir, 'bootstrap-manifest.json'))?.detection ?? {}

    const detection = {
      appType:       field(config.appType, d.appType),
      authType:      field(config.authType, d.authType),
      crawlStrategy: field(config.crawlStrategy, d.crawlStrategy),
      appName:       field(config.appName, d.appName),
    }

    const now = new Date().toISOString()
    const project = {
      appName, url,
      appType: config.appType, crawlStrategy: config.crawlStrategy, authType: config.authType,
      createdAt: now, lastOpenedAt: now,
    }

    if (!dryRun) {
      projectRegistry.register({ appName, url, workspacePath: ws.root, createdAt: now, lastOpenedAt: now })
    }

    res.json(ok({ project, detection, dryRun: !!dryRun }))
  } finally {
    console.log = origLog
    console.warn = origWarn
    if (jobId) logBuffer.markComplete(jobId)
  }
})

export default router
