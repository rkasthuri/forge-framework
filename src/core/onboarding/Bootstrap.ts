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
import * as path from 'path'
import { chromium, Page } from '@playwright/test'
import { StrategyDetector } from './StrategyDetector'

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

// ── Bootstrap ───────────────────────────────────────────────────────────────────

export class Bootstrap {
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

      return { appName, appType, crawlStrategy, authType, loginUrl, baseUrl }
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
}
