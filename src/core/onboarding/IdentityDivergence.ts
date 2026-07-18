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
import {
  detectAuthType, detectAppType, mapDetectedAppType,
  authTypeCanRepresent, appTypeCanRepresent,
} from './Bootstrap'
import {
  OnboardingConfig, CrawlDiagnostic, IdentitySignalResult, IdentityDivergenceReport,
} from './types'

/** Per-signal granularity labels (ADR-019): each names its comparison granularity so a
 *  reader cannot infer a sharper comparison than was made — appType is compared at the
 *  SPA/non-SPA class only; baseUrl by origin only. */
const SIGNAL_LABEL: Record<IdentitySignalResult['signal'], string> = {
  authType: 'authType',
  appType:  'appType (SPA/non-SPA class only)',
  baseUrl:  'baseUrl (origin only)',
}

/** The full designed check-set (present in a report's `checked` when every signal reached
 *  a comparison). A signal that resolves 'inconclusive' is moved to notChecked at report
 *  time — see buildIdentityDivergenceDiagnostic (ADR-019 2d). */
export const IDENTITY_SIGNALS_CHECKED = [SIGNAL_LABEL.authType, SIGNAL_LABEL.appType, SIGNAL_LABEL.baseUrl]

/** Attributes this probe never evaluates, regardless of run (static). */
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

/** ADR-019 competence gate for baseUrl. The baseUrl comparison is owned HERE (not a
 *  Bootstrap detector) — it reads page.url() and compares by origin, with a raw-string
 *  fallback for unparseable input. Origin comparison is competent for any string, so the
 *  boundary admits everything; the predicate exists so the gate is UNIFORM across all
 *  three signals (ADR-019 2c), not bolted onto authType alone. */
const baseUrlCanRepresent = (_configuredValue: string): boolean => true

