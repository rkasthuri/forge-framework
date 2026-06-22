// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminAddThemePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/addTheme"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/addTheme") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/addTheme")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly publish = this.smart({
    key: 'web-index-php-admin-addTheme:publish',
    description: "Publish",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Publish" },
      { name: 'text', selector: "text=Publish" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly logoLink: Locator = this.page.locator("role=link")

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

  readonly nationalities: Locator = this.page.locator("role=link[name=\"Nationalities\"]")

  readonly corporateBranding: Locator = this.page.locator("role=link[name=\"Corporate Branding\"]")

  readonly saveThemeButton: Locator = this.page.locator("role=button")

  readonly themeNameInput: Locator = this.page.locator("role=textbox")

  readonly themeDescriptionInput: Locator = this.page.locator("role=textbox")

  readonly themeFileInput: Locator = this.page.locator("role=textbox")

  readonly setActiveCheckbox: Locator = this.page.locator("role=textbox")

  readonly resetToDefault: Locator = this.page.locator("role=button[name=\"Reset to Default\"]")

  readonly preview: Locator = this.page.locator("role=button[name=\"Preview\"]")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
