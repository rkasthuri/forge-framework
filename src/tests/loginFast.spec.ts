import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

test.describe('Fast P0 Tests - Standard Users Only', () => {
  
  test('Standard user login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    await expect(inventoryPage.pageTitle).toContainText('Products');
    console.log('✅ Standard user login successful');
  });

  test('Invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('invalid_user', 'wrong_password');
    
    await expect(loginPage.errorMessage).toBeVisible();
    console.log('✅ Invalid credentials handled');
  });

  test('Locked user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('locked_out_user', 'secret_sauce');
    
    await expect(loginPage.errorMessage).toContainText('locked out');
    console.log('✅ Locked user handled');
  });

  test('Empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.loginButton.click();
    
    await expect(loginPage.errorMessage).toBeVisible();
    console.log('✅ Validation working');
  });
}); 