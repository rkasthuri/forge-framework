import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly shoppingCartLink: Locator;
  readonly menuButton: Locator;
  readonly inventoryItems: Locator;
  readonly addToCartButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.title');
    this.shoppingCartLink = page.locator('.shopping_cart_link');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.inventoryItems = page.locator('.inventory_item');
    this.addToCartButtons = page.locator('[data-test^="add-to-cart"]');
  }

  async isLoaded(): Promise<boolean> {
    return await this.pageTitle.isVisible() && 
           await this.shoppingCartLink.isVisible();
  }

  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }

  async getInventoryItemCount(): Promise<number> {
    return await this.inventoryItems.count();
  }

  async addFirstItemToCart() {
    await this.addToCartButtons.first().click();
  }

  async getCartBadgeCount(): Promise<string> {
    const badge = this.page.locator('.shopping_cart_badge');
    if (await badge.isVisible()) {
      return await badge.textContent() || '0';
    }
    return '0';
  }
} 