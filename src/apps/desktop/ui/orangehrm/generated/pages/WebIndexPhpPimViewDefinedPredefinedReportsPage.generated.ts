// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimViewDefinedPredefinedReportsPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/viewDefinedPredefinedReports"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/viewDefinedPredefinedReports") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/viewDefinedPredefinedReports")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly employeeList = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:employeeList',
    description: "Employee List",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee List" },
      { name: 'text', selector: "text=Employee List" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly addEmployee = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:addEmployee',
    description: "Add Employee",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Add Employee" },
      { name: 'text', selector: "text=Add Employee" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reports = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:reports',
    description: "Reports",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Reports" },
      { name: 'text', selector: "text=Reports" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:unnamed-input-26',
    description: "unnamed-input-26",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly firstReportCheckbox = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:unnamed-input-27',
    description: "unnamed-input-27",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly secondReportCheckbox = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:unnamed-input-31',
    description: "unnamed-input-31",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly thirdReportCheckbox = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:unnamed-input-35',
    description: "unnamed-input-35",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fourthReportCheckbox = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:unnamed-input-39',
    description: "unnamed-input-39",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-pim-viewDefinedPredefinedReports:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly predefinedReportsLink: Locator = this.page.locator("role=link")

  readonly addReportButton: Locator = this.page.locator("role=none")

  readonly searchButton: Locator = this.page.locator("role=button")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly firstReportEditButton: Locator = this.page.locator("role=button")

  readonly firstReportDeleteButton: Locator = this.page.locator("role=button")

  readonly firstReportRunButton: Locator = this.page.locator("role=button")

  readonly secondReportEditButton: Locator = this.page.locator("role=button")

  readonly secondReportDeleteButton: Locator = this.page.locator("role=button")

  readonly secondReportRunButton: Locator = this.page.locator("role=button")

  readonly thirdReportEditButton: Locator = this.page.locator("role=button")

  readonly thirdReportDeleteButton: Locator = this.page.locator("role=button")

  readonly thirdReportRunButton: Locator = this.page.locator("role=button")

  readonly fourthReportEditButton: Locator = this.page.locator("role=button")

  readonly fourthReportDeleteButton: Locator = this.page.locator("role=button")

  readonly viewReportsButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHints: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
