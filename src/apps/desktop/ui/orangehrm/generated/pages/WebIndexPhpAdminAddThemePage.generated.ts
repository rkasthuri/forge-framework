// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpAdminAddThemePage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/admin/addTheme"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/admin/addTheme") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/admin/addTheme")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly search = this.smart({
    key: 'web-index-php-admin-addTheme:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-admin-addTheme:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-admin-addTheme:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-admin-addTheme:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-admin-addTheme:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-admin-addTheme:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-admin-addTheme:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-admin-addTheme:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-admin-addTheme:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-admin-addTheme:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-admin-addTheme:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-admin-addTheme:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-admin-addTheme:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-admin-addTheme:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-admin-addTheme:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly nationalities = this.smart({
    key: 'web-index-php-admin-addTheme:nationalities',
    description: "Nationalities",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Nationalities" },
      { name: 'text', selector: "text=Nationalities" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly corporateBranding = this.smart({
    key: 'web-index-php-admin-addTheme:corporateBranding',
    description: "Corporate Branding",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Corporate Branding" },
      { name: 'text', selector: "text=Corporate Branding" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly themeNameInput = this.smart({
    key: 'web-index-php-admin-addTheme:unnamed-input-20',
    description: "unnamed-input-20",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=file]" },
    ],
  })

  readonly themeDescriptionInput = this.smart({
    key: 'web-index-php-admin-addTheme:unnamed-input-21',
    description: "unnamed-input-21",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=file]" },
    ],
  })

  readonly themeColorInput = this.smart({
    key: 'web-index-php-admin-addTheme:unnamed-input-22',
    description: "unnamed-input-22",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=file]" },
    ],
  })

  readonly themeActiveCheckbox = this.smart({
    key: 'web-index-php-admin-addTheme:unnamed-input-23',
    description: "unnamed-input-23",
    strategies: [
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "input[type=checkbox]" },
    ],
  })

  readonly resetToDefault = this.smart({
    key: 'web-index-php-admin-addTheme:resetToDefault',
    description: "Reset to Default",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Reset to Default" },
      { name: 'text', selector: "text=Reset to Default" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly preview = this.smart({
    key: 'web-index-php-admin-addTheme:preview',
    description: "Preview",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Preview" },
      { name: 'text', selector: "text=Preview" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly publish = this.smart({
    key: 'web-index-php-admin-addTheme:publish',
    description: "Publish",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Publish" },
      { name: 'text', selector: "text=Publish" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-admin-addTheme:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly backLink: Locator = this.page.locator("role=link")

  readonly cancelButton: Locator = this.page.locator("role=none")

  readonly saveThemeButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string, themeNameInput: string, themeDescriptionInput: string, themeColorInput: string): Promise<void> {
    await (await this.search.resolve({ assertionType: 'fill', expectedValue: search })).fill(search)
    await (await this.themeNameInput.resolve({ assertionType: 'fill', expectedValue: themeNameInput })).fill(themeNameInput)
    await (await this.themeDescriptionInput.resolve({ assertionType: 'fill', expectedValue: themeDescriptionInput })).fill(themeDescriptionInput)
    await (await this.themeColorInput.resolve({ assertionType: 'fill', expectedValue: themeColorInput })).fill(themeColorInput)
    await (await this.upgrade_2.resolve({ assertionType: 'click' })).click()
  }
}
