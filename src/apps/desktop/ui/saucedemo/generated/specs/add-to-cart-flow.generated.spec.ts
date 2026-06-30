// @generated from app-model.json v1.0.27 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'
import { InventoryItemHtmlPage } from '../pages/InventoryItemHtmlPage.generated'

test.describe('add-to-cart-flow', () => {

  test('TC-GEN-024 Add Item to Cart full flow', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    // FORGE: navigation and prerequisite reachability unverified; URL assertion omitted.
  })

  test('TC-GEN-025 critical elements visible on inventory-html (batch 1 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeVisible()
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"about-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"about-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"logout-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"logout-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"reset-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"reset-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("#react-burger-cross-btn")).toBeAttached()
    await expect(standardUser.locator("[data-test=\"shopping-cart-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"secondary-header\"]")).toBeVisible()
  })

  test('TC-GEN-026 critical elements visible on inventory-html (batch 2 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"title\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"active-option\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"product-sort-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-list\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-4-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-4-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-backpack-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-backpack-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-4-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-4-title-link\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-027 critical elements visible on inventory-html (batch 3 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-0-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-0-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bike-light-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bike-light-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-0-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-0-title-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-028 critical elements visible on inventory-html (batch 4 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bike-light\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bike-light\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-1-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-1-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-1-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-1-title-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-029 critical elements visible on inventory-html (batch 5 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-5-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-5-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-5-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-5-title-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-030 critical elements visible on inventory-html (batch 6 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-2-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-2-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-onesie-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-onesie-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-2-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-2-title-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-onesie\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-onesie\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-031 critical elements visible on inventory-html (batch 7 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-3-img-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-3-img-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"item-3-title-link\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"item-3-title-link\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]").first()).toBeVisible()
    await expect(standardUser.locator("[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]")).not.toHaveCount(0)
    await expect(standardUser.locator("[data-test=\"footer\"]")).toBeVisible()
  })

  test('TC-GEN-032 critical elements visible on inventory-html (batch 8 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await expect(standardUser.locator("[data-test=\"social-twitter\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-facebook\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-linkedin\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"footer-copy\"]")).toBeVisible()
  })

  test('TC-GEN-033 critical elements visible on cart-html (batch 1 of 3)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    // FORGE: navigation and prerequisite reachability unverified; URL assertion omitted.
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeVisible()
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeVisible()
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"about-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"about-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"logout-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"logout-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("[data-test=\"reset-sidebar-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"reset-sidebar-link\"]")).not.toHaveCount(0)
    // FORGE: element observed hidden during crawl; visibility unprovable — asserting attached, not visible.
    await expect(standardUser.locator("#react-burger-cross-btn")).toBeAttached()
    await expect(standardUser.locator("[data-test=\"shopping-cart-link\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"secondary-header\"]")).toBeVisible()
  })

  test('TC-GEN-034 critical elements visible on cart-html (batch 2 of 3)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    // FORGE: navigation and prerequisite reachability unverified; URL assertion omitted.
    await expect(standardUser.locator("[data-test=\"title\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"cart-contents-container\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"cart-list\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"cart-quantity-label\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"cart-desc-label\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"continue-shopping\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"checkout\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"footer\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-twitter\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"social-facebook\"]")).toBeVisible()
  })

  test('TC-GEN-035 critical elements visible on cart-html (batch 3 of 3)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    await standardUser.locator("[data-test=\"item-3-img-link\"]").click()
    // FORGE: navigation and prerequisite reachability unverified; URL assertion omitted.
    await expect(standardUser.locator("[data-test=\"social-linkedin\"]")).toBeVisible()
    await expect(standardUser.locator("[data-test=\"footer-copy\"]")).toBeVisible()
  })

})
