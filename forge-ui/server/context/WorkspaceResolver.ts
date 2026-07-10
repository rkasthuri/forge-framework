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

import { createRequire } from 'module'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

/**
 * WorkspaceResolver — resolves the correct workspace for a given appName.
 * Phase 1: per-app UI workspace at ~/.forge-projects/<appName>/ when present,
 * else process.cwd()/.forge/ (CLI/standalone). Phase 2: tenant cloud storage.
 *
 * Uses createRequire so the engine is loaded at runtime (under tsx) without
 * forge-ui's tsc pulling the engine into the UI compile — the one-directional
 * boundary holds (forge-ui → src, never the reverse).
 */
const require = createRequire(import.meta.url)

/** Structural slice of the engine Workspace — avoids importing the engine type. */
export interface ResolvedWorkspace {
  root: string
  forgeDir: string
  [key: string]: unknown
}

export class WorkspaceResolver {
  resolve(appName: string): ResolvedWorkspace {
    const enginePath = '../../../src/core/workspace/WorkspaceManager'
    const { createWorkspace } = require(enginePath)
    // Prefer the per-app UI workspace (~/.forge-projects/<appName>) when it has a
    // config; fall back to cwd (CLI/standalone). createWorkspace returns a REAL
    // engine Workspace (loadConfig/saveConfig/…) — required by CrawlRunner —
    // rooted at the chosen path. A plain {root,forgeDir} would break loadConfig().
    const perApp = path.join(os.homedir(), '.forge-projects', appName)
    const root = fs.existsSync(path.join(perApp, '.forge', 'config.json'))
      ? perApp
      : process.cwd()
    return createWorkspace(root) as ResolvedWorkspace
  }
}

export const workspaceResolver = new WorkspaceResolver()
