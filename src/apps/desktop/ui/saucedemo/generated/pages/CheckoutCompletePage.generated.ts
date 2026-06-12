// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class CheckoutCompletePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/checkout-complete.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/checkout-complete.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/checkout-complete.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly confirmationHeader = this.smart({
    key: 'checkoutComplete:confirmationHeader',
    description: "Thank you header",
    strategies: [
      { name: 'css', selector: ".complete-header" },
      { name: 'role', selector: "heading[name='Thank you for your order!']" },
    ],
  })

  readonly backHomeButton = this.smart({
    key: 'checkoutComplete:backHomeButton',
    description: "Back Home",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"back-to-products\"]" },
      { name: 'role', selector: "button[name='Back Home']" },
    ],
  })


}
