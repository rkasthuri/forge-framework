// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpDashboardIndexPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/dashboard/index"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/dashboard/index") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/dashboard/index")
  }



  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly dashboardLink: Locator = this.page.locator("role=link")

  readonly search: Locator = this.page.locator("role=textbox[name=\"Search\"]")

  readonly menuToggleButton: Locator = this.page.locator("role=none")

  readonly admin: Locator = this.page.locator("role=link[name=\"Admin\"]")

  readonly pIM: Locator = this.page.locator("role=link[name=\"PIM\"]")

  readonly leave: Locator = this.page.locator("role=link[name=\"Leave\"]")

  readonly time: Locator = this.page.locator("role=link[name=\"Time\"]")

  readonly recruitment: Locator = this.page.locator("role=link[name=\"Recruitment\"]")

  readonly myInfo: Locator = this.page.locator("role=link[name=\"My Info\"]")

  readonly performance: Locator = this.page.locator("role=link[name=\"Performance\"]")

  readonly dashboard: Locator = this.page.locator("role=link[name=\"Dashboard\"]")

  readonly directory: Locator = this.page.locator("role=link[name=\"Directory\"]")

  readonly maintenance: Locator = this.page.locator("role=link[name=\"Maintenance\"]")

  readonly claim: Locator = this.page.locator("role=link[name=\"Claim\"]")

  readonly buzz: Locator = this.page.locator("role=link[name=\"Buzz\"]")

  readonly upgrade: Locator = this.page.locator("role=link[name=\"Upgrade\"]")

  readonly upgrade_2: Locator = this.page.locator("role=button[name=\"Upgrade\"]")

  readonly dashboardActionButton1: Locator = this.page.locator("role=button")

  readonly dashboardActionButton2: Locator = this.page.locator("role=button")

  readonly dashboardActionButton3: Locator = this.page.locator("role=button")

  readonly dashboardActionButton4: Locator = this.page.locator("role=button")

  readonly dashboardActionButton5: Locator = this.page.locator("role=button")

  readonly dashboardActionButton6: Locator = this.page.locator("role=button")

  readonly dashboardActionButton7: Locator = this.page.locator("role=button")

  readonly dashboardActionButton8: Locator = this.page.locator("role=button")

  readonly dashboardActionButton9: Locator = this.page.locator("role=button")

  readonly dashboardActionButton10: Locator = this.page.locator("role=button")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
