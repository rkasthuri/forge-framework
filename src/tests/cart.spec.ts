import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';

test.describe('Cart Functionality Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login and add items to cart
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');
    
    // Add 2 items to cart
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.addToCartButtons.nth(1).click();
    
    // Navigate to cart
    await inventoryPage.shoppingCartLink.click();
    await page.waitForURL('**/cart.html');
  });

  test('TC017 - Verify cart page displays added items', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Verify page title
    await expect(cartPage.pageTitle).toContainText('Your Cart');

    // Verify 2 items in cart
    const itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(2);

    console.log('✅ TC017 - Cart displays correct number of items');
  });

  test('TC018 - Remove item from cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Get initial count
    let itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(2);

    // Remove first item
    await cartPage.removeFirstItem();

    // Verify count decreased
    itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(1);

    console.log('✅ TC018 - Item removed from cart');
  });

  test('TC019 - Remove all items from cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Remove all items
    await cartPage.removeAllItems();

    // Verify cart is empty
    const isEmpty = await cartPage.isCartEmpty();
    expect(isEmpty).toBe(true);

    console.log('✅ TC019 - All items removed, cart is empty');
  });

  test('TC020 - Continue shopping from cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Click continue shopping
    await cartPage.continueShopping();

    // Verify back on inventory page
    await expect(page).toHaveURL(/.*inventory\.html/);

    console.log('✅ TC020 - Continued shopping successfully');
  });

  test('TC021 - Proceed to checkout from cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Click checkout
    await cartPage.proceedToCheckout();

    // Verify on checkout page
    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
    await expect(page.locator('.title')).toContainText('Checkout: Your Information');

    console.log('✅ TC021 - Proceeded to checkout');
  });

  test('TC022 - Verify cart badge count matches items', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Get cart badge
    const badgeCount = await cartPage.getCartBadgeCount();
    
    // Get actual items in cart
    const itemCount = await cartPage.getCartItemCount();

    // They should match
    expect(badgeCount).toBe(itemCount.toString());

    console.log('✅ TC022 - Badge count matches cart items');
  });

  test('TC023 - Verify item names displayed correctly', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Get item names
    const itemNames = await cartPage.getItemNames();
    
    // Verify we have names
    expect(itemNames.length).toBeGreaterThan(0);
    expect(itemNames[0]).toBeTruthy();

    console.log(`✅ TC023 - Items displayed: ${itemNames.join(', ')}`);
  });

  test('TC024 - Verify prices displayed correctly', async ({ page }) => {
    const cartPage = new CartPage(page);

    // Get prices
    const prices = await cartPage.getItemPrices();
    
    // Verify prices exist and have $ symbol
    expect(prices.length).toBeGreaterThan(0);
    prices.forEach(price => {
      expect(price).toContain('$');
    });

    console.log(`✅ TC024 - Prices displayed: ${prices.join(', ')}`);
  });
});