// @generated from app-model.json v1.0.0 sha256:placeholder-update-on-first-crawl
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class ProductDetailPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/inventory-item.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/inventory-item.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/inventory-item.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly backButton = this.smart({
    key: 'productDetail:backButton',
    description: "Back to products",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"back-to-products\"]" },
      { name: 'role', selector: "button[name='Back to products']" },
    ],
  })

  readonly addToCart = this.smart({
    key: 'productDetail:addToCart',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart\"]" },
      { name: 'role', selector: "button[name='Add to cart']" },
    ],
  })


}
