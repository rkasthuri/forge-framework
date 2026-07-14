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
 * TC-04 regression (2026-07-13) — FORGE must REFUSE to generate/verify against an
 * app it never explored. Onboard's bootstrap persists a contentless model (0
 * pages/flows/endpoints) with crawledAt set, so the null-only guard let generation
 * "succeed" with a lone fixtures file. This is an honesty-floor bug and ships proven.
 * node:test under tsx.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { modelHasContent } from '../src/core/onboarding/ModelValidator'
import { GeneratorRunner } from '../src/core/onboarding/GeneratorRunner'
import { VerificationRunner } from '../src/core/onboarding/VerificationRunner'
import { EmptyModelError, ModelNotFoundError } from '../src/core/errors/OperatorFacingError'
import { JobRunner } from '../forge-ui/server/jobs/JobRunner'
import type { AppModel } from '../src/core/onboarding/types'
import type { Workspace } from '../src/core/workspace/WorkspaceManager'

const appShell = (appType: string) => ({
  name: 'x', displayName: 'X', baseUrl: 'https://x.example.com', appType,
  modelVersion: '1.0.0', spaConfig: null,
  evidenceState: 'crawled-empty',
  crawlMetadata: {
    crawlConfigHash: 'sha256:x', crawledAt: '2026-07-13T00:00:00.000Z', crawledBy: 'agent',
    crawlDurationMs: 1, pagesBudget: 0, pagesDiscovered: 0, pagesSkipped: 0,
    aiBudgetStatus: 'within-budget', crawlDiagnostics: null,
  },
})
const emptyUiModel = (): AppModel => ({
  schemaVersion: '1.0', generatedAt: '2026-07-13T00:00:00.000Z', generatedBy: 'agent',
  app: appShell('web-ui'), roles: [], pages: [], flows: [], endpoints: null, api: null, diff: null,
} as unknown as AppModel)
const apiModel = (): AppModel => ({
  schemaVersion: '1.0', generatedAt: '2026-07-13T00:00:00.000Z', generatedBy: 'agent',
  app: appShell('rest-api'), roles: [], pages: null, flows: [],
  endpoints: [{ method: 'GET', path: '/ping', summary: 'HealthCheck', auth: false }],
  api: null, diff: null,
} as unknown as AppModel)

// A SCHEMA-VALID empty model (mirrors the real test-nomodel bootstrap output) for
// the on-disk paths that Ajv-validate (VerificationRunner's loadAppModel).
const schemaValidEmpty = (name: string) => ({
  schemaVersion: '2.0', generatedAt: '2026-07-13T18:05:24.200Z', generatedBy: 'human',
  app: {
    name, displayName: name, baseUrl: 'https://the-internet.herokuapp.com',
    appType: 'web-ui', modelVersion: '1.0.0', spaConfig: null,
    evidenceState: 'crawled-empty',
    crawlMetadata: {
      crawlConfigHash: 'sha256:b3b7a8e34e79190e',
      crawledAt: '2026-07-13T18:05:24.200Z', crawledBy: 'human', crawlDurationMs: 2855,
      pagesBudget: 50, pagesDiscovered: 0, pagesSkipped: 0,
      aiBudgetStatus: 'within-budget', crawlDiagnostics: null,
    },
  },
  roles: [], pages: [], flows: [], endpoints: null, api: null, diff: null,
  classificationRunId: '2026-07-13T18-05-21',
})

/** Fake workspace whose loadModel returns `model`; all writes are no-ops. */
function mockWs(model: unknown): Workspace {
  return {
    root: 'C:/fake', forgeDir: 'C:/fake/.forge', testsDir: 'C:/fake/tests', reportsDir: 'C:/fake/reports',
    dbPath: () => 'C:/fake/.forge/forge.db',
    loadProjectManifest: async () => null, saveProjectManifest: async () => {},
    loadConfig: async () => null, saveConfig: async () => {},
    saveBootstrapManifest: async () => {}, saveBootstrapEvidence: async () => {},
    saveGenerationManifest: async () => {},
    loadMemory: async () => null, saveMemory: async () => {},
    writeTests: async () => {}, writeTestsFile: async () => {},
    loadModel: async () => model, saveModel: async () => {}, saveReport: async () => {},
  } as unknown as Workspace
}

// ── modelHasContent predicate (the guard logic) ─────────────────────────────────

test('G1 modelHasContent: 0 pages / 0 flows / 0 endpoints → false', () => {
  assert.equal(modelHasContent(emptyUiModel()), false)
})
test('G2 modelHasContent: pages present → true', () => {
  assert.equal(modelHasContent({ pages: [{}], flows: [], endpoints: null } as unknown as AppModel), true)
})
test('G3 modelHasContent: flows present → true', () => {
  assert.equal(modelHasContent({ pages: [], flows: [{}], endpoints: null } as unknown as AppModel), true)
})
test('G4 modelHasContent: API (0 pages, N endpoints) → true (guard must NOT become pages-only)', () => {
  assert.equal(modelHasContent(apiModel()), true)
})

// ── GeneratorRunner guard ───────────────────────────────────────────────────────

test('G5 generate against an EMPTY model → EmptyModelError (MODEL_EMPTY)', async () => {
  await assert.rejects(
    () => new GeneratorRunner().generate('emptyapp', mockWs(emptyUiModel())),
    (err: unknown) => err instanceof EmptyModelError && err.code === 'MODEL_EMPTY',
  )
})

test('G6 generate against a NULL model → ModelNotFoundError (existing rail intact)', async () => {
  await assert.rejects(
    () => new GeneratorRunner().generate('nullapp', mockWs(null)),
    (err: unknown) => err instanceof ModelNotFoundError && err.code === 'MODEL_NOT_FOUND',
  )
})

test('G7 generate against an API model (0 pages, N endpoints) → SUCCEEDS (not rejected as empty)', async () => {
  const manifest = await new GeneratorRunner().generate('apiapp', mockWs(apiModel()))
  assert.ok(manifest && typeof manifest === 'object', 'expected a manifest, not void/throw')
  assert.equal((manifest as { appName: string }).appName, 'apiapp')
})

// ── End-to-end: EmptyModelError reaches the Mission Timeline ─────────────────────

test('G8 END-TO-END: EmptyModelError message reaches the Timeline lines[]', async () => {
  const appName = 'zzz-emptymodel-guard-proof'
  const root = path.join(os.homedir(), '.forge-projects', appName)
  const modelDir = path.join(root, 'models', appName)
  const jr = new JobRunner()
  try {
    fs.rmSync(root, { recursive: true, force: true })
    fs.mkdirSync(modelDir, { recursive: true })
    fs.writeFileSync(path.join(modelDir, 'app-model.json'), JSON.stringify(schemaValidEmpty(appName)), 'utf-8')

    await jr.submit({ jobId: 'g8-empty', type: 'generate', appName, options: {} })
    const status = jr.getStatus('g8-empty')
    assert.ok(status)
    assert.equal(status!.status, 'failed')
    assert.equal(
      status!.error,
      `'${appName}' has been onboarded but never crawled — the model contains 0 pages, 0 flows, and 0 endpoints. Run a crawl before generating tests.`,
    )
    assert.ok(
      status!.lines.some(l => l.includes('⛔') && l.includes('onboarded but never crawled')),
      `EmptyModelError missing from Timeline lines[] — lines: ${JSON.stringify(status!.lines)}`,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ── VerificationRunner guard ────────────────────────────────────────────────────

test('G9 verify against an EMPTY model → refuses (EmptyModelError), no report emitted', async () => {
  const appName = 'zzz-emptymodel-verify-proof'
  const modelDir = path.resolve('models', appName)   // loadAppModel reads cwd/models/<app>/
  try {
    fs.mkdirSync(modelDir, { recursive: true })
    fs.writeFileSync(path.join(modelDir, 'app-model.json'), JSON.stringify(schemaValidEmpty(appName)), 'utf-8')
    await assert.rejects(
      () => new VerificationRunner(appName).run(),
      (err: unknown) => err instanceof EmptyModelError && err.code === 'MODEL_EMPTY',
    )
  } finally {
    fs.rmSync(modelDir, { recursive: true, force: true })
  }
})
