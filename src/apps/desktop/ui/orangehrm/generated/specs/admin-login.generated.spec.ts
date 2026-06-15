// @generated from app-model.json v1.0.10 sha256:3796b82cdef23357
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('admin-login', () => {

  // ── Tier 1 — Invariants (always run) ────────────────────────────────────
  test('TC-GEN-001 navigation succeeds', async ({ adminUser }) => {
    await expect(adminUser).toHaveURL(/\//)
  })

  test('TC-GEN-002 no console errors', async ({ adminUser }) => {
    const errors: string[] = []
    adminUser.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  // ── Tier 2 — Structural (high confidence) ──────────────────────────────
  test('TC-GEN-003 navigates to home', async ({ adminUser }) => {
    await expect(adminUser).toHaveURL(/\//)
  })


})
