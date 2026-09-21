/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */

/**
 * ADR-013 authenticated-bootstrap endpoint (Phase 5b) — proof tests.
 *
 * The pure planAuthenticate() covers the decision (incl. the 202 'submit' path,
 * which we do NOT exercise at the HTTP layer — it would launch a real crawl).
 * Route tests cover 404 / 200-noop / 400-unset, all of which return BEFORE any
 * job is submitted. Route dependencies are injected so every config fixture is
 * contained beneath a newly created disposable root.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import express from 'express'
import { createAuthenticateHandler, planAuthenticate } from '../forge-ui/server/routes/projects'
import { WorkspaceResolver } from '../forge-ui/server/context/WorkspaceResolver'
import { CredentialError } from '../forge-ui/server/context/credentials/CredentialTypes'

function once(handler: express.RequestHandler, method: string, urlPath: string, body?: unknown): Promise<{ status: number; json: any }> {
  const app = express()
  app.use(express.json())
  app.post('/api/v1/projects/:appName/authenticate', handler)
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const port = (server.address() as any).port
        const res = await fetch(`http://localhost:${port}${urlPath}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const json = await res.json().catch(() => null)
        server.close(() => resolve({ status: res.status, json }))
      } catch (e) { server.close(() => reject(e)) }
    })
  })
}

function fixture(): { root: string; resolver: WorkspaceResolver; writeConfig(appName: string, config: unknown): void; cleanup(): void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-auth-route-'))
  const projectsRoot = path.join(root, 'projects')
  const resolver = new WorkspaceResolver(projectsRoot)
  const assertTarget = (target: string): string => {
    const resolved = path.resolve(target)
    const relative = path.relative(path.resolve(root), resolved)
    assert.ok(relative.length > 0 && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    return resolved
  }
  return {
    root,
    resolver,
    writeConfig(appName, config) {
      const dir = assertTarget(resolver.resolve(appName).forgeDir)
      const configPath = assertTarget(path.join(dir, 'config.json'))
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(configPath, JSON.stringify(config))
    },
    cleanup() {
      assert.equal(path.resolve(root), root)
      fs.rmSync(root, { recursive: true, force: true })
    },
  }
}

// ── planAuthenticate (pure decision) ──────────────────────────────────────────

test('P1 planAuthenticate: null config → not-found', () => {
  assert.equal(planAuthenticate(null, null), 'not-found')
})

test('P2 planAuthenticate: existing credentials.envKey → noop (idempotent)', () => {
  assert.equal(planAuthenticate({ credentials: { envKey: 'X' } }, { username: 'u', password: 'p' }), 'noop')
})

test('P3 planAuthenticate: guest (no material, no slot) → noop', () => {
  assert.equal(planAuthenticate({}, null), 'noop')
})

test('P4 planAuthenticate: no slot + material resolved → submit', () => {
  assert.equal(planAuthenticate({ authType: 'form-login' }, { username: 'u', password: 'p' }), 'submit')
})

// ── Route (all return BEFORE any job submission) ──────────────────────────────

test('A1 POST /:app/authenticate unknown app → 404 NOT_FOUND', async () => {
  const f = fixture()
  try {
    const res = await once(createAuthenticateHandler(f.resolver), 'POST', '/api/v1/projects/zz-authtest-404-xyz/authenticate', {})
    assert.equal(res.status, 404)
    assert.equal(res.json.code, 'NOT_FOUND')
  } finally { f.cleanup() }
})

test('A2 POST /:app/authenticate with existing envKey → 200 { noop:true }', async () => {
  const app = 'zz-authtest-noop'
  const f = fixture()
  f.writeConfig(app, {
    schemaVersion: 1, appName: app, url: 'https://x', authType: 'form-login',
    credentials: { envKey: 'ZZ_AUTHTEST_NOOP_CREDENTIALS' },
  })
  try {
    const res = await once(createAuthenticateHandler(f.resolver), 'POST', `/api/v1/projects/${app}/authenticate`, {})
    assert.equal(res.status, 200)
    assert.equal(res.json.data.noop, true)
  } finally { f.cleanup() }
})

test('A3 POST /:app/authenticate auth app, env pair unset → 400 CREDENTIALS_REQUIRED', async () => {
  const app = 'zz-authtest-400'
  const f = fixture()
  delete process.env.ZZ_AUTHTEST_400_USERNAME
  delete process.env.ZZ_AUTHTEST_400_PASSWORD
  f.writeConfig(app, { schemaVersion: 1, appName: app, url: 'https://x', authType: 'form-login' })
  try {
    const credentials = { resolve: () => { throw new CredentialError(app, 'form-login', { usernameEnv: 'ZZ_AUTHTEST_400_USERNAME', passwordEnv: 'ZZ_AUTHTEST_400_PASSWORD' }) } }
    const res = await once(createAuthenticateHandler(f.resolver, credentials), 'POST', `/api/v1/projects/${app}/authenticate`, {})
    assert.equal(res.status, 400)
    assert.equal(res.json.code, 'CREDENTIALS_REQUIRED')
    assert.match(res.json.error, /governed credential reference is unavailable/)
    assert.doesNotMatch(JSON.stringify(res.json), /ZZ_AUTHTEST_400_USERNAME|ZZ_AUTHTEST_400_PASSWORD/)
  } finally { f.cleanup() }
})
