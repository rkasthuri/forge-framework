// @generated from app-model.json v1.0.23 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class HomePage extends BasePage {

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
  readonly loginContainer = this.smart({
    key: 'home:loginContainer',
    description: "Accepted usernames are:standard_userlocked_out_use",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-container\"]" },
      { name: 'css', selector: "[data-test=\"login-container\"]" },
    ],
  })

  readonly username = this.smart({
    key: 'home:username',
    description: "Username",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"username\"]" },
      { name: 'id', selector: "#user-name" },
      { name: 'role', selector: "textbox", accessibleName: "Username" },
      { name: 'css', selector: "#user-name" },
    ],
  })

  readonly password = this.smart({
    key: 'home:password',
    description: "Password",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"password\"]" },
      { name: 'id', selector: "#password" },
      { name: 'role', selector: "textbox", accessibleName: "Password" },
      { name: 'css', selector: "#password" },
    ],
  })

  readonly loginButton = this.smart({
    key: 'home:loginButton',
    description: "loginButton",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-button\"]" },
      { name: 'id', selector: "#login-button" },
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "#login-button" },
    ],
  })

  readonly loginCredentialsContainer = this.smart({
    key: 'home:loginCredentialsContainer',
    description: "Accepted usernames are:standard_userlocked_out_use",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-credentials-container\"]" },
      { name: 'css', selector: "[data-test=\"login-credentials-container\"]" },
    ],
  })

  readonly loginCredentials = this.smart({
    key: 'home:loginCredentials',
    description: "Accepted usernames are:standard_userlocked_out_use",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-credentials\"]" },
      { name: 'id', selector: "#login_credentials" },
      { name: 'css', selector: "#login_credentials" },
    ],
  })

  readonly loginPassword = this.smart({
    key: 'home:loginPassword',
    description: "Password for all users:secret_sauce",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"login-password\"]" },
      { name: 'css', selector: "[data-test=\"login-password\"]" },
    ],
  })


  // ── Actions ────────────────────────────────────────────────────────────
  async login(username: string, password: string): Promise<void> {
    await (await this.username.resolve()).fill(username)
    await (await this.password.resolve()).fill(password)
    await (await this.loginButton.resolve()).click()
  }
}
