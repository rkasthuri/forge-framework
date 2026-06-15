// @generated from app-model.json v1.0.10 sha256:3796b82cdef23357
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPerformanceViewPerformanceModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/performance/viewPerformanceModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/performance/viewPerformanceModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/performance/viewPerformanceModule")
  }




}
