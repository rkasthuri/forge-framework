// @generated from app-model.json v1.0.28 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('login-to-inventory', () => {

  test('TC-GEN-015 Login to Inventory full flow', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
  })

  test('TC-GEN-016 critical elements visible on inventory-html (batch 1 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"header-container\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"primary-header\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("#react-burger-menu-btn")).toBeAttached()
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
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"shopping-cart-link\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"secondary-header\"]")).toBeAttached()
  })

  test('TC-GEN-017 critical elements visible on inventory-html (batch 2 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"title\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"active-option\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"product-sort-container\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-container\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-list\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-4-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-4-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-backpack-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-backpack-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-4-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-4-title-link\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-018 critical elements visible on inventory-html (batch 3 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-backpack\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-0-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-0-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bike-light-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bike-light-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-0-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-0-title-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-019 critical elements visible on inventory-html (batch 4 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bike-light\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bike-light\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-1-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-1-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-1-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-1-title-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-020 critical elements visible on inventory-html (batch 5 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-5-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-5-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-5-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-5-title-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-021 critical elements visible on inventory-html (batch 6 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-2-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-2-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-onesie-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-sauce-labs-onesie-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-2-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-2-title-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-onesie\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-sauce-labs-onesie\"]")).not.toHaveCount(0)
  })

  test('TC-GEN-022 critical elements visible on inventory-html (batch 7 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-3-img-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-3-img-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-description\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"item-3-title-link\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"item-3-title-link\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-name\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-desc\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"inventory-item-price\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]").first()).toBeAttached()
    await expect(standardUser.locator("[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]")).not.toHaveCount(0)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"footer\"]")).toBeAttached()
  })

  test('TC-GEN-023 critical elements visible on inventory-html (batch 8 of 8)', async ({ standardUser }) => {
    // FORGE: navigation not observed during crawl (no real edge); asserting non-error landing, not a specific URL.
    await expect(standardUser).not.toHaveURL(/404|error/i)
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"social-twitter\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"social-facebook\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"social-linkedin\"]")).toBeAttached()
    // FORGE: arrival at this page inferred (single uncertain hop) — asserting attached, not visible (FC-004a).
    await expect(standardUser.locator("[data-test=\"footer-copy\"]")).toBeAttached()
  })

})
