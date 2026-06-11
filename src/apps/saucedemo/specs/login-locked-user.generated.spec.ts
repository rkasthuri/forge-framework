// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { LoginPage } from '../pages/LoginPage.generated'

test.describe('login-locked-user', () => {

  // ── Tier 1 — Invariants (always run) ────────────────────────────────────
  test('TC-GEN-005 navigation succeeds', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
  })

  test('TC-GEN-006 no console errors', async ({ lockedUser }) => {
    const errors: string[] = []
    lockedUser.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  // ── Tier 2 — Structural (high confidence) ──────────────────────────────
  test('TC-GEN-007 errorMessage is visible', async ({ lockedUser }) => {
    await expect(lockedUser.locator('[data-test="errorMessage"]')).toBeVisible()
  })


})
