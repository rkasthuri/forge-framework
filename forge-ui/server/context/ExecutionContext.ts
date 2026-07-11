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

import * as fs from 'fs'
import * as path from 'path'
import { workspaceResolver } from './WorkspaceResolver'
import { credentialResolver } from './credentials/CredentialResolver'
import { planCrawlCredentials, type EngineConfigView } from './credentials/CredentialPlanner'
import { SerialQueue } from './SerialQueue'

/**
 * ExecutionContext — Phase 1: runs in-process. Phase 2: submits to a cloud job
 * queue. Nova-approved: wraps ALL engine calls. Routes must NEVER call
 * CrawlRunner/GeneratorRunner/VerificationRunner directly — always go through
 * ExecutionContext, so Phase 2 can swap in-process for a queue with no route
 * changes.
 *
 * Engine imports are DYNAMIC and via a variable path so forge-ui's tsc does not
 * pull the engine (a separate tsconfig/compilation) into the UI build — the
 * one-directional boundary holds (forge-ui → src, never the reverse). Resolved
 * at runtime under tsx.
 */
export interface Job {
  type: 'crawl' | 'generate' | 'run' | 'verify'
  appName: string
  options: Record<string, unknown>
}

export interface JobResult {
  jobId: string
  status: 'completed' | 'failed'
  result?: unknown
  error?: string
}

const ENGINE = {
  crawlRunner:  '../../../src/core/runner/CrawlRunner',
  generator:    '../../../src/core/onboarding/GeneratorRunner',
  verifier:     '../../../src/core/onboarding/VerificationRunner',
  db:           '../../../src/core/storage/db',
}

/** ADR-014 — close the open project DB only when switching to a different one. */
export function shouldCloseDb(lastDbPath: string | null, targetDbPath: string): boolean {
  return lastDbPath !== null && lastDbPath !== targetDbPath
}

export class ExecutionContext {
  // ADR-014 — one active execution engine per instance: every submit runs under
  // this serial queue, and the project DB is closed-on-switch between apps.
  private readonly queue = new SerialQueue()
  private lastDbPath: string | null = null

  submit(job: Job): Promise<JobResult> {
    // Serialize the WHOLE run sequence (creds pre-flight → DB switch → engine)
    // so DB-touching runs never overlap (TD-UI-020).
    return this.queue.run(() => this.runGuarded(job))
  }

  private async runGuarded(job: Job): Promise<JobResult> {
    const jobId = `job-${Date.now()}`
    // ADR-013 pre-flight (crawl only): resolve + inject credentials BEFORE the
    // engine runs. A CredentialError PROPAGATES to JobRunner (surfaced to the
    // Mission Timeline), rather than being swallowed into a failed JobResult.
    if (job.type === 'crawl') this.prepareCredentials(job)
    try {
      // ADR-014 — release the previous app's DB before the engine opens this one.
      if (job.type === 'crawl') await this.switchDatabaseIfNeeded(job.appName)
      const result = await this.runInProcess(job)
      return { jobId, status: 'completed', result }
    } catch (err) {
      return { jobId, status: 'failed', error: String(err) }
    }
  }

  /**
   * ADR-014 — close the engine's per-app DB singleton before it opens a
   * different app's DB (TD-UI-020). closeDb() is engine-exported; no src/ edit.
   */
  private async switchDatabaseIfNeeded(appName: string): Promise<void> {
    const targetDbPath = path.join(workspaceResolver.resolve(appName).root, '.forge', 'forge.db')
    if (shouldCloseDb(this.lastDbPath, targetDbPath)) {
      const dbMod: any = await import(ENGINE.db)
      await dbMod.closeDb()
    }
    this.lastDbPath = targetDbPath
  }

  /**
   * ADR-013 two-path credential injection. Onboard supplies form creds directly
   * (respected, skipped). Otherwise resolve from the env pointer pair (hard-fails
   * via CredentialError when auth is required but unresolved), then inject:
   *   Path A (bootstrap: force / fresh) → pass options.username/password so the
   *     engine's Bootstrap writes credentials.envKey and CrawlRunner:129 injects.
   *   Path B (existing config WITH envKey, no force) → set process.env[envKey]
   *     here and DON'T pass options, so CrawlRunner:129 stays inert (single
   *     materializer, no double-inject).
   *   Split (existing config, no force, creds resolved, but NO envKey slot) →
   *     refuse with CredentialSlotError. We do NOT silently auto-force a
   *     re-detect nor run unauthenticated; the operator establishes the slot via
   *     a Force re-crawl.
   */
  private prepareCredentials(job: Job): void {
    // Onboard passes form credentials directly — respect them (bootstrap/force
    // path already) and skip env resolution + hard-fail.
    if (job.options.username && job.options.password) return

    const material = credentialResolver.resolve(job.appName)   // throws CredentialError on hard-fail
    if (!material) return   // guest app (authType 'none') — nothing to inject

    const config = this.readEngineConfig(job.appName)          // read-only; null when fresh
    const plan = planCrawlCredentials(config, material, { force: job.options.force === true })

    if (plan.path === 'A') {
      // Path A — the engine's Bootstrap writes credentials.envKey and
      // CrawlRunner:129 injects. Supply the material as options.
      job.options.username = material.username
      job.options.password = material.password
    } else {
      // Path B — existing envKey: inject here; keep line-129 inert (no options).
      process.env[plan.envKey] = `${material.username}:${material.password}`
      delete job.options.username
      delete job.options.password
    }
  }

  /** Read the engine-owned .forge/config.json (read-only) — never writes it. */
  private readEngineConfig(appName: string): EngineConfigView | null {
    try {
      const ws = workspaceResolver.resolve(appName)
      return JSON.parse(fs.readFileSync(path.join(ws.forgeDir, 'config.json'), 'utf-8'))
    } catch {
      return null
    }
  }

  private async runInProcess(job: Job): Promise<unknown> {
    switch (job.type) {
      case 'crawl': {
        const mod: any = await import(ENGINE.crawlRunner)
        return new mod.CrawlRunner().run(job.options as any)
      }
      case 'generate': {
        const mod: any = await import(ENGINE.generator)
        // GeneratorRunner.generate(appName, workspace?) → void today (TD-UI-003).
        return new mod.GeneratorRunner().generate(job.appName, undefined)
      }
      case 'verify': {
        const mod: any = await import(ENGINE.verifier)
        return new mod.VerificationRunner(job.appName).run()
      }
      case 'run':
        // Test execution runs via the Playwright CLI, not a runner class.
        // Wiring (spawn + SSE surfacing) lands in TD-UI-004.
        throw new Error("ExecutionContext: 'run' not yet wired — TD-UI-004")
      default:
        throw new Error(`Unknown job type: ${(job as Job).type}`)
    }
  }
}

export const executionContext = new ExecutionContext()
