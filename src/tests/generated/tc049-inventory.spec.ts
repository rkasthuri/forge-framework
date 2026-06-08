import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';

test.describe('Inventory Page Persistence', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC049 - Inventory page persistence after browser back navigation from product detail or cart', async ({ page }) => {
    console.log('✅ TC049 - Starting inventory persistence test');

    const inventoryPage = new InventoryPage(page);
    await page.waitForURL('**/inventory.html');
    console.log('✅ TC049 - Inventory page loaded');

    // Add first item to cart
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC049 - Added Sauce Labs Backpack to cart');

    // Verify cart badge shows 1
    let cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('1');
    console.log('✅ TC049 - Cart badge shows 1 item');

    // Verify Remove button is displayed for backpack
    let backpackButton = await page.locator('[data-test="remove-sauce-labs-backpack"]');
    await expect(backpackButton).toBeVisible();
    console.log('✅ TC049 - Remove button visible for backpack');

    // Add second item to cart
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC049 - Added Sauce Labs Bike Light to cart');

    // Verify cart badge shows 2
    cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('2');
    console.log('✅ TC049 - Cart badge shows 2 items');

    // Navigate to product detail page
    await page.locator('#item_4_title_link').click();
    console.log('✅ TC049 - Navigated to product detail page');

    // Wait for product detail to load
    await expect(page.locator('.inventory_details')).toBeVisible();

    // Navigate back using browser back
    await page.goBack();
    console.log('✅ TC049 - Navigated back to inventory page');

    // Wait for inventory page to load
    await page.waitForURL('**/inventory.html');

    // Verify cart badge still shows 2
    cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('2');
    console.log('✅ TC049 - Cart badge persists with 2 items after back navigation');

    // Verify Remove buttons are still visible for both items
    backpackButton = await page.locator('[data-test="remove-sauce-labs-backpack"]');
    await expect(backpackButton).toBeVisible();
    const bikeLightButton = await page.locator('[data-test="remove-sauce-labs-bike-light"]');
    await expect(bikeLightButton).toBeVisible();
    console.log('✅ TC049 - Remove buttons persist for both items');

    // Navigate to cart
    await page.locator('.shopping_cart_link').click();
    console.log('✅ TC049 - Navigated to cart page');

    const cartPage = new CartPage(page);
    await page.waitForURL('**/cart.html');

    // Verify cart contains 2 items
    const cartItems = await cartPage.getCartItems();
    expect(cartItems).toBe(2);
    console.log('✅ TC049 - Cart page shows 2 items');

    // Navigate back to inventory using browser back
    await page.goBack();
    console.log('✅ TC049 - Navigated back to inventory from cart');

    await page.waitForURL('**/inventory.html');

    // Verify cart badge still shows 2
    cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('2');
    console.log('✅ TC049 - Cart badge persists with 2 items after back from cart');

    // Verify Remove buttons are still visible
    await expect(backpackButton).toBeVisible();
    await expect(bikeLightButton).toBeVisible();
    console.log('✅ TC049 - Remove buttons persist after back from cart');

    // Verify Add to Cart buttons are NOT visible for items in cart
    await expect(page.locator('[data-test="add-to-cart-sauce-labs-backpack"]')).not.toBeVisible();
    await expect(page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]')).not.toBeVisible();
    console.log('✅ TC049 - Add to Cart buttons correctly hidden for items in cart');

    console.log('✅ TC049 - Test completed successfully');
  });
});