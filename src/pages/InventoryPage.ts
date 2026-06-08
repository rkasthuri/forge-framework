/**
 * InventoryPage.ts
 * ─────────────────────────────────────────────────────────────
 * Page Object for the SauceDemo inventory page (/inventory.html).
 * The core page of the application — products, sorting, cart.
 * ─────────────────────────────────────────────────────────────
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage extends BasePage {
  readonly pageUrl = '/inventory.html';

  // ── Locators ──────────────────────────────────────────────
  readonly sortDropdown:        Locator;
  readonly inventoryItems:      Locator;
  readonly inventoryItemNames:  Locator;
  readonly inventoryItemPrices: Locator;
  readonly addToCartButtons:    Locator;
  readonly removeButtons:       Locator;

  constructor(page: Page) {
    super(page);
    this.sortDropdown        = page.locator('[data-test="product_sort_container"]');
    this.inventoryItems      = page.locator('.inventory_item');
    this.inventoryItemNames  = page.locator('.inventory_item_name');
    this.inventoryItemPrices = page.locator('.inventory_item_price');
    this.addToCartButtons    = page.locator('[data-test^="add-to-cart-"]');
    this.removeButtons       = page.locator('[data-test^="remove-"]');
  }

  // ── Contract implementation ───────────────────────────────

  async isLoaded(): Promise<boolean> {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(this.sortDropdown).toBeVisible({ timeout: 10000 });
    return true;
  }

  override async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.sortDropdown).toBeVisible({ timeout: 10000 });
  }

  // ── Sorting ───────────────────────────────────────────────

  async sortBy(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getCurrentSortOption(): Promise<string> {
    return this.sortDropdown.inputValue();
  }

  // ── Product interaction ───────────────────────────────────

  async getProductCount(): Promise<number> {
    return this.inventoryItems.count();
  }

  async getProductNames(): Promise<string[]> {
    return this.inventoryItemNames.allTextContents();
  }

  async getProductPrices(): Promise<number[]> {
    const texts = await this.inventoryItemPrices.allTextContents();
    return texts.map(t => parseFloat(t.replace('$', '')));
  }

  async addItemToCart(itemName: string): Promise<void> {
    const item = this.inventoryItems.filter({ hasText: itemName });
    await item.locator('[data-test^="add-to-cart-"]').click();
  }

  async removeItemFromCart(itemName: string): Promise<void> {
    const item = this.inventoryItems.filter({ hasText: itemName });
    await item.locator('[data-test^="remove-"]').click();
  }

  async addFirstItemToCart(): Promise<void> {
    await this.addToCartButtons.first().click();
  }

  async navigateToProduct(itemName: string): Promise<void> {
    await this.inventoryItemNames.filter({ hasText: itemName }).click();
    await this.page.waitForURL('**/inventory-item.html**');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToProductViaImage(itemName: string): Promise<void> {
    const item = this.inventoryItems.filter({ hasText: itemName });
    await item.locator('.inventory_item_img').click();
    await this.page.waitForURL('**/inventory-item.html**');
    await this.page.waitForLoadState('networkidle');
  }

  async isItemInCart(itemName: string): Promise<boolean> {
    const item = this.inventoryItems.filter({ hasText: itemName });
    return item.locator('[data-test^="remove-"]').isVisible();
  }
  // ── Backward-compatible aliases ───────────────────────────
  async getInventoryItemCount(): Promise<number> { return this.getProductCount(); }
}
