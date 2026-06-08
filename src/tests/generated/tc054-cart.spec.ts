import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';

test.describe('Cart Badge Visibility', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC054 - Cart badge visibility when cart is empty vs has items', async ({ page }) => {
    console.log('✅ TC054 - Starting cart badge visibility test');
    
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    
    await page.waitForURL('**/inventory.html');
    console.log('✅ TC054 - Inventory page loaded');

    // Verify no badge when cart is empty
    const badgeEmpty = page.locator('.shopping_cart_badge');
    await expect(badgeEmpty).not.toBeVisible();
    console.log('✅ TC054 - Verified cart badge is not visible when cart is empty');

    // Add first item to cart
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC054 - Added first item to cart');

    // Verify badge appears with count 1
    await expect(badgeEmpty).toBeVisible();
    await expect(badgeEmpty).toHaveText('1');
    console.log('✅ TC054 - Verified cart badge appears with count 1');

    // Add second item to cart
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC054 - Added second item to cart');

    // Verify badge updates to count 2
    await expect(badgeEmpty).toHaveText('2');
    console.log('✅ TC054 - Verified cart badge updated to count 2');

    // Navigate to cart
    await page.locator('.shopping_cart_link').click();
    await page.waitForURL('**/cart.html');
    console.log('✅ TC054 - Navigated to cart page');

    // Verify badge still visible on cart page
    await expect(badgeEmpty).toBeVisible();
    await expect(badgeEmpty).toHaveText('2');
    console.log('✅ TC054 - Verified cart badge still visible on cart page');

    // Remove first item
    await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
    console.log('✅ TC054 - Removed first item from cart');

    // Verify badge decrements to 1
    await expect(badgeEmpty).toHaveText('1');
    console.log('✅ TC054 - Verified cart badge decremented to 1');

    // Remove second item
    await page.locator('[data-test="remove-sauce-labs-bike-light"]').click();
    console.log('✅ TC054 - Removed second item from cart');

    // Verify badge disappears when cart is empty again
    await expect(badgeEmpty).not.toBeVisible();
    console.log('✅ TC054 - Verified cart badge disappears when all items removed');
  });
});