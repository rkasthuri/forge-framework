// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class InventoryPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/inventory.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/inventory.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/inventory.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly cartIcon = this.smart({
    key: 'inventory:cartIcon',
    description: "Shopping cart",
    strategies: [
      { name: 'css', selector: ".shopping_cart_link" },
      { name: 'role', selector: "link[name='shopping cart']" },
    ],
  })

  readonly addToCartBackpack = this.smart({
    key: 'inventory:addToCartBackpack',
    description: "Add Sauce Labs Backpack to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-backpack\"]" },
      { name: 'role', selector: "button[name='Add to cart']" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly sortDropdown: Locator = this.page.locator(".product_sort_container")

}
