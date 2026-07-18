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

/**
 * TD-UI-027 — identity-divergence detection on crawl auth-failure.
 *
 * Governing principle (Nova): diagnose why a crawl FAILED — never certify why it
 * would have succeeded. FAILURE-TRIGGERED ONLY (shouldProbeIdentity gates it);
 * FORGE never probes proactively on a successful crawl.
 *
 * Re-runs the ALREADY-SHIPPED bootstrap observations (detectAuthType, detectAppType,
 * plus a baseUrl-origin comparison) and compares each against the onboarding config.
 * No new detection logic lives here — only the comparison and its honest reporting.
 *
 * The three-outcome invariant: per signal the result is EXACTLY one of
 * 'divergence-detected' | 'no-divergence-detected' | 'inconclusive'. 'inconclusive'
 * can never collapse into 'no-divergence-detected' — a probe that could not run
 * says so. The verdict lives in the EXISTING crawlDiagnostics channel (TD-UI-040
 * seam): it explains THIS crawl, not a permanent fact about the configuration.
 */

import { chromium, Page } from '@playwright/test'
import { detectAuthType, detectAppType, mapDetectedAppType } from './Bootstrap'
import {
  OnboardingConfig, CrawlDiagnostic, IdentitySignalResult, IdentityDivergenceReport,
} from './types'

/** v1 coverage manifest — named so coverage is never over-implied. The appType
 *  entry names its granularity (SPA/non-SPA class only, per the detection-vocabulary
 *  coarseness) so a reader cannot infer a sharper comparison than was made; the
 *  excluded finer granularity is listed in notChecked. Likewise baseUrl is checked
 *  by ORIGIN only (path differences are not divergence). */
export const IDENTITY_SIGNALS_CHECKED = ['authType', 'appType (SPA/non-SPA class only)', 'baseUrl (origin only)']
export const IDENTITY_SIGNALS_NOT_CHECKED = [
  'exact appType variant within the same SPA/non-SPA class',
  'crawl/routing strategy', 'MFA', 'OAuth provider', 'credential validity', 'role permissions',
]

export interface ObservedIdentity {
  authType: string | null   // null = probe could not determine (→ 'inconclusive')
  appType:  string | null
  baseUrl:  string | null
  /** inconclusive-only context: what prevented each null observation. */
  whys?: Partial<Record<'authType' | 'appType' | 'baseUrl', string>>
}

export interface ConfiguredIdentity {
  authType: string
  appType:  string
  baseUrl:  string
}

/** The onboarding config's recorded identity, for comparison. authType comes from
 *  the first role's authFlow (v1: single-auth-scheme assumption), else the
 *  unmetAuth record, else 'none'. */
export function configuredIdentity(config: OnboardingConfig): ConfiguredIdentity {
  return {
    authType: config.roles[0]?.authFlow ?? config.unmetAuth?.authType ?? 'none',
    appType:  config.appType ?? config.app.appType,
    baseUrl:  config.app.baseUrl,
  }
}

/** SPA-vs-not equivalence class for appType comparison. The detection vocabulary
 *  ('spa' | 'desktop-web'→'web-ui') cannot reproduce every config AppTypeName
 *  (e.g. 'mpa'), so comparing raw strings would fabricate divergence out of a
 *  vocabulary mismatch. v1 claims divergence only across the SPA/non-SPA class
 *  boundary (the MPA→SPA re-platform case the TD names). */
const appTypeClass = (v: string): string => (v === 'spa' ? 'spa' : 'non-spa-web')

const sameOrigin = (a: string, b: string): boolean => {
  try {
    return new URL(a).origin === new URL(b).origin
  } catch {
    return a === b   // unparseable → honest raw comparison
  }
}

/**
 * Pure three-outcome evaluation. HARD INVARIANT: a null observation returns
 * 'inconclusive' BEFORE any equality check runs — it can never fall through to
 * 'no-divergence-detected'.
 */
export function evaluateIdentitySignals(
  observed: ObservedIdentity,
  configured: ConfiguredIdentity,
): IdentitySignalResult[] {
  const mk = (
    signal: IdentitySignalResult['signal'],
    obs: string | null,
    conf: string,
    equivalent: (a: string, b: string) => boolean,
  ): IdentitySignalResult => {
    if (obs === null) {
      // INVARIANT BRANCH: inconclusive exits here — the equality below is unreachable.
      const why = observed.whys?.[signal]
      return { signal, outcome: 'inconclusive', observed: null, configured: conf, ...(why ? { why } : {}) }
    }
    return equivalent(obs, conf)
      ? { signal, outcome: 'no-divergence-detected', observed: obs, configured: conf }
      : { signal, outcome: 'divergence-detected', observed: obs, configured: conf }
  }
  return [
    mk('authType', observed.authType, configured.authType, (a, b) => a === b),
    mk('appType',  observed.appType,  configured.appType,  (a, b) => appTypeClass(a) === appTypeClass(b)),
    mk('baseUrl',  observed.baseUrl,  configured.baseUrl,  sameOrigin),
  ]
}

