// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../../pages/BasePage'

export class CheckoutOverviewPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/checkout-step-two.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/checkout-step-two.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/checkout-step-two.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly finishButton = this.smart({
    key: 'checkoutOverview:finishButton',
    description: "Finish",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"finish\"]" },
      { name: 'role', selector: "button[name='Finish']" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly cancelButton: Locator = this.page.locator("[data-test=\"cancel\"]")

  readonly summaryTotal: Locator = this.page.locator(".summary_total_label")

}
