// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminViewAdminModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/viewAdminModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/viewAdminModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/viewAdminModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-admin-viewAdminModule:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-admin-viewAdminModule:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-admin-viewAdminModule:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-admin-viewAdminModule:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-admin-viewAdminModule:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-admin-viewAdminModule:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-admin-viewAdminModule:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-admin-viewAdminModule:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-admin-viewAdminModule:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-admin-viewAdminModule:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-admin-viewAdminModule:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-admin-viewAdminModule:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-admin-viewAdminModule:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-admin-viewAdminModule:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-admin-viewAdminModule:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly nationalities = this.smart({
    key: 'web-index-php-admin-viewAdminModule:nationalities',
    description: "Nationalities",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Nationalities" },
      { name: 'text', selector: "text=Nationalities" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly corporateBranding = this.smart({
    key: 'web-index-php-admin-viewAdminModule:corporateBranding',
    description: "Corporate Branding",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Corporate Branding" },
      { name: 'text', selector: "text=Corporate Branding" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly searchInput = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-21',
    description: "unnamed-input-21",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=text]" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-admin-viewAdminModule:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-admin-viewAdminModule:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-admin-viewAdminModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-admin-viewAdminModule:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly firstItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-26',
    description: "unnamed-input-26",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly secondItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-27',
    description: "unnamed-input-27",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly thirdItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-30',
    description: "unnamed-input-30",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fourthItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-33',
    description: "unnamed-input-33",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fifthItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-36',
    description: "unnamed-input-36",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly sixthItemCheckbox = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-39',
    description: "unnamed-input-39",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCheckbox1 = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-42',
    description: "unnamed-input-42",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectCheckbox2 = this.smart({
    key: 'web-index-php-admin-viewAdminModule:unnamed-input-45',
    description: "unnamed-input-45",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-admin-viewAdminModule:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly navigationLink: Locator = this.page.locator("role=link")

  readonly primaryActionButton: Locator = this.page.locator("role=none")

  readonly addButton: Locator = this.page.locator("role=button")

  readonly saveButton: Locator = this.page.locator("role=button")

  readonly firstEditButton: Locator = this.page.locator("role=button")

  readonly firstDeleteButton: Locator = this.page.locator("role=button")

  readonly secondEditButton: Locator = this.page.locator("role=button")

  readonly secondDeleteButton: Locator = this.page.locator("role=button")

  readonly thirdEditButton: Locator = this.page.locator("role=button")

  readonly thirdDeleteButton: Locator = this.page.locator("role=button")

  readonly fourthEditButton: Locator = this.page.locator("role=button")

  readonly fourthDeleteButton: Locator = this.page.locator("role=button")

  readonly fifthEditButton: Locator = this.page.locator("role=button")

  readonly actionButton1: Locator = this.page.locator("role=button")

  readonly actionButton2: Locator = this.page.locator("role=button")

  readonly actionButton3: Locator = this.page.locator("role=button")

  readonly actionButton4: Locator = this.page.locator("role=button")

  readonly actionButton5: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, searchInput: string, typeForHints: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.searchInput.resolve({ assertionType: 'fill', expectedValue: searchInput })).fill(searchInput)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
