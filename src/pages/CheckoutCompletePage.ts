/**
 * CheckoutCompletePage.ts
 * ─────────────────────────────────────────────────────────────
 * Page Object for checkout step 3 (/checkout-complete.html).
 * "Checkout: Complete!" — order confirmation screen.
 *
 * Previously bundled inside CheckoutPage.ts. Now a dedicated
 * file with complete order confirmation assertions.
 * ─────────────────────────────────────────────────────────────
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutCompletePage extends BasePage {
  readonly pageUrl = '/checkout-complete.html';

  // ── Locators ──────────────────────────────────────────────
  readonly completeHeader:   Locator;
  readonly completeText:     Locator;
  readonly ponyExpressImage: Locator;
  readonly backHomeButton:   Locator;

  constructor(page: Page) {
    super(page);
    this.completeHeader   = page.locator('.complete-header');
    this.completeText     = page.locator('.complete-text');
    this.ponyExpressImage = page.locator('.pony_express');
    this.backHomeButton   = page.locator('[data-test="back-to-products"]');
  }

  // ── Contract implementation ───────────────────────────────

  async isLoaded(): Promise<boolean> {
    await expect(this.completeHeader).toBeVisible({ timeout: 10000 });
    return true;
  }

  // ── Order confirmation ────────────────────────────────────

  async isOrderComplete(): Promise<boolean> {
    return this.completeHeader.isVisible();
  }

  async getCompleteHeader(): Promise<string> {
    return (await this.completeHeader.textContent()) ?? '';
  }

  async getCompleteText(): Promise<string> {
    return (await this.completeText.textContent()) ?? '';
  }

  async isPonyExpressVisible(): Promise<boolean> {
    return this.ponyExpressImage.isVisible();
  }

  // ── Navigation ────────────────────────────────────────────

  async backToHome(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/inventory.html'),
      this.backHomeButton.click(),
    ]);
    await this.page.waitForLoadState('networkidle');
  }
}
