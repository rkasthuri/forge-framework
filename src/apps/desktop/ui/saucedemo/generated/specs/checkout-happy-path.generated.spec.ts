// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { InventoryPage } from '../pages/InventoryPage.generated'
import { CartPage } from '../pages/CartPage.generated'
import { CheckoutPage } from '../pages/CheckoutPage.generated'
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage.generated'
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage.generated'

test.describe('checkout-happy-path', () => {

  // ── Tier 1 — Invariants (always run) ────────────────────────────────────
  test('TC-GEN-008 navigation succeeds', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/checkout-complete\.html/)
  })

  test('TC-GEN-009 no console errors', async ({ standardUser }) => {
    const errors: string[] = []
    standardUser.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  // ── Tier 2 — Structural (high confidence) ──────────────────────────────
  test('TC-GEN-010 navigates to cart', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/cart\.html/)
  })

  test('TC-GEN-011 navigates to checkout', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/checkout-step-one\.html/)
  })

  test('TC-GEN-012 navigates to checkoutOverview', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/checkout-step-two\.html/)
  })

  test('TC-GEN-013 navigates to checkoutComplete', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/checkout-complete\.html/)
  })

  // ── Tier 3 — Semantic (@unverified-oracle, excluded by default) ────────
  test('TC-GEN-014 @unverified-oracle checkoutButton is visible on cart',
    async ({ standardUser }) => {
    const pg = new CartPage(standardUser)
    await expect(pg.checkoutButton.resolve()).resolves.toBeDefined()
  })

  test('TC-GEN-015 @unverified-oracle firstNameInput is visible on checkout',
    async ({ standardUser }) => {
    const pg = new CheckoutPage(standardUser)
    await expect(pg.firstNameInput.resolve()).resolves.toBeDefined()
  })

  test('TC-GEN-016 @unverified-oracle finishButton is visible on checkoutOverview',
    async ({ standardUser }) => {
    const pg = new CheckoutOverviewPage(standardUser)
    await expect(pg.finishButton.resolve()).resolves.toBeDefined()
  })

  test('TC-GEN-017 @unverified-oracle confirmationHeader is visible on checkoutComplete',
    async ({ standardUser }) => {
    const pg = new CheckoutCompletePage(standardUser)
    await expect(pg.confirmationHeader.resolve()).resolves.toBeDefined()
  })

})
