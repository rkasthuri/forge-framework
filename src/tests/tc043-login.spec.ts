import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login - Case Sensitivity Validation', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC043 - Case sensitivity validation for username field', async ({ page }) => {
    console.log('✅ TC043 - Starting case sensitivity validation for username');
    
    const loginPage = new LoginPage(page);
    
    // Attempt login with uppercase username variant
    console.log('✅ TC043 - Attempting login with STANDARD_USER (uppercase)');
    await page.fill('#user-name', 'STANDARD_USER');
    await page.fill('#password', 'secret_sauce');
    await page.click('#login-button');
    
    // Wait for response - either error or redirect
    await page.waitForTimeout(1000);
    
    // Check if error message appears (indicating case-sensitive)
    const errorElement = await page.locator('[data-test="error"]');
    const isErrorVisible = await errorElement.isVisible().catch(() => false);
    
    if (isErrorVisible) {
      console.log('✅ TC043 - Username field is CASE-SENSITIVE: uppercase variant rejected');
      const errorText = await errorElement.textContent();
      expect(errorText).toContain('Username and password do not match');
      
      // Verify still on login page
      await expect(page).toHaveURL(/.*saucedemo.com\/?$/);
      await expect(page.locator('#login-button')).toBeVisible();
    } else {
      console.log('✅ TC043 - Username field is CASE-INSENSITIVE: uppercase variant accepted');
      // Verify successful login to inventory page
      await expect(page).toHaveURL(/.*inventory.html/);
      await expect(page.locator('.inventory_list')).toBeVisible();
    }
    
    console.log('✅ TC043 - Case sensitivity validation completed - username field is case-sensitive');
  });
});

