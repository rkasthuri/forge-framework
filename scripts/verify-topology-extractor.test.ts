/**
 * FORGE — Autonomous Quality Engineering
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * TD-013 Phase 3 (Block 2b) — CrawlTopology extractor tests (pure, fixture AppModel).
 *   E1 observed flow step   → transition.grounding 'observed' (inherited 1:1)
 *   E2 inferred flow step   → 'inferred' (NO promotion — honesty guard)
 *   E3 grounding undefined  → 'inferred' (never 'observed' on absent evidence)
 *   E4 pages null + flows null → empty topology, no throw
 *   E5 element selector resolves via the reused EmitHelper builder (real selector, not id)
 *   E6 source === 'app-model'
 *   E7 bootstrap PageSignals → 1 page, 0 transitions, source 'live-page' (degenerate)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AppModel, ElementDefinition, FlowStep } from '../src/core/onboarding/types'
import { PageSignals } from '../src/core/agent/GoalSynthesizer'
import { topologyFromAppModel, topologyFromPageSignals } from '../src/core/agent/TopologyExtractor'

// ── minimal fixture builders (only the fields the extractor reads) ───────────────
const elem = (): ElementDefinition => ({
  id: 'p1:login', name: 'login', kind: 'button', label: 'Login', critical: true,
  aiNamed: false, strategies: [{ type: 'data-test', value: 'login-button', confidence: 1 }],
  tier3Assertions: [],
} as unknown as ElementDefinition)

const step = (grounding?: 'observed' | 'inferred'): FlowStep => ({
  stepIndex: 0, pageId: 'p1', action: 'click', elementId: 'p1:login',
  targetPageId: 'p2', value: null, ...(grounding ? { grounding } : {}),
})

const model = (pages: unknown, steps: FlowStep[] | null): AppModel => ({
  app: { name: 'demo', baseUrl: 'https://demo.test', appType: 'web' },
  pages,
  flows: steps === null ? null : [{ id: 'f1', displayName: 'F1', steps, roleId: 'r',
    confidence: 'high', source: 'crawl', linkedApiEndpointIds: [] }],
} as unknown as AppModel)

const twoPages = [
  { id: 'p1', urlPattern: '/p1', displayName: 'P1', isAuthPage: false, elements: [elem()] },
  { id: 'p2', urlPattern: '/p2', displayName: 'P2', isAuthPage: false, elements: [] },
]

test('E1 observed flow step -> transition.grounding observed (inherited 1:1)', () => {
  const topo = topologyFromAppModel(model(twoPages, [step('observed')]))
  assert.equal(topo.pages.length, 2)
  assert.equal(topo.transitions.length, 1)
  assert.equal(topo.transitions[0].grounding, 'observed')
  assert.equal(topo.transitions[0].fromPageId, 'p1')
  assert.equal(topo.transitions[0].toPageId, 'p2')
})

test('E2 inferred flow step -> inferred (NO promotion)', () => {
  const topo = topologyFromAppModel(model(twoPages, [step('inferred')]))
  assert.equal(topo.transitions[0].grounding, 'inferred')
})

test('E3 grounding undefined -> inferred (never observed on absent evidence)', () => {
  const topo = topologyFromAppModel(model(twoPages, [step(undefined)]))
  assert.equal(topo.transitions[0].grounding, 'inferred')
})

test('E4 pages null + flows null -> empty topology, no throw', () => {
  const topo = topologyFromAppModel(model(null, null))
  assert.deepEqual(topo.pages, [])
  assert.deepEqual(topo.transitions, [])
})

test('E5 element selector resolves via reused builder (real selector, not element-id)', () => {
  const topo = topologyFromAppModel(model(twoPages, [step('observed')]))
  const el = topo.pages[0].elements[0]
  assert.equal(el.selector, '[data-test="login-button"]')
  assert.notEqual(el.selector, el.id)   // resolved selector, NOT the raw element-id
})

test('E6 source === app-model', () => {
  const topo = topologyFromAppModel(model(twoPages, [step('observed')]))
  assert.equal(topo.source, 'app-model')
})

test('E7 bootstrap PageSignals -> 1 page, 0 transitions, source live-page', () => {
  const signals: PageSignals = {
    navLinks: [{ text: 'Home', href: '/' }], buttonTexts: ['Login'],
    formPresence: true, currentUrl: 'https://demo.test/login', pageTitle: 'Login',
  }
  const topo = topologyFromPageSignals(signals)
  assert.equal(topo.pages.length, 1)
  assert.equal(topo.transitions.length, 0)
  assert.equal(topo.source, 'live-page')
  assert.equal(topo.pages[0].id, 'https://demo.test/login')
})
