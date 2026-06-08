import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Login - Session Persistence', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC039 - Session persistence after successful login - browser refresh maintains logged-in state', async ({ page }) => {
    console.log('✅ TC039 - Starting session persistence test');

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    console.log('✅ TC039 - Logging in with standard_user');
    await loginPage.login('standard_user', 'secret_sauce');

    console.log('✅ TC039 - Verifying inventory page loaded after login');
    await page.waitForURL('**/inventory.html');
    await expect(page).toHaveURL(/.*inventory.html/);
    await expect(page.locator('.inventory_list')).toBeVisible();

    console.log('✅ TC039 - Refreshing browser');
    await page.reload();

    console.log('✅ TC039 - Verifying user remains on inventory page after refresh');
    await expect(page).toHaveURL(/.*inventory.html/);
    await expect(page.locator('.inventory_list')).toBeVisible();
    await expect(page.locator('#user-name')).not.toBeVisible();

    console.log('✅ TC039 - Session persistence verified successfully');
  });
});