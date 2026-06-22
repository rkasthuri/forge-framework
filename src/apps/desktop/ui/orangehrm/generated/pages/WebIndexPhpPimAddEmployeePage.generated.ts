// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimAddEmployeePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/addEmployee"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/addEmployee") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/addEmployee")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly save = this.smart({
    key: 'web-index-php-pim-addEmployee:save',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
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

  readonly employeeList: Locator = this.page.locator("role=link[name=\"Employee List\"]")

  readonly addEmployee: Locator = this.page.locator("role=link[name=\"Add Employee\"]")

  readonly reports: Locator = this.page.locator("role=link[name=\"Reports\"]")

  readonly uploadPhotoButton: Locator = this.page.locator("role=button")

  readonly employeeIdInput: Locator = this.page.locator("role=textbox")

  readonly saveEmployeeButton: Locator = this.page.locator("role=none")

  readonly firstName: Locator = this.page.locator("role=textbox[name=\"First Name\"]")

  readonly middleName: Locator = this.page.locator("role=textbox[name=\"Middle Name\"]")

  readonly lastName: Locator = this.page.locator("role=textbox[name=\"Last Name\"]")

  readonly usernameInput: Locator = this.page.locator("role=textbox")

  readonly createLoginDetailsCheckbox: Locator = this.page.locator("role=textbox")

  readonly cancel: Locator = this.page.locator("role=button[name=\"Cancel\"]")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
