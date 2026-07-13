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
 * TD-121 + Generator workspace routing — proof tests.
 *
 * node:test + node:assert/strict under tsx (auto-covered by `npm run test:unit`).
 *
 * Approach notes:
 *  - modelsDir/authStateDir are private by design — asserted via (x as any),
 *    the standard pattern for path-scoping proofs.
 *  - T5/T6 (CrawlRunner wiring) are SOURCE-LEVEL assertions: CrawlRunner
 *    constructs the Crawler inside run(), which needs a live URL + browser —
 *    same grep-proof pattern as TD-114's T11.
 *  - T11 spawns the real CLI in an empty temp dir (the honest error-path test).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { Crawler } from '../src/core/onboarding/Crawler'
import { ApiSpecCrawler } from '../src/core/onboarding/ApiSpecCrawler'
import { AuthManager } from '../src/core/onboarding/AuthManager'
import { GeneratorRunner } from '../src/core/onboarding/GeneratorRunner'
import { createWorkspace, Workspace } from '../src/core/workspace/WorkspaceManager'
import { OnboardingConfig } from '../src/core/onboarding/types'

const REPO_ROOT = path.resolve(__dirname, '..')

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'td121-'))
}

const CONFIG: OnboardingConfig = {
  app: { name: 'testapp', baseUrl: 'https://example.com', appType: 'web-ui' },
  roles: [],
}

// ── T1-T4: path-scoping defaults + overrides ──────────────────────────────────

test('T1 Crawler without opts → modelsDir/authStateDir default to cwd (fixture behavior)', () => {
  const c = new Crawler(CONFIG) as any
  assert.equal(c.modelsDir, path.resolve('models'))
  assert.equal(c.authStateDir, path.resolve('.auth'))
})

test('T2 Crawler with opts → provided dirs win (and ApiSpecCrawler mirrors the pattern)', () => {
  const c = new Crawler(CONFIG, { modelsDir: 'C:/x/models', authStateDir: 'C:/x/.forge/auth' }) as any
  assert.equal(c.modelsDir, 'C:/x/models')
  assert.equal(c.authStateDir, 'C:/x/.forge/auth')
  const a = new ApiSpecCrawler(CONFIG, { modelsDir: 'C:/y/models' }) as any
  assert.equal(a.modelsDir, 'C:/y/models')
  assert.equal((new ApiSpecCrawler(CONFIG) as any).modelsDir, path.resolve('models'))
})

test('T3 AuthManager without opts → authStateDir defaults to cwd/.auth', () => {
  assert.equal((new AuthManager(CONFIG) as any).authStateDir, path.resolve('.auth'))
})

test('T4 AuthManager with opts → session state path uses the provided dir', () => {
  assert.equal((new AuthManager(CONFIG, { authStateDir: 'C:/w/.forge/auth' }) as any).authStateDir, 'C:/w/.forge/auth')
})

// ── T5-T6: CrawlRunner wiring (source-level — run() needs a live crawl) ───────

test('T5 CrawlRunner passes workspace.root/models as modelsDir', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src/core/runner/CrawlRunner.ts'), 'utf-8')
  assert.match(src, /modelsDir:\s*path\.join\(workspace\.root,\s*'models'\)/)
})

test('T6 CrawlRunner passes workspace.forgeDir/auth as authStateDir (inside .forge/)', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src/core/runner/CrawlRunner.ts'), 'utf-8')
  assert.match(src, /authStateDir:\s*path\.join\(workspace\.forgeDir,\s*'auth'\)/)
})

// ── T7-T9: Workspace additions ────────────────────────────────────────────────

test('T7 workspace.loadModel() returns null when missing', async () => {
  const root = tempRoot()
  try {
    assert.equal(await createWorkspace(root).loadModel('nope'), null)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('T8 workspace.loadModel() returns the parsed model when present', async () => {
  const root = tempRoot()
  try {
    const dir = path.join(root, 'models', 'myapp')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'app-model.json'), JSON.stringify({ app: { name: 'myapp' } }), 'utf-8')
    const model = await createWorkspace(root).loadModel('myapp') as any
    assert.equal(model.app.name, 'myapp')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('T9 workspace.writeTestsFile() writes to tests/ ROOT (no module segment)', async () => {
  const root = tempRoot()
  try {
    const ws = createWorkspace(root)
    await ws.writeTestsFile('fixtures.generated.ts', '// fixtures')
    assert.equal(fs.readFileSync(path.join(root, 'tests', 'fixtures.generated.ts'), 'utf-8'), '// fixtures')
    // traversal still guarded
    await assert.rejects(() => ws.writeTestsFile('../escape.ts', ''), /Invalid filename/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

// ── T10: GeneratorRunner routing ──────────────────────────────────────────────

test('T10 generate(app, workspace) routes through workspace.writeTests*/loadModel (spy)', async () => {
  const calls: Array<{ kind: string; args: string[] }> = []
  const minimalModel = {
    modelVersion: '1.0.0',
    app: { name: 'spyapp', baseUrl: 'https://example.com', appType: 'web-ui' },
    roles: [], pages: [], flows: [],
  }
  // Fake workspace — records routing calls; loadModel returns the minimal model.
  const fake = {
    root: 'C:/fake', forgeDir: 'C:/fake/.forge', testsDir: 'C:/fake/tests', reportsDir: 'C:/fake/reports',
    dbPath: () => 'C:/fake/.forge/forge.db',
    loadProjectManifest: async () => null, saveProjectManifest: async () => {},
    loadConfig: async () => null, saveConfig: async () => {},
    saveBootstrapManifest: async () => {}, saveBootstrapEvidence: async () => {},
    saveGenerationManifest: async () => {},
    loadMemory: async () => null, saveMemory: async () => {},
    writeTests: async (module: string, filename: string) => { calls.push({ kind: 'writeTests', args: [module, filename] }) },
    writeTestsFile: async (filename: string) => { calls.push({ kind: 'writeTestsFile', args: [filename] }) },
    loadModel: async () => minimalModel,
    saveReport: async () => {},
  } as unknown as Workspace

  await new GeneratorRunner().generate('spyapp', fake)
  // FixtureGenerator always emits fixtures.generated.ts → must be routed to the tests/ ROOT.
  assert.ok(
    calls.some(c => c.kind === 'writeTestsFile' && c.args[0] === 'fixtures.generated.ts'),
    `fixtures.generated.ts not routed via writeTestsFile — calls: ${JSON.stringify(calls)}`,
  )
  // Nothing may bypass the workspace: zero direct src/apps writes is implied by
  // the fake (no fs paths available) + T11's fixture-path contrast below.
})

test('T10b generate(app) WITHOUT workspace takes the fixture path (loadAppModel, cwd models/)', async () => {
  // The fixture path reads cwd models/<app>/app-model.json via loadAppModel and
  // throws its distinctive error for an unknown app — proving the branch.
  await assert.rejects(
    () => new GeneratorRunner().generate('no-such-app-xyz'),
    /App model not found/,
  )
})

// ── T11: CLI standalone generate error path ───────────────────────────────────

test('T11 `forge generate` with no workspace config → "Run forge crawl first" + exit 1', () => {
  const root = tempRoot()
  try {
    let output = ''
    let exitCode = 0
    try {
      output = execFileSync(
        path.join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx'),
        [path.join(REPO_ROOT, 'src', 'core', 'onboarding', 'cli.ts'), 'generate'],
        { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
      )
    } catch (e: any) {
      exitCode = e.status ?? 1
      output = `${e.stdout ?? ''}${e.stderr ?? ''}`
    }
    assert.equal(exitCode, 1)
    assert.match(output, /Run forge crawl first/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
