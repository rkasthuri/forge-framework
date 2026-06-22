// @generated from app-model.json v1.0.20 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'
import { InventoryItemHtmlPage } from '../pages/InventoryItemHtmlPage.generated'
import { CartHtmlPage } from '../pages/CartHtmlPage.generated'

test.describe('complete-purchase-flow', () => {

  test('TC-GEN-014 Complete Purchase Journey full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser).toHaveURL(/\/inventory-item\.html/)
    await expect(standardUser).toHaveURL(/\/cart\.html/)
  })

  test('TC-GEN-015 critical elements visible on home', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser.locator("[data-test=\"login-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"username\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"password\"]")).toBeVisible()
  })

  test('TC-GEN-016 critical elements visible on inventory-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
  })

  test('TC-GEN-017 critical elements visible on cart-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser).toHaveURL(/\/inventory-item\.html/)
    await expect(standardUser).toHaveURL(/\/cart\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
  })

})
