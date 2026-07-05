/**
 * TD-013 Phase 2 Commit 3 — AgentRunner.
 *
 * Wires the agentic stack end-to-end: selects an ExecutionEnvironment by app type,
 * loads cross-session AgentMemory (via the repository seam), builds a CrawlSession
 * from hand-authored GoalDefinitions, runs the AgentPlanner, and persists the
 * updated memory. The browser/request context is always closed in a finally block.
 *
 * TD-097 (portability): no hardcoded paths — all persistence goes through the
 * injected AgentMemoryRepository (which derives paths from __dirname).
 */
import { AgentPlanner, GoalDefinition } from './AgentPlanner'
import { AgentMemoryRepository } from './AgentMemoryRepository'
import { WebUIEnvironment } from './WebUIEnvironment'
import { ApiEnvironment } from './ApiEnvironment'
import { AgentMemory, AgentMode, CrawlSession, Goal, GoalStatus } from './types'
import { OnboardingConfig } from '../onboarding/types'

export interface AgentRunnerOptions {
  config:     OnboardingConfig
  goals:      GoalDefinition[]
  mode:       AgentMode       // 'supervised' | 'autonomous'
  repository: AgentMemoryRepository
}

export class AgentRunner {
  constructor(private options: AgentRunnerOptions) {}

  async run(): Promise<CrawlSession> {
    const { config, goals, mode, repository } = this.options

    // 1. Select the ExecutionEnvironment by app type.
    const env = this.selectEnvironment(config)

    // 2. Load cross-session memory (or a fresh default on first run).
    const memory = await repository.load(config.app.name) ?? defaultMemory(config.app.name)

    // 3. Build the CrawlSession.
    const session: CrawlSession = {
      id:          generateRunId(),
      appId:       config.app.name,
      mode,
      startedAt:   new Date().toISOString(),
      goals:       goals.map(defToGoal),
      limitations: [],
      memory,
      environment: env.type,
    }

    // 4. Init environment + run the planner; always close the environment.
    await env.init()
    try {
      const planner = new AgentPlanner(memory, env, mode)
      planner.loadGoalDefinitions(goals)                 // caches action plans by goal id
      const completed = await planner.runSession(session)
      completed.completedAt = new Date().toISOString()
      await repository.save(completed.memory)            // cross-session persistence
      this.printSummary(completed)
      return completed
    } finally {
      await env.close()
    }
  }

  /**
   * rest-api/graphql-api -> ApiEnvironment (with credentials so init() gets a token);
   * else WebUIEnvironment. Returns the concrete union because init()/close() are on
   * the implementations, not the ExecutionEnvironment interface (see Commit-3 note).
   */
  private selectEnvironment(config: OnboardingConfig): WebUIEnvironment | ApiEnvironment {
    const appType = config.appType ?? config.app.appType
    if (appType === 'rest-api' || appType === 'graphql-api') {
      const credentials = extractCredentials(config)
      return new ApiEnvironment(config.app.baseUrl, credentials)
    }
    return new WebUIEnvironment(config.app.baseUrl)
  }

  private printSummary(session: CrawlSession): void {
    const n = (s: GoalStatus) => session.goals.filter(g => g.status === s).length
    console.log(`[AgentRunner] Session complete: ${session.id}`)
    console.log(`[AgentRunner] Goals: ${n('achieved')} achieved / ${n('blocked')} blocked / ${n('unreachable')} unreachable`)
    console.log(`[AgentRunner] Memory saved: models/${session.appId}/agent-memory.json`)
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────────

/** GoalDefinition -> a fresh pending Goal (empty evidence chain, no resolution yet). */
function defToGoal(def: GoalDefinition): Goal {
  return {
    id:              def.id,
    type:            def.type,
    description:     def.description,
    successCriteria: def.successCriteria,
    prerequisites:   def.prerequisites,
    status:          'pending',
    evidenceChain:   [],
    createdAt:       new Date().toISOString(),
  }
}

/** Timestamped run id, same format as CURRENT_RUN_ID (e.g. 2026-07-05T14-03-22). */
function generateRunId(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '')
}

function defaultMemory(appId: string): AgentMemory {
  return {
    appId, goals: [], evidence: [], discoveredCapabilities: [],
    lastUpdated: new Date().toISOString(), crawlRunCount: 0,
  }
}

/**
 * Credentials from the first non-guest role's credentialsEnvKey (e.g.
 * BOOKER_CREDENTIALS), parsed `username:password` — same contract as
 * AuthManager.resolveCredentials. undefined for guest-only apps or when the env
 * var is absent/malformed.
 */
function extractCredentials(config: OnboardingConfig): { username: string; password: string } | undefined {
  const role = (config.roles ?? []).find(r => r.authFlow !== 'none')
  if (!role?.credentialsEnvKey) return undefined
  const raw = process.env[role.credentialsEnvKey]
  if (!raw) return undefined
  const [username, password] = raw.split(':')
  if (!username || !password) return undefined
  return { username, password }
}
