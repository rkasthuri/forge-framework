import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly cartItems: Locator;
  readonly removeButtons: Locator;
  readonly continueShoppingButton: Locator;
  readonly checkoutButton: Locator;
  readonly cartBadge: Locator;
  readonly cartItemNames: Locator;
  readonly cartItemPrices: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.title');
//    this.cartItems = page.locator('.cart_item');
    this.removeButtons = page.locator('[data-test^="remove-"]');
    this.continueShoppingButton = page.locator('#continue-shopping');
    this.checkoutButton = page.locator('#checkout');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.cartItemNames = page.locator('.inventory_item_name');
    this.cartItemPrices = page.locator('.inventory_item_price');
  }

  async goto() {
    await this.page.goto('/cart.html');
  }

  async getCartItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  async getCartBadgeCount(): Promise<string> {
    if (await this.cartBadge.isVisible()) {
      return await this.cartBadge.textContent() || '0';
    }
    return '0';
  }

  async getItemNames(): Promise<string[]> {
    const count = await this.cartItemNames.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = await this.cartItemNames.nth(i).textContent();
      if (name) names.push(name);
    }
    return names;
  }

  async getItemPrices(): Promise<string[]> {
    const count = await this.cartItemPrices.count();
    const prices: string[] = [];
    for (let i = 0; i < count; i++) {
      const price = await this.cartItemPrices.nth(i).textContent();
      if (price) prices.push(price);
    }
    return prices;
  }

  async removeItem(itemName: string) {
    // Convert item name to data-test format
    // e.g., "Sauce Labs Backpack" -> "remove-sauce-labs-backpack"
    const dataTest = `remove-${itemName.toLowerCase().replace(/\s+/g, '-')}`;
    await this.page.locator(`[data-test="${dataTest}"]`).click();
  }

  async removeFirstItem() {
    await this.removeButtons.first().click();
  }

  async removeAllItems() {
    const count = await this.removeButtons.count();
    for (let i = count - 1; i >= 0; i--) {
      await this.removeButtons.first().click();
      await this.page.waitForTimeout(300); // Small delay between removals
    }
  }

  async continueShopping() {
    await this.continueShoppingButton.click();
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }

  async isCartEmpty(): Promise<boolean> {
    const count = await this.getCartItemCount();
    return count === 0;
  }

  async getTotalPrice(): Promise<number> {
    const prices = await this.getItemPrices();
    let total = 0;
    prices.forEach(price => {
      // Remove $ and convert to number
      total += parseFloat(price.replace('$', ''));
    });
    return total;
  }
}