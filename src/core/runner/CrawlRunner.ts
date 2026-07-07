/**
 * TD-108 — CrawlRunner: the single orchestration engine.
 *
 * CLI, future UI, and future REST API all call THIS — never the Crawler,
 * Bootstrap, or AgentRunner directly. It owns the zero-friction decision
 * ("no config? bootstrap first, invisibly") and ALL workspace persistence.
 *
 * Ownership rules (Nova):
 *   - CrawlRunner is the ONLY component that calls workspace.*
 *   - Crawler/Bootstrap/AgentRunner produce data; CrawlRunner persists it.
 *   - No process.exit() anywhere on this path — errors propagate to the caller
 *     (the CLI's catch handler exits; a server would return a 500).
 */
import * as path from 'path'
import { Bootstrap, BootstrapOptions, generateRunId } from '../onboarding/Bootstrap'
import { Crawler } from '../onboarding/Crawler'
import { openProjectDatabase, getMigrationCount } from '../storage/DatabaseFactory'
import { buildProjectManifest } from '../workspace/Project'
import { AgentRunner } from '../agent/AgentRunner'
import { Missions } from '../agent/Mission'
import { GoalDefinition } from '../agent/AgentPlanner'
import { AgentMode } from '../agent/types'
import { AppModel, ModuleAssignment } from '../onboarding/types'
import { ModuleClassifier } from '../crawler/ModuleClassifier'
import { Workspace, createWorkspace } from '../workspace/WorkspaceManager'
import { WorkspaceMemoryRepository } from '../workspace/WorkspaceMemoryRepository'
import { AppConfig } from '../workspace/AppConfig'
import { toOnboardingConfig } from '../workspace/ConfigAdapter'

export interface CrawlRunnerOptions {
  url: string;
  appName?: string;        // derived from the URL hostname if not provided
  username?: string;
  password?: string;
  workspace?: Workspace;   // defaults to createWorkspace(process.cwd())
  mode?: AgentMode;        // 'supervised' (default) | 'autonomous'
  dryRun?: boolean;
  force?: boolean;         // re-bootstrap even if a config exists
  /** Run the goal-directed agent instead of the mechanical crawl (TD-013 path). */
  agent?: boolean;
  /** Goals for the agent path — empty is valid (AgentRunner warns and no-ops). */
  goals?: GoalDefinition[];
}

export interface CrawlResult {
  appName: string;
  workspaceRoot: string;
  pagesDiscovered: number;
  testsGenerated: number;   // always 0 today — generation is a separate stage (see run())
  dryRun: boolean;
}

export class CrawlRunner {
  async run(options: CrawlRunnerOptions): Promise<CrawlResult> {
    // 1. Resolve the workspace (auto-init happens inside on first write).
    const workspace = options.workspace ?? createWorkspace()

    // 1b. TD-114: scope the DB singleton to THIS project (.forge/forge.db) and
    //     run lazy migrations — BEFORE anything downstream can touch getDb()
    //     (a first touch at the legacy cwd default would lock the singleton
    //     there and make initDb throw). All 16 repositories then transparently
    //     use the per-app DB. NOTE: this runs before the dry-run gate, so a
    //     --dry-run creates .forge/forge.db (infrastructure, not an artifact);
    //     pre-TD-114 dry-runs created ./forge-framework.db in the cwd instead.
    await openProjectDatabase(workspace)

    // 2. Load config; null means "never bootstrapped here" — NOT an error.
    let config = await workspace.loadConfig()

    // 3. Zero-friction auto-bootstrap: no config, or an explicit --force.
    if (!config || options.force) {
      console.log(
        config
          ? '[CrawlRunner] --force: re-running Bootstrap over the existing config.'
          : '[CrawlRunner] No config found — running Bootstrap first.',
      )
      const bootstrapped = await this.bootstrap(workspace, options)
      if (bootstrapped === null) {
        // --dry-run: Bootstrap previewed (synthesized goals already logged by the
        // agent phase); nothing was written, nothing crawls.
        console.log('[CrawlRunner] --dry-run: bootstrap previewed, nothing written, no crawl.')
        return {
          appName: options.appName ?? '(dry-run)', workspaceRoot: workspace.root,
          pagesDiscovered: 0, testsGenerated: 0, dryRun: true,
        }
      }
      config = bootstrapped
    }

    // 3b. TD-114: project.json — the canonical Project handshake. createdAt is
    //     written once and preserved forever; lastOpenedAt updates on EVERY
    //     open; databaseVersion records the migration count of this open.
    //     (After the dry-run gate on purpose: dry-runs write no artifacts.)
    const existingManifest = await workspace.loadProjectManifest()
    await workspace.saveProjectManifest(buildProjectManifest(existingManifest, {
      appName:         config.appName,
      url:             options.url,
      databaseVersion: await getMigrationCount(),
    }))

    // Zero-friction credentials: secrets given on the command line are injected
    // into THIS process's env under the config's envKey (the exact place
    // AuthManager.resolveCredentials reads, 'user:pass' format) — in-process
    // only, NEVER persisted. Without this, `forge crawl --username --password`
    // would bootstrap fine and then crawl unauthenticated.
    if (options.username && options.password && config.credentials?.envKey) {
      process.env[config.credentials.envKey] = `${options.username}:${options.password}`
      console.log(`[CrawlRunner] Credentials injected in-process under env key '${config.credentials.envKey}' (never persisted).`)
    }

    // 4. Convert to the rich config the existing pipeline consumes.
    const onboardingConfig = toOnboardingConfig(config)
    const runId = generateRunId()

    // 5. Dispatch: agent path or the mechanical crawl.
    if (options.agent) {
      const runner = new AgentRunner({
        config:     onboardingConfig,
        goals:      options.goals ?? [],
        mode:       options.mode ?? 'supervised',
        mission:    Missions.crawl(),
        repository: new WorkspaceMemoryRepository(workspace),   // memory → .forge/agent-memory.json
      })
      const session = await runner.run()
      // Agent memory was persisted by AgentRunner through the workspace-backed
      // repository above — that IS this run's workspace.saveMemory() call.
      await workspace.saveReport(runId, 'agent-session', {
        sessionId: session.id, appName: config.appName, url: config.url,
        mode: session.mode, goals: session.goals.map(g => ({ id: g.id, status: g.status, origin: g.origin })),
        limitations: session.limitations,
      })
      console.log(`[CrawlRunner] Agent session ${session.id} complete — report: reports/${runId}/agent-session.json`)
      return {
        appName: config.appName, workspaceRoot: workspace.root,
        pagesDiscovered: 0, testsGenerated: 0, dryRun: false,
      }
    }

    // TD-121: workspace-derived artifact placement — the model is visible
    // output (workspace root), session tokens are secrets (.forge/auth/).
    // Both runtime-resolved from the workspace; Crawler still never sees
    // the Workspace itself (path-scoping, Option A).
    const crawler = new Crawler(onboardingConfig, {
      modelsDir:    path.join(workspace.root, 'models'),
      authStateDir: path.join(workspace.forgeDir, 'auth'),
    })
    const model   = await crawler.crawl()

    // 6. Module classification — rule-based pass only (AI residue is TD-112,
    //    deliberately NOT called here so AI latency never blocks a crawl).
    const assignments = this.classifyPages(model)

    // 7. Persist the run summary. NOTE (flagged): the module assignments live on
    //    the in-memory model and in this report; Crawler already saved the App
    //    Model internally BEFORE classification ran, so app-model.json does not
    //    carry them yet — App-Model persistence of module fields is follow-up
    //    work alongside TD-112 (saveModel is private to Crawler by design).
    const pagesDiscovered = model.pages?.length ?? model.endpoints?.length ?? 0
    await workspace.saveReport(runId, 'crawl-summary', {
      runId, appName: config.appName, url: config.url,
      crawlMode: onboardingConfig.crawlMode,
      pagesDiscovered,
      moduleAssignments: assignments,
      unassignedPages: assignments.filter(a => a.module.confidence === 'unknown').map(a => a.pageId),
    })
    console.log(`[CrawlRunner] Crawl complete — ${pagesDiscovered} page(s), report: reports/${runId}/crawl-summary.json`)

    // 8. Summary for the caller.
    return {
      appName: config.appName, workspaceRoot: workspace.root,
      pagesDiscovered,
      testsGenerated: 0,   // generation (GeneratorRunner) is a separate pipeline stage, not run here
      dryRun: false,
    }
  }

