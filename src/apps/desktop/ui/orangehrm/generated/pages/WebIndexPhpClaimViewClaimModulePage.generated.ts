// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpClaimViewClaimModulePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/claim/viewClaimModule"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/claim/viewClaimModule") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/claim/viewClaimModule")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-claim-viewClaimModule:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-claim-viewClaimModule:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-claim-viewClaimModule:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-claim-viewClaimModule:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-claim-viewClaimModule:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-claim-viewClaimModule:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-claim-viewClaimModule:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-claim-viewClaimModule:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-claim-viewClaimModule:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-claim-viewClaimModule:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-claim-viewClaimModule:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-claim-viewClaimModule:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-claim-viewClaimModule:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-claim-viewClaimModule:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly submitClaim = this.smart({
    key: 'web-index-php-claim-viewClaimModule:submitClaim',
    description: "Submit Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Submit Claim" },
      { name: 'text', selector: "text=Submit Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myClaims = this.smart({
    key: 'web-index-php-claim-viewClaimModule:myClaims',
    description: "My Claims",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Claims" },
      { name: 'text', selector: "text=My Claims" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly employeeClaims = this.smart({
    key: 'web-index-php-claim-viewClaimModule:employeeClaims',
    description: "Employee Claims",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Employee Claims" },
      { name: 'text', selector: "text=Employee Claims" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly assignClaim = this.smart({
    key: 'web-index-php-claim-viewClaimModule:assignClaim',
    description: "Assign Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Assign Claim" },
      { name: 'text', selector: "text=Assign Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly typeForHintsEmployeeName = this.smart({
    key: 'web-index-php-claim-viewClaimModule:typeForHintsEmployeeName',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly typeForHintsReferenceId = this.smart({
    key: 'web-index-php-claim-viewClaimModule:typeForHintsReferenceId',
    description: "Type for hints...",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Type for hints..." },
      { name: 'css', selector: "input[placeholder='Type for hints...']" },
    ],
  })

  readonly yyyyDdMmFromDate = this.smart({
    key: 'web-index-php-claim-viewClaimModule:yyyyDdMmFromDate',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly yyyyDdMmToDate = this.smart({
    key: 'web-index-php-claim-viewClaimModule:yyyyDdMmToDate',
    description: "yyyy-dd-mm",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "yyyy-dd-mm" },
      { name: 'css', selector: "input[placeholder='yyyy-dd-mm']" },
    ],
  })

  readonly reset = this.smart({
    key: 'web-index-php-claim-viewClaimModule:reset',
    description: "Reset",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset" },
      { name: 'text', selector: "text=Reset" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly search_2 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:search_2',
    description: "Search",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Search" },
      { name: 'text', selector: "text=Search" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly assignClaim_2 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:assignClaim_2',
    description: "Assign Claim",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Assign Claim" },
      { name: 'text', selector: "text=Assign Claim" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly viewDetails9 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:viewDetails9',
    description: "View Details",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View Details" },
      { name: 'text', selector: "text=View Details" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly viewDetails9_2 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:viewDetails9_2',
    description: "View Details",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View Details" },
      { name: 'text', selector: "text=View Details" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly viewDetails9_3 = this.smart({
    key: 'web-index-php-claim-viewClaimModule:viewDetails9_3',
    description: "View Details",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "View Details" },
      { name: 'text', selector: "text=View Details" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-claim-viewClaimModule:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly viewClaimLink: Locator = this.page.locator("role=link")

  readonly claimActionButton: Locator = this.page.locator("role=none")

  readonly claimSecondaryButton: Locator = this.page.locator("role=button")

  readonly claimTertiaryButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, typeForHintsEmployeeName: string, typeForHintsReferenceId: string, yyyyDdMmFromDate: string, yyyyDdMmToDate: string): Promise<void> {
    await (await this.search.resolve()).fill(search)
    await (await this.typeForHintsEmployeeName.resolve()).fill(typeForHintsEmployeeName)
    await (await this.typeForHintsReferenceId.resolve()).fill(typeForHintsReferenceId)
    await (await this.yyyyDdMmFromDate.resolve()).fill(yyyyDdMmFromDate)
    await (await this.yyyyDdMmToDate.resolve()).fill(yyyyDdMmToDate)
    await (await this.upgrade_2.resolve()).click()
  }
}
