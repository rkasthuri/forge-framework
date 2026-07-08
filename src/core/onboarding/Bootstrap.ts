/**
 * TD-093 — Bootstrap Mode (detection core) / TD-108 — pure detection engine.
 *
 * Given a URL (+ credentials), Bootstrap probes the live page and produces a
 * BootstrapDetection: each field carries its detected value, a confidence tier,
 * and a human-readable source. `generateConfig()` projects that detection into
 * in-memory BootstrapArtifacts (AppConfig + manifest + evidence package).
 *
 * TD-108: Bootstrap performs NO disk writes and NEVER calls process.exit() —
 * it is a pure detection engine. Persistence (workspace config, manifest,
 * evidence) is owned by the caller (CrawlRunner via Workspace; the CLI bridges
 * this temporarily until Step 6). The .ts fixture generator survives as
 * generateTypeScriptConfig() (@internal, regression fixtures only).
 *
 * Reuses existing detectors rather than inventing new ones: StrategyDetector
 * (crawl mode) and the password-field auth signal (PageVisitor's convention).
 * The only net-new detection here is appType (no live inference existed — see
 * TD-093 audit).
 *
 * SECURITY: credentials' username/password are NEVER serialized into the
 * generated config — only a `credentialsEnvKey` pointer is emitted; the secret
 * stays in the environment (same contract as AuthManager.resolveCredentials).
 */
import * as path from 'path'
import { chromium, Page } from '@playwright/test'
import { StrategyDetector } from './StrategyDetector'
import { AgentRunner } from '../agent/AgentRunner'
import { Missions } from '../agent/Mission'
import { DefaultGoalSynthesizer, PageSignals } from '../agent/GoalSynthesizer'
import { GoalDefinition } from '../agent/AgentPlanner'
import { AgentMemoryRepository, JsonAgentMemoryRepository } from '../agent/AgentMemoryRepository'
import { Goal, GoalStatus } from '../agent/types'
import { BootstrapEvidencePackage, BootstrapEvidenceRecord } from './BootstrapEvidence'
import { OnboardingConfig, AppTypeName } from './types'
import { AppConfig } from '../workspace/AppConfig'
import { ObservationSettlingPolicy, DEFAULT_SETTLING_POLICY, SPA_AUTH_SETTLING_POLICY } from './ObservationSettlingPolicy'
import { DEFAULT_AI_BUDGET } from '../config/budgetDefaults'

/**
 * Repo root derived from THIS file's location (src/core/onboarding/Bootstrap.ts),
 * NOT process.cwd() — cwd depends on where the command is invoked from, __dirname
 * does not. TD-097 (portability): every repo-internal path resolves from here, so
 * the same code works cloned into /Users/jane/… on a Mac or C:\… on Windows.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..')   // onboarding → core → src → repoRoot

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetectionConfidence = 'high' | 'medium' | 'low'

export interface DetectedField<T> {
  value: T
  confidence: DetectionConfidence
  source: string   // human-readable: "StrategyDetector", "password-field-count",
                   // "SPA-framework-signal", "hostname-derived", "user-supplied", etc.
}

export interface BootstrapDetection {
  appName:       DetectedField<string>
  appType:       DetectedField<string>
  crawlStrategy: DetectedField<string>
  authType:      DetectedField<string>
  loginUrl:      DetectedField<string | null>
  baseUrl:       DetectedField<string>
}

export interface BootstrapCredential {
  role:     string
  username: string
  password: string
}

export interface BootstrapOptions {
  url:           string
  credentials:   BootstrapCredential[]
  nameOverride?: string
  maxPages?:     number   // default 50
  dryRun?:       boolean  // Commit 3
  force?:        boolean  // overwrite an existing config instead of aborting
  /**
   * TD-115: where the agent phase's cross-session memory persists — a CALLER
   * decision. CrawlRunner passes the workspace-backed repository so standalone
   * runs write .forge/agent-memory.json; omitted (fixture flows) it defaults to
   * the repo-anchored JsonAgentMemoryRepository — byte-identical to before.
   */
  repository?:   AgentMemoryRepository
}