/** Build the crawlDiagnostics entry (ADR-016: machine-readable remedy). */
export function buildIdentityDivergenceDiagnostic(
  perSignal: IdentitySignalResult[],
  target: string,
): CrawlDiagnostic {
  const divergences     = perSignal.filter(s => s.outcome === 'divergence-detected')
  const allInconclusive = perSignal.every(s => s.outcome === 'inconclusive')

  let detail: string
  let remedy: CrawlDiagnostic['remedy']
  if (divergences.length > 0) {
    const list = divergences
      .map(d => `observed ${d.signal} differs from onboarding (${d.observed} vs ${d.configured})`)
      .join('; ')
    detail = `Identity divergence detected after auth failure: ${list}.`
    remedy = { tier: 2, action: `${list.charAt(0).toUpperCase()}${list.slice(1)}. Re-onboard to re-detect application identity.` }
  } else if (allInconclusive) {
    detail = 'Identity-divergence analysis could not be completed — the probe produced no observations; no conclusion about the onboarding configuration was reached.'
    remedy = { tier: 3, action: 'Identity-divergence analysis could not be completed. Verify the application is reachable and retry, or re-onboard to re-detect application identity.' }
  } else {
    const notChecked = IDENTITY_SIGNALS_NOT_CHECKED.join(', ')
    detail = 'No identity divergence detected among the checked signals (authType, appType, baseUrl); the auth failure is not explained by these signals.'
    remedy = { tier: 3, action: `The auth failure is not explained by the checked identity signals (authType, appType, baseUrl). Signals NOT checked: ${notChecked}. Verify credentials and application state, then re-crawl.` }
  }

  const report: IdentityDivergenceReport = {
    check:      'identity-divergence',
    perSignal,
    checked:    [...IDENTITY_SIGNALS_CHECKED],
    notChecked: [...IDENTITY_SIGNALS_NOT_CHECKED],
  }
  return { scope: 'role', target, reason: 'identity-divergence', detail, remedy, identityDivergence: report }
}

/** FAILURE-TRIGGERED gate: probe ONLY when a crawl already failed on auth —
 *  either a role's auth was tried and rejected, or auth was required and no
 *  credentials existed (no role crawlable). A successful crawl never probes.
 *  Non-web app types never probe (the probe is a web-page observation). */
export function shouldProbeIdentity(
  roleAuthOutcomes: Record<string, 'succeeded' | 'failed' | 'unknown'>,
  config: OnboardingConfig,
): boolean {
  const appType = config.appType ?? config.app.appType
  const nonWeb = ['rest-api', 'graphql-api', 'mobile-android', 'mobile-ios', 'iot', 'cloud', 'data']
  if (nonWeb.includes(appType)) return false
  if (Object.values(roleAuthOutcomes).includes('failed')) return true
  return config.roles.length === 0 && !!config.unmetAuth
}

export type IdentityPageSession = { page: Page; close: () => Promise<void> }
export type IdentityPageFactory = () => Promise<IdentityPageSession>

const defaultPageFactory: IdentityPageFactory = async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  return { page, close: () => browser.close() }
}

/**
 * I/O wrapper: re-run the shipped bootstrap observations against the live app and
 * build the diagnostic. Every failure path degrades a signal to 'inconclusive'
 * (with why) — this function itself never throws on probe failure.
 */
export async function probeIdentityDivergence(
  config: OnboardingConfig,
  pageFactory: IdentityPageFactory = defaultPageFactory,
): Promise<CrawlDiagnostic> {
  const configured = configuredIdentity(config)
  const observed: ObservedIdentity = { authType: null, appType: null, baseUrl: null, whys: {} }

  let session: IdentityPageSession | null = null
  try {
    session = await pageFactory()
  } catch (e: any) {
    const why = `browser launch failed: ${e?.message ?? e}`
    observed.whys = { authType: why, appType: why, baseUrl: why }
  }

  if (session) {
    try {
      try {
        await session.page.goto(config.app.baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        observed.baseUrl = session.page.url()
      } catch (e: any) {
        const why = `navigation failed: ${e?.message ?? e}`
        observed.whys = { authType: why, appType: why, baseUrl: why }
      }
      if (observed.baseUrl !== null) {
        try {
          observed.authType = (await detectAuthType(session.page)).value
        } catch (e: any) {
          observed.whys!.authType = `authType probe failed: ${e?.message ?? e}`
        }
        try {
          observed.appType = mapDetectedAppType((await detectAppType(session.page)).value)
        } catch (e: any) {
          observed.whys!.appType = `appType probe failed: ${e?.message ?? e}`
        }
      }
    } finally {
      await session.close().catch(() => {})
    }
  }

  return buildIdentityDivergenceDiagnostic(
    evaluateIdentitySignals(observed, configured),
    config.app.name,
  )
}
