// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class LoginPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/"
  async isLoaded(): Promise<boolean> { return this.page.url().length > 0 }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly usernameInput = this.smart({
    key: 'login:usernameInput',
    description: "Username",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"username\"]" },
      { name: 'id', selector: "#user-name" },
      { name: 'role', selector: "textbox[name='Username']" },
      { name: 'css', selector: "input[placeholder='Username']" },
    ],
  })

  readonly passwordInput = this.smart({
    key: 'login:passwordInput',
    description: "Password",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"password\"]" },
      { name: 'id', selector: "#password" },
      { name: 'role', selector: "textbox[name='Password']" },
      { name: 'css', selector: "input[placeholder='Password']" },
    ],
  })

  readonly loginButton = this.smart({
    key: 'login:loginButton',
    description: "Login",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-button\"]" },
      { name: 'role', selector: "button[name='Login']" },
      { name: 'css', selector: "input[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly errorMessage: Locator = this.page.locator("[data-test=\"error\"]")

  // ── Actions ────────────────────────────────────────────────────────────
  async login(usernameInput: string, passwordInput: string): Promise<void> {
    await (await this.usernameInput.resolve()).fill(usernameInput)
    await (await this.passwordInput.resolve()).fill(passwordInput)
    await (await this.loginButton.resolve()).click()
  }
}
