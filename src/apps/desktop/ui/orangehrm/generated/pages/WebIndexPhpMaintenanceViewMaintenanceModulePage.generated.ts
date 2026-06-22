// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpMaintenanceViewMaintenanceModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/maintenance/viewMaintenanceModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/maintenance/viewMaintenanceModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/maintenance/viewMaintenanceModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly maintenanceSecondaryInput = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:unnamed-input-1',
    description: "unnamed-input-1",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=password]" },
    ],
  })

  readonly confirm = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:confirm',
    description: "Confirm",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Confirm" },
      { name: 'text', selector: "text=Confirm" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly maintenanceInput: Locator = this.page.locator("role=textbox")

  readonly cancel: Locator = this.page.locator("role=button[name=\"Cancel\"]")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

  // ── Actions ────────────────────────────────────────────────────────────
  async login(maintenanceSecondaryInput: string): Promise<void> {
    await (await this.maintenanceSecondaryInput.resolve()).fill(maintenanceSecondaryInput)
    await (await this.confirm.resolve()).click()
  }
}
