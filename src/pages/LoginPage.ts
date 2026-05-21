import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameField: Locator;
  readonly passwordField: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameField = page.locator('#user-name');
    this.passwordField = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('.error-button');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessageText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isErrorMessageVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async closeErrorMessage() {
    await this.errorCloseButton.click();
  }

  // Self-healing login method with fallback selectors
  async smartLogin(username: string, password: string) {
    try {
      await this.login(username, password);
    } catch (error) {
      console.log('Primary selectors failed, attempting self-healing...');
      
      // Fallback selectors
      const fallbackSelectors = {
        username: [
          '[data-test="username"]',
          'input[placeholder*="Username" i]',
          'input[type="text"]',
          'input[name="user-name"]'
        ],
        password: [
          '[data-test="password"]',
          'input[placeholder*="Password" i]',
          'input[type="password"]',
          'input[name="password"]'
        ],
        button: [
          '[data-test="login-button"]',
          'input[type="submit"]',
          'button[type="submit"]',
          'input[value="Login"]'
        ]
      };

      // Try fallback selectors
      for (const userSelector of fallbackSelectors.username) {
        try {
          await this.page.fill(userSelector, username);
          console.log(`✓ Self-healed username field with: ${userSelector}`);
          break;
        } catch {}
      }

      for (const passSelector of fallbackSelectors.password) {
        try {
          await this.page.fill(passSelector, password);
          console.log(`✓ Self-healed password field with: ${passSelector}`);
          break;
        } catch {}
      }

      for (const btnSelector of fallbackSelectors.button) {
        try {
          await this.page.click(btnSelector);
          console.log(`✓ Self-healed login button with: ${btnSelector}`);
          break;
        } catch {}
      }
    }
  }

  // Visual validation helper
  async captureLoginPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `reports/screenshots/${name}.png`,
      fullPage: true 
    });
  }
} 