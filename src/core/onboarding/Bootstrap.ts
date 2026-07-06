/**
 * TD-093 — Bootstrap Mode (Phase 1, Commit 1: detection core).
 *
 * Given a URL (+ credentials), Bootstrap probes the live page and produces a
 * BootstrapDetection: each field carries its detected value, a confidence tier,
 * and a human-readable source. `generateConfig()` renders that detection as an
 * `onboarding.<app>.config.ts` SOURCE STRING (writing to disk is Commit 2; CLI
 * wiring Commit 2; dry-run Commit 3; manifest Commit 4).
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
import * as fs from 'fs'
import * as path from 'path'
import { chromium, Page } from '@playwright/test'
import { StrategyDetector } from './StrategyDetector'
import { AgentRunner } from '../agent/AgentRunner'
import { Missions } from '../agent/Mission'
import { DefaultGoalSynthesizer, PageSignals } from '../agent/GoalSynthesizer'
import { GoalDefinition } from '../agent/AgentPlanner'
import { JsonAgentMemoryRepository } from '../agent/AgentMemoryRepository'
import { Goal, GoalStatus } from '../agent/types'
import { BootstrapEvidencePackage, BootstrapEvidenceRecord, bootstrapEvidencePath } from './BootstrapEvidence'
import { OnboardingConfig, AppTypeName } from './types'

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

/** Internal carrier for the agent-phase results between runAgentPhase() and the manifest. */
interface AgentPhaseResult {
  evidencePackagePath:   string
  agentGoalsSynthesized: number
  agentGoalsAchieved:    number
  agentGoalsBlocked:     number
  agentGoalsUnreachable: number
  authAttempted:         boolean
  authOutcome:           'success' | 'failed' | 'not-attempted'
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
 */
export async function detectAuthType(page: Page): Promise<DetectedField<string>> {
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

  /** Probe the live URL and return a fully-annotated BootstrapDetection. */
  async detect(options: BootstrapOptions): Promise<BootstrapDetection> {
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 })

      const [crawlStrategy, authType, appType] = await Promise.all([
        detectCrawlStrategy(page),
        detectAuthType(page),
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
   * Not written to disk (Commit 2). Every field is annotated as AUTO-DETECTED
   * (with confidence + source), USER-SUPPLIED, or a low-confidence "verify" note.
   * Secrets are never emitted — only the credentialsEnvKey pointer.
   */
  generateConfig(detection: BootstrapDetection, options: BootstrapOptions): string {
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
    aiCalls:  50, // default
  },
  crawlMode: '${crawlStrategy.value}', // AUTO-DETECTED [confidence: ${crawlStrategy.confidence}] source: ${crawlStrategy.source}
}

export default config
`
    )
  }

  /**
   * Generate the config and WRITE it to the app's onboarding config path,
   * creating the app directory if needed. Returns the written path.
   *
   * TD-097 (portability): the path is built from REPO_ROOT (derived from
   * __dirname, not process.cwd()) via path.join — never hardcoded, never OS-
   * specific. The written location is exactly what cli.ts's resolveConfig()
   * searches for (onboarding.<appName>.config.ts under src/apps/**).
   */
  async writeConfig(detection: BootstrapDetection, options: BootstrapOptions): Promise<string> {
    const appDir = path.join(REPO_ROOT, 'src', 'apps', 'desktop', 'ui', detection.appName.value)
    const outputPath = path.join(appDir, `onboarding.${detection.appName.value}.config.ts`)
    const relConfigPath = path.relative(REPO_ROOT, outputPath).replace(/\\/g, '/')

    // --dry-run: preview the generated config + manifest, write nothing, and exit
    // before the crawl (writeConfig runs ahead of the crawl in the CLI flow, so
    // exiting here skips both the disk write and the crawl). Path STRINGS are
    // computed above but no filesystem write occurs.
    if (options.dryRun) {
      const configStr = this.generateConfig(detection, options)
      console.log('\n[bootstrap] --dry-run: config NOT written to disk.')
      console.log('[bootstrap] Generated config preview:\n')
      console.log(configStr)
      console.log('\n[bootstrap] --dry-run: manifest NOT written. Preview:\n')
      console.log(JSON.stringify(this.buildManifest(detection, options, relConfigPath), null, 2))
      console.log('\n[bootstrap] To write and crawl, run without --dry-run.')
      process.exit(0)   // no file write, no crawl
    }

    // Overwrite guard: never silently clobber an existing (possibly hand-curated)
    // config. Abort unless --force is passed; warn when force overwrites.
    if (fs.existsSync(outputPath)) {
      if (!options.force) {
        console.error(
          `[bootstrap] Config already exists at: ${outputPath}\n` +
          `Use --force to overwrite.`,
        )
        process.exit(1)
      }
      console.warn('[bootstrap] --force: overwriting existing config.')
    }

    fs.mkdirSync(appDir, { recursive: true })
    const configStr = this.generateConfig(detection, options)
    fs.writeFileSync(outputPath, configStr, 'utf-8')
    console.log(`[bootstrap] Config written to: ${outputPath}`)

    this.writeManifest(detection, options, relConfigPath)
    return outputPath
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

  /**
   * Write the machine-readable detection manifest to
   * reports/bootstrap-manifest-<app>.json. TD-097: path from REPO_ROOT via
   * path.join. Stores role names only — never passwords. (Dry-run previews the
   * manifest inline in writeConfig and never reaches here.)
   */
  writeManifest(detection: BootstrapDetection, options: BootstrapOptions, configPath: string): void {
    const manifestPath = path.join(
      REPO_ROOT, 'reports', `bootstrap-manifest-${detection.appName.value}.json`,
    )
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    fs.writeFileSync(
      manifestPath, JSON.stringify(this.buildManifest(detection, options, configPath), null, 2), 'utf-8',
    )
    console.log(`[bootstrap] Manifest written to: ${manifestPath}`)
  }

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
          repository: new JsonAgentMemoryRepository(),
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

    // 6. Confidence upgrade — agent direct observation is stronger than a static
    //    signal; NEVER downgrade (a failed probe cannot demote high static evidence).
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
    const notes: string[] = [
      `bootstrap mission: supervised (hard-locked), depthBudget=${mission.depthBudget}, optimizeFor=${mission.optimizeFor}`,
    ]
    // Self-documentation: every synthesized goal + its criteria (what was synthesized vs observed).
    for (const g of synthesized) {
      const criteria = g.successCriteria.map(c =>
        `${c.verifier}${c.locator ? `[${c.locator}]` : ''}${c.expectedValue !== undefined ? `=${String(c.expectedValue)}` : ''}`).join('; ')
      notes.push(`synthesized '${g.id}' (${g.description}) criteria: ${criteria}`)
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

    // 10. Write the evidence package (reports/ ensured; gitignored).
    const evPath = bootstrapEvidencePath(detection.appName.value)
    fs.mkdirSync(path.dirname(evPath), { recursive: true })
    fs.writeFileSync(evPath, JSON.stringify(pkg, null, 2), 'utf-8')
    console.log(`[bootstrap] Evidence package written to: ${evPath}`)

    // 11. Stash for the manifest (buildManifest folds these in).
    this.agentPhase = {
      evidencePackagePath:   path.relative(REPO_ROOT, evPath).replace(/\\/g, '/'),
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
      budgets: { maxPages: options.maxPages ?? 50, maxDepth: 5, aiCalls: 50 },
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
