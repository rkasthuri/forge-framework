// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpMaintenancePurgeEmployeePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/maintenance/purgeEmployee"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/maintenance/purgeEmployee") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/maintenance/purgeEmployee")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly employeeIdInput = this.smart({
    key: 'web-index-php-maintenance-purgeEmployee:unnamed-input-0',
    description: "unnamed-input-0",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly confirmPurgeInput = this.smart({
    key: 'web-index-php-maintenance-purgeEmployee:unnamed-input-1',
    description: "unnamed-input-1",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=password]" },
    ],
  })

  readonly cancel = this.smart({
    key: 'web-index-php-maintenance-purgeEmployee:cancel',
    description: "Cancel",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Cancel" },
      { name: 'text', selector: "text=Cancel" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly confirm = this.smart({
    key: 'web-index-php-maintenance-purgeEmployee:confirm',
    description: "Confirm",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Confirm" },
      { name: 'text', selector: "text=Confirm" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-maintenance-purgeEmployee:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })


  // ── Actions ────────────────────────────────────────────────────────────
  async login(employeeIdInput: string, confirmPurgeInput: string): Promise<void> {
    await (await this.employeeIdInput.resolve({ assertionType: 'fill', expectedValue: employeeIdInput })).fill(employeeIdInput)
    await (await this.confirmPurgeInput.resolve({ assertionType: 'fill', expectedValue: confirmPurgeInput })).fill(confirmPurgeInput)
    await (await this.cancel.resolve({ assertionType: 'click' })).click()
  }
}
