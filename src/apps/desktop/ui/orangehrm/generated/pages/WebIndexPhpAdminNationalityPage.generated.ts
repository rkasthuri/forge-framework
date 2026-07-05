// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminNationalityPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/nationality"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/nationality") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/nationality")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-admin-nationality:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-admin-nationality:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-admin-nationality:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-admin-nationality:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-admin-nationality:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-admin-nationality:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-admin-nationality:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-admin-nationality:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-admin-nationality:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-admin-nationality:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-admin-nationality:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-admin-nationality:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-admin-nationality:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-admin-nationality:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-admin-nationality:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly nationalities = this.smart({
    key: 'web-index-php-admin-nationality:nationalities',
    description: "Nationalities",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Nationalities" },
      { name: 'text', selector: "text=Nationalities" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly corporateBranding = this.smart({
    key: 'web-index-php-admin-nationality:corporateBranding',
    description: "Corporate Branding",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Corporate Branding" },
      { name: 'text', selector: "text=Corporate Branding" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly add = this.smart({
    key: 'web-index-php-admin-nationality:add',
    description: "Add",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Add" },
      { name: 'text', selector: "text=Add" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly firstNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-21',
    description: "unnamed-input-21",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly secondNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-22',
    description: "unnamed-input-22",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly thirdNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-25',
    description: "unnamed-input-25",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fourthNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-28',
    description: "unnamed-input-28",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly fifthNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-31',
    description: "unnamed-input-31",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly sixthNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-34',
    description: "unnamed-input-34",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly seventhNationalityCheckbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-37',
    description: "unnamed-input-37",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox20 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-40',
    description: "unnamed-input-40",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox21 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-43',
    description: "unnamed-input-43",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox22 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-46',
    description: "unnamed-input-46",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox23 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-49',
    description: "unnamed-input-49",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox24 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-52',
    description: "unnamed-input-52",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly selectNationalityCheckbox25 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-55',
    description: "unnamed-input-55",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox1 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-58',
    description: "unnamed-input-58",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox2 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-61',
    description: "unnamed-input-61",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox3 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-64',
    description: "unnamed-input-64",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox4 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-67',
    description: "unnamed-input-67",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox5 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-70',
    description: "unnamed-input-70",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox6 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-73',
    description: "unnamed-input-73",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRowCheckbox7 = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-76',
    description: "unnamed-input-76",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow1Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-79',
    description: "unnamed-input-79",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow2Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-82',
    description: "unnamed-input-82",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow3Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-85',
    description: "unnamed-input-85",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow4Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-88',
    description: "unnamed-input-88",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow5Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-91',
    description: "unnamed-input-91",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow6Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-94',
    description: "unnamed-input-94",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly nationalityRow7Checkbox = this.smart({
    key: 'web-index-php-admin-nationality:unnamed-input-97',
    description: "unnamed-input-97",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly nationalityLink: Locator = this.page.locator("role=link")

  readonly addNationalityButton: Locator = this.page.locator("role=none")

  readonly firstNationalityEditButton: Locator = this.page.locator("role=button")

  readonly secondNationalityEditButton: Locator = this.page.locator("role=button")

  readonly secondNationalityDeleteButton: Locator = this.page.locator("role=button")

  readonly thirdNationalityEditButton: Locator = this.page.locator("role=button")

  readonly thirdNationalityDeleteButton: Locator = this.page.locator("role=button")

  readonly fourthNationalityEditButton: Locator = this.page.locator("role=button")

  readonly fourthNationalityDeleteButton: Locator = this.page.locator("role=button")

  readonly fifthNationalityEditButton: Locator = this.page.locator("role=button")

  readonly fifthNationalityDeleteButton: Locator = this.page.locator("role=button")

  readonly sixthNationalityEditButton: Locator = this.page.locator("role=button")

  readonly sixthNationalityDeleteButton: Locator = this.page.locator("role=button")

  readonly editNationalityButton20: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton20: Locator = this.page.locator("role=button")

  readonly editNationalityButton21: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton21: Locator = this.page.locator("role=button")

  readonly editNationalityButton22: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton22: Locator = this.page.locator("role=button")

  readonly editNationalityButton23: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton23: Locator = this.page.locator("role=button")

  readonly editNationalityButton24: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton24: Locator = this.page.locator("role=button")

  readonly editNationalityButton25: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton25: Locator = this.page.locator("role=button")

  readonly editNationalityButton26: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton26: Locator = this.page.locator("role=button")

  readonly editNationalityButton1: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton1: Locator = this.page.locator("role=button")

  readonly editNationalityButton2: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton2: Locator = this.page.locator("role=button")

  readonly editNationalityButton3: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton3: Locator = this.page.locator("role=button")

  readonly editNationalityButton4: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton4: Locator = this.page.locator("role=button")

  readonly editNationalityButton5: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton5: Locator = this.page.locator("role=button")

  readonly editNationalityButton6: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton6: Locator = this.page.locator("role=button")

  readonly editNationalityButton7: Locator = this.page.locator("role=button")

  readonly nationalityRow1EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow1DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow2EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow2DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow3EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow3DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow4EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow4DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow5EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow5DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow6EditButton: Locator = this.page.locator("role=button")

  readonly nationalityRow6DeleteButton: Locator = this.page.locator("role=button")

  readonly nationalityRow7EditButton: Locator = this.page.locator("role=button")

  readonly addNationalityButton_2: Locator = this.page.locator("role=button")

  readonly deleteNationalityButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
