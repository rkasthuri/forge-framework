// @generated from app-model.json v1.0.22 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'
import { CartHtmlPage } from '../pages/CartHtmlPage.generated'

test.describe('direct-checkout-flow', () => {

  test('TC-GEN-011 Direct Checkout from Cart full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await standardUser.locator("[data-test=\"shopping-cart-link\"]").click()
    await standardUser.locator("[data-test=\"checkout\"]").click()
  })

  test('TC-GEN-012 critical elements visible on inventory-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
  })

})
