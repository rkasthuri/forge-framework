// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpTimeViewEmployeeTimesheetPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/time/viewEmployeeTimesheet"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/time/viewEmployeeTimesheet") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/time/viewEmployeeTimesheet")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly view = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:view',
    description: "View",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View" },
      { name: 'text', selector: "text=View" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly view_2 = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:view_2',
    description: "View",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View" },
      { name: 'text', selector: "text=View" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly view_3 = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:view_3',
    description: "View",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View" },
      { name: 'text', selector: "text=View" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly view_4 = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:view_4',
    description: "View",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View" },
      { name: 'text', selector: "text=View" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly view_5 = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:view_5',
    description: "View",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View" },
      { name: 'text', selector: "text=View" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-time-viewEmployeeTimesheet:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly viewTimesheetLink: Locator = this.page.locator("role=link")

  readonly submitTimesheetButton: Locator = this.page.locator("role=none")

  readonly cancelTimesheetButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHints: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