/** Machine-readable record of one bootstrap detection run (reports/bootstrap-manifest-<app>.json). */
export interface BootstrapManifest {
  runId:           string
  timestamp:       string   // ISO
  url:             string
  appName:         string
  detection:       BootstrapDetection
  credentialRoles: string[]   // role names only — passwords are NEVER stored
  configPath:      string     // where the config was (or would be) written, relative to repo root
  dryRun:          boolean
  // ── TD-093 Phase 2 — agent-phase results (absent when the agent didn't run, e.g. dry-run) ──
  evidencePackagePath?:    string   // repo-relative path to bootstrap-evidence-<app>.json
  agentGoalsSynthesized?:  number
  agentGoalsAchieved?:     number
  agentGoalsBlocked?:      number
  agentGoalsUnreachable?:  number
  authAttempted?:          boolean
  authOutcome?:            'success' | 'failed' | 'not-attempted'
}

/**
 * Internal carrier for the agent-phase results between runAgentPhase() and the
 * manifest. TD-108: evidencePackagePath is NOT here — Bootstrap no longer writes
 * the evidence package, so it cannot know where it will be persisted; whoever
 * persists BootstrapArtifacts patches manifest.evidencePackagePath afterwards.
 */
interface AgentPhaseResult {
  agentGoalsSynthesized: number
  agentGoalsAchieved:    number
  agentGoalsBlocked:     number
  agentGoalsUnreachable: number
  authAttempted:         boolean
  authOutcome:           'success' | 'failed' | 'not-attempted'
}

/**
 * TD-108 — everything one bootstrap run produces, entirely in memory.
 * Bootstrap builds; the caller persists (CrawlRunner via Workspace).
 *
 * evidence is null exactly when the agent phase did not execute (--dry-run):
 * evidence begins only at execution (Nova Q1), so a dry-run has none to report.
 */
export interface BootstrapArtifacts {
  config:   AppConfig
  manifest: BootstrapManifest
  evidence: BootstrapEvidencePackage | null
  dryRun:   boolean
}

// ── Detection functions (pure w.r.t. the page; each returns one DetectedField) ──

/** Crawl mode via the existing StrategyDetector (real DOM/framework signals). */
export async function detectCrawlStrategy(page: Page): Promise<DetectedField<string>> {
  const mode = await new StrategyDetector().detect(page)   // 'bfs' | 'spa' | 'hybrid'
  return { value: mode, confidence: 'high', source: 'StrategyDetector' }
}

/**
 * Auth type from password-field presence (same signal as PageVisitor.isAuthPage).
 * `none` is only MEDIUM confidence: the login form may simply not be shown on the
 * landing page yet, so absence of a password field is weaker evidence than presence.
 *
 * TD-110 (Fix 1): the settling policy waits for EVIDENCE before concluding
 * "no login form" — SPAs (OrangeHRM, live-confirmed) render the form after
 * domcontentloaded, so an immediate count reads 0 and misdetects 'none'.
 * Default keeps the pre-TD-110 immediate-count behavior (fixture flows and
 * unit callers byte-identical); Bootstrap.detect() passes the SPA policy.
 */
export async function detectAuthType(
  page: Page,
  settlingPolicy: ObservationSettlingPolicy = DEFAULT_SETTLING_POLICY,
): Promise<DetectedField<string>> {
  await settlingPolicy.settle(page)   // evidence-driven; instant when the field already exists
  const passwordFields = await page.locator('input[type="password"]').count()
  return passwordFields > 0
    ? { value: 'form-login', confidence: 'high',   source: 'password-field-count' }
    : { value: 'none',       confidence: 'medium', source: 'password-field-count' }
}

/**
 * appType — net-new live inference (no prior code inferred this; Crawler reads it
 * from config only). First match wins.
 *
 * NOTE (flagged for Aiden): the vocabulary here ('spa' | 'desktop-web') is the
 * DETECTION vocabulary, which is NOT the config's `AppTypeName` union
 * ('mpa' | 'spa' | 'web-ui' | ...). 'spa' overlaps; 'desktop-web' does not — it is
 * mapped to a valid AppTypeName in generateConfig() (desktop-web -> web-ui). See
 * mapDetectedAppType() and the Commit-1 report.
 */
export async function detectAppType(page: Page): Promise<DetectedField<string>> {
  const spaDom = await page.locator('#root, #app, [ng-version], [data-reactroot]').count()
  const spaScript = await page
    .locator('script[src*="react"], script[src*="vue"], script[src*="angular"]')
    .count()
  if (spaDom > 0 || spaScript > 0) {
    return { value: 'spa', confidence: 'high', source: 'SPA-framework-signal' }
  }

  const links = await page.locator('a[href]').count()
  const forms = await page.locator('form').count()
  if (links > 5 && forms > 0) {
    return { value: 'desktop-web', confidence: 'medium', source: 'nav-and-form-pattern' }
  }

  return { value: 'desktop-web', confidence: 'low', source: 'default-fallback' }
}

/** App name from an explicit override, else the URL's second-level domain label. */
export function deriveAppName(url: string, nameOverride?: string): DetectedField<string> {
  if (nameOverride) {
    return { value: nameOverride, confidence: 'high', source: 'user-supplied' }
  }
  const host = new URL(url).hostname.replace(/^www\./, '')
  const parts = host.split('.')
  // Strip the TLD: for a 2-label host that is parts[0]; for a multi-label host
  // (e.g. opensource-demo.orangehrmlive.com) take the registrable SLD.
  const value = parts.length > 1 ? parts[parts.length - 2] : parts[0]
  return { value, confidence: 'medium', source: 'hostname-derived' }
}

// ── Config-string helpers ───────────────────────────────────────────────────────

/**
 * Map the DETECTION-vocabulary appType onto a valid config `AppTypeName`.
 * 'spa' is already valid; 'desktop-web' has no AppTypeName equivalent, so it maps
 * to 'web-ui' (the generic UI type). See the vocabulary-reconciliation flag.
 */
export function mapDetectedAppType(detected: string): string {
  if (detected === 'spa') return 'spa'
  return 'web-ui'
}

/**
 * TD-110 (Fix 2) — observation-driven authType value correction.
 *
 * The agent's auth goal is only ever SYNTHESIZED when a Login/Sign-in control
 * was literally observed in the page signals — so `loginControlObserved` IS
 * the observation record, independent of whether the agent run succeeded.
 * If static detection said 'none' (form hadn't hydrated at detect time —
 * OrangeHRM, live-confirmed), the observed control corrects the VALUE.
 *
 * Two independent facts, never coupled (Nova ruling):
 *   authType    = "does a login form exist?"  → updates on OBSERVATION (here)
 *   authOutcome = "did login work?"           → updates on RESULT only (caller)
 * Observation grants MEDIUM confidence only — HIGH requires goal achievement
 * (the caller's upgradeField on 'achieved'). Guard on value 'none': an
 * existing form-login detection is never touched (no downgrade, no re-source).
 *
 * Exported (not private) for direct unit-testing — runAgentPhase needs a live
 * browser. Returns true when the correction fired.
 */
export function applyAuthTypeObservation(
  detection: BootstrapDetection,
  loginControlObserved: boolean,
): boolean {
  if (!loginControlObserved || detection.authType.value !== 'none') return false
  detection.authType = {
    value:      'form-login',
    confidence: 'medium',   // observed by agent signals, not directly verified by the detector
    source:     'agent-observation:login-control-seen',
  }
  return true
}

/** camelCase role id -> SCREAMING_SNAKE env-key, matching the existing convention. */
export function credentialsEnvKey(role: string): string {
  return role.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase() + '_CREDENTIALS'
}

/**
 * Timestamped run id, e.g. 2026-07-05T14-03-22 — mirrors evals/runner.ts
 * generateRunId(). Inlined (not imported) because Bootstrap.ts lives under src/
 * (rootDir), and importing from evals/ breaks the check:core compile gate
 * (TS6059 — file not under rootDir). Same format, no cross-boundary dependency.
 */
export function generateRunId(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '')
}

// ── Bootstrap ───────────────────────────────────────────────────────────────────

export class Bootstrap {
  // TD-093 Phase 2 — set by runAgentPhase(); folded into the manifest by buildManifest().
  private agentPhase?: AgentPhaseResult
  // TD-108 — the evidence package runAgentPhase() BUILDS but no longer writes;
  // picked up by generateConfig() into BootstrapArtifacts (null until the agent ran).
  private evidencePackage: BootstrapEvidencePackage | null = null

  /** Probe the live URL and return a fully-annotated BootstrapDetection. */
  async detect(options: BootstrapOptions): Promise<BootstrapDetection> {
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // TD-110: auth detection always uses the SPA settling policy — its 3s
      // outer bound runs CONCURRENTLY with detectCrawlStrategy's internal 2s
      // wait inside this Promise.all (≈1s worst-case wall cost, zero when the
      // password field exists at load), so no appType-first re-ordering is
      // needed. Non-SPA pages settle instantly.
      const [crawlStrategy, authType, appType] = await Promise.all([
        detectCrawlStrategy(page),
        detectAuthType(page, SPA_AUTH_SETTLING_POLICY),
        detectAppType(page),
      ])

      const appName = deriveAppName(options.url, options.nameOverride)
      const baseUrl: DetectedField<string> = {
        value: options.url, confidence: 'high', source: 'user-supplied',
      }
      // loginUrl is derived from the auth signal + the URL where it was observed.
      const loginUrl: DetectedField<string | null> = authType.value === 'form-login'
        ? { value: page.url(), confidence: authType.confidence, source: 'password-field-count' }
        : { value: null,       confidence: 'medium',            source: 'no-auth-detected' }

      const detection: BootstrapDetection = { appName, appType, crawlStrategy, authType, loginUrl, baseUrl }

      // TD-093 Phase 2 — agent phase runs after static detection, while the probe
      // page is still open (signals come from it; the agent itself runs in its own
      // environment). May upgrade DetectedField confidence — never downgrades.
      await this.runAgentPhase(page, detection, options)

      return detection
    } finally {
      await browser.close()
    }
  }

  /**
   * Render the detection as an `onboarding.<app>.config.ts` SOURCE STRING.
   * Every field is annotated as AUTO-DETECTED (with confidence + source),
   * USER-SUPPLIED, or a low-confidence "verify" note. Secrets are never
   * emitted — only the credentialsEnvKey pointer.
   *
   * @internal TD-108: the standalone-tool path uses generateConfig() → AppConfig
   * (JSON) instead. This .ts generator survives ONLY for the internal regression
   * fixtures (SauceDemo/OrangeHRM/Restful Booker) and the temporary CLI bridge.
   */
  generateTypeScriptConfig(detection: BootstrapDetection, options: BootstrapOptions): string {
    const { appName, appType, crawlStrategy, authType, loginUrl, baseUrl } = detection
    const mappedAppType = mapDetectedAppType(appType.value)

    // TD-097 (portability): derive the types-module import as a RELATIVE path from
    // the config file's eventual on-disk location (Commit 2 writes it there) to
    // src/core/onboarding/types. path.relative + forward-slash normalization keeps
    // this correct at any nesting depth and on any OS — never a hardcoded string.
    const configOutputPath = path.join(
      REPO_ROOT, 'src', 'apps', 'desktop', 'ui', appName.value,
      `onboarding.${appName.value}.config.ts`,
    )
    const typesPath = path.join(REPO_ROOT, 'src', 'core', 'onboarding', 'types')
    const relativeImport = path.relative(path.dirname(configOutputPath), typesPath)
      .replace(/\\/g, '/')
    const appTypeNote = appType.value !== mappedAppType
      ? ` (detected '${appType.value}' -> mapped to '${mappedAppType}')`
      : ''
    const maxPages = options.maxPages ?? 50

    const roles = options.credentials.map(c => {
      const key = credentialsEnvKey(c.role)
      const loginLine = loginUrl.value
        ? `\n      loginUrl:          '${loginUrl.value}', // AUTO-DETECTED [confidence: ${loginUrl.confidence}] source: ${loginUrl.source}`
        : ''
      return (
`    {
      id:                '${c.role}',
      displayName:       '${c.role}', // USER-SUPPLIED — friendly role name
      authFlow:          '${authType.value}', // AUTO-DETECTED [confidence: ${authType.confidence}] source: ${authType.source}
      credentialsEnvKey: '${key}', // USER-SUPPLIED — export ${key}="<username>:<password>" (secret NOT stored here)${loginLine}
      // successUrl: USER-SUPPLIED — the post-login URL; verify before use
    },`
      )
    }).join('\n')

    return (
`import { OnboardingConfig } from '${relativeImport}'

// Generated by FORGE Bootstrap (TD-093) from ${options.url}
// Review every AUTO-DETECTED / USER-SUPPLIED annotation before crawling.
// Secrets are intentionally absent — export the credentialsEnvKey env vars separately.

const config: OnboardingConfig = {
  app: {
    name:    '${appName.value}', // AUTO-DETECTED [confidence: ${appName.confidence}] source: ${appName.source}
    baseUrl: '${baseUrl.value}', // AUTO-DETECTED [confidence: ${baseUrl.confidence}] source: ${baseUrl.source}
    appType: '${mappedAppType}', // AUTO-DETECTED [confidence: ${appType.confidence}] source: ${appType.source}${appTypeNote}
  },
  roles: [
${roles}
  ],
  flows: [], // USER-SUPPLIED — business-intent flow hints; Bootstrap cannot infer these
  pagePrerequisites: [], // USER-SUPPLIED — app-specific setup steps (see TD-013)
  budgets: {
    maxPages: ${maxPages}, // AUTO-DETECTED [confidence: low] — default, verify before use
    maxDepth: 5,  // default
    aiCalls:  ${DEFAULT_AI_BUDGET}, // default (TD-132)
  },
  crawlMode: '${crawlStrategy.value}', // AUTO-DETECTED [confidence: ${crawlStrategy.confidence}] source: ${crawlStrategy.source}
}

export default config
`
    )
  }

  /**
   * TD-108 — project the detection into in-memory BootstrapArtifacts.
   * PURE apart from reading this instance's detect()-time stashes: no disk
   * writes, no process.exit(), no overwrite guard — persistence policy (where
   * to write, whether an existing config may be clobbered, how dry-run is
   * surfaced to the user) belongs to the caller (CrawlRunner via Workspace;
   * temporarily the CLI bridge).
   *
   * Must be called on the SAME instance as detect() — the agent-phase results
   * (manifest counts, evidence package) ride on instance state, exactly as the
   * manifest fold-in always has.
   *
   * @param configPath where the caller INTENDS to persist the config, recorded
   * in the manifest. Callers that don't know yet may omit it and patch
   * manifest.configPath after persisting — never leave the placeholder in a
   * written manifest.
   */
  generateConfig(
    detection: BootstrapDetection,
    options: BootstrapOptions,
    configPath = '(in-memory — not yet persisted)',
  ): BootstrapArtifacts {
    return {
      config:   this.buildAppConfig(detection, options),
      manifest: this.buildManifest(detection, options, configPath),
      evidence: this.evidencePackage,   // null exactly when the agent phase didn't run (dry-run)
      dryRun:   !!options.dryRun,
    }
  }

  /**
   * Project the detection into the thin workspace-layer AppConfig (JSON shape).
   *
   * LOSSY (flagged, not silent): AppConfig.credentials holds ONE envKey while
   * BootstrapOptions supports multiple role credential sets — only the FIRST
   * role's envKey is carried; additional roles are a schema-v2 concern. The
   * rich per-role data survives in the .ts fixture path and in ConfigAdapter's
   * OnboardingConfig defaults (TD-108 Step 4).
   */
  private buildAppConfig(detection: BootstrapDetection, options: BootstrapOptions): AppConfig {
    const first = options.credentials[0]
    return {
      schemaVersion: 1,
      appName:       detection.appName.value,
      url:           detection.baseUrl.value,
      appType:       mapDetectedAppType(detection.appType.value),
      // TD-116 fix: pre-auth detection cannot reliably determine strategy
      // (realLinks:0 on login pages always returns 'bfs'). Write 'auto' so
      // Crawler's per-role StrategyDetector reads real post-auth signals. The
      // detected value is preserved in bootstrap-manifest.json + bootstrap-
      // evidence.json for informational use — it is not lost, just not used
      // as a hard override.
      crawlStrategy: 'auto',
      authType:      detection.authType.value,
      ...(first ? { credentials: { envKey: credentialsEnvKey(first.role) } } : {}),
      budgets: { maxPages: options.maxPages ?? 50, maxDepth: 5 },
    }
  }

  /** Build the manifest record — role names only, NEVER passwords. */
  private buildManifest(
    detection: BootstrapDetection, options: BootstrapOptions, configPath: string,
  ): BootstrapManifest {
    return {
      runId:           generateRunId(),
      timestamp:       new Date().toISOString(),
      url:             options.url,
      appName:         detection.appName.value,
      detection,
      credentialRoles: options.credentials.map(c => c.role),
      configPath,
      dryRun:          !!options.dryRun,
      // TD-093 Phase 2: agent-phase results, when the agent ran (absent on dry-run).
      ...(this.agentPhase ?? {}),
    }
  }

  // TD-108: writeManifest() removed — the manifest is returned in-memory via
  // generateConfig() → BootstrapArtifacts.manifest; the caller persists it.

  // ── TD-093 Phase 2 — agent phase ─────────────────────────────────────────────

  /**
   * Run the Bootstrap Mission: synthesize candidate goals from the landing page's
   * observed signals, execute them via the agent (SUPERVISED — hard-locked), and
   * project the results into a BootstrapEvidencePackage + manifest fields.
   *
   * Dry-run: synthesize + log only — no agent execution, no auth probe, no
   * evidence write. Evidence begins only at execution (Nova Q1); Bootstrap does
   * NOT seed the App Model (Nova Q4) — the evidence package is the hand-off.
   */
  private async runAgentPhase(
    page: Page, detection: BootstrapDetection, options: BootstrapOptions,
  ): Promise<void> {
    // 1. Collect signals from the already-open probe page.
    const signals = await this.collectPageSignals(page)

    // 2. Synthesize candidate goals under the bootstrap mission policy.
    const mission = Missions.bootstrap()
    const synthesized = new DefaultGoalSynthesizer().synthesize(signals, mission)
    // The (single) auth goal, if synthesized — identified by its password-field criterion.
    const authGoalId = synthesized.find(
      g => g.successCriteria.some(c => c.locator === 'input[type="password"]'))?.id ?? null

    // 3. Dry-run: log the synthesized goals and bail — nothing executes, nothing writes.
    if (options.dryRun) {
      console.log(`\n[bootstrap] --dry-run: ${synthesized.length} goal(s) synthesized; agent NOT executed, no auth probe, no evidence written.`)
      for (const g of synthesized) console.log(`  - ${g.id} [${g.origin}] ${g.description}`)
      return
    }
    if (synthesized.length === 0) {
      console.log('[bootstrap] Agent phase: no goals synthesized from page signals — skipping agent run.')
    }

    // 4. Map synthesized Goals to the GoalDefinition shape AgentRunner expects
    //    (synthesis carries no actions — derive the minimal navigate action).
    const defs = synthesized.map(g => this.toGoalDefinition(g, signals))

    // 5-6. Run the agent: supervised (hard-locked for bootstrap), bootstrap mission.
    let session: import('../agent/types').CrawlSession | null = null
    let failureNote: string | null = null
    if (defs.length > 0) {
      try {
        const runner = new AgentRunner({
          config:     this.buildAgentConfig(detection, options),
          goals:      defs,
          mode:       'supervised',            // Bootstrap is ALWAYS supervised
          mission,
          // TD-115: caller-injected (workspace-backed for standalone runs);
          // fixture default stays the repo-anchored JSON repository.
          repository: options.repository ?? new JsonAgentMemoryRepository(),
        })
        session = await runner.run()
      } catch (e: any) {
        // Explicit, never silent (Rule 5): a failed agent phase degrades bootstrap
        // to static-detection-only; the failure is logged AND recorded in the package.
        failureNote = `agent phase failed: ${e.message}`
        console.warn(`[bootstrap] ${failureNote}`)
      }
    }

    // 7-8. Outcomes. Auth attempt is a BOOLEAN (one credential set per bootstrap
    // run — a flag, not a counter, by design): attempted iff the auth goal executed.
    const goals = session?.goals ?? []
    const count = (s: GoalStatus) => goals.filter(g => g.status === s).length
    const authGoal = goals.find(g => g.id === authGoalId)
    const authAttempted = !!authGoal
    const authOutcome: 'success' | 'failed' | 'not-attempted' =
      !authGoal ? 'not-attempted' : authGoal.status === 'achieved' ? 'success' : 'failed'

    // 6. TD-110 (Fix 2) — cumulative observation passes. Two INDEPENDENT facts,
    //    never coupled (Nova ruling):
    //      authType    = "does a login form exist?"  → updates on OBSERVATION
    //      authOutcome = "did login work?"           → updates on RESULT only
    //
    // 6a. Observation correction: the auth goal is only ever SYNTHESIZED when a
    //     Login/Sign-in control was literally observed in the page signals — so
    //     authGoalId !== null IS the observation record, independent of whether
    //     the agent run succeeded. If static detection said 'none' (e.g. the
    //     form hadn't hydrated at detect time — OrangeHRM, live-confirmed),
    //     the observed control corrects the VALUE. Guard on 'none' only: an
    //     existing form-login/high detection is never touched (no downgrade).
    const authTypeCorrected = applyAuthTypeObservation(detection, authGoalId !== null)
    if (authTypeCorrected) {
      console.log('[bootstrap] authType corrected none → form-login (agent observed a login control)')
    }
    // NOTE (intentional, not an accident): loginUrl stays null after this
    // correction — AuthManager falls back to baseUrl, which is the login page
    // for apps that hit this path.
    //
    // 6b. Result upgrade (unchanged semantics): goal ACHIEVEMENT is direct
    //     verification of the password field → high confidence.
    if (authGoal?.status === 'achieved') {
      this.upgradeField(detection.authType, 'high', 'agent-direct-observation:auth-form-reachable')
    } else if (authGoal && detection.authType.confidence === 'low') {
      detection.authType.source = 'attempt-failed-manual-verification-required'
    }

    // 9. Project into the BootstrapEvidencePackage.
    const records: BootstrapEvidenceRecord[] = []
    for (const g of goals) {
      for (const e of g.evidenceChain) {
        records.push({
          field: `goal:${g.id}`, value: `${g.status}: ${e.signal}`,
          observationType: e.observationType, source: e.source,
          confidence: e.confidence, goalOrigin: g.origin, timestamp: e.timestamp,
        })
      }
    }
    // TD-110 (Fix 2): the authType value correction is itself evidence — record it.
    if (authTypeCorrected) {
      records.push({
        field: 'authType', value: 'form-login (corrected from none)',
        observationType: 'indirect_observation',
        source: 'agent-observation:login-control-seen',
        confidence: 'medium', goalOrigin: 'synthesized',
        timestamp: new Date().toISOString(),
      })
    }
    const notes: string[] = [
      `bootstrap mission: supervised (hard-locked), depthBudget=${mission.depthBudget}, optimizeFor=${mission.optimizeFor}`,
    ]
    // Self-documentation: every synthesized goal + its criteria (what was synthesized vs observed).
    for (const g of synthesized) {
      const criteria = g.successCriteria.map(c =>
        `${c.verifier}${c.locator ? `[${c.locator}]` : ''}${c.expectedValue !== undefined ? `=${String(c.expectedValue)}` : ''}`).join('; ')
      notes.push(`synthesized '${g.id}' (${g.description}) criteria: ${criteria}`)
    }
    if (authTypeCorrected) {
      notes.push('TD-110: authType corrected none → form-login on agent OBSERVATION of a login ' +
        'control (independent of auth outcome — authType is "does the form exist?", authOutcome is "did login work?")')
    }
    if (authGoalId) {
      notes.push('auth goal verifies auth-form REACHABILITY (input[type="password"] present) — ' +
        'no credential submission in Phase 2 bootstrap; credentialed login is deferred')
    }
    if (failureNote) notes.push(failureNote)

    const pkg: BootstrapEvidencePackage = {
      schemaVersion: '1.0',
      appName: detection.appName.value,
      url: options.url,
      missionType: 'bootstrap',
      producedAt: new Date().toISOString(),
      agentSupervised: true,
      records,
      synthesizedGoalCount: synthesized.length,
      achievedGoalCount: count('achieved'),
      blockedGoalCount: count('blocked'),
      unreachableGoalCount: count('unreachable'),
      authAttempted,
      authOutcome,
      notes,
    }

    // 10. TD-108: STASH the evidence package (no disk write — the caller
    // persists it from BootstrapArtifacts.evidence and patches
    // manifest.evidencePackagePath with wherever it actually lands).
    this.evidencePackage = pkg
    console.log(`[bootstrap] Evidence package built (${records.length} record(s), in-memory — persisted by the caller).`)

    // 11. Stash for the manifest (buildManifest folds these in).
    this.agentPhase = {
      agentGoalsSynthesized: synthesized.length,
      agentGoalsAchieved:    count('achieved'),
      agentGoalsBlocked:     count('blocked'),
      agentGoalsUnreachable: count('unreachable'),
      authAttempted,
      authOutcome,
    }
  }

  /** Observed landing-page signals for the synthesizer (arrow callbacks — tsx-safe). */
  private async collectPageSignals(page: Page): Promise<PageSignals> {
    const navLinks = await page.$$eval('a', as =>
      as.map(a => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '' })))
    const buttonTexts = await page.$$eval('button, input[type="submit"]', bs =>
      bs.map(b => ((b.textContent ?? '') || (b as HTMLInputElement).value || '').trim()).filter(t => t.length > 0))
    const formPresence = (await page.locator('form').count()) > 0
    return { navLinks, buttonTexts, formPresence, currentUrl: page.url(), pageTitle: await page.title() }
  }

  /**
   * Map a synthesized Goal to the GoalDefinition shape AgentRunner expects.
   * Synthesis carries no actions (evidence starts at execution), so derive the
   * minimal one: navigate to the criterion's target (nav goals) or to the page
   * where the auth control was observed (auth goal). Relative hrefs are resolved
   * absolute against the observed page URL (WebUIEnvironment.goto needs absolute).
   */
  private toGoalDefinition(goal: Goal, signals: PageSignals): GoalDefinition {
    const c = goal.successCriteria[0]
    const target = c?.verifier === 'page-url'
      ? new URL(String(c.expectedValue ?? '/'), signals.currentUrl).href
      : signals.currentUrl
    return {
      id:              goal.id,
      description:     goal.description,
      type:            goal.type,
      origin:          goal.origin,   // 'synthesized' — preserved through defToGoal
      successCriteria: goal.successCriteria,
      prerequisites:   goal.prerequisites,
      actions:         [{ type: 'navigate', target }],
    }
  }

  /** Minimal in-memory OnboardingConfig for the AgentRunner (detection is not a config file). */
  private buildAgentConfig(detection: BootstrapDetection, options: BootstrapOptions): OnboardingConfig {
    return {
      app: {
        name:    detection.appName.value,
        baseUrl: detection.baseUrl.value,
        appType: mapDetectedAppType(detection.appType.value) as AppTypeName,
      },
      roles: options.credentials.map(c => ({
        id:                c.role,
        displayName:       c.role,
        authFlow:          'form-login' as const,
        credentialsEnvKey: credentialsEnvKey(c.role),
      })),
      budgets: { maxPages: options.maxPages ?? 50, maxDepth: 5, aiCalls: DEFAULT_AI_BUDGET },
    }
  }

  /** Raise a DetectedField's confidence when agent evidence is stronger — never downgrade. */
  private upgradeField(field: DetectedField<string>, confidence: DetectionConfidence, source: string): void {
    const RANK: Record<DetectionConfidence, number> = { low: 0, medium: 1, high: 2 }
    if (RANK[confidence] > RANK[field.confidence]) {
      field.confidence = confidence
      field.source = source
    }
  }
}
