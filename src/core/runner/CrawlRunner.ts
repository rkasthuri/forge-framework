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
import { Bootstrap, BootstrapOptions, generateRunId } from '../onboarding/Bootstrap'
import { Crawler } from '../onboarding/Crawler'
import { runMigrations } from '../storage/migrate'
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
    // 0. Storage migrations — the crawl pipeline writes run history to the DB;
    //    every entry point (CLI, UI, API) comes through here, so this is where
    //    the legacy CLI's pre-crawl runMigrations() call now lives. Idempotent.
    await runMigrations()

    // 1. Resolve the workspace (auto-init happens inside on first write).
    const workspace = options.workspace ?? createWorkspace()

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

    const crawler = new Crawler(onboardingConfig)
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
