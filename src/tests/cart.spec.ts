import { test, expect } from '../fixtures/fixtures';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';

// standardUser fixture: logged in on /inventory.html.
// beforeEach handles the cart-specific setup (add items + navigate).

test.describe('Cart Functionality Tests', () => {

  test.beforeEach(async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    await inventoryPage.addToCartButtons.nth(0).click();
    // Wait for cart badge to confirm first item registered before
    // clicking again. webkit requires DOM to settle between actions
    // that trigger badge/button state changes.
    await standardUser.waitForFunction(() =>
      document.querySelector('.shopping_cart_badge')?.textContent === '1'
    );
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.goToCart();
  });

  test('TC017 - Verify cart page displays added items', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    await expect(cartPage.pageTitle).toContainText('Your Cart');

    const itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(2);

    console.log('✅ TC017 - Cart displays correct number of items');
  });

  test('TC018 - Remove item from cart', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    expect(await cartPage.getCartItemCount()).toBe(2);

    await cartPage.removeFirstItem();

    expect(await cartPage.getCartItemCount()).toBe(1);

    console.log('✅ TC018 - Item removed from cart');
  });

  test('TC019 - Remove all items from cart', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    await cartPage.removeAllItems();

    expect(await cartPage.isCartEmpty()).toBe(true);

    console.log('✅ TC019 - All items removed, cart is empty');
  });

  test('TC020 - Continue shopping from cart', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    await cartPage.continueShopping();

    await expect(standardUser).toHaveURL(/.*inventory\.html/);

    console.log('✅ TC020 - Continued shopping successfully');
  });

  test('TC021 - Proceed to checkout from cart', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    await cartPage.proceedToCheckout();

    await expect(standardUser).toHaveURL(/.*checkout-step-one\.html/);

    console.log('✅ TC021 - Proceeded to checkout');
  });

  test('TC022 - Verify cart badge count matches items', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    const badgeCount = await cartPage.getCartBadgeCount();
    const itemCount  = await cartPage.getCartItemCount();

    expect(badgeCount).toBe(itemCount);

    console.log('✅ TC022 - Badge count matches cart items');
  });

  test('TC023 - Verify item names displayed correctly', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    const itemNames = await cartPage.getItemNames();

    expect(itemNames.length).toBeGreaterThan(0);
    expect(itemNames[0]).toBeTruthy();

    console.log(`✅ TC023 - Items displayed: ${itemNames.join(', ')}`);
  });

  test('TC024 - Verify prices displayed correctly', async ({ standardUser }) => {
    const cartPage = new CartPage(standardUser);

    const prices = await cartPage.getItemPrices();

    expect(prices.length).toBeGreaterThan(0);
    prices.forEach(price => {
      expect(price).toBeGreaterThan(0);
    });

    console.log(`✅ TC024 - Prices displayed: ${prices.map(p => '$' + p).join(', ')}`);
  });
});
