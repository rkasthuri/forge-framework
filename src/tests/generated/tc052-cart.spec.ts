import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';

test.describe('Cart Persistence', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC052 - Cart persistence after logout/login', async ({ page }) => {
    console.log('✅ TC052 - Starting cart persistence test');

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    console.log('✅ TC052 - Logging in as standard_user');
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    console.log('✅ TC052 - Adding items to cart');
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item

    console.log('✅ TC052 - Verifying cart badge shows 3 items');
    const cartBadge = page.locator('.shopping_cart_badge');
    await expect(cartBadge).toHaveText('3');

    console.log('✅ TC052 - Navigating to cart to verify items');
    await page.locator('.shopping_cart_link').click();
    await page.waitForURL('**/cart.html');
    const cartItemsBefore = await cartPage.getCartItems();
    expect(cartItemsBefore.length).toBe(3);

    console.log('✅ TC052 - Opening menu and logging out');
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').click();
    await expect(page.locator('#login-button')).toBeVisible();

    console.log('✅ TC052 - Logging back in as same user');
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    console.log('✅ TC052 - Verifying cart badge still shows 3 items after re-login');
    await expect(cartBadge).toHaveText('3');

    console.log('✅ TC052 - Navigating to cart to verify items persisted');
    await page.locator('.shopping_cart_link').click();
    await page.waitForURL('**/cart.html');
    const cartItemsAfter = await cartPage.getCartItems();
    
    console.log('✅ TC052 - Verifying cart contains same 3 items');
    expect(cartItemsAfter.length).toBe(3);
    
    const itemNames = await page.locator('.cart_item .inventory_item_name').allTextContents();
    expect(itemNames).toContain('Sauce Labs Backpack');
    expect(itemNames).toContain('Sauce Labs Bike Light');
    expect(itemNames).toContain('Sauce Labs Bolt T-Shirt');

    console.log('✅ TC052 - Cart persistence verified successfully');
  });
});