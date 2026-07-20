/**
 * FORGE — Autonomous Quality Engineering
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * ADR-020 (TD-158) — evidence-derived confidence. These assert the RULES directly against
 * the derived producers: asymmetry (found ≠ nothing-found), 'high' unreachable from a single
 * pre-auth sample, low (looked, found nothing) distinct from unknown (could not look), every
 * graded value carries source + reason, and ModuleClassifier derives by quantity + ambiguity.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectAuthType, detectAppType } from '../src/core/onboarding/Bootstrap'
import { ModuleClassifier } from '../src/core/crawler/ModuleClassifier'
import { PageDefinition } from '../src/core/onboarding/types'

const SEL = {
  password:  'input[type="password"]',
  spaDom:    '#root, #app, [ng-version], [data-reactroot]',
  spaScript: 'script[src*="react"], script[src*="vue"], script[src*="angular"]',
  links:     'a[href]',
  forms:     'form',
}
const mockPage = (counts: Record<string, number>) => ({
  locator: (sel: string) => ({ count: async () => counts[sel] ?? 0 }),
  url: () => 'https://x.example.com',
}) as any
const noSettle = { settle: async () => {} } as any

// ── ADR-020 §2: ASYMMETRY — found vs nothing-found differ in grade AND in source ──
test('A1 authType: a found signal vs a nothing-found produce DIFFERENT grades AND DIFFERENT sources', async () => {
  const found    = await detectAuthType(mockPage({ [SEL.password]: 1 }), noSettle)
  const notFound = await detectAuthType(mockPage({ [SEL.password]: 0 }), noSettle)
  assert.notEqual(found.confidence, notFound.confidence)   // medium vs low — never mirror images
  assert.notEqual(found.source, notFound.source)
  assert.equal(found.source, 'evidence-matched')
  assert.equal(notFound.source, 'default-fallback')
})

test('A2 appType: a found marker vs a nothing-found produce DIFFERENT grades AND DIFFERENT sources', async () => {
  const spa    = await detectAppType(mockPage({ [SEL.spaDom]: 1 }))
  const noneOf = await detectAppType(mockPage({}))
  assert.notEqual(spa.confidence, noneOf.confidence)
  assert.equal(spa.source, 'evidence-matched')
  assert.equal(noneOf.source, 'default-fallback')
})

// ── ADR-020 §4: 'high' UNREACHABLE from a single pre-auth sample ──
test("A3 no single pre-auth detector returns 'high' — a positive signal caps at medium", async () => {
  const auth = await detectAuthType(mockPage({ [SEL.password]: 3 }), noSettle)
  const app  = await detectAppType(mockPage({ [SEL.spaDom]: 2, [SEL.spaScript]: 1 }))
  assert.notEqual(auth.confidence, 'high'); assert.equal(auth.confidence, 'medium')
  assert.notEqual(app.confidence, 'high');  assert.equal(app.confidence, 'medium')
})

// ── ADR-020 §5: low (looked, found nothing) is distinct from unknown (could not look) ──
test('A4 an absence after a SUCCESSFUL observation is low, never unknown', async () => {
  const r = await detectAuthType(mockPage({ [SEL.password]: 0 }), noSettle)
  assert.equal(r.confidence, 'low')          // successful zero-signal observation → low…
  assert.notEqual(r.confidence, 'unknown')   // …not 'unknown', which is reserved for a FAILED observation
})

// ── ADR-020 §6: every graded value carries a non-empty source and reason ──
test('A5 every derived detection carries a non-empty source and reason', async () => {
  const fields = [
    await detectAuthType(mockPage({ [SEL.password]: 1 }), noSettle),
    await detectAuthType(mockPage({ [SEL.password]: 0 }), noSettle),
    await detectAppType(mockPage({ [SEL.spaDom]: 1 })),
    await detectAppType(mockPage({ [SEL.links]: 9, [SEL.forms]: 1 })),
    await detectAppType(mockPage({})),
  ]
  for (const f of fields) {
    assert.ok((f.source ?? '').length > 0, `source empty for value '${f.value}'`)
    assert.ok((f.reason ?? '').length > 0, `reason empty for value '${f.value}'`)
  }
})

// ── Part 2: ModuleClassifier derives by QUANTITY and AMBIGUITY, never a literal ──
const mpage = (id: string, urlPattern: string): PageDefinition => ({ id, urlPattern } as any)

test('A6 ModuleClassifier: a single-token match (medium) and a two-token match (high) differ — quantity', () => {
  const c = new ModuleClassifier()
  assert.equal(c.classify(mpage('a', '/cart')).confidence, 'medium')       // 1 token: 'cart'
  assert.equal(c.classify(mpage('b', '/auth/login')).confidence, 'high')   // 2 tokens: 'auth' + 'login'
})

test('A7 ModuleClassifier: a URL matching multiple modules is AMBIGUOUS → low, competitors named', () => {
  const c = new ModuleClassifier()
  const a = c.classify(mpage('x', '/account/cart'))   // hits Cart AND Account
  assert.equal(a.confidence, 'low')
  assert.equal(a.source, 'evidence-matched')
  assert.match(a.reason ?? '', /ambiguous/i)
})
