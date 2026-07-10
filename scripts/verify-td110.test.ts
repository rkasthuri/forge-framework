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
 * TD-110 — proof tests (ObservationSettlingPolicy, hydration-aware
 * detectAuthType, observation-driven authType correction).
 *
 * node:test + node:assert/strict under tsx. Pure in-memory — the Playwright
 * Page is faked with minimal structural mocks (only the methods each policy/
 * detector actually calls); the full live path is Step 6's E2E proof.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ObservationSettlingPolicy, DomcontentloadedPolicy, WaitForSelectorPolicy,
  NetworkIdlePolicy, ComposedPolicy,
} from '../src/core/onboarding/ObservationSettlingPolicy'
import { detectAuthType, applyAuthTypeObservation, BootstrapDetection } from '../src/core/onboarding/Bootstrap'
import { DEFAULT_SETTLING_POLICY } from '../src/core/onboarding/ObservationSettlingPolicy'

// ── fake pages (structural — only what each consumer calls) ───────────────────

/** A page whose password field exists from the start (static HTML app). */
function staticPage(passwordFields: number) {
  return {
    waitForSelector: async () => ({}),
    waitForLoadState: async () => {},
    locator: (_sel: string) => ({ count: async () => passwordFields }),
  } as any
}

/** A page that "hydrates" its password field only when settle() awaits it. */
function hydratingPage() {
  let hydrated = false
  return {
    waitForSelector: async () => { hydrated = true; return {} },   // evidence appears on wait
    locator: (_sel: string) => ({ count: async () => (hydrated ? 1 : 0) }),
  } as any
}

/** A page that never grows the selector — waitForSelector times out (rejects). */
function barePage() {
  return {
    waitForSelector: async () => { throw new Error('Timeout 3000ms exceeded') },
    waitForLoadState: async () => { throw new Error('Timeout exceeded') },
    locator: (_sel: string) => ({ count: async () => 0 }),
  } as any
}

function detectionWith(authType: BootstrapDetection['authType']): BootstrapDetection {
  const f = (v: string) => ({ value: v, confidence: 'high' as const, source: 'test' })
  return { appName: f('app'), appType: f('spa'), crawlStrategy: f('auto'), authType, loginUrl: { value: null, confidence: 'medium', source: 'test' }, baseUrl: f('https://x') }
}

// ── T1-T5: settling policies ──────────────────────────────────────────────────

test('T1 DomcontentloadedPolicy: no-op, resolves immediately (never touches the page)', async () => {
  const trap = new Proxy({}, { get() { throw new Error('page must not be touched') } })
  await new DomcontentloadedPolicy().settle(trap as any)   // would throw if it touched anything
})

test('T2 WaitForSelectorPolicy: settles when the selector appears', async () => {
  let waited = false
  const page = { waitForSelector: async (sel: string) => { waited = true; assert.equal(sel, 'input[type="password"]'); return {} } } as any
  await new WaitForSelectorPolicy('input[type="password"]', 3000).settle(page)
  assert.equal(waited, true)
})

test('T3 WaitForSelectorPolicy: timeout logs and does NOT throw', async () => {
  const logs: string[] = []
  const origLog = console.log
  console.log = (...a: any[]) => { logs.push(a.join(' ')) }
  try {
    await new WaitForSelectorPolicy('input[type="password"]', 10).settle(barePage())   // must not throw
    assert.ok(logs.some(l => l.includes('not found within')), `timeout warning not logged: ${JSON.stringify(logs)}`)
  } finally { console.log = origLog }
})

test('T4 NetworkIdlePolicy: resolves on networkidle (and tolerates timeout without throwing)', async () => {
  let state = ''
  const page = { waitForLoadState: async (s: string) => { state = s } } as any
  await new NetworkIdlePolicy(5000).settle(page)
  assert.equal(state, 'networkidle')
  await new NetworkIdlePolicy(10).settle(barePage())   // timeout path — must not throw
})

test('T5 ComposedPolicy: runs all policies in sequence', async () => {
  const order: string[] = []
  const mk = (name: string): ObservationSettlingPolicy => ({ settle: async () => { order.push(name) } })
  await new ComposedPolicy([mk('one'), mk('two'), mk('three')]).settle({} as any)
  assert.deepEqual(order, ['one', 'two', 'three'])
})

// ── T6-T8: hydration-aware detectAuthType ─────────────────────────────────────

test('T6 DEFAULT policy + static password field → form-login/high (fixture behavior preserved)', async () => {
  const r = await detectAuthType(staticPage(1), DEFAULT_SETTLING_POLICY)
  assert.deepEqual(r, { value: 'form-login', confidence: 'high', source: 'password-field-count' })
})

test('T7 THE FIX: field appears only after settling → form-login (was misdetected none)', async () => {
  // Contrast on fresh hydrating pages: the pre-fix path (no settling) reads
  // the unhydrated 0 → none; the settled path waits for evidence → form-login.
  const unsettled = await detectAuthType(hydratingPage(), DEFAULT_SETTLING_POLICY)
  assert.equal(unsettled.value, 'none', 'pre-fix path should still read the unhydrated 0')
  const settled = await detectAuthType(hydratingPage(), new WaitForSelectorPolicy('input[type="password"]', 3000))
  assert.equal(settled.value, 'form-login')
  assert.equal(settled.confidence, 'high')
})

test('T8 no password field even after timeout → none (honest: the form genuinely does not exist)', async () => {
  const r = await detectAuthType(barePage(), new WaitForSelectorPolicy('input[type="password"]', 10))
  assert.equal(r.value, 'none')
  assert.equal(r.confidence, 'medium')   // absence stays weaker evidence than presence
})

// ── T9-T10: Fix 2 — observation corrects authType; outcome stays independent ──

test('T9 observed login control corrects authType none → form-login/medium', () => {
  const d = detectionWith({ value: 'none', confidence: 'medium', source: 'password-field-count' })
  const corrected = applyAuthTypeObservation(d, true)
  assert.equal(corrected, true)
  assert.deepEqual(d.authType, {
    value: 'form-login', confidence: 'medium', source: 'agent-observation:login-control-seen',
  })
})

test('T9b no observation → no correction; existing form-login/high → never touched (no downgrade)', () => {
  const none = detectionWith({ value: 'none', confidence: 'medium', source: 'password-field-count' })
  assert.equal(applyAuthTypeObservation(none, false), false)
  assert.equal(none.authType.value, 'none')

  const high = detectionWith({ value: 'form-login', confidence: 'high', source: 'password-field-count' })
  assert.equal(applyAuthTypeObservation(high, true), false)
  assert.deepEqual(high.authType, { value: 'form-login', confidence: 'high', source: 'password-field-count' })
})

test('T10 independence: observation grants MEDIUM only — high still requires goal achievement', () => {
  // The observation path (authType fact) must not manufacture the result-level
  // confidence: a corrected detection sits at medium; 'high' comes only from
  // the achieved-goal upgrade in runAgentPhase (authOutcome's side of the wall).
  const d = detectionWith({ value: 'none', confidence: 'medium', source: 'password-field-count' })
  applyAuthTypeObservation(d, true)
  assert.equal(d.authType.confidence, 'medium')
  assert.notEqual(d.authType.confidence, 'high')
})