/**
 * Pure three-outcome evaluation. TWO structural early returns, each producing
 * 'inconclusive' BEFORE any equality check runs — the equality is unreachable, not merely
 * guarded:
 *   BRANCH 1 (null observation)     — the probe could not OBSERVE a value.
 *   BRANCH 2 (ADR-019 competence)   — the probe observed a value, but the detector's
 *                                     vocabulary cannot represent the CONFIGURED value.
 * The two are distinguishable: branch 1 has observed===null; branch 2 has observed!==null
 * and a `why` naming the vocabulary limitation. Neither can fall through to
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
    canRepresent: (configuredValue: string) => boolean,
  ): IdentitySignalResult => {
    if (obs === null) {
      // INVARIANT BRANCH 1 — probe could not OBSERVE. Inconclusive exits here; the
      // equality below is unreachable. `why` names the observation failure.
      const why = observed.whys?.[signal]
      return { signal, outcome: 'inconclusive', observed: null, configured: conf, ...(why ? { why } : {}) }
    }
    if (!canRepresent(conf)) {
      // INVARIANT BRANCH 2 (ADR-019) — probe OBSERVED a value, but the detector's
      // vocabulary cannot represent the CONFIGURED value, so this is not a comparison the
      // detector is competent to make. Inconclusive exits here too; the equality below is
      // unreachable. Distinguishable from branch 1: observed is NON-null; `why` names a
      // vocabulary limitation, not an observation failure.
      return {
        signal, outcome: 'inconclusive', observed: obs, configured: conf,
        why: `the ${signal} detector's observation vocabulary cannot represent the configured value '${conf}' — the probe produced a value ('${obs}') but has no way to express this distinction (ADR-019 competence boundary; see TD-142 / TD-144)`,
      }
    }
    return equivalent(obs, conf)
      ? { signal, outcome: 'no-divergence-detected', observed: obs, configured: conf }
      : { signal, outcome: 'divergence-detected', observed: obs, configured: conf }
  }
  return [
    mk('authType', observed.authType, configured.authType, (a, b) => a === b, authTypeCanRepresent),
    mk('appType',  observed.appType,  configured.appType,  (a, b) => appTypeClass(a) === appTypeClass(b), appTypeCanRepresent),
    mk('baseUrl',  observed.baseUrl,  configured.baseUrl,  sameOrigin, baseUrlCanRepresent),
  ]
}

/** Build the crawlDiagnostics entry (ADR-016: machine-readable remedy). */
export function buildIdentityDivergenceDiagnostic(
  perSignal: IdentitySignalResult[],
  target: string,
): CrawlDiagnostic {
  const divergences     = perSignal.filter(s => s.outcome === 'divergence-detected')
  const inconclusive    = perSignal.filter(s => s.outcome === 'inconclusive')
  const allInconclusive = perSignal.length > 0 && inconclusive.length === perSignal.length

  // ADR-019 2d — the manifest reflects what was ACTUALLY evaluated. A signal that resolved
  // 'inconclusive' was NOT meaningfully checked; move it to notChecked with the reason —
  // discriminated by observed===null (could not observe) vs !==null (competence) — never
  // leave it in `checked` as though a comparison occurred.
  const checked: string[] = []
  const notChecked: string[] = [...IDENTITY_SIGNALS_NOT_CHECKED]
  for (const s of perSignal) {
    if (s.outcome === 'inconclusive') {
      const reason = s.observed === null
        ? `not evaluated: the probe could not observe a value${s.why ? ` (${s.why})` : ''}`
        : `not evaluated: the detector's vocabulary cannot represent the configured value '${s.configured}' (known limitation, see TD-144)`
      notChecked.push(`${SIGNAL_LABEL[s.signal]} — ${reason}`)
    } else {
      checked.push(SIGNAL_LABEL[s.signal])
    }
  }

  let detail: string
  let remedy: CrawlDiagnostic['remedy']
  if (divergences.length > 0) {
    const list = divergences
      .map(d => `observed ${d.signal} differs from onboarding (${d.observed} vs ${d.configured})`)
      .join('; ')
    detail = `Identity divergence detected after auth failure: ${list}.`
    remedy = { tier: 2, action: `${list.charAt(0).toUpperCase()}${list.slice(1)}. Re-onboard to re-detect application identity.` }
  } else if (allInconclusive) {
    detail = 'Identity-divergence analysis could not be completed — no signal could be evaluated; no conclusion about the onboarding configuration was reached.'
    remedy = { tier: 3, action: 'Identity-divergence analysis could not be completed — no signal could be evaluated. Verify the application is reachable and retry, or re-onboard to re-detect application identity.' }
  } else if (inconclusive.length > 0) {
    // ADR-019 2e — SOME signals evaluated (no divergence), SOME could not be. NEVER imply
    // the config was fully checked and found sound; name each unevaluated signal's reason.
    const notes = inconclusive.map(s => s.observed === null
      ? `${s.signal} could not be observed`
      : `the configured ${s.signal} ('${s.configured}') is outside what the current detector can observe, so this signal could not be evaluated`)
    detail = `Partial identity-divergence analysis: no divergence among the signals that could be evaluated, but ${notes.join('; ')}. This is a known limitation, not a finding about the configuration.`
    remedy = { tier: 3, action: `${notes.join('; ')} — a known limitation (see TD-144), not a finding about the configuration. Re-onboard only if application identity is believed to have changed; otherwise verify credentials and application state, then re-crawl.` }
  } else {
    detail = `No identity divergence detected among the checked signals (${checked.join(', ')}); the auth failure is not explained by these signals.`
    remedy = { tier: 3, action: `The auth failure is not explained by the checked identity signals (${checked.join(', ')}). Signals NOT checked: ${notChecked.join(', ')}. Verify credentials and application state, then re-crawl.` }
  }

  const report: IdentityDivergenceReport = {
    check:      'identity-divergence',
    perSignal,
    checked,
    notChecked,
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
