import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

test.describe('Checkout - Multi-item cart modification', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC059 - Multi-item checkout with different quantities and removal during checkout flow', async ({ page }) => {
    console.log('✅ TC059 - Starting login');
    const loginPage = new LoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');

    console.log('✅ TC059 - Adding three items to cart');
    const inventoryPage = new InventoryPage(page);
    await page.waitForURL('**/inventory.html');
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item

    const itemCount = await inventoryPage.getItemCount();
    expect(itemCount).toBe(3);
    console.log('✅ TC059 - Verified 3 items in cart badge');

    console.log('✅ TC059 - Navigating to cart');
    await page.click('.shopping_cart_link');
    const cartPage = new CartPage(page);
    await page.waitForURL('**/cart.html');

    const initialCartItems = await cartPage.getCartItems();
    expect(initialCartItems).toHaveLength(3);
    console.log('✅ TC059 - Verified 3 items in cart page');

    console.log('✅ TC059 - Starting checkout process');
    await page.click('[data-test="checkout"]');

    console.log('✅ TC059 - Filling checkout information');
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.fillInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    console.log('✅ TC059 - On checkout step 2, navigating back to cart');
    await page.click('.shopping_cart_link');
    await page.waitForURL('**/cart.html');

    console.log('✅ TC059 - Removing one item from cart');
    await page.click('[data-test="remove-sauce-labs-bike-light"]');

    const updatedCartItems = await cartPage.getCartItems();
    expect(updatedCartItems).toHaveLength(2);
    console.log('✅ TC059 - Verified 2 items remain in cart after removal');

    const updatedItemCount = await page.locator('.shopping_cart_badge').textContent();
    expect(updatedItemCount).toBe('2');
    console.log('✅ TC059 - Verified cart badge shows 2 items');

    console.log('✅ TC059 - Continuing to checkout again');
    await page.click('[data-test="checkout"]');
    await checkoutPage.fillInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    console.log('✅ TC059 - Verifying checkout overview matches current cart state');
    const checkoutItems = await page.locator('.cart_item').count();
    expect(checkoutItems).toBe(2);

    const checkoutItemNames = await page.locator('.inventory_item_name').allTextContents();
    expect(checkoutItemNames).toContain('Sauce Labs Backpack');
    expect(checkoutItemNames).toContain('Sauce Labs Bolt T-Shirt');
    expect(checkoutItemNames).not.toContain('Sauce Labs Bike Light');
    console.log('✅ TC059 - Verified only remaining items appear in checkout overview');

    console.log('✅ TC059 - Completing checkout');
    await checkoutPage.finish();

    const completeHeader = await page.locator('.complete-header').textContent();
    expect(completeHeader).toContain('Thank you for your order');
    console.log('✅ TC059 - Order completed successfully with modified cart');
  });
});