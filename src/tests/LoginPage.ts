/**
 * LoginPage.ts
 * ─────────────────────────────────────────────────────────────
 * Page Object for the SauceDemo login page (/).
 *
 * NOTE: Login page does not have the hamburger menu or cart —
 * those live in BasePage for authenticated pages only.
 * Login overrides waitForPageLoad since .title does not exist
 * on the login page.
 * ─────────────────────────────────────────────────────────────
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { UserCredentials } from '../data/users';

export class LoginPage extends BasePage {
  readonly pageUrl = '/';

  // ── Locators ──────────────────────────────────────────────
  readonly usernameField:    Locator;
  readonly passwordField:    Locator;
  readonly loginButton:      Locator;
  readonly errorMessage:     Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameField    = page.locator('[data-test="username"]');
    this.passwordField    = page.locator('[data-test="password"]');
    this.loginButton      = page.locator('[data-test="login-button"]');
    this.errorMessage     = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('[data-test="error-button"]');
  }

  // ── Contract implementation ───────────────────────────────

  async isLoaded(): Promise<boolean> {
    return this.loginButton.isVisible();
  }

  // Login page has no .title — override waitForPageLoad
  override async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.loginButton).toBeVisible({ timeout: 10000 });
  }

  // ── Actions ───────────────────────────────────────────────

  /**
   * Login with a UserCredentials object from users.ts.
   * Waits for navigation to inventory on success.
   */
  async login(credentials: UserCredentials): Promise<void> {
    await this.usernameField.fill(credentials.username);
    await this.passwordField.fill(credentials.password);
    await this.loginButton.click();
  }

  /**
   * Login and explicitly wait for successful navigation to inventory.
   * Use this when you need to assert the login succeeded.
   */
  async loginAndWait(credentials: UserCredentials): Promise<void> {
    await this.login(credentials);
    await this.page.waitForURL('**/inventory.html');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Attempt a login expected to fail (locked user, bad creds).
   * Does not wait for navigation — caller verifies the error.
   */
  async attemptLogin(credentials: UserCredentials): Promise<void> {
    await this.usernameField.fill(credentials.username);
    await this.passwordField.fill(credentials.password);
    await this.loginButton.click();
  }

  // ── Assertions / state ────────────────────────────────────

  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? '';
  }

  async isErrorVisible(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  async closeError(): Promise<void> {
    await this.errorCloseButton.click();
  }

  async isUsernameFieldEmpty(): Promise<boolean> {
    return (await this.usernameField.inputValue()) === '';
  }

  async isPasswordFieldEmpty(): Promise<boolean> {
    return (await this.passwordField.inputValue()) === '';
  }

  /**
   * Self-healing login — tries primary selectors, falls back to
   * alternatives if they fail. Used by EC011 to test resilience.
   */
  async smartLogin(credentials: UserCredentials): Promise<void> {
    try {
      await this.login(credentials);
    } catch {
      const userSelectors = [
        '[data-test="username"]', '#user-name',
        'input[placeholder*="Username" i]', 'input[type="text"]',
      ];
      const passSelectors = [
        '[data-test="password"]', '#password',
        'input[placeholder*="Password" i]', 'input[type="password"]',
      ];
      const btnSelectors = [
        '[data-test="login-button"]', '#login-button',
        'input[type="submit"]', 'button[type="submit"]',
      ];
      for (const s of userSelectors) {
        try { await this.page.fill(s, credentials.username); break; } catch {}
      }
      for (const s of passSelectors) {
        try { await this.page.fill(s, credentials.password); break; } catch {}
      }
      for (const s of btnSelectors) {
        try { await this.page.click(s); break; } catch {}
      }
    }
  }
}
