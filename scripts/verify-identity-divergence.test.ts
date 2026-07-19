/**
 * FORGE — Autonomous Quality Engineering
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * TD-UI-027 — identity-divergence detection (failure-triggered probe).
 *   D1 authType diverges → 'divergence-detected' with both values
 *   D2 all match → 'no-divergence-detected' (wording carries no certainty words)
 *   D3 probe failure → 'inconclusive', NEVER 'no-divergence-detected' (THE KEY TEST)
 *   D4 ALL inconclusive → remedy states analysis incomplete, no "checked and fine" implication
 *   D5 checked/notChecked manifest present + accurate
 *   D6 appType divergence (MPA→SPA class boundary)
 *   D7 baseUrl origin divergence
 *   D8 probe gate: fires ONLY on auth-failure; successful crawls never probe
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateIdentitySignals, buildIdentityDivergenceDiagnostic, shouldProbeIdentity,
  configuredIdentity, IDENTITY_SIGNALS_CHECKED, IDENTITY_SIGNALS_NOT_CHECKED,
} from '../src/core/onboarding/IdentityDivergence'
import { OnboardingConfig } from '../src/core/onboarding/types'

const CONF = { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://app.example.com' }
const byName = (r: ReturnType<typeof evaluateIdentitySignals>, s: string) => r.find(x => x.signal === s)!

test('D1 authType diverges -> divergence-detected with both values', () => {
  // brief vocabulary ('sso') — evaluate() is comparison-generic:
  const r1 = byName(evaluateIdentitySignals({ authType: 'sso', appType: 'web-ui', baseUrl: CONF.baseUrl }, CONF), 'authType')
  assert.equal(r1.outcome, 'divergence-detected')
  assert.equal(r1.observed, 'sso'); assert.equal(r1.configured, 'form-login')
  // shipped detector vocabulary — an SSO page has no password field, detector observes 'none':
  const r2 = byName(evaluateIdentitySignals({ authType: 'none', appType: 'web-ui', baseUrl: CONF.baseUrl }, CONF), 'authType')
  assert.equal(r2.outcome, 'divergence-detected')
})

test('D2 all three match -> no-divergence-detected; wording carries no certainty words', () => {
  const perSignal = evaluateIdentitySignals({ authType: 'form-login', appType: 'web-ui', baseUrl: 'https://app.example.com/login' }, CONF)
  for (const s of perSignal) assert.equal(s.outcome, 'no-divergence-detected')
  const diag = buildIdentityDivergenceDiagnostic(perSignal, 'demo')
  const payload = JSON.stringify(diag).toLowerCase()
  for (const banned of ['stale', 'fresh', '"clean', ' clean ', 'valid ']) {
    assert.ok(!payload.includes(banned), `payload must not contain certainty word: ${banned}`)
  }
  assert.match(diag.detail, /not explained by these signals/)
})

test('D3 probe failure -> inconclusive for affected signals, NEVER no-divergence-detected (KEY)', () => {
  const perSignal = evaluateIdentitySignals(
    { authType: null, appType: 'web-ui', baseUrl: CONF.baseUrl, whys: { authType: 'authType probe failed: timeout' } },
    CONF,
  )
  const auth = byName(perSignal, 'authType')
  assert.equal(auth.outcome, 'inconclusive')
  assert.notEqual(auth.outcome, 'no-divergence-detected')
  assert.equal(auth.observed, null)
  assert.match(auth.why!, /timeout/)
  // the signals that DID run still evaluate normally:
  assert.equal(byName(perSignal, 'appType').outcome, 'no-divergence-detected')
})

test('D4 ALL signals inconclusive -> remedy states analysis incomplete; no "checked and fine" implication', () => {
  const why = 'navigation failed: net::ERR_CONNECTION_REFUSED'
  const perSignal = evaluateIdentitySignals(
    { authType: null, appType: null, baseUrl: null, whys: { authType: why, appType: why, baseUrl: why } },
    CONF,
  )
  assert.ok(perSignal.every(s => s.outcome === 'inconclusive'))
  const diag = buildIdentityDivergenceDiagnostic(perSignal, 'demo')
  assert.match(diag.remedy.action, /could not be completed/)
  const payload = JSON.stringify(diag)
  assert.ok(!payload.includes('no-divergence-detected'), 'nothing may claim a signal was checked-and-matched')
  assert.ok(!/not explained by these signals/.test(diag.detail), 'must not imply the signals were evaluated')
})

test('D5 checked/notChecked manifest present + accurate; appType granularity declared, not over-implied', () => {
  const perSignal = evaluateIdentitySignals({ authType: 'form-login', appType: 'web-ui', baseUrl: CONF.baseUrl }, CONF)
  const diag = buildIdentityDivergenceDiagnostic(perSignal, 'demo')
  const checked = diag.identityDivergence!.checked
  const notChecked = diag.identityDivergence!.notChecked
  assert.deepEqual(checked, IDENTITY_SIGNALS_CHECKED)
  assert.deepEqual(notChecked, IDENTITY_SIGNALS_NOT_CHECKED)
  // REQUIRED CHANGE 1 — the coarse appType comparison must NOT read as a bare 'appType'
  // (that over-implies an exact-variant comparison), and the excluded granularity is named.
  assert.ok(!checked.includes('appType'), 'bare "appType" must not appear — it over-implies exact comparison')
  assert.ok(checked.some(c => /appType \(SPA\/non-SPA class only\)/.test(c)), 'checked names the appType granularity')
  assert.ok(notChecked.some(c => /exact appType variant within the same SPA\/non-SPA class/.test(c)), 'notChecked names the excluded finer granularity')
  assert.ok(notChecked.includes('MFA'))
})

test('D6 appType divergence (MPA -> SPA class boundary) detected', () => {
  const r = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'spa', baseUrl: CONF.baseUrl },
    { ...CONF, appType: 'mpa' },
  ), 'appType')
  assert.equal(r.outcome, 'divergence-detected')
  assert.equal(r.observed, 'spa'); assert.equal(r.configured, 'mpa')
  // vocabulary mismatch alone must NOT fabricate divergence: config 'mpa', observed 'web-ui' — same non-SPA class
  const same = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: CONF.baseUrl },
    { ...CONF, appType: 'mpa' },
  ), 'appType')
  assert.equal(same.outcome, 'no-divergence-detected')
})

test('D7 baseUrl origin DIFFERENCE -> inconclusive (post-TD-146); same-origin path difference -> no-divergence', () => {
  // FIRST ASSERTION UPDATED (TD-146/ADR-019 axis 2): it previously asserted 'divergence-detected'
  // — that encoded the DEFECT. An origin difference is under-determined (moved app vs SSO/proxy/
  // redirect), so a single page.url() cannot conclude divergence → inconclusive. (D-f is the new
  // KEY test for this case.)
  const moved = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://moved.example.net/home' }, CONF), 'baseUrl')
  assert.equal(moved.outcome, 'inconclusive')
  // SECOND ASSERTION UNCHANGED + still load-bearing (not covered by D-f): same origin, different
  // path -> NOT a divergence.
  const samePathDiff = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://app.example.com/dashboard' }, CONF), 'baseUrl')
  assert.equal(samePathDiff.outcome, 'no-divergence-detected')
})

test('D8 the probe gate fires ONLY on auth-failure; success never probes', () => {
  const cfg = (roles: number, unmet: boolean, appType = 'web-ui'): OnboardingConfig => ({
    app: { name: 'demo', baseUrl: 'https://x.test', appType: appType as any },
    appType: appType as any,
    roles: Array.from({ length: roles }, (_, i) => ({ id: `r${i}`, displayName: `r${i}`, authFlow: 'form-login', credentialsEnvKey: 'X' })) as any,
    ...(unmet ? { unmetAuth: { authType: 'form-login' } } : {}),
  } as unknown as OnboardingConfig)

  assert.equal(shouldProbeIdentity({ r0: 'succeeded' }, cfg(1, false)), false)   // success → NO probe
  assert.equal(shouldProbeIdentity({ r0: 'unknown' }, cfg(1, false)), false)     // unknown ≠ failed
  assert.equal(shouldProbeIdentity({ r0: 'failed' }, cfg(1, false)), true)       // tried + rejected → probe
  assert.equal(shouldProbeIdentity({}, cfg(0, true)), true)                      // auth required, no creds → probe
  assert.equal(shouldProbeIdentity({}, cfg(0, false)), false)                    // no auth involvement → NO probe
  assert.equal(shouldProbeIdentity({ r0: 'failed' }, cfg(1, false, 'rest-api')), false)  // non-web → NO probe
})

test('configuredIdentity reads authFlow, appType, baseUrl from the onboarding config', () => {
  const conf = configuredIdentity({
    app: { name: 'demo', baseUrl: 'https://x.test', appType: 'web-ui' },
    roles: [{ id: 'r', displayName: 'r', authFlow: 'form-login', credentialsEnvKey: 'X' }],
  } as unknown as OnboardingConfig)
  assert.deepEqual(conf, { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://x.test' })
})

// ── ADR-019 competence boundary (TD-142) ────────────────────────────────────────
test('D-a configured authType outside detector vocabulary + SUCCESSFUL observation -> inconclusive, NEVER no-divergence-detected (KEY)', () => {
  // config declares 'sso' (outside the authType detector's {form-login,none} vocabulary);
  // the probe cleanly OBSERVES 'none' (SSO page has no password field). The comparison is
  // not one the detector is competent to make → inconclusive, not no-divergence-detected.
  const r = byName(evaluateIdentitySignals(
    { authType: 'none', appType: 'web-ui', baseUrl: CONF.baseUrl },
    { ...CONF, authType: 'sso' },
  ), 'authType')
  assert.equal(r.outcome, 'inconclusive')
  assert.notEqual(r.outcome, 'no-divergence-detected')
  assert.equal(r.observed, 'none')     // the probe DID observe — competence, not observation, failed
  assert.equal(r.configured, 'sso')
})

test('D-b competence-inconclusive why names the vocabulary limitation, DISTINGUISHABLE from a probe-failure why', () => {
  const competence = byName(evaluateIdentitySignals(
    { authType: 'none', appType: 'web-ui', baseUrl: CONF.baseUrl }, { ...CONF, authType: 'sso' }), 'authType')
  const probeFail = byName(evaluateIdentitySignals(
    { authType: null, appType: 'web-ui', baseUrl: CONF.baseUrl, whys: { authType: 'authType probe failed: timeout' } }, CONF), 'authType')
  assert.match(competence.why!, /vocabulary cannot represent the configured value/i)
  assert.match(probeFail.why!, /probe failed|timeout/i)
  assert.notEqual(competence.why, probeFail.why)
  // structural discriminator: competence OBSERVED a value; probe-failure did not
  assert.notEqual(competence.observed, null)
  assert.equal(probeFail.observed, null)
})

test('D-c a configured value INSIDE the vocabulary still compares normally (gate is not a blanket inconclusive)', () => {
  const diverge = byName(evaluateIdentitySignals(
    { authType: 'none', appType: 'web-ui', baseUrl: CONF.baseUrl }, CONF), 'authType')   // config form-login (in vocab), observed none
  assert.equal(diverge.outcome, 'divergence-detected')
  const match = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: CONF.baseUrl }, CONF), 'authType')
  assert.equal(match.outcome, 'no-divergence-detected')
})

test('D-d competence-inconclusive is reflected honestly in checked/notChecked (authType not over-claimed as checked)', () => {
  const perSignal = evaluateIdentitySignals(
    { authType: 'none', appType: 'web-ui', baseUrl: CONF.baseUrl }, { ...CONF, authType: 'sso' })
  const diag = buildIdentityDivergenceDiagnostic(perSignal, 'demo')
  const checked = diag.identityDivergence!.checked
  const notChecked = diag.identityDivergence!.notChecked
  assert.ok(!checked.some(c => c.startsWith('authType')), 'authType must NOT sit in checked — it was not evaluated')
  assert.ok(notChecked.some(c => /authType/.test(c) && /cannot represent the configured value/i.test(c)),
    'notChecked must name the authType vocabulary limitation')
  assert.ok(checked.some(c => c.startsWith('appType')), 'appType WAS evaluated — stays in checked')
  assert.ok(checked.some(c => c.startsWith('baseUrl')), 'baseUrl WAS evaluated — stays in checked')
  // remedy must NOT imply the config was checked-and-sound; names the limitation + capability TD
  assert.match(diag.remedy.action, /known limitation \(see TD-144\)/)
  assert.ok(!/not explained by these signals/.test(diag.detail), 'must not imply full-coverage no-divergence')
})

test('D-e the competence gate is LIVE on a non-authType signal (appType), not bolted onto authType alone', () => {
  // configured appType 'iot' is outside the appType detector's web vocabulary — proves the
  // gate is structural for all three signals (ADR-019 2c), not authType-only.
  const r = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: CONF.baseUrl },
    { ...CONF, appType: 'iot' },
  ), 'appType')
  assert.equal(r.outcome, 'inconclusive')
  assert.notEqual(r.outcome, 'no-divergence-detected')
  assert.match(r.why!, /vocabulary cannot represent the configured value 'iot'/)
})

// ── ADR-019 axis 2 — discriminative competence (TD-146) ─────────────────────────
test('D-f baseUrl landing origin differs from configured, no evidence to distinguish base-URL-change from redirect -> inconclusive, NEVER divergence-detected (KEY)', () => {
  // observed lands on a DIFFERENT origin (an IdP, a proxy, a moved app — a single page.url()
  // cannot say which). The observation is under-determined → inconclusive, never divergence.
  const r = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://idp.example.net/login' },
    CONF), 'baseUrl')
  assert.equal(r.outcome, 'inconclusive')
  assert.notEqual(r.outcome, 'divergence-detected')
  assert.equal(r.observed, 'https://idp.example.net/login')   // the probe DID observe — axis 2, not axis 1 or an observation failure
})

test('D-g baseUrl why names the competing explanations; a genuinely matching origin still compares normally', () => {
  const under = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://idp.example.net/login' }, CONF), 'baseUrl')
  assert.match(under.why!, /does not uniquely support/i)
  assert.match(under.why!, /redirect/i)
  assert.match(under.why!, /reverse proxy/i)
  // gate is NOT a blanket inconclusive: a matching origin (path differs) still concludes no-divergence
  const match = byName(evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://app.example.com/dashboard' }, CONF), 'baseUrl')
  assert.equal(match.outcome, 'no-divergence-detected')
})

test('D-h baseUrl axis-2 inconclusive reflected honestly in the manifest + remedy (not checked; no re-onboard on its basis)', () => {
  const perSignal = evaluateIdentitySignals(
    { authType: 'form-login', appType: 'web-ui', baseUrl: 'https://idp.example.net/login' }, CONF)
  const diag = buildIdentityDivergenceDiagnostic(perSignal, 'demo')
  assert.ok(!diag.identityDivergence!.checked.some(c => c.startsWith('baseUrl')), 'baseUrl must NOT sit in checked — it was not conclusively evaluated')
  assert.ok(diag.identityDivergence!.notChecked.some(c => /baseUrl/.test(c) && /does not uniquely support|redirect/i.test(c)), 'notChecked names the baseUrl under-determination')
  assert.ok(!/re-onboard/i.test(diag.remedy.action), 'remedy must NOT instruct re-onboarding on baseUrl basis')
  assert.match(diag.remedy.action, /neither checked nor found sound/)
})
