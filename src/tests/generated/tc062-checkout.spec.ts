import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

test.describe('Checkout - Problem User', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC062 - Checkout with problem_user or other non-standard user types', async ({ page }) => {
    console.log('✅ TC062 - Starting checkout flow with problem_user');
    
    const loginPage = new LoginPage(page);
    await loginPage.login('problem_user', 'secret_sauce');
    console.log('✅ TC062 - Logged in as problem_user');

    const inventoryPage = new InventoryPage(page);
    await page.waitForURL('**/inventory.html');
    console.log('✅ TC062 - Inventory page loaded');

    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC062 - Added item to cart');

    const cartCount = await inventoryPage.getItemCount();
    expect(cartCount).toBe(1);
    console.log('✅ TC062 - Verified cart badge shows 1 item');

    await page.locator('.shopping_cart_link').click();
    console.log('✅ TC062 - Navigated to cart');

    const cartPage = new CartPage(page);
    await page.waitForURL('**/cart.html');

    const cartItems = await cartPage.getCartItems();
    expect(cartItems.length).toBeGreaterThan(0);
    console.log('✅ TC062 - Cart contains items');

    await page.locator('[data-test="checkout"]').click();
    console.log('✅ TC062 - Proceeded to checkout');

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.fillInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    console.log('✅ TC062 - Filled checkout information and continued');

    await page.locator('.checkout_summary_container').waitFor({ state: 'visible' });
    console.log('✅ TC062 - Checkout summary page loaded');

    const summaryItemName = await page.locator('.inventory_item_name').first().textContent();
    expect(summaryItemName).toBeTruthy();
    console.log('✅ TC062 - Verified item appears in checkout summary');

    await checkoutPage.finish();
    console.log('✅ TC062 - Completed checkout');

    await page.locator('.complete-header').waitFor({ state: 'visible' });
    const completeHeader = await page.locator('.complete-header').textContent();
    expect(completeHeader).toContain('Thank you for your order');
    console.log('✅ TC062 - Checkout completed successfully with problem_user');

    const checkoutImage = await page.locator('.pony_express').first();
    await expect(checkoutImage).toBeVisible();
    console.log('✅ TC062 - Verified checkout complete page displays properly despite problem_user quirks');
  });
});