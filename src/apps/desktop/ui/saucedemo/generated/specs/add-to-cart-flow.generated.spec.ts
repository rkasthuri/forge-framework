// @generated from app-model.json v1.0.23 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'
import { InventoryItemHtmlPage } from '../pages/InventoryItemHtmlPage.generated'

test.describe('add-to-cart-flow', () => {

  test('TC-GEN-008 Add Item to Cart full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    await expect(standardUser).toHaveURL(/\/cart\.html/)
  })

  test('TC-GEN-009 critical elements visible on inventory-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeVisible()
  })

  test('TC-GEN-010 critical elements visible on cart-html', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    await expect(standardUser).toHaveURL(/\/cart\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeVisible()
  })

})
