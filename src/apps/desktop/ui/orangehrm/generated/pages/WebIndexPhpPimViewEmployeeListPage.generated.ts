// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimViewEmployeeListPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/viewEmployeeList"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/viewEmployeeList") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/viewEmployeeList")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly employeeList = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeList',
    description: "Employee List",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee List" },
      { name: 'text', selector: "text=Employee List" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly addEmployee = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:addEmployee',
    description: "Add Employee",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Add Employee" },
      { name: 'text', selector: "text=Add Employee" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reports = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:reports',
    description: "Reports",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Reports" },
      { name: 'text', selector: "text=Reports" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHintsEmployeeName = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:typeForHintsEmployeeName',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly employeeNameInput = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:unnamed-input-23',
    description: "unnamed-input-23",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly typeForHintsSupervisorName = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:typeForHintsSupervisorName',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=reset]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow1Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow1Checkbox1',
    description: "unnamed-input-29",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow2Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow2Checkbox1',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow3Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow3Checkbox1',
    description: "unnamed-input-35",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow4Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow4Checkbox1',
    description: "unnamed-input-38",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow5Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow5Checkbox1',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow1Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow1Checkbox1_2',
    description: "unnamed-input-43",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow2Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow2Checkbox1_2',
    description: "unnamed-input-46",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow3Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow3Checkbox1_2',
    description: "unnamed-input-49",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow4Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow4Checkbox1_2',
    description: "unnamed-input-52",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow5Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow5Checkbox1_2',
    description: "unnamed-input-55",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow6Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow6Checkbox1',
    description: "unnamed-input-58",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow7Checkbox1 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow7Checkbox1',
    description: "unnamed-input-61",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow1Checkbox1_3 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow1Checkbox1_3',
    description: "unnamed-input-64",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow2Checkbox1_3 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow2Checkbox1_3',
    description: "unnamed-input-67",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow3Checkbox1_3 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow3Checkbox1_3',
    description: "unnamed-input-70",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow4Checkbox1_3 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow4Checkbox1_3',
    description: "unnamed-input-73",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow5Checkbox1_3 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow5Checkbox1_3',
    description: "unnamed-input-76",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow6Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow6Checkbox1_2',
    description: "unnamed-input-79",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow7Checkbox1_2 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow7Checkbox1_2',
    description: "unnamed-input-82",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow1Checkbox1_4 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow1Checkbox1_4',
    description: "unnamed-input-85",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow2Checkbox1_4 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow2Checkbox1_4',
    description: "unnamed-input-88",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow3Checkbox1_4 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow3Checkbox1_4',
    description: "unnamed-input-91",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow4Checkbox1_4 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow4Checkbox1_4',
    description: "unnamed-input-94",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly employeeRow5Checkbox1_4 = this.smart({
    key: 'web-index-php-pim-viewEmployeeList:employeeRow5Checkbox1_4',
    description: "unnamed-input-97",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly addEmployeeLink: Locator = this.page.locator("role=link")

  readonly searchButton: Locator = this.page.locator("role=none")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly deleteSelectedButton: Locator = this.page.locator("role=button")

  readonly employeeRow1EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow1DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow2EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow2DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow3EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow3DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow4EditButton9: Locator = this.page.locator("role=button")

  readonly employeeRow5EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow5DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow1EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow1DeleteButton2_2: Locator = this.page.locator("role=button")

  readonly employeeRow2EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow2DeleteButton2_2: Locator = this.page.locator("role=button")

  readonly employeeRow3EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow3DeleteButton2_2: Locator = this.page.locator("role=button")

  readonly employeeRow4EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow4DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow5EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow5DeleteButton2_2: Locator = this.page.locator("role=button")

  readonly employeeRow6EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow6DeleteButton2: Locator = this.page.locator("role=button")

  readonly employeeRow7EditButton1: Locator = this.page.locator("role=button")

  readonly employeeRow1EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow1DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow2EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow2DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow3EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow3DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow4EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow4DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow5EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow5DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow6EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow6DeleteButton1: Locator = this.page.locator("role=button")

  readonly employeeRow7EditButton2: Locator = this.page.locator("role=button")

  readonly employeeRow1EditButton1_3: Locator = this.page.locator("role=button")

  readonly employeeRow1DeleteButton2_3: Locator = this.page.locator("role=button")

  readonly employeeRow2EditButton1_3: Locator = this.page.locator("role=button")

  readonly employeeRow2DeleteButton2_3: Locator = this.page.locator("role=button")

  readonly employeeRow3EditButton1_3: Locator = this.page.locator("role=button")

  readonly employeeRow3DeleteButton2_3: Locator = this.page.locator("role=button")

  readonly employeeRow4EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow4DeleteButton2_2: Locator = this.page.locator("role=button")

  readonly employeeRow5EditButton1_3: Locator = this.page.locator("role=button")

  readonly employeeRow5DeleteButton2_3: Locator = this.page.locator("role=button")

  readonly employeeRow6EditButton1_2: Locator = this.page.locator("role=button")

  readonly employeeRow6DeleteButton2_2: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHintsEmployeeName: string, employeeNameInput: string, typeForHintsSupervisorName: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.typeForHintsEmployeeName.resolve({ assertionType: 'fill', expectedValue: typeForHintsEmployeeName })).fill(typeForHintsEmployeeName)
    await (await this.employeeNameInput.resolve({ assertionType: 'fill', expectedValue: employeeNameInput })).fill(employeeNameInput)
    await (await this.typeForHintsSupervisorName.resolve({ assertionType: 'fill', expectedValue: typeForHintsSupervisorName })).fill(typeForHintsSupervisorName)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
