// @generated from app-model.json v1.0.20 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'

test.describe('guest-browse-inventory', () => {

  test('TC-GEN-020 Guest Browse Inventory full flow', async ({ guestPage }) => {
    await expect(guestPage).toHaveURL(/\/inventory\.html/)
  })

  test('TC-GEN-021 critical elements visible on inventory-html', async ({ guestPage }) => {
    await expect(guestPage).toHaveURL(/\/inventory\.html/)
    await expect(guestPage.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(guestPage.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(guestPage.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
  })

})
