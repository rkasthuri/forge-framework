// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../../pages/BasePage'

export class CheckoutPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/checkout-step-one.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/checkout-step-one.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/checkout-step-one.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly firstNameInput = this.smart({
    key: 'checkout:firstNameInput',
    description: "First Name",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"firstName\"]" },
      { name: 'id', selector: "#first-name" },
      { name: 'role', selector: "textbox[name='First Name']" },
    ],
  })

  readonly lastNameInput = this.smart({
    key: 'checkout:lastNameInput',
    description: "Last Name",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"lastName\"]" },
      { name: 'id', selector: "#last-name" },
      { name: 'role', selector: "textbox[name='Last Name']" },
    ],
  })

  readonly postalCodeInput = this.smart({
    key: 'checkout:postalCodeInput',
    description: "Postal Code",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"postalCode\"]" },
      { name: 'id', selector: "#postal-code" },
      { name: 'role', selector: "textbox[name='Zip/Postal Code']" },
    ],
  })

  readonly continueButton = this.smart({
    key: 'checkout:continueButton',
    description: "Continue",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"continue\"]" },
      { name: 'role', selector: "button[name='Continue']" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly cancelButton: Locator = this.page.locator("[data-test=\"cancel\"]")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(firstNameInput: string, lastNameInput: string, postalCodeInput: string): Promise<void> {
    await (await this.firstNameInput.resolve()).fill(firstNameInput)
    await (await this.lastNameInput.resolve()).fill(lastNameInput)
    await (await this.postalCodeInput.resolve()).fill(postalCodeInput)
    await (await this.continueButton.resolve()).click()
  }
}
