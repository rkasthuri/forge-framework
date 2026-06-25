// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPimViewPimModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/pim/viewPimModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/pim/viewPimModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/pim/viewPimModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-pim-viewPimModule:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-pim-viewPimModule:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-pim-viewPimModule:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-pim-viewPimModule:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-pim-viewPimModule:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-pim-viewPimModule:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-pim-viewPimModule:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-pim-viewPimModule:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-pim-viewPimModule:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-pim-viewPimModule:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-pim-viewPimModule:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-pim-viewPimModule:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-pim-viewPimModule:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-pim-viewPimModule:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly employeeList = this.smart({
    key: 'web-index-php-pim-viewPimModule:employeeList',
    description: "Employee List",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee List" },
      { name: 'text', selector: "text=Employee List" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly addEmployee = this.smart({
    key: 'web-index-php-pim-viewPimModule:addEmployee',
    description: "Add Employee",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Add Employee" },
      { name: 'text', selector: "text=Add Employee" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly reports = this.smart({
    key: 'web-index-php-pim-viewPimModule:reports',
    description: "Reports",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Reports" },
      { name: 'text', selector: "text=Reports" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHintsEmployeeName = this.smart({
    key: 'web-index-php-pim-viewPimModule:typeForHintsEmployeeName',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly searchInput = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-23',
    description: "unnamed-input-23",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly typeForHintsSupervisorName = this.smart({
    key: 'web-index-php-pim-viewPimModule:typeForHintsSupervisorName',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-pim-viewPimModule:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=reset]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-pim-viewPimModule:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly firstRowCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-29',
    description: "unnamed-input-29",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly secondRowCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-32',
    description: "unnamed-input-32",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly thirdRowCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-35',
    description: "unnamed-input-35",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fourthRowCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-38',
    description: "unnamed-input-38",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fifthRowCheckbox = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-40',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox11 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox11',
    description: "unnamed-input-43",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox21 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox21',
    description: "unnamed-input-46",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox31 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox31',
    description: "unnamed-input-49",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox41 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox41',
    description: "unnamed-input-52",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox51 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox51',
    description: "unnamed-input-55",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox61 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox61',
    description: "unnamed-input-58",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox71 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox71',
    description: "unnamed-input-61",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox11_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox11_2',
    description: "unnamed-input-64",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox21_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox21_2',
    description: "unnamed-input-67",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox31_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox31_2',
    description: "unnamed-input-70",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox41_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox41_2',
    description: "unnamed-input-73",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox51_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox51_2',
    description: "unnamed-input-76",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox61_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox61_2',
    description: "unnamed-input-79",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimItemCheckbox71_2 = this.smart({
    key: 'web-index-php-pim-viewPimModule:pimItemCheckbox71_2',
    description: "unnamed-input-82",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimSelectionCheckbox85 = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-85',
    description: "unnamed-input-85",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimSelectionCheckbox88 = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-88',
    description: "unnamed-input-88",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimSelectionCheckbox91 = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-91',
    description: "unnamed-input-91",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimSelectionCheckbox94 = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-94',
    description: "unnamed-input-94",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly pimSelectionCheckbox97 = this.smart({
    key: 'web-index-php-pim-viewPimModule:unnamed-input-97',
    description: "unnamed-input-97",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly pimModuleLink: Locator = this.page.locator("role=link")

  readonly addButton: Locator = this.page.locator("role=none")

  readonly editButton: Locator = this.page.locator("role=button")

  readonly deleteButton: Locator = this.page.locator("role=button")

  readonly firstRowEditButton: Locator = this.page.locator("role=button")

  readonly firstRowDeleteButton: Locator = this.page.locator("role=button")

  readonly secondRowEditButton: Locator = this.page.locator("role=button")

  readonly secondRowDeleteButton: Locator = this.page.locator("role=button")

  readonly thirdRowEditButton: Locator = this.page.locator("role=button")

  readonly thirdRowDeleteButton: Locator = this.page.locator("role=button")

  readonly fourthRowEditButton: Locator = this.page.locator("role=button")

  readonly fifthRowEditButton: Locator = this.page.locator("role=button")

  readonly fifthRowDeleteButton: Locator = this.page.locator("role=button")

  readonly pimItemEditButton11: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton1: Locator = this.page.locator("role=button")

  readonly pimItemEditButton21: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton2: Locator = this.page.locator("role=button")

  readonly pimItemEditButton31: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton3: Locator = this.page.locator("role=button")

  readonly pimItemEditButton41: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton4: Locator = this.page.locator("role=button")

  readonly pimItemEditButton51: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton5: Locator = this.page.locator("role=button")

  readonly pimItemEditButton61: Locator = this.page.locator("role=button")

  readonly pimItemDeleteButton6: Locator = this.page.locator("role=button")

  readonly pimItemEditButton7: Locator = this.page.locator("role=button")

  readonly pimItemButton1: Locator = this.page.locator("role=button")

  readonly pimItemEditButton11_2: Locator = this.page.locator("role=button")

  readonly pimItemButton2: Locator = this.page.locator("role=button")

  readonly pimItemEditButton21_2: Locator = this.page.locator("role=button")

  readonly pimItemButton3: Locator = this.page.locator("role=button")

  readonly pimItemEditButton31_2: Locator = this.page.locator("role=button")

  readonly pimItemButton4: Locator = this.page.locator("role=button")

  readonly pimItemEditButton41_2: Locator = this.page.locator("role=button")

  readonly pimItemButton5: Locator = this.page.locator("role=button")

  readonly pimItemEditButton51_2: Locator = this.page.locator("role=button")

  readonly pimItemButton6: Locator = this.page.locator("role=button")

  readonly pimItemEditButton61_2: Locator = this.page.locator("role=button")

  readonly pimItemButton7: Locator = this.page.locator("role=button")

  readonly pimActionButton83: Locator = this.page.locator("role=button")

  readonly pimActionButton84: Locator = this.page.locator("role=button")

  readonly pimActionButton86: Locator = this.page.locator("role=button")

  readonly pimActionButton87: Locator = this.page.locator("role=button")

  readonly pimActionButton89: Locator = this.page.locator("role=button")

  readonly pimActionButton90: Locator = this.page.locator("role=button")

  readonly pimActionButton92: Locator = this.page.locator("role=button")

  readonly pimActionButton93: Locator = this.page.locator("role=button")

  readonly pimActionButton95: Locator = this.page.locator("role=button")

  readonly pimActionButton96: Locator = this.page.locator("role=button")

  readonly pimActionButton98: Locator = this.page.locator("role=button")

  readonly pimActionButton99: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHintsEmployeeName: string, searchInput: string, typeForHintsSupervisorName: string): Promise<void> {
    await (await this.search.resolve()).fill(search)
    await (await this.typeForHintsEmployeeName.resolve()).fill(typeForHintsEmployeeName)
    await (await this.searchInput.resolve()).fill(searchInput)
    await (await this.typeForHintsSupervisorName.resolve()).fill(typeForHintsSupervisorName)
    await (await this.upgrade_2.resolve()).click()
  }
}
