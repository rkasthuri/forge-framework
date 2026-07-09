import { Router } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { ok, fail } from '../http'
import { executionContext } from '../context/ExecutionContext'
import { workspaceResolver } from '../context/WorkspaceResolver'
import { projectRegistry } from '../registry/ProjectRegistry'

const router = Router()

type DetField = { value: string; confidence: string; source: string }
const field = (value: string, det: any): DetField => ({
  value: value ?? '',
  confidence: det?.confidence ?? 'unknown',
  source: det?.source ?? '',
})

function readJson(file: string): any {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null }
}

// GET /api/v1/projects — list onboarded projects (registry + per-project config).
router.get('/', (_req, res) => {
  const projects = projectRegistry.list().map(e => {
    const cfg = readJson(path.join(e.workspacePath, '.forge', 'config.json')) ?? {}
    return {
      appName:       e.appName,
      url:           e.url,
      appType:       cfg.appType ?? '',
      crawlStrategy: cfg.crawlStrategy ?? '',
      authType:      cfg.authType ?? '',
      createdAt:     e.createdAt,
      lastOpenedAt:  e.lastOpenedAt,
    }
  })
  res.json(ok({ projects }))
})

// POST /api/v1/projects — onboard a new app.
// Ruling G+H+I: run CrawlRunner (auto-bootstraps → writes config + manifest),
// then read detection from workspace files. Always dryRun:false at the engine
// (so the manifest is written); the UI "dry run" only skips registry.register().
router.post('/', async (req, res) => {
  const { url, appName, username, password, dryRun } = req.body ?? {}
  if (!url || typeof url !== 'string')
    return res.status(400).json(fail('url is required', 'MISSING_URL'))
  if (!appName || typeof appName !== 'string')
    return res.status(400).json(fail('appName is required', 'MISSING_APP_NAME'))

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
})

export default router
