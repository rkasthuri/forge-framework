// @generated from app-model.json v1.0.23 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('login-to-inventory', () => {

  test('TC-GEN-015 Login to Inventory full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
  })

  test('TC-GEN-016 critical elements visible on inventory-html (batch 1 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"about-sidebar-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"logout-sidebar-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"reset-sidebar-link\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-cross-btn")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"shopping-cart-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"secondary-header\"]")).toBeVisible()
  })

  test('TC-GEN-017 critical elements visible on inventory-html (batch 2 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"title\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"active-option\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"product-sort-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-list\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-4-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-backpack-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-4-title-link\"]")).toBeVisible()
  })

  test('TC-GEN-018 critical elements visible on inventory-html (batch 3 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-0-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bike-light-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-0-title-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
  })

  test('TC-GEN-019 critical elements visible on inventory-html (batch 4 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bike-light\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-1-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-1-title-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
  })

  test('TC-GEN-020 critical elements visible on inventory-html (batch 5 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-5-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-5-title-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
  })

  test('TC-GEN-021 critical elements visible on inventory-html (batch 6 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-2-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-onesie-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-2-title-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-onesie\"]")).toBeVisible()
  })

  test('TC-GEN-022 critical elements visible on inventory-html (batch 7 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-3-img-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-3-title-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"footer\"]")).toBeVisible()
  })

  test('TC-GEN-023 critical elements visible on inventory-html (batch 8 of 8)', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator("[data-test=\"social-twitter\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-facebook\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-linkedin\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"footer-copy\"]")).toBeVisible()
  })

})
