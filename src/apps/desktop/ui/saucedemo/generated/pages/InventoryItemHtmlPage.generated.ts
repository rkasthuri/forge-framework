// @generated from app-model.json v1.0.17 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class InventoryItemHtmlPage extends BasePage {

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



  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly headerContainer: Locator = this.page.locator("[data-test=\"header-container\"]")

  readonly primaryHeader: Locator = this.page.locator("[data-test=\"primary-header\"]")

  readonly inventorySidebarLink: Locator = this.page.locator("[data-test=\"inventory-sidebar-link\"]")

  readonly aboutSidebarLink: Locator = this.page.locator("[data-test=\"about-sidebar-link\"]")

  readonly logoutSidebarLink: Locator = this.page.locator("[data-test=\"logout-sidebar-link\"]")

  readonly resetSidebarLink: Locator = this.page.locator("[data-test=\"reset-sidebar-link\"]")

  readonly shoppingCartLink: Locator = this.page.locator("[data-test=\"shopping-cart-link\"]")

  readonly secondaryHeader: Locator = this.page.locator("[data-test=\"secondary-header\"]")

  readonly backToProducts: Locator = this.page.locator("[data-test=\"back-to-products\"]")

  readonly inventoryContainer: Locator = this.page.locator("[data-test=\"inventory-container\"]")

  readonly inventoryItem: Locator = this.page.locator("[data-test=\"inventory-item\"]")

  readonly itemSauceLabsBackpackImg: Locator = this.page.locator("[data-test=\"item-sauce-labs-backpack-img\"]")

  readonly inventoryItemName: Locator = this.page.locator("[data-test=\"inventory-item-name\"]")

  readonly inventoryItemDesc: Locator = this.page.locator("[data-test=\"inventory-item-desc\"]")

  readonly inventoryItemPrice: Locator = this.page.locator("[data-test=\"inventory-item-price\"]")

  readonly addToCart: Locator = this.page.locator("[data-test=\"add-to-cart\"]")

  readonly footer: Locator = this.page.locator("[data-test=\"footer\"]")

  readonly socialTwitter: Locator = this.page.locator("[data-test=\"social-twitter\"]")

  readonly socialFacebook: Locator = this.page.locator("[data-test=\"social-facebook\"]")

  readonly socialLinkedin: Locator = this.page.locator("[data-test=\"social-linkedin\"]")

  readonly footerCopy: Locator = this.page.locator("[data-test=\"footer-copy\"]")

  readonly reactBurgerMenuBtn: Locator = this.page.locator("#react-burger-menu-btn")

  readonly reactBurgerCrossBtn: Locator = this.page.locator("#react-burger-cross-btn")

}
