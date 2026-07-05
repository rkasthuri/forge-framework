// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimViewPersonalDetailsEmpNumber7Page extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/viewPersonalDetails/empNumber/7"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/viewPersonalDetails/empNumber/7") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/viewPersonalDetails/empNumber/7")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly personalDetails = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:personalDetails',
    description: "Personal Details",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Personal Details" },
      { name: 'text', selector: "text=Personal Details" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly contactDetails = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:contactDetails',
    description: "Contact Details",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Contact Details" },
      { name: 'text', selector: "text=Contact Details" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly emergencyContacts = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:emergencyContacts',
    description: "Emergency Contacts",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Emergency Contacts" },
      { name: 'text', selector: "text=Emergency Contacts" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dependents = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:dependents',
    description: "Dependents",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dependents" },
      { name: 'text', selector: "text=Dependents" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly immigration = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:immigration',
    description: "Immigration",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Immigration" },
      { name: 'text', selector: "text=Immigration" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly job = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:job',
    description: "Job",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Job" },
      { name: 'text', selector: "text=Job" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly salary = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:salary',
    description: "Salary",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Salary" },
      { name: 'text', selector: "text=Salary" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reportTo = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:reportTo',
    description: "Report-to",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Report-to" },
      { name: 'text', selector: "text=Report-to" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly qualifications = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:qualifications',
    description: "Qualifications",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Qualifications" },
      { name: 'text', selector: "text=Qualifications" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly memberships = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:memberships',
    description: "Memberships",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Memberships" },
      { name: 'text', selector: "text=Memberships" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly firstName = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:firstName',
    description: "First Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "First Name" },
      { name: 'css', selector: "input[placeholder='First Name']" },
    ],
  })

  readonly middleName = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:middleName',
    description: "Middle Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Middle Name" },
      { name: 'css', selector: "input[placeholder='Middle Name']" },
    ],
  })

  readonly lastName = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:lastName',
    description: "Last Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Last Name" },
      { name: 'css', selector: "input[placeholder='Last Name']" },
    ],
  })

  readonly firstNameInput = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-31',
    description: "unnamed-input-31",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly middleNameInput = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-32',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly lastNameInput = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-33',
    description: "unnamed-input-33",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly yyyyDdMmLicenseExpiryDate = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:yyyyDdMmLicenseExpiryDate',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly yyyyDdMmDateOfBirth = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:yyyyDdMmDateOfBirth',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly genderMaleRadio = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-36',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=radio]" },
    ],
  })

  readonly genderFemaleRadio = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-37',
    description: "unnamed-input-37",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=radio]" },
    ],
  })

  readonly save = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:save',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly dateOfBirthInput = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-39',
    description: "unnamed-input-39",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly save_2 = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:save_2',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly smokerCheckbox = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-42',
    description: "unnamed-input-42",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly disabledCheckbox = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:unnamed-input-43',
    description: "unnamed-input-43",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-pim-viewPersonalDetails-empNumber-7:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly personalDetailsLink: Locator = this.page.locator("role=link")

  readonly editButton: Locator = this.page.locator("role=none")

  readonly addAttachmentButton: Locator = this.page.locator("role=button")

  readonly saveButton: Locator = this.page.locator("role=button")

  readonly cancelButton: Locator = this.page.locator("role=button")

  readonly deleteButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, firstName: string, middleName: string, lastName: string, firstNameInput: string, middleNameInput: string, lastNameInput: string, yyyyDdMmLicenseExpiryDate: string, yyyyDdMmDateOfBirth: string, dateOfBirthInput: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.firstName.resolve({ assertionType: 'fill', expectedValue: firstName })).fill(firstName)
    await (await this.middleName.resolve({ assertionType: 'fill', expectedValue: middleName })).fill(middleName)
    await (await this.lastName.resolve({ assertionType: 'fill', expectedValue: lastName })).fill(lastName)
    await (await this.firstNameInput.resolve({ assertionType: 'fill', expectedValue: firstNameInput })).fill(firstNameInput)
    await (await this.middleNameInput.resolve({ assertionType: 'fill', expectedValue: middleNameInput })).fill(middleNameInput)
    await (await this.lastNameInput.resolve({ assertionType: 'fill', expectedValue: lastNameInput })).fill(lastNameInput)
    await (await this.yyyyDdMmLicenseExpiryDate.resolve({ assertionType: 'fill', expectedValue: yyyyDdMmLicenseExpiryDate })).fill(yyyyDdMmLicenseExpiryDate)
    await (await this.yyyyDdMmDateOfBirth.resolve({ assertionType: 'fill', expectedValue: yyyyDdMmDateOfBirth })).fill(yyyyDdMmDateOfBirth)
    await (await this.dateOfBirthInput.resolve({ assertionType: 'fill', expectedValue: dateOfBirthInput })).fill(dateOfBirthInput)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
