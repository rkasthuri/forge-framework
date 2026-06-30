// @generated from app-model.json v1.0.26 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class CheckoutStepOneHtmlPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/checkout-step-one.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/checkout-step-one.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/checkout-step-one.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly headerContainer = this.smart({
    key: 'checkout-step-one-html:headerContainer',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"header-container\"]" },
      { name: 'id', selector: "#header_container" },
      { name: 'css', selector: "#header_container" },
    ],
  })

  readonly primaryHeader = this.smart({
    key: 'checkout-step-one-html:primaryHeader',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"primary-header\"]" },
      { name: 'css', selector: "[data-test=\"primary-header\"]" },
    ],
  })

  readonly reactBurgerMenuBtn = this.smart({
    key: 'checkout-step-one-html:reactBurgerMenuBtn',
    description: "Open Menu",
    strategies: [
      { name: 'id', selector: "#react-burger-menu-btn" },
      { name: 'role', selector: "button", accessibleName: "Open Menu" },
      { name: 'text', selector: "text=Open Menu" },
      { name: 'css', selector: "#react-burger-menu-btn" },
    ],
  })

  readonly inventorySidebarLink = this.smart({
    key: 'checkout-step-one-html:inventorySidebarLink',
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
    key: 'checkout-step-one-html:aboutSidebarLink',
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
    key: 'checkout-step-one-html:logoutSidebarLink',
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
    key: 'checkout-step-one-html:resetSidebarLink',
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
    key: 'checkout-step-one-html:reactBurgerCrossBtn',
    description: "Close Menu",
    strategies: [
      { name: 'id', selector: "#react-burger-cross-btn" },
      { name: 'role', selector: "button", accessibleName: "Close Menu" },
      { name: 'text', selector: "text=Close Menu" },
      { name: 'css', selector: "#react-burger-cross-btn" },
    ],
  })

  readonly shoppingCartLink = this.smart({
    key: 'checkout-step-one-html:shoppingCartLink',
    description: "shoppingCartLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"shopping-cart-link\"]" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "[data-test=\"shopping-cart-link\"]" },
    ],
  })

  readonly secondaryHeader = this.smart({
    key: 'checkout-step-one-html:secondaryHeader',
    description: "Checkout: Your Information",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"secondary-header\"]" },
      { name: 'text', selector: "text=Checkout: Your Information" },
      { name: 'css', selector: "[data-test=\"secondary-header\"]" },
    ],
  })

  readonly title = this.smart({
    key: 'checkout-step-one-html:title',
    description: "Checkout: Your Information",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"title\"]" },
      { name: 'text', selector: "text=Checkout: Your Information" },
      { name: 'css', selector: "[data-test=\"title\"]" },
    ],
  })

  readonly checkoutInfoContainer = this.smart({
    key: 'checkout-step-one-html:checkoutInfoContainer',
    description: "Cancel",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"checkout-info-container\"]" },
      { name: 'id', selector: "#checkout_info_container" },
      { name: 'text', selector: "text=Cancel" },
      { name: 'css', selector: "#checkout_info_container" },
    ],
  })

  readonly firstName = this.smart({
    key: 'checkout-step-one-html:firstName',
    description: "First Name",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"firstName\"]" },
      { name: 'id', selector: "#first-name" },
      { name: 'role', selector: "textbox", accessibleName: "First Name" },
      { name: 'css', selector: "#first-name" },
    ],
  })

  readonly lastName = this.smart({
    key: 'checkout-step-one-html:lastName',
    description: "Last Name",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"lastName\"]" },
      { name: 'id', selector: "#last-name" },
      { name: 'role', selector: "textbox", accessibleName: "Last Name" },
      { name: 'css', selector: "#last-name" },
    ],
  })

  readonly postalCode = this.smart({
    key: 'checkout-step-one-html:postalCode',
    description: "Zip/Postal Code",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"postalCode\"]" },
      { name: 'id', selector: "#postal-code" },
      { name: 'role', selector: "textbox", accessibleName: "Zip/Postal Code" },
      { name: 'css', selector: "#postal-code" },
    ],
  })

  readonly cancel = this.smart({
    key: 'checkout-step-one-html:cancel',
    description: "Cancel",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"cancel\"]" },
      { name: 'id', selector: "#cancel" },
      { name: 'role', selector: "button", accessibleName: "Cancel" },
      { name: 'text', selector: "text=Cancel" },
      { name: 'css', selector: "#cancel" },
    ],
  })

  readonly continue = this.smart({
    key: 'checkout-step-one-html:continue',
    description: "continue",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"continue\"]" },
      { name: 'id', selector: "#continue" },
      { name: 'role', selector: "textbox" },
      { name: 'css', selector: "#continue" },
    ],
  })

  readonly footer = this.smart({
    key: 'checkout-step-one-html:footer',
    description: "TwitterFacebookLinkedIn© 2026 Sauce Labs. All Righ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer\"]" },
      { name: 'css', selector: "[data-test=\"footer\"]" },
    ],
  })

  readonly socialTwitter = this.smart({
    key: 'checkout-step-one-html:socialTwitter',
    description: "Twitter",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-twitter\"]" },
      { name: 'role', selector: "link", accessibleName: "Twitter" },
      { name: 'text', selector: "text=Twitter" },
      { name: 'css', selector: "[data-test=\"social-twitter\"]" },
    ],
  })

  readonly socialFacebook = this.smart({
    key: 'checkout-step-one-html:socialFacebook',
    description: "Facebook",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-facebook\"]" },
      { name: 'role', selector: "link", accessibleName: "Facebook" },
      { name: 'text', selector: "text=Facebook" },
      { name: 'css', selector: "[data-test=\"social-facebook\"]" },
    ],
  })

  readonly socialLinkedin = this.smart({
    key: 'checkout-step-one-html:socialLinkedin',
    description: "LinkedIn",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-linkedin\"]" },
      { name: 'role', selector: "link", accessibleName: "LinkedIn" },
      { name: 'text', selector: "text=LinkedIn" },
      { name: 'css', selector: "[data-test=\"social-linkedin\"]" },
    ],
  })

  readonly footerCopy = this.smart({
    key: 'checkout-step-one-html:footerCopy',
    description: "© 2026 Sauce Labs. All Rights Reserved. Terms of S",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer-copy\"]" },
      { name: 'css', selector: "[data-test=\"footer-copy\"]" },
    ],
  })


  // ── Actions ────────────────────────────────────────────────────────────
  async submit(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await (await this.firstName.resolve()).fill(firstName)
    await (await this.lastName.resolve()).fill(lastName)
    await (await this.postalCode.resolve()).fill(postalCode)
    await (await this.reactBurgerMenuBtn.resolve()).click()
  }
}
