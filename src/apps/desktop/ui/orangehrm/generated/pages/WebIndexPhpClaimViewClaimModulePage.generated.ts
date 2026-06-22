// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpClaimViewClaimModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/claim/viewClaimModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/claim/viewClaimModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/claim/viewClaimModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search_2 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly viewClaimLink: Locator = this.page.locator("role=link")

  readonly search: Locator = this.page.locator("role=textbox[name=\"Search\"]")

  readonly claimActionButton: Locator = this.page.locator("role=none")

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

  readonly submitClaim: Locator = this.page.locator("role=link[name=\"Submit Claim\"]")

  readonly myClaims: Locator = this.page.locator("role=link[name=\"My Claims\"]")

  readonly employeeClaims: Locator = this.page.locator("role=link[name=\"Employee Claims\"]")

  readonly assignClaim: Locator = this.page.locator("role=link[name=\"Assign Claim\"]")

  readonly claimSecondaryButton: Locator = this.page.locator("role=button")

  readonly claimTertiaryButton: Locator = this.page.locator("role=button")

  readonly typeForHintsEmployeeName: Locator = this.page.locator("role=textbox[name=\"Type for hints...\"]")

  readonly typeForHintsReferenceId: Locator = this.page.locator("role=textbox[name=\"Type for hints...\"]")

  readonly yyyyDdMmFromDate: Locator = this.page.locator("role=textbox[name=\"yyyy-dd-mm\"]")

  readonly yyyyDdMmToDate: Locator = this.page.locator("role=textbox[name=\"yyyy-dd-mm\"]")

  readonly reset: Locator = this.page.locator("role=button[name=\"Reset\"]")

  readonly assignClaim_2: Locator = this.page.locator("role=button[name=\"Assign Claim\"]")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
