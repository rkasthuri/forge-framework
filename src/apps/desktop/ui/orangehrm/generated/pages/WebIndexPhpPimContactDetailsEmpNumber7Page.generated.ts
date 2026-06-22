// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimContactDetailsEmpNumber7Page extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/contactDetails/empNumber/7"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/contactDetails/empNumber/7") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/contactDetails/empNumber/7")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly save = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:save',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly contactDetailsLink: Locator = this.page.locator("role=link")

  readonly search: Locator = this.page.locator("role=textbox[name=\"Search\"]")

  readonly saveButton: Locator = this.page.locator("role=none")

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

  readonly cancelButton: Locator = this.page.locator("role=button")

  readonly personalDetails: Locator = this.page.locator("role=link[name=\"Personal Details\"]")

  readonly contactDetails: Locator = this.page.locator("role=link[name=\"Contact Details\"]")

  readonly emergencyContacts: Locator = this.page.locator("role=link[name=\"Emergency Contacts\"]")

  readonly dependents: Locator = this.page.locator("role=link[name=\"Dependents\"]")

  readonly immigration: Locator = this.page.locator("role=link[name=\"Immigration\"]")

  readonly job: Locator = this.page.locator("role=link[name=\"Job\"]")

  readonly salary: Locator = this.page.locator("role=link[name=\"Salary\"]")

  readonly reportTo: Locator = this.page.locator("role=link[name=\"Report-to\"]")

  readonly qualifications: Locator = this.page.locator("role=link[name=\"Qualifications\"]")

  readonly memberships: Locator = this.page.locator("role=link[name=\"Memberships\"]")

  readonly streetAddress1Input: Locator = this.page.locator("role=textbox")

  readonly streetAddress2Input: Locator = this.page.locator("role=textbox")

  readonly cityInput: Locator = this.page.locator("role=textbox")

  readonly stateProvinceInput: Locator = this.page.locator("role=textbox")

  readonly zipPostalCodeInput: Locator = this.page.locator("role=textbox")

  readonly countryInput: Locator = this.page.locator("role=textbox")

  readonly homeTelephoneInput: Locator = this.page.locator("role=textbox")

  readonly mobileInput: Locator = this.page.locator("role=textbox")

  readonly workTelephoneInput: Locator = this.page.locator("role=textbox")

  readonly workEmailInput: Locator = this.page.locator("role=textbox")

  readonly add: Locator = this.page.locator("role=button[name=\"Add\"]")

  readonly otherEmailInput: Locator = this.page.locator("role=textbox")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
