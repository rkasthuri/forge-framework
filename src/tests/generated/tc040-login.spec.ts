import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Logout Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC040 - User can successfully log out and cannot access protected pages after logout', async ({ page }) => {
    console.log('✅ TC040 - Starting logout functionality test');

    // Login with standard user
    const loginPage = new LoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ TC040 - User logged in successfully');

    // Verify we're on the inventory page
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    await expect(page).toHaveURL(/.*inventory.html/);
    console.log('✅ TC040 - Verified user is on inventory page');

    // Click the burger menu
    await page.click('#react-burger-menu-btn');
    console.log('✅ TC040 - Opened burger menu');

    // Wait for menu to be visible
    await page.waitForSelector('.bm-menu', { state: 'visible' });

    // Click logout link
    await page.click('#logout_sidebar_link');
    console.log('✅ TC040 - Clicked logout button');

    // Verify redirected back to login page
    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(page.locator('#login-button')).toBeVisible();
    console.log('✅ TC040 - User redirected to login page after logout');

    // Attempt to access protected inventory page directly
    await page.goto('https://www.saucedemo.com/inventory.html');
    console.log('✅ TC040 - Attempted to access inventory page after logout');

    // Verify user is blocked and redirected back to login
    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(page.locator('#login-button')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toContainText('Epic sadface: You can only access \'/inventory.html\' when you are logged in');
    console.log('✅ TC040 - Verified user cannot access protected page after logout');
  });
});