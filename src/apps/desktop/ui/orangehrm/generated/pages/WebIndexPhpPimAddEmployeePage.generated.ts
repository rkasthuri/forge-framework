// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
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
  readonly search = this.smart({
    key: 'web-index-php-pim-addEmployee:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-addEmployee:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-addEmployee:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-addEmployee:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-addEmployee:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-addEmployee:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-addEmployee:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-addEmployee:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-addEmployee:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-addEmployee:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-addEmployee:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-addEmployee:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-addEmployee:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-addEmployee:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-addEmployee:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly employeeList = this.smart({
    key: 'web-index-php-pim-addEmployee:employeeList',
    description: "Employee List",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee List" },
      { name: 'text', selector: "text=Employee List" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly addEmployee = this.smart({
    key: 'web-index-php-pim-addEmployee:addEmployee',
    description: "Add Employee",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Add Employee" },
      { name: 'text', selector: "text=Add Employee" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reports = this.smart({
    key: 'web-index-php-pim-addEmployee:reports',
    description: "Reports",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Reports" },
      { name: 'text', selector: "text=Reports" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly employeeIdInput = this.smart({
    key: 'web-index-php-pim-addEmployee:unnamed-input-21',
    description: "unnamed-input-21",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=file]" },
    ],
  })

  readonly cancelButton = this.smart({
    key: 'web-index-php-pim-addEmployee:unnamed-button-22',
    description: "unnamed-button-22",
    strategies: [
      { name: 'role', selector: "none" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly firstName = this.smart({
    key: 'web-index-php-pim-addEmployee:firstName',
    description: "First Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "First Name" },
      { name: 'css', selector: "input[placeholder='First Name']" },
    ],
  })

  readonly middleName = this.smart({
    key: 'web-index-php-pim-addEmployee:middleName',
    description: "Middle Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Middle Name" },
      { name: 'css', selector: "input[placeholder='Middle Name']" },
    ],
  })

  readonly lastName = this.smart({
    key: 'web-index-php-pim-addEmployee:lastName',
    description: "Last Name",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Last Name" },
      { name: 'css', selector: "input[placeholder='Last Name']" },
    ],
  })

  readonly usernameInput = this.smart({
    key: 'web-index-php-pim-addEmployee:unnamed-input-26',
    description: "unnamed-input-26",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly createLoginDetailsCheckbox = this.smart({
    key: 'web-index-php-pim-addEmployee:unnamed-input-27',
    description: "unnamed-input-27",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly cancel = this.smart({
    key: 'web-index-php-pim-addEmployee:cancel',
    description: "Cancel",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Cancel" },
      { name: 'text', selector: "text=Cancel" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly save = this.smart({
    key: 'web-index-php-pim-addEmployee:save',
    description: "Save",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Save" },
      { name: 'text', selector: "text=Save" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-pim-addEmployee:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly pimMenuLink: Locator = this.page.locator("role=link")

  readonly addEmployeeButton: Locator = this.page.locator("role=none")

  readonly submitButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, employeeIdInput: string, firstName: string, middleName: string, lastName: string, usernameInput: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.employeeIdInput.resolve({ assertionType: 'fill', expectedValue: employeeIdInput })).fill(employeeIdInput)
    await (await this.firstName.resolve({ assertionType: 'fill', expectedValue: firstName })).fill(firstName)
    await (await this.middleName.resolve({ assertionType: 'fill', expectedValue: middleName })).fill(middleName)
    await (await this.lastName.resolve({ assertionType: 'fill', expectedValue: lastName })).fill(lastName)
    await (await this.usernameInput.resolve({ assertionType: 'fill', expectedValue: usernameInput })).fill(usernameInput)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