  /**
   * Run Bootstrap and persist its artifacts through the workspace.
   * Returns the fresh AppConfig, or null when --dry-run previewed only.
   */
  private async bootstrap(workspace: Workspace, options: CrawlRunnerOptions): Promise<AppConfig | null> {
    const bootstrapOptions: BootstrapOptions = {
      url:          options.url,
      // Single command-line credential pair → one role, id 'user' (envKey
      // USER_CREDENTIALS). Multi-role stays a .ts-fixture / schema-v2 concern.
      credentials:  options.username && options.password
        ? [{ role: 'user', username: options.username, password: options.password }]
        : [],
      nameOverride: options.appName,
      dryRun:       options.dryRun,
      force:        options.force,
      // TD-115: bootstrap agent memory persists into THIS workspace
      // (.forge/agent-memory.json), never into the FORGE repo.
      repository:   new WorkspaceMemoryRepository(workspace),
    }

    const bootstrap = new Bootstrap()
    const detection = await bootstrap.detect(bootstrapOptions)
    const artifacts = bootstrap.generateConfig(detection, bootstrapOptions, '.forge/config.json')

    if (artifacts.dryRun) return null

    await workspace.saveConfig(artifacts.config)
    if (artifacts.evidence) {
      await workspace.saveBootstrapEvidence(artifacts.evidence)
      artifacts.manifest.evidencePackagePath = '.forge/bootstrap-evidence.json'
    }
    await workspace.saveBootstrapManifest(artifacts.manifest)
    console.log(`[CrawlRunner] Bootstrap complete — config: .forge/config.json (app: ${artifacts.config.appName})`)
    return artifacts.config
  }

  /** Rule-based module pass over every discovered page; mutates page.module. */
  private classifyPages(model: AppModel): Array<{ pageId: string; urlPattern: string; module: ModuleAssignment }> {
    const classifier = new ModuleClassifier()
    const assignments: Array<{ pageId: string; urlPattern: string; module: ModuleAssignment }> = []
    for (const page of model.pages ?? []) {
      page.module = classifier.classify(page)
      assignments.push({ pageId: page.id, urlPattern: page.urlPattern, module: page.module })
    }
    const unknown = assignments.filter(a => a.module.confidence === 'unknown').length
    if (assignments.length > 0) {
      console.log(
        `[CrawlRunner] Module classification: ${assignments.length - unknown}/${assignments.length} page(s) assigned by rule` +
        (unknown > 0 ? `, ${unknown} unknown (AI residue deferred — TD-112)` : ''),
      )
    }
    return assignments
  }
}
