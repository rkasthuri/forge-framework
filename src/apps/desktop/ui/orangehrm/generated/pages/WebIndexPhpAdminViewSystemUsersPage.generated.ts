// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminViewSystemUsersPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/viewSystemUsers"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/viewSystemUsers") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/viewSystemUsers")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly nationalities = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:nationalities',
    description: "Nationalities",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Nationalities" },
      { name: 'text', selector: "text=Nationalities" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly corporateBranding = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:corporateBranding',
    description: "Corporate Branding",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Corporate Branding" },
      { name: 'text', selector: "text=Corporate Branding" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly searchInput = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-21',
    description: "unnamed-input-21",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly selectAllCheckbox = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-26',
    description: "unnamed-input-26",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly userRowCheckbox1 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-27',
    description: "unnamed-input-27",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly userRowCheckbox2 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-30',
    description: "unnamed-input-30",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly userRowCheckbox3 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-33',
    description: "unnamed-input-33",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly userRowCheckbox4 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-36',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly userRowCheckbox5 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-39',
    description: "unnamed-input-39",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox1 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-42',
    description: "unnamed-input-42",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox2 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-45',
    description: "unnamed-input-45",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox3 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-48',
    description: "unnamed-input-48",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox4 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-51',
    description: "unnamed-input-51",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox5 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-54',
    description: "unnamed-input-54",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectUserCheckbox6 = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:unnamed-input-57',
    description: "unnamed-input-57",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-admin-viewSystemUsers:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly adminLink: Locator = this.page.locator("role=link")

  readonly addUserButton: Locator = this.page.locator("role=none")

  readonly searchButton: Locator = this.page.locator("role=button")

  readonly resetButton: Locator = this.page.locator("role=button")

  readonly editUserButton11: Locator = this.page.locator("role=button")

  readonly deleteUserButton12: Locator = this.page.locator("role=button")

  readonly editUserButton21: Locator = this.page.locator("role=button")

  readonly deleteUserButton22: Locator = this.page.locator("role=button")

  readonly editUserButton31: Locator = this.page.locator("role=button")

  readonly deleteUserButton32: Locator = this.page.locator("role=button")

  readonly editUserButton41: Locator = this.page.locator("role=button")

  readonly deleteUserButton42: Locator = this.page.locator("role=button")

  readonly editUserButton51: Locator = this.page.locator("role=button")

  readonly userRowButton1: Locator = this.page.locator("role=button")

  readonly editUserButton11_2: Locator = this.page.locator("role=button")

  readonly deleteUserButton12_2: Locator = this.page.locator("role=button")

  readonly editUserButton21_2: Locator = this.page.locator("role=button")

  readonly deleteUserButton22_2: Locator = this.page.locator("role=button")

  readonly editUserButton31_2: Locator = this.page.locator("role=button")

  readonly deleteUserButton32_2: Locator = this.page.locator("role=button")

  readonly editUserButton41_2: Locator = this.page.locator("role=button")

  readonly deleteUserButton42_2: Locator = this.page.locator("role=button")

  readonly editUserButton51_2: Locator = this.page.locator("role=button")

  readonly deleteUserButton5: Locator = this.page.locator("role=button")

  readonly editUserButton6: Locator = this.page.locator("role=button")

  readonly deleteUserButton6: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, searchInput: string, typeForHints: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.searchInput.resolve({ assertionType: 'fill', expectedValue: searchInput })).fill(searchInput)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
