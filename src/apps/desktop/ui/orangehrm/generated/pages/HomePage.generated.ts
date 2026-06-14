// @generated from app-model.json v1.0.8 sha256:15cff9c58b7f2b62
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../../pages/BasePage'

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




}
