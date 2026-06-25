// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
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
  readonly search = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly personalDetails = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:personalDetails',
    description: "Personal Details",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Personal Details" },
      { name: 'text', selector: "text=Personal Details" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly contactDetails = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:contactDetails',
    description: "Contact Details",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Contact Details" },
      { name: 'text', selector: "text=Contact Details" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly emergencyContacts = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:emergencyContacts',
    description: "Emergency Contacts",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Emergency Contacts" },
      { name: 'text', selector: "text=Emergency Contacts" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dependents = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:dependents',
    description: "Dependents",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dependents" },
      { name: 'text', selector: "text=Dependents" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly immigration = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:immigration',
    description: "Immigration",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Immigration" },
      { name: 'text', selector: "text=Immigration" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly job = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:job',
    description: "Job",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Job" },
      { name: 'text', selector: "text=Job" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly salary = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:salary',
    description: "Salary",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Salary" },
      { name: 'text', selector: "text=Salary" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reportTo = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:reportTo',
    description: "Report-to",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Report-to" },
      { name: 'text', selector: "text=Report-to" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly qualifications = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:qualifications',
    description: "Qualifications",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Qualifications" },
      { name: 'text', selector: "text=Qualifications" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly memberships = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:memberships',
    description: "Memberships",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Memberships" },
      { name: 'text', selector: "text=Memberships" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly streetAddress1Input = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly streetAddress2Input = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-29',
    description: "unnamed-input-29",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly cityInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-30',
    description: "unnamed-input-30",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly stateProvinceInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-31',
    description: "unnamed-input-31",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly zipPostalCodeInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-32',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly countryInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-33',
    description: "unnamed-input-33",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly homeTelephoneInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-34',
    description: "unnamed-input-34",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly mobileInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-35',
    description: "unnamed-input-35",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly workTelephoneInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-36',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly workEmailInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-37',
    description: "unnamed-input-37",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly save = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:save',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly otherEmailInput = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:unnamed-input-40',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-pim-contactDetails-empNumber-7:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly contactDetailsLink: Locator = this.page.locator("role=link")

  readonly saveButton: Locator = this.page.locator("role=none")

  readonly addButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, streetAddress1Input: string, streetAddress2Input: string, cityInput: string, stateProvinceInput: string, zipPostalCodeInput: string, countryInput: string, homeTelephoneInput: string, mobileInput: string, workTelephoneInput: string, workEmailInput: string): Promise<void> {
    await (await this.search.resolve()).fill(search)
    await (await this.streetAddress1Input.resolve()).fill(streetAddress1Input)
    await (await this.streetAddress2Input.resolve()).fill(streetAddress2Input)
    await (await this.cityInput.resolve()).fill(cityInput)
    await (await this.stateProvinceInput.resolve()).fill(stateProvinceInput)
    await (await this.zipPostalCodeInput.resolve()).fill(zipPostalCodeInput)
    await (await this.countryInput.resolve()).fill(countryInput)
    await (await this.homeTelephoneInput.resolve()).fill(homeTelephoneInput)
    await (await this.mobileInput.resolve()).fill(mobileInput)
    await (await this.workTelephoneInput.resolve()).fill(workTelephoneInput)
    await (await this.workEmailInput.resolve()).fill(workEmailInput)
    await (await this.upgrade_2.resolve()).click()
  }
}
