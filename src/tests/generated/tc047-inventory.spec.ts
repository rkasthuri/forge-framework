import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Inventory - Cart Badge Counter', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC047 - Cart badge counter updates correctly when adding/removing items from inventory', async ({ page }) => {
    console.log('✅ TC047 - Starting cart badge counter test');
    
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();

    // Verify no badge is displayed initially
    console.log('✅ TC047 - Verifying cart badge is not visible initially');
    await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();

    // Add first item (Backpack)
    console.log('✅ TC047 - Adding first item to cart');
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    
    // Verify badge shows '1'
    console.log('✅ TC047 - Verifying badge shows 1');
    await expect(page.locator('.shopping_cart_badge')).toBeVisible();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    // Add second item (Bike Light)
    console.log('✅ TC047 - Adding second item to cart');
    await inventoryPage.addItemToCart('Sauce Labs Bike Light');
    
    // Verify badge shows '2'
    console.log('✅ TC047 - Verifying badge shows 2');
    await expect(page.locator('.shopping_cart_badge')).toHaveText('2');

    // Remove first item (Backpack)
    console.log('✅ TC047 - Removing first item from cart');
    await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
    
    // Verify badge shows '1'
    console.log('✅ TC047 - Verifying badge shows 1 after removal');
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    // Remove second item (Bike Light)
    console.log('✅ TC047 - Removing second item from cart');
    await page.locator('[data-test="remove-sauce-labs-bike-light"]').click();
    
    // Verify badge disappears
    console.log('✅ TC047 - Verifying badge disappears when cart is empty');
    await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();

    console.log('✅ TC047 - Cart badge counter test completed successfully');
  });
});