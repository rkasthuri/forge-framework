// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class CartPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/cart.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/cart.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/cart.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly checkoutButton = this.smart({
    key: 'cart:checkoutButton',
    description: "Checkout",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"checkout\"]" },
      { name: 'role', selector: "button[name='Checkout']" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly continueShoppingButton: Locator = this.page.locator("[data-test=\"continue-shopping\"]")

  readonly cartItem: Locator = this.page.locator(".cart_item")

}
