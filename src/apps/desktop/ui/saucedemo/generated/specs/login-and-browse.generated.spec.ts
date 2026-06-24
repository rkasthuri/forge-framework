// @generated from app-model.json v1.0.22 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('login-and-browse', () => {

  test('TC-GEN-006 Login and Browse Inventory full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
  })

  test('TC-GEN-007 critical elements visible on inventory-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
  })

})
