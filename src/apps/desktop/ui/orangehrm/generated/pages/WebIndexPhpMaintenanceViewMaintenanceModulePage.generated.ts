// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
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
  readonly maintenanceInput = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:unnamed-input-0',
    description: "unnamed-input-0",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly maintenanceInputSecondary = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:unnamed-input-1',
    description: "unnamed-input-1",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=password]" },
    ],
  })

  readonly cancel = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:cancel',
    description: "Cancel",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Cancel" },
      { name: 'text', selector: "text=Cancel" },
      { name: 'css', selector: "button[type=button]" },
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

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-maintenance-viewMaintenanceModule:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })


  // ── Actions ────────────────────────────────────────────────────────────
  async login(maintenanceInput: string, maintenanceInputSecondary: string): Promise<void> {
    await (await this.maintenanceInput.resolve({ assertionType: 'fill', expectedValue: maintenanceInput })).fill(maintenanceInput)
    await (await this.maintenanceInputSecondary.resolve({ assertionType: 'fill', expectedValue: maintenanceInputSecondary })).fill(maintenanceInputSecondary)
    await (await this.cancel.resolve({ assertionType: 'click' })).click()
  }
}
