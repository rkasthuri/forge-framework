// @generated from app-model.json v1.0.17 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { Page, Locator } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'

export class InventoryHtmlPage extends BasePage {

  constructor(page: Page) {
    super(page)
  }

  // ── Abstract contract ────────────────────────────────────────────────────
  readonly pageUrl = "/inventory.html"
  async isLoaded(): Promise<boolean> { return this.page.url().includes("/inventory.html") }

  // ── Navigation ────────────────────────────────────────────────────────────
  async navigateTo(): Promise<void> {
    await this.page.goto("/inventory.html")
  }

  // ── Critical elements — SmartLocator wired ────────────────────────────────────────
  readonly headerContainer = this.smart({
    key: 'inventory-html:headerContainer',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"header-container\"]" },
      { name: 'id', selector: "#header_container" },
      { name: 'css', selector: "#header_container" },
    ],
  })

  readonly primaryHeader = this.smart({
    key: 'inventory-html:primaryHeader',
    description: "Open MenuAll ItemsAboutLogoutReset App StateClose ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"primary-header\"]" },
      { name: 'css', selector: "[data-test=\"primary-header\"]" },
    ],
  })

  readonly inventorySidebarLink = this.smart({
    key: 'inventory-html:inventorySidebarLink',
    description: "All Items",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-sidebar-link\"]" },
      { name: 'id', selector: "#inventory_sidebar_link" },
      { name: 'role', selector: "link[name='All Items']" },
      { name: 'text', selector: "text=All Items" },
      { name: 'css', selector: "#inventory_sidebar_link" },
    ],
  })

  readonly aboutSidebarLink = this.smart({
    key: 'inventory-html:aboutSidebarLink',
    description: "About",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"about-sidebar-link\"]" },
      { name: 'id', selector: "#about_sidebar_link" },
      { name: 'role', selector: "link[name='About']" },
      { name: 'text', selector: "text=About" },
      { name: 'css', selector: "#about_sidebar_link" },
    ],
  })

  readonly logoutSidebarLink = this.smart({
    key: 'inventory-html:logoutSidebarLink',
    description: "Logout",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"logout-sidebar-link\"]" },
      { name: 'id', selector: "#logout_sidebar_link" },
      { name: 'role', selector: "link[name='Logout']" },
      { name: 'text', selector: "text=Logout" },
      { name: 'css', selector: "#logout_sidebar_link" },
    ],
  })

  readonly resetSidebarLink = this.smart({
    key: 'inventory-html:resetSidebarLink',
    description: "Reset App State",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"reset-sidebar-link\"]" },
      { name: 'id', selector: "#reset_sidebar_link" },
      { name: 'role', selector: "link[name='Reset App State']" },
      { name: 'text', selector: "text=Reset App State" },
      { name: 'css', selector: "#reset_sidebar_link" },
    ],
  })

  readonly shoppingCartLink = this.smart({
    key: 'inventory-html:shoppingCartLink',
    description: "shoppingCartLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"shopping-cart-link\"]" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "[data-test=\"shopping-cart-link\"]" },
    ],
  })

  readonly secondaryHeader = this.smart({
    key: 'inventory-html:secondaryHeader',
    description: "ProductsName (A to Z)Name (A to Z)Name (Z to A)Pri",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"secondary-header\"]" },
      { name: 'css', selector: "[data-test=\"secondary-header\"]" },
    ],
  })

  readonly title = this.smart({
    key: 'inventory-html:title',
    description: "Products",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"title\"]" },
      { name: 'text', selector: "text=Products" },
      { name: 'css', selector: "[data-test=\"title\"]" },
    ],
  })

  readonly activeOption = this.smart({
    key: 'inventory-html:activeOption',
    description: "Name (A to Z)",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"active-option\"]" },
      { name: 'text', selector: "text=Name (A to Z)" },
      { name: 'css', selector: "[data-test=\"active-option\"]" },
    ],
  })

  readonly productSortContainer = this.smart({
    key: 'inventory-html:productSortContainer',
    description: "Name (A to Z)Name (Z to A)Price (low to high)Price",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"product-sort-container\"]" },
      { name: 'role', selector: "combobox[name='Name (A to Z)Name (Z to A)Price (low to high)Price']" },
      { name: 'css', selector: "[data-test=\"product-sort-container\"]" },
    ],
  })

  readonly inventoryContainer = this.smart({
    key: 'inventory-html:inventoryContainer',
    description: "Sauce Labs Backpackcarry.allTheThings() with the s",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-container\"]" },
      { name: 'id', selector: "#inventory_container" },
      { name: 'css', selector: "#inventory_container" },
    ],
  })

  readonly inventoryList = this.smart({
    key: 'inventory-html:inventoryList',
    description: "Sauce Labs Backpackcarry.allTheThings() with the s",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-list\"]" },
      { name: 'css', selector: "[data-test=\"inventory-list\"]" },
    ],
  })

  readonly inventoryItemSauceLabsBackpack = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBackpack',
    description: "Sauce Labs Backpackcarry.allTheThings() with the s",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item4ImgLink = this.smart({
    key: 'inventory-html:item4ImgLink',
    description: "item4ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-4-img-link\"]" },
      { name: 'id', selector: "#item_4_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_4_img_link" },
    ],
  })

  readonly inventoryItemSauceLabsBackpackImg = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBackpackImg',
    description: "inventoryItemSauceLabsBackpackImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-sauce-labs-backpack-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-sauce-labs-backpack-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionSauceLabsBackpack = this.smart({
    key: 'inventory-html:inventoryItemDescriptionSauceLabsBackpack',
    description: "Sauce Labs Backpackcarry.allTheThings() with the s",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item4TitleLink = this.smart({
    key: 'inventory-html:item4TitleLink',
    description: "Sauce Labs Backpack",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-4-title-link\"]" },
      { name: 'id', selector: "#item_4_title_link" },
      { name: 'role', selector: "link[name='Sauce Labs Backpack']" },
      { name: 'text', selector: "text=Sauce Labs Backpack" },
      { name: 'css', selector: "#item_4_title_link" },
    ],
  })

  readonly inventoryItemNameSauceLabsBackpack = this.smart({
    key: 'inventory-html:inventoryItemNameSauceLabsBackpack',
    description: "Sauce Labs Backpack",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'text', selector: "text=Sauce Labs Backpack" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescSauceLabsBackpack = this.smart({
    key: 'inventory-html:inventoryItemDescSauceLabsBackpack',
    description: "carry.allTheThings() with the sleek, streamlined S",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceSauceLabsBackpack = this.smart({
    key: 'inventory-html:inventoryItemPriceSauceLabsBackpack',
    description: "$29.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$29.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartSauceLabsBackpack = this.smart({
    key: 'inventory-html:addToCartSauceLabsBackpack',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-backpack\"]" },
      { name: 'id', selector: "#add-to-cart-sauce-labs-backpack" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-sauce-labs-backpack" },
    ],
  })

  readonly inventoryItemSauceLabsBikeLight = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBikeLight',
    description: "Sauce Labs Bike LightA red light isn't the desired",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item0ImgLink = this.smart({
    key: 'inventory-html:item0ImgLink',
    description: "item0ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-0-img-link\"]" },
      { name: 'id', selector: "#item_0_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_0_img_link" },
    ],
  })

  readonly inventoryItemSauceLabsBikeLightImg = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBikeLightImg',
    description: "inventoryItemSauceLabsBikeLightImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-sauce-labs-bike-light-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-sauce-labs-bike-light-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionSauceLabsBikeLight = this.smart({
    key: 'inventory-html:inventoryItemDescriptionSauceLabsBikeLight',
    description: "Sauce Labs Bike LightA red light isn't the desired",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item0TitleLink = this.smart({
    key: 'inventory-html:item0TitleLink',
    description: "Sauce Labs Bike Light",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-0-title-link\"]" },
      { name: 'id', selector: "#item_0_title_link" },
      { name: 'role', selector: "link[name='Sauce Labs Bike Light']" },
      { name: 'text', selector: "text=Sauce Labs Bike Light" },
      { name: 'css', selector: "#item_0_title_link" },
    ],
  })

  readonly inventoryItemNameSauceLabsBikeLight = this.smart({
    key: 'inventory-html:inventoryItemNameSauceLabsBikeLight',
    description: "Sauce Labs Bike Light",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'text', selector: "text=Sauce Labs Bike Light" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescSauceLabsBikeLight = this.smart({
    key: 'inventory-html:inventoryItemDescSauceLabsBikeLight',
    description: "A red light isn't the desired state in testing but",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceSauceLabsBikeLight = this.smart({
    key: 'inventory-html:inventoryItemPriceSauceLabsBikeLight',
    description: "$9.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$9.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartSauceLabsBikeLight = this.smart({
    key: 'inventory-html:addToCartSauceLabsBikeLight',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-bike-light\"]" },
      { name: 'id', selector: "#add-to-cart-sauce-labs-bike-light" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-sauce-labs-bike-light" },
    ],
  })

  readonly inventoryItemSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBoltTShirt',
    description: "Sauce Labs Bolt T-ShirtGet your testing superhero ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item1ImgLink = this.smart({
    key: 'inventory-html:item1ImgLink',
    description: "item1ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-1-img-link\"]" },
      { name: 'id', selector: "#item_1_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_1_img_link" },
    ],
  })

  readonly inventoryItemSauceLabsBoltTShirtImg = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsBoltTShirtImg',
    description: "inventoryItemSauceLabsBoltTShirtImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-sauce-labs-bolt-t-shirt-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:inventoryItemDescriptionSauceLabsBoltTShirt',
    description: "Sauce Labs Bolt T-ShirtGet your testing superhero ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item1TitleLink = this.smart({
    key: 'inventory-html:item1TitleLink',
    description: "Sauce Labs Bolt T-Shirt",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-1-title-link\"]" },
      { name: 'id', selector: "#item_1_title_link" },
      { name: 'role', selector: "link[name='Sauce Labs Bolt T-Shirt']" },
      { name: 'text', selector: "text=Sauce Labs Bolt T-Shirt" },
      { name: 'css', selector: "#item_1_title_link" },
    ],
  })

  readonly inventoryItemNameSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:inventoryItemNameSauceLabsBoltTShirt',
    description: "Sauce Labs Bolt T-Shirt",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'text', selector: "text=Sauce Labs Bolt T-Shirt" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:inventoryItemDescSauceLabsBoltTShirt',
    description: "Get your testing superhero on with the Sauce Labs ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:inventoryItemPriceSauceLabsBoltTShirt',
    description: "$15.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$15.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartSauceLabsBoltTShirt = this.smart({
    key: 'inventory-html:addToCartSauceLabsBoltTShirt',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-bolt-t-shirt\"]" },
      { name: 'id', selector: "#add-to-cart-sauce-labs-bolt-t-shirt" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-sauce-labs-bolt-t-shirt" },
    ],
  })

  readonly inventoryItemSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsFleeceJacket',
    description: "Sauce Labs Fleece JacketIt's not every day that yo",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item5ImgLink = this.smart({
    key: 'inventory-html:item5ImgLink',
    description: "item5ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-5-img-link\"]" },
      { name: 'id', selector: "#item_5_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_5_img_link" },
    ],
  })

  readonly inventoryItemSauceLabsFleeceJacketImg = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsFleeceJacketImg',
    description: "inventoryItemSauceLabsFleeceJacketImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-sauce-labs-fleece-jacket-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:inventoryItemDescriptionSauceLabsFleeceJacket',
    description: "Sauce Labs Fleece JacketIt's not every day that yo",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item5TitleLink = this.smart({
    key: 'inventory-html:item5TitleLink',
    description: "Sauce Labs Fleece Jacket",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-5-title-link\"]" },
      { name: 'id', selector: "#item_5_title_link" },
      { name: 'role', selector: "link[name='Sauce Labs Fleece Jacket']" },
      { name: 'text', selector: "text=Sauce Labs Fleece Jacket" },
      { name: 'css', selector: "#item_5_title_link" },
    ],
  })

  readonly inventoryItemNameSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:inventoryItemNameSauceLabsFleeceJacket',
    description: "Sauce Labs Fleece Jacket",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'text', selector: "text=Sauce Labs Fleece Jacket" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:inventoryItemDescSauceLabsFleeceJacket',
    description: "It's not every day that you come across a midweigh",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:inventoryItemPriceSauceLabsFleeceJacket',
    description: "$49.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$49.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartSauceLabsFleeceJacket = this.smart({
    key: 'inventory-html:addToCartSauceLabsFleeceJacket',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]" },
      { name: 'id', selector: "#add-to-cart-sauce-labs-fleece-jacket" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-sauce-labs-fleece-jacket" },
    ],
  })

  readonly inventoryItemSauceLabsOnesie = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsOnesie',
    description: "Sauce Labs OnesieRib snap infant onesie for the ju",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item2ImgLink = this.smart({
    key: 'inventory-html:item2ImgLink',
    description: "item2ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-2-img-link\"]" },
      { name: 'id', selector: "#item_2_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_2_img_link" },
    ],
  })

  readonly inventoryItemSauceLabsOnesieImg = this.smart({
    key: 'inventory-html:inventoryItemSauceLabsOnesieImg',
    description: "inventoryItemSauceLabsOnesieImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-sauce-labs-onesie-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-sauce-labs-onesie-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionSauceLabsOnesie = this.smart({
    key: 'inventory-html:inventoryItemDescriptionSauceLabsOnesie',
    description: "Sauce Labs OnesieRib snap infant onesie for the ju",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item2TitleLink = this.smart({
    key: 'inventory-html:item2TitleLink',
    description: "Sauce Labs Onesie",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-2-title-link\"]" },
      { name: 'id', selector: "#item_2_title_link" },
      { name: 'role', selector: "link[name='Sauce Labs Onesie']" },
      { name: 'text', selector: "text=Sauce Labs Onesie" },
      { name: 'css', selector: "#item_2_title_link" },
    ],
  })

  readonly inventoryItemNameSauceLabsOnesie = this.smart({
    key: 'inventory-html:inventoryItemNameSauceLabsOnesie',
    description: "Sauce Labs Onesie",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'text', selector: "text=Sauce Labs Onesie" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescSauceLabsOnesie = this.smart({
    key: 'inventory-html:inventoryItemDescSauceLabsOnesie',
    description: "Rib snap infant onesie for the junior automation e",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceSauceLabsOnesie = this.smart({
    key: 'inventory-html:inventoryItemPriceSauceLabsOnesie',
    description: "$7.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$7.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartSauceLabsOnesie = this.smart({
    key: 'inventory-html:addToCartSauceLabsOnesie',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-sauce-labs-onesie\"]" },
      { name: 'id', selector: "#add-to-cart-sauce-labs-onesie" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-sauce-labs-onesie" },
    ],
  })

  readonly inventoryItemTestallTheThingsTShirtRed = this.smart({
    key: 'inventory-html:inventoryItemTestallTheThingsTShirtRed',
    description: "Test.allTheThings() T-Shirt (Red)This classic Sauc",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item\"]" },
    ],
  })

  readonly item3ImgLink = this.smart({
    key: 'inventory-html:item3ImgLink',
    description: "item3ImgLink",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-3-img-link\"]" },
      { name: 'id', selector: "#item_3_img_link" },
      { name: 'role', selector: "link" },
      { name: 'css', selector: "#item_3_img_link" },
    ],
  })

  readonly inventoryItemTestallthethingsTShirtRedImg = this.smart({
    key: 'inventory-html:inventoryItemTestallthethingsTShirtRedImg',
    description: "inventoryItemTestallthethingsTShirtRedImg",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-test.allthethings()-t-shirt-(red)-img\"]" },
    ],
  })

  readonly inventoryItemDescriptionTestallTheThingsTShirtRed = this.smart({
    key: 'inventory-html:inventoryItemDescriptionTestallTheThingsTShirtRed',
    description: "Test.allTheThings() T-Shirt (Red)This classic Sauc",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-description\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-description\"]" },
    ],
  })

  readonly item3TitleLink = this.smart({
    key: 'inventory-html:item3TitleLink',
    description: "Test.allTheThings() T-Shirt (Red)",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"item-3-title-link\"]" },
      { name: 'id', selector: "#item_3_title_link" },
      { name: 'role', selector: "link[name='Test.allTheThings() T-Shirt (Red)']" },
      { name: 'css', selector: "#item_3_title_link" },
    ],
  })

  readonly inventoryItemNameTestallTheThingsTShirtRed = this.smart({
    key: 'inventory-html:inventoryItemNameTestallTheThingsTShirtRed',
    description: "Test.allTheThings() T-Shirt (Red)",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-name\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-name\"]" },
    ],
  })

  readonly inventoryItemDescTestallTheThingsTShirtRed = this.smart({
    key: 'inventory-html:inventoryItemDescTestallTheThingsTShirtRed',
    description: "This classic Sauce Labs t-shirt is perfect to wear",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-desc\"]" },
      { name: 'css', selector: "[data-test=\"inventory-item-desc\"]" },
    ],
  })

  readonly inventoryItemPriceTestallTheThingsTShirtRed = this.smart({
    key: 'inventory-html:inventoryItemPriceTestallTheThingsTShirtRed',
    description: "$15.99",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"inventory-item-price\"]" },
      { name: 'text', selector: "text=$15.99" },
      { name: 'css', selector: "[data-test=\"inventory-item-price\"]" },
    ],
  })

  readonly addToCartTestallthethingsTShirtRed = this.smart({
    key: 'inventory-html:addToCartTestallthethingsTShirtRed',
    description: "Add to cart",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"add-to-cart-test.allthethings()-t-shirt-(red)\"]" },
      { name: 'id', selector: "#add-to-cart-test.allthethings()-t-shirt-(red)" },
      { name: 'role', selector: "button[name='Add to cart']" },
      { name: 'text', selector: "text=Add to cart" },
      { name: 'css', selector: "#add-to-cart-test.allthethings()-t-shirt-(red)" },
    ],
  })

  readonly footer = this.smart({
    key: 'inventory-html:footer',
    description: "TwitterFacebookLinkedIn© 2026 Sauce Labs. All Righ",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer\"]" },
      { name: 'css', selector: "[data-test=\"footer\"]" },
    ],
  })

  readonly socialTwitter = this.smart({
    key: 'inventory-html:socialTwitter',
    description: "Twitter",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-twitter\"]" },
      { name: 'role', selector: "link[name='Twitter']" },
      { name: 'text', selector: "text=Twitter" },
      { name: 'css', selector: "[data-test=\"social-twitter\"]" },
    ],
  })

  readonly socialFacebook = this.smart({
    key: 'inventory-html:socialFacebook',
    description: "Facebook",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-facebook\"]" },
      { name: 'role', selector: "link[name='Facebook']" },
      { name: 'text', selector: "text=Facebook" },
      { name: 'css', selector: "[data-test=\"social-facebook\"]" },
    ],
  })

  readonly socialLinkedin = this.smart({
    key: 'inventory-html:socialLinkedin',
    description: "LinkedIn",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"social-linkedin\"]" },
      { name: 'role', selector: "link[name='LinkedIn']" },
      { name: 'text', selector: "text=LinkedIn" },
      { name: 'css', selector: "[data-test=\"social-linkedin\"]" },
    ],
  })

  readonly footerCopy = this.smart({
    key: 'inventory-html:footerCopy',
    description: "© 2026 Sauce Labs. All Rights Reserved. Terms of S",
    strategies: [
      { name: 'data-test', selector: "[data-test=\"footer-copy\"]" },
      { name: 'css', selector: "[data-test=\"footer-copy\"]" },
    ],
  })

  // ── Non-critical elements — plain locators ────────────────────────────────────────
  readonly reactBurgerMenuBtn: Locator = this.page.locator("#react-burger-menu-btn")

  readonly reactBurgerCrossBtn: Locator = this.page.locator("#react-burger-cross-btn")

}
