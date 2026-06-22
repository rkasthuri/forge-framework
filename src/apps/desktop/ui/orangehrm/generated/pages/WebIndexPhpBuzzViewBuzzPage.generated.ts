// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class WebIndexPhpBuzzViewBuzzPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/web/index.php/buzz/viewBuzz"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/web/index.php/buzz/viewBuzz") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/web/index.php/buzz/viewBuzz")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly post = this.smart({
    key: 'web-index-php-buzz-viewBuzz:post',
    description: "Post",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Post" },
      { name: 'text', selector: "text=Post" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly viewBuzzLink: Locator = this.page.locator("role=link")

  readonly search: Locator = this.page.locator("role=textbox[name=\"Search\"]")

  readonly likeBuzzButton: Locator = this.page.locator("role=none")

  readonly admin: Locator = this.page.locator("role=link[name=\"Admin\"]")

  readonly pIM: Locator = this.page.locator("role=link[name=\"PIM\"]")

  readonly leave: Locator = this.page.locator("role=link[name=\"Leave\"]")

  readonly time: Locator = this.page.locator("role=link[name=\"Time\"]")

  readonly recruitment: Locator = this.page.locator("role=link[name=\"Recruitment\"]")

  readonly myInfo: Locator = this.page.locator("role=link[name=\"My Info\"]")

  readonly performance: Locator = this.page.locator("role=link[name=\"Performance\"]")

  readonly dashboard: Locator = this.page.locator("role=link[name=\"Dashboard\"]")

  readonly directory: Locator = this.page.locator("role=link[name=\"Directory\"]")

  readonly maintenance: Locator = this.page.locator("role=link[name=\"Maintenance\"]")

  readonly claim: Locator = this.page.locator("role=link[name=\"Claim\"]")

  readonly buzz: Locator = this.page.locator("role=link[name=\"Buzz\"]")

  readonly upgrade: Locator = this.page.locator("role=link[name=\"Upgrade\"]")

  readonly upgrade_2: Locator = this.page.locator("role=button[name=\"Upgrade\"]")

  readonly shareBuzzButton: Locator = this.page.locator("role=button")

  readonly whatsOnYourMind: Locator = this.page.locator("role=textbox[name=\"What's on your mind?\"]")

  readonly sharePhotos: Locator = this.page.locator("role=button[name=\"Share Photos\"]")

  readonly shareVideo: Locator = this.page.locator("role=button[name=\"Share Video\"]")

  readonly mostRecentPosts: Locator = this.page.locator("role=button[name=\"Most Recent Posts\"]")

  readonly mostLikedPosts: Locator = this.page.locator("role=button[name=\"Most Liked Posts\"]")

  readonly mostCommentedPosts: Locator = this.page.locator("role=button[name=\"Most Commented Posts\"]")

  readonly orangeHRMInc: Locator = this.page.locator("role=link[name=\"OrangeHRM, Inc\"]")

}
