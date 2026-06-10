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
import { SmartLocator } from '../healing/SmartLocator';
import { UserCredentials } from '../data/users';

export class LoginPage extends BasePage {
  readonly pageUrl = '/';

  // ── Locators ──────────────────────────────────────────────
  readonly usernameField = this.smart({
    key: 'login.usernameField',
    description: 'Username input field on the login form',
    strategies: [
      { name: 'data-test', selector: '[data-test="username"]' },
      { name: 'id',        selector: '#user-name' },
      { name: 'css',       selector: 'input[placeholder*="Username" i]' },
    ],
  });

  readonly passwordField = this.smart({
    key: 'login.passwordField',
    description: 'Password input field on the login form',
    strategies: [
      { name: 'data-test', selector: '[data-test="password"]' },
      { name: 'id',        selector: '#password' },
      { name: 'css',       selector: 'input[type="password"]' },
    ],
  });

  readonly loginButton = this.smart({
    key: 'login.loginButton',
    description: 'Login submit button on the login form',
    strategies: [
      { name: 'data-test', selector: '[data-test="login-button"]' },
      { name: 'id',        selector: '#login-button' },
      { name: 'css',       selector: 'input[type="submit"]' },
    ],
  });

  readonly errorMessage:     Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    super(page);
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
    await expect(await this.loginButton.resolve()).toBeVisible({ timeout: 10000 });
  }

  // ── Actions ───────────────────────────────────────────────
  // login() accepts BOTH the new UserCredentials object AND the legacy
  // two-string signature so promoted generated tests keep working.

  async login(credentialsOrUsername: UserCredentials | string, password?: string): Promise<void> {
    const u = typeof credentialsOrUsername === 'string' ? credentialsOrUsername : credentialsOrUsername.username;
    const p = typeof credentialsOrUsername === 'string' ? (password ?? '')     : credentialsOrUsername.password;
    await this.usernameField.fill(u);
    await this.passwordField.fill(p);
    await this.loginButton.click();
  }

  async loginAndWait(credentialsOrUsername: UserCredentials | string, password?: string): Promise<void> {
    await this.login(credentialsOrUsername as any, password);
    await Promise.all([
      this.page.waitForURL('**/inventory.html'),
      this.page.waitForLoadState('networkidle'),
    ]);
  }

  async attemptLogin(credentialsOrUsername: UserCredentials | string, password?: string): Promise<void> {
    await this.login(credentialsOrUsername as any, password);
  }

  // ── Backward-compatible aliases ───────────────────────────
  async getErrorMessageText(): Promise<string>  { return this.getErrorMessage(); }
  isErrorMessageVisible():    Promise<boolean>  { return this.isErrorVisible();  }

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
