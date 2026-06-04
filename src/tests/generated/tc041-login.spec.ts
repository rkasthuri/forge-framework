import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Login - Error and Visual User Validation', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC041 - Error_user and visual_user login validation', async ({ page }) => {
    console.log('✅ TC041 - Starting error_user and visual_user login validation');

    // Test error_user login
    console.log('✅ TC041 - Testing error_user login');
    const loginPage = new LoginPage(page);
    await loginPage.login('error_user', 'secret_sauce');

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    console.log('✅ TC041 - error_user successfully logged in and reached inventory page');

    // Verify inventory page is displayed
    await expect(page.locator('.inventory_list')).toBeVisible();
    const errorUserUrl = page.url();
    expect(errorUserUrl).toContain('inventory.html');
    console.log('✅ TC041 - error_user inventory page verified');

    // Logout to test next user
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').click();
    console.log('✅ TC041 - error_user logged out successfully');

    // Wait for login page to be ready
    await expect(page.locator('#login-button')).toBeVisible();

    // Test visual_user login
    console.log('✅ TC041 - Testing visual_user login');
    await loginPage.login('visual_user', 'secret_sauce');

    await inventoryPage.waitForLoad();
    console.log('✅ TC041 - visual_user successfully logged in and reached inventory page');

    // Verify inventory page is displayed
    await expect(page.locator('.inventory_list')).toBeVisible();
    const visualUserUrl = page.url();
    expect(visualUserUrl).toContain('inventory.html');
    console.log('✅ TC041 - visual_user inventory page verified');

    // Verify inventory items are present for visual_user
    const inventoryItems = page.locator('.inventory_item');
    const itemCount = await inventoryItems.count();
    expect(itemCount).toBeGreaterThan(0);
    console.log(`✅ TC041 - visual_user can see ${itemCount} inventory items`);

    console.log('✅ TC041 - Both error_user and visual_user login validation completed successfully');
  });
});