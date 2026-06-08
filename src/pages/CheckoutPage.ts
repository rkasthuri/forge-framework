/**
 * CheckoutPage.ts
 * ─────────────────────────────────────────────────────────────
 * Page Object for checkout step 1 (/checkout-step-one.html).
 * "Checkout: Your Information" — name and postal code form.
 *
 * Previously this file contained three classes. Now it contains
 * exactly one. CheckoutOverviewPage and CheckoutCompletePage
 * have their own dedicated files.
 * ─────────────────────────────────────────────────────────────
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  readonly pageUrl = '/checkout-step-one.html';

  // ── Locators ──────────────────────────────────────────────
  readonly firstNameField:   Locator;
  readonly lastNameField:    Locator;
  readonly postalCodeField:  Locator;
  readonly continueButton:   Locator;
  readonly cancelButton:     Locator;
  readonly errorMessage:     Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameField   = page.locator('[data-test="firstName"]');
    this.lastNameField    = page.locator('[data-test="lastName"]');
    this.postalCodeField  = page.locator('[data-test="postalCode"]');
    this.continueButton   = page.locator('[data-test="continue"]');
    this.cancelButton     = page.locator('[data-test="cancel"]');
    this.errorMessage     = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('[data-test="error-button"]');
  }

  // ── Contract implementation ───────────────────────────────

  async isLoaded(): Promise<boolean> {
    await expect(this.firstNameField).toBeVisible({ timeout: 10000 });
    return true;
  }

  // ── Form actions ──────────────────────────────────────────

  async fillCheckoutInfo(
    firstName: string,
    lastName: string,
    postalCode: string
  ): Promise<void> {
    await this.firstNameField.fill(firstName);
    await this.lastNameField.fill(lastName);
    await this.postalCodeField.fill(postalCode);
  }

  async continue(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/checkout-step-two.html'),
      this.continueButton.click(),
    ]);
    await this.page.waitForLoadState('networkidle');
  }

  async cancel(): Promise<void> {
    await Promise.all([
      this.page.waitForURL('**/cart.html'),
      this.cancelButton.click(),
    ]);
    await this.page.waitForLoadState('networkidle');
  }

  // ── Error state ───────────────────────────────────────────

  async isErrorVisible(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? '';
  }

  async closeError(): Promise<void> {
    await this.errorCloseButton.click();
  }
}
