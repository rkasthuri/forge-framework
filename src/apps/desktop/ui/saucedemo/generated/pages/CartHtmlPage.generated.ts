// @generated from app-model.json v1.0.25 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class CartHtmlPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/cart.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/cart.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/cart.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly headerContainer = this.smart({
    key: 'cart-html:headerContainer',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"header-container\"]" },
      { name: 'id', selector: "#header_container" },
      { name: 'css', selector: "#header_container" },
    ],
  })

  readonly primaryHeader = this.smart({
    key: 'cart-html:primaryHeader',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"primary-header\"]" },
      { name: 'css', selector: "[data-test=\"primary-header\"]" },
    ],
  })

  readonly reactBurgerMenuBtn = this.smart({
    key: 'cart-html:reactBurgerMenuBtn',
    description: "Open Menu",
    strategies: [
      { name: 'id', selector: "#react-burger-menu-btn" },
      { name: 'role', selector: "button", accessibleName: "Open Menu" },
      { name: 'text', selector: "text=Open Menu" },
      { name: 'css', selector: "#react-burger-menu-btn" },
    ],
  })

  readonly inventorySidebarLink = this.smart({
    key: 'cart-html:inventorySidebarLink',
    description: "All Items",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-sidebar-link\"]" },
      { name: 'id', selector: "#inventory_sidebar_link" },
      { name: 'role', selector: "link", accessibleName: "All Items" },
      { name: 'text', selector: "text=All Items" },
      { name: 'css', selector: "#inventory_sidebar_link" },
    ],
  })

  readonly aboutSidebarLink = this.smart({
    key: 'cart-html:aboutSidebarLink',
    description: "About",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"about-sidebar-link\"]" },
      { name: 'id', selector: "#about_sidebar_link" },
      { name: 'role', selector: "link", accessibleName: "About" },
      { name: 'text', selector: "text=About" },
      { name: 'css', selector: "#about_sidebar_link" },
    ],
  })

  readonly logoutSidebarLink = this.smart({
    key: 'cart-html:logoutSidebarLink',
    description: "Logout",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"logout-sidebar-link\"]" },
      { name: 'id', selector: "#logout_sidebar_link" },
      { name: 'role', selector: "link", accessibleName: "Logout" },
      { name: 'text', selector: "text=Logout" },
      { name: 'css', selector: "#logout_sidebar_link" },
    ],
  })

  readonly resetSidebarLink = this.smart({
    key: 'cart-html:resetSidebarLink',
    description: "Reset App State",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"reset-sidebar-link\"]" },
      { name: 'id', selector: "#reset_sidebar_link" },
      { name: 'role', selector: "link", accessibleName: "Reset App State" },
      { name: 'text', selector: "text=Reset App State" },
      { name: 'css', selector: "#reset_sidebar_link" },
    ],
  })

  readonly reactBurgerCrossBtn = this.smart({
    key: 'cart-html:reactBurgerCrossBtn',
    description: "Close Menu",
    strategies: [
      { name: 'id', selector: "#react-burger-cross-btn" },
      { name: 'role', selector: "button", accessibleName: "Close Menu" },
      { name: 'text', selector: "text=Close Menu" },
      { name: 'css', selector: "#react-burger-cross-btn" },
    ],
  })

  readonly shoppingCartLink = this.smart({
    key: 'cart-html:shoppingCartLink',
    description: "shoppingCartLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"shopping-cart-link\"]" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "[data-test=\"shopping-cart-link\"]" },
    ],
  })

  readonly secondaryHeader = this.smart({
    key: 'cart-html:secondaryHeader',
    description: "Your Cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"secondary-header\"]" },
      { name: 'text', selector: "text=Your Cart" },
      { name: 'css', selector: "[data-test=\"secondary-header\"]" },
    ],
  })

  readonly title = this.smart({
    key: 'cart-html:title',
    description: "Your Cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"title\"]" },
      { name: 'text', selector: "text=Your Cart" },
      { name: 'css', selector: "[data-test=\"title\"]" },
    ],
  })

  readonly cartContentsContainer = this.smart({
    key: 'cart-html:cartContentsContainer',
    description: "QTYDescriptionContinue ShoppingCheckout",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"cart-contents-container\"]" },
      { name: 'id', selector: "#cart_contents_container" },
      { name: 'css', selector: "#cart_contents_container" },
    ],
  })

  readonly cartList = this.smart({
    key: 'cart-html:cartList',
    description: "QTYDescription",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"cart-list\"]" },
      { name: 'text', selector: "text=QTYDescription" },
      { name: 'css', selector: "[data-test=\"cart-list\"]" },
    ],
  })

  readonly cartQuantityLabel = this.smart({
    key: 'cart-html:cartQuantityLabel',
    description: "QTY",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"cart-quantity-label\"]" },
      { name: 'text', selector: "text=QTY" },
      { name: 'css', selector: "[data-test=\"cart-quantity-label\"]" },
    ],
  })

  readonly cartDescLabel = this.smart({
    key: 'cart-html:cartDescLabel',
    description: "Description",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"cart-desc-label\"]" },
      { name: 'text', selector: "text=Description" },
      { name: 'css', selector: "[data-test=\"cart-desc-label\"]" },
    ],
  })

  readonly continueShopping = this.smart({
    key: 'cart-html:continueShopping',
    description: "Continue Shopping",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"continue-shopping\"]" },
      { name: 'id', selector: "#continue-shopping" },
      { name: 'role', selector: "button", accessibleName: "Continue Shopping" },
      { name: 'text', selector: "text=Continue Shopping" },
      { name: 'css', selector: "#continue-shopping" },
    ],
  })

  readonly checkout = this.smart({
    key: 'cart-html:checkout',
    description: "Checkout",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"checkout\"]" },
      { name: 'id', selector: "#checkout" },
      { name: 'role', selector: "button", accessibleName: "Checkout" },
      { name: 'text', selector: "text=Checkout" },
      { name: 'css', selector: "#checkout" },
    ],
  })

  readonly footer = this.smart({
    key: 'cart-html:footer',
    description: "TwitterFacebookLinkedIn© 2026 Sauce Labs. All Righ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer\"]" },
      { name: 'css', selector: "[data-test=\"footer\"]" },
    ],
  })

  readonly socialTwitter = this.smart({
    key: 'cart-html:socialTwitter',
    description: "Twitter",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-twitter\"]" },
      { name: 'role', selector: "link", accessibleName: "Twitter" },
      { name: 'text', selector: "text=Twitter" },
      { name: 'css', selector: "[data-test=\"social-twitter\"]" },
    ],
  })

  readonly socialFacebook = this.smart({
    key: 'cart-html:socialFacebook',
    description: "Facebook",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-facebook\"]" },
      { name: 'role', selector: "link", accessibleName: "Facebook" },
      { name: 'text', selector: "text=Facebook" },
      { name: 'css', selector: "[data-test=\"social-facebook\"]" },
    ],
  })

  readonly socialLinkedin = this.smart({
    key: 'cart-html:socialLinkedin',
    description: "LinkedIn",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-linkedin\"]" },
      { name: 'role', selector: "link", accessibleName: "LinkedIn" },
      { name: 'text', selector: "text=LinkedIn" },
      { name: 'css', selector: "[data-test=\"social-linkedin\"]" },
    ],
  })

  readonly footerCopy = this.smart({
    key: 'cart-html:footerCopy',
    description: "© 2026 Sauce Labs. All Rights Reserved. Terms of S",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer-copy\"]" },
      { name: 'css', selector: "[data-test=\"footer-copy\"]" },
    ],
  })


}
