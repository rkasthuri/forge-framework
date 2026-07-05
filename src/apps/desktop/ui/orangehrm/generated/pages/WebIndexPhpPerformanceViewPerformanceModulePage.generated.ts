// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpPerformanceViewPerformanceModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/performance/viewPerformanceModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/performance/viewPerformanceModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/performance/viewPerformanceModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly myTrackers = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:myTrackers',
    description: "My Trackers",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Trackers" },
      { name: 'text', selector: "text=My Trackers" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly employeeTrackers = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:employeeTrackers',
    description: "Employee Trackers",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee Trackers" },
      { name: 'text', selector: "text=Employee Trackers" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHints = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:typeForHints',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly yyyyDdMmFromDate = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:yyyyDdMmFromDate',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly yyyyDdMmToDate = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:yyyyDdMmToDate',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=reset]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly closeButton = this.smart({
    key: 'web-index-php-performance-viewPerformanceModule:unnamed-div-27',
    description: "×",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "×" },
      { name: 'text', selector: "text=×" },
      { name: 'css', selector: "div" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly performanceLink: Locator = this.page.locator("role=link")

  readonly primaryActionButton: Locator = this.page.locator("role=none")

  readonly secondaryActionButton: Locator = this.page.locator("role=button")

  readonly tertiaryActionButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHints: string, yyyyDdMmFromDate: string, yyyyDdMmToDate: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.typeForHints.resolve({ assertionType: 'fill', expectedValue: typeForHints })).fill(typeForHints)
    await (await this.yyyyDdMmFromDate.resolve({ assertionType: 'fill', expectedValue: yyyyDdMmFromDate })).fill(yyyyDdMmFromDate)
    await (await this.yyyyDdMmToDate.resolve({ assertionType: 'fill', expectedValue: yyyyDdMmToDate })).fill(yyyyDdMmToDate)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
