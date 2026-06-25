// @generated from app-model.json v1.0.26 sha256:9ab1f1a9e33a2f16
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
  readonly search = this.smart({
    key: 'web-index-php-buzz-viewBuzz:search',
    description: "Search",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "Search" },
      { name: 'css', selector: "input[placeholder='Search']" },
    ],
  })

  readonly admin = this.smart({
    key: 'web-index-php-buzz-viewBuzz:admin',
    description: "Admin",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Admin" },
      { name: 'text', selector: "text=Admin" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly pIM = this.smart({
    key: 'web-index-php-buzz-viewBuzz:pIM',
    description: "PIM",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "PIM" },
      { name: 'text', selector: "text=PIM" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly leave = this.smart({
    key: 'web-index-php-buzz-viewBuzz:leave',
    description: "Leave",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Leave" },
      { name: 'text', selector: "text=Leave" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly time = this.smart({
    key: 'web-index-php-buzz-viewBuzz:time',
    description: "Time",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Time" },
      { name: 'text', selector: "text=Time" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly recruitment = this.smart({
    key: 'web-index-php-buzz-viewBuzz:recruitment',
    description: "Recruitment",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Recruitment" },
      { name: 'text', selector: "text=Recruitment" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly myInfo = this.smart({
    key: 'web-index-php-buzz-viewBuzz:myInfo',
    description: "My Info",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "My Info" },
      { name: 'text', selector: "text=My Info" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly performance = this.smart({
    key: 'web-index-php-buzz-viewBuzz:performance',
    description: "Performance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Performance" },
      { name: 'text', selector: "text=Performance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly dashboard = this.smart({
    key: 'web-index-php-buzz-viewBuzz:dashboard',
    description: "Dashboard",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Dashboard" },
      { name: 'text', selector: "text=Dashboard" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly directory = this.smart({
    key: 'web-index-php-buzz-viewBuzz:directory',
    description: "Directory",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Directory" },
      { name: 'text', selector: "text=Directory" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly maintenance = this.smart({
    key: 'web-index-php-buzz-viewBuzz:maintenance',
    description: "Maintenance",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Maintenance" },
      { name: 'text', selector: "text=Maintenance" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly claim = this.smart({
    key: 'web-index-php-buzz-viewBuzz:claim',
    description: "Claim",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Claim" },
      { name: 'text', selector: "text=Claim" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly buzz = this.smart({
    key: 'web-index-php-buzz-viewBuzz:buzz',
    description: "Buzz",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Buzz" },
      { name: 'text', selector: "text=Buzz" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade = this.smart({
    key: 'web-index-php-buzz-viewBuzz:upgrade',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "a" },
    ],
  })

  readonly upgrade_2 = this.smart({
    key: 'web-index-php-buzz-viewBuzz:upgrade_2',
    description: "Upgrade",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Upgrade" },
      { name: 'text', selector: "text=Upgrade" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly whatsOnYourMind = this.smart({
    key: 'web-index-php-buzz-viewBuzz:whatsOnYourMind',
    description: "What's on your mind?",
    strategies: [
      { name: 'role', selector: "textbox", accessibleName: "What's on your mind?" },
      { name: 'css', selector: "textarea[placeholder='What's on your mind?']" },
    ],
  })

  readonly post = this.smart({
    key: 'web-index-php-buzz-viewBuzz:post',
    description: "Post",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Post" },
      { name: 'text', selector: "text=Post" },
      { name: 'css', selector: "button[type=submit]" },
    ],
  })

  readonly sharePhotos = this.smart({
    key: 'web-index-php-buzz-viewBuzz:sharePhotos',
    description: "Share Photos",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Share Photos" },
      { name: 'text', selector: "text=Share Photos" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly shareVideo = this.smart({
    key: 'web-index-php-buzz-viewBuzz:shareVideo',
    description: "Share Video",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Share Video" },
      { name: 'text', selector: "text=Share Video" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly mostRecentPosts = this.smart({
    key: 'web-index-php-buzz-viewBuzz:mostRecentPosts',
    description: "Most Recent Posts",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Most Recent Posts" },
      { name: 'text', selector: "text=Most Recent Posts" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly mostLikedPosts = this.smart({
    key: 'web-index-php-buzz-viewBuzz:mostLikedPosts',
    description: "Most Liked Posts",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Most Liked Posts" },
      { name: 'text', selector: "text=Most Liked Posts" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly mostCommentedPosts = this.smart({
    key: 'web-index-php-buzz-viewBuzz:mostCommentedPosts',
    description: "Most Commented Posts",
    strategies: [
      { name: 'role', selector: "button", accessibleName: "Most Commented Posts" },
      { name: 'text', selector: "text=Most Commented Posts" },
      { name: 'css', selector: "button[type=button]" },
    ],
  })

  readonly orangeHRMInc = this.smart({
    key: 'web-index-php-buzz-viewBuzz:orangeHRMInc',
    description: "OrangeHRM, Inc",
    strategies: [
      { name: 'role', selector: "link", accessibleName: "OrangeHRM, Inc" },
      { name: 'text', selector: "text=OrangeHRM, Inc" },
      { name: 'css', selector: "a" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly viewBuzzLink: Locator = this.page.locator("role=link")

  readonly buzzActionButton: Locator = this.page.locator("role=none")

  readonly buzzSecondaryButton: Locator = this.page.locator("role=button")

  // ── Actions ────────────────────────────────────────────────────────────
  async submit(search: string): Promise<void> {
    await (await this.search.resolve()).fill(search)
    await (await this.upgrade_2.resolve()).click()
  }
}
