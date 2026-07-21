/**
 * FORGE — Autonomous Quality Engineering
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Ground-truth harness — pure logic (fixture validation with REQUIRED basis, staleness,
 * assertion matching, the four distinct outcomes) + the Ruling-1 structural `signals`
 * population on detection. No network; the live runner is scripts/ground-truth-check.ts.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'fs'
import * as path from 'path'
import {
  validateFixture, isStale, evaluateAssertion, buildObservation, gradeFixture, resolvePath,
  GroundTruthFixture, Assertion,
} from '../src/core/ground-truth/GroundTruth'
import { detectRenderingModel, detectAuthType } from '../src/core/onboarding/Bootstrap'

const DAY = 86_400_000
const A = (over: Partial<Assertion> & { field: string; assert: Assertion['assert'] }): Assertion =>
  ({ basis: 'a stated reason', ...over } as Assertion)
const FX = (over: Partial<GroundTruthFixture> = {}): GroundTruthFixture => ({
  schemaVersion: 1, app: 'x', url: 'https://x', verifiedBy: 'Raj', verifiedOn: '2026-07-21',
  staleAfterDays: 90, expected: [A({ field: 'renderingModel', assert: 'equals', value: 'framework-rendered' })], ...over,
})

// ── basis is REQUIRED (ADR-015) ───────────────────────────────────────────────
test('G1 an assertion without a basis is INVALID (answer key needs stated reasoning)', () => {
  const errs = validateFixture(FX({ expected: [{ field: 'renderingModel', assert: 'equals', value: 'framework-rendered' } as any] }))
  assert.ok(errs.some(e => /basis/i.test(e)), 'missing basis must be flagged')
})

test('G2 an unfilled template (null verifiedBy, empty expected) is INVALID/UNFILLED', () => {
  const errs = validateFixture(FX({ verifiedBy: null, verifiedOn: null, expected: [] }))
  assert.ok(errs.some(e => /verifiedBy/i.test(e)))
  assert.ok(errs.some(e => /empty|no assertions/i.test(e)))
})

test('G3 a complete fixture with bases validates clean', () => {
  assert.deepEqual(validateFixture(FX()), [])
})

// ── staleness ─────────────────────────────────────────────────────────────────
test('G4 staleness: fresh passes, past-horizon is stale, unparseable date is stale', () => {
  const now = Date.parse('2026-07-21')
  assert.equal(isStale(FX({ verifiedOn: '2026-07-01' }), now), false)              // 20d < 90d
  assert.equal(isStale(FX({ verifiedOn: '2026-01-01' }), now), true)               // >90d
  assert.equal(isStale(FX({ verifiedOn: 'not-a-date' }), now), true)               // unparseable → re-verify
  assert.equal(isStale(FX({ verifiedOn: null }), now), true)
})

// ── assertion types ────────────────────────────────────────────────────────────
test('G5 evaluateAssertion — every type matches the right way', () => {
  assert.equal(evaluateAssertion(A({ field: 'renderingModel', assert: 'equals', value: 'framework-rendered' }), 'framework-rendered').pass, true)
  assert.equal(evaluateAssertion(A({ field: 'renderingModel', assert: 'equals', value: 'framework-rendered' }), 'static-rendered').pass, false)
  assert.equal(evaluateAssertion(A({ field: 'renderingModel', assert: 'notEquals', value: 'static-rendered' }), 'framework-rendered').pass, true)   // known-wrong guard
  assert.equal(evaluateAssertion(A({ field: 'renderingModel', assert: 'notEquals', value: 'static-rendered' }), 'static-rendered').pass, false)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'oneOf', values: ['bfs', 'hybrid'] }), 'bfs').pass, true)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'oneOf', values: ['bfs', 'hybrid'] }), 'spa').pass, false)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'atLeast', value: 100 }), 376).pass, true)                       // TD-162 guard
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'atLeast', value: 100 }), 0).pass, false)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'atMost', value: 5 }), 3).pass, true)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'present', value: undefined }), 1).pass, true)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'present', value: undefined }), 0).pass, false)
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'absent', value: undefined }), 0).pass, true)
})

test('G6 atLeast against an UNMEASURED (null) signal does not pass — never reads null as a count', () => {
  assert.equal(evaluateAssertion(A({ field: 'x', assert: 'atLeast', value: 1 }), null).pass, false)
})

// ── buildObservation + resolvePath ──────────────────────────────────────────────
test('G7 buildObservation flattens values + merges signals; grades are NOT surfaced', () => {
  const detection = {
    renderingModel: { value: 'framework-rendered', confidence: 'medium', source: 'evidence-matched', reason: 'r', signals: { frameworkMountPointCount: 1, frameworkScriptCount: 0, rawDomAnchorCount: 9, formCount: 1 } },
    authType: { value: 'none', confidence: 'low', signals: { passwordFieldCount: 0 } },
    crawlStrategy: { value: 'bfs', confidence: 'low', signals: { sameOriginNavigableLinkCount: 0, jsClickableCount: 0 } },
    appName: { value: 'x' }, baseUrl: { value: 'https://x' }, loginUrl: { value: null },
  }
  const obs = buildObservation(detection)
  assert.equal(obs.renderingModel, 'framework-rendered')
  assert.equal(resolvePath(obs, 'signals.rawDomAnchorCount'), 9)
  assert.equal(resolvePath(obs, 'signals.passwordFieldCount'), 0)
  assert.equal(resolvePath(obs, 'signals.sameOriginNavigableLinkCount'), 0)
  assert.equal((obs as any).confidence, undefined, 'grades must NOT be surfaced for assertion')
})

// ── the four distinct outcomes ───────────────────────────────────────────────────
test('G8 gradeFixture keeps the four outcomes distinct', () => {
  const now = Date.parse('2026-07-21')
  const obs = { renderingModel: 'framework-rendered', signals: {} }
  assert.equal(gradeFixture(FX({ verifiedBy: null, expected: [] }), obs, now).outcome, 'INVALID')
  assert.equal(gradeFixture(FX({ verifiedOn: '2026-01-01' }), obs, now).outcome, 'STALE')
  assert.equal(gradeFixture(FX(), null, now).outcome, 'UNREACHABLE')
  assert.equal(gradeFixture(FX(), obs, now).outcome, 'PASS')
  assert.equal(gradeFixture(FX({ expected: [A({ field: 'renderingModel', assert: 'equals', value: 'static-rendered' })] }), obs, now).outcome, 'MISMATCH')
})

// ── the shipped empty fixtures are UNFILLED until Raj fills them ──────────────────
test('G9 the on-disk saucedemo/wikipedia fixtures are UNFILLED (INVALID) — no invented values', () => {
  const dir = path.resolve(process.cwd(), 'fixtures', 'ground-truth')
  for (const app of ['saucedemo', 'wikipedia']) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, `${app}.json`), 'utf-8'))
    assert.ok(validateFixture(fx).length > 0, `${app} must report UNFILLED until Raj fills it`)
  }
})

// ── Ruling 1: detection attaches structured signals ──────────────────────────────
const SEL = { password: 'input[type="password"]', spaDom: '#root, #app, [ng-version], [data-reactroot]',
  spaScript: 'script[src*="react"], script[src*="vue"], script[src*="angular"]', links: 'a[href]', forms: 'form' }
const mockPage = (counts: Record<string, number>) => ({ locator: (s: string) => ({ count: async () => counts[s] ?? 0 }), url: () => 'https://x' }) as any
const noSettle = { settle: async () => {} } as any

test('G10 detectRenderingModel attaches definition-carrying signals on every branch (ADR-021 §2)', async () => {
  const framework = await detectRenderingModel(mockPage({ [SEL.spaDom]: 1, [SEL.links]: 9, [SEL.forms]: 1 }))
  assert.deepEqual(framework.signals, { frameworkMountPointCount: 1, frameworkScriptCount: 0, rawDomAnchorCount: 9, formCount: 1 })   // measured even on the framework branch
  const fallback = await detectRenderingModel(mockPage({}))
  assert.deepEqual(fallback.signals, { frameworkMountPointCount: 0, frameworkScriptCount: 0, rawDomAnchorCount: 0, formCount: 0 })
})

test('G11 detectAuthType attaches signals { passwordFieldCount }', async () => {
  const found = await detectAuthType(mockPage({ [SEL.password]: 2 }), noSettle)
  assert.deepEqual(found.signals, { passwordFieldCount: 2 })
  const none = await detectAuthType(mockPage({ [SEL.password]: 0 }), noSettle)
  assert.deepEqual(none.signals, { passwordFieldCount: 0 })
})
