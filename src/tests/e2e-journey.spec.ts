import { test, expect } from '../fixtures/fixtures';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';

// standardUser fixture: logged in and on /inventory.html.
// All tests start from inventory — no manual login code needed.

test.describe('E2E User Journey Tests', () => {

  test('TC033 - Complete user journey: Login → Browse → Cart → Checkout → Complete', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    console.log('🛍️ Step 1: Verify inventory');
    await expect(inventoryPage.pageTitle).toContainText('Products');
    expect(await inventoryPage.getProductCount()).toBe(6);

    console.log('➕ Step 2: Add items to cart');
    await inventoryPage.addToCartButtons.nth(0).click();
    await standardUser.waitForFunction(() =>
      document.querySelector('.shopping_cart_badge')?.textContent === '1'
    );
    await inventoryPage.addToCartButtons.nth(0).click();
    expect(await inventoryPage.getCartBadgeCount()).toBe(2);

    console.log('🛒 Step 3: View cart');
    await inventoryPage.goToCart();
    const cartPage = new CartPage(standardUser);
    expect(await cartPage.getCartItemCount()).toBe(2);
    console.log(`✅ Cart: ${(await cartPage.getItemNames()).join(', ')}`);

    console.log('💳 Step 4: Checkout info');
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(standardUser);
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    console.log('📋 Step 5: Review order');
    const overviewPage = new CheckoutOverviewPage(standardUser);
    expect(await overviewPage.verifyTotalIsCorrect()).toBe(true);
    const total = await overviewPage.getTotal();
    console.log(`✅ Order total: $${total}`);

    console.log('✅ Step 6: Complete order');
    await overviewPage.finish();
    const completePage = new CheckoutCompletePage(standardUser);
    expect(await completePage.isOrderComplete()).toBe(true);
    expect(await completePage.getCompleteHeader()).toContain('Thank you');

    console.log('🏠 Step 7: Return to products');
    await completePage.backToHome();
    await expect(standardUser).toHaveURL(/.*inventory\.html/);
    expect(await inventoryPage.isCartBadgeVisible()).toBe(false);

    console.log('🎉 TC033 - COMPLETE USER JOURNEY SUCCESSFUL!');
  });

  test('TC034 - User journey with cart modifications', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    const cartPage      = new CartPage(standardUser);

    console.log('➕ Add 3 items');
    await inventoryPage.addToCartButtons.nth(0).click();
    await standardUser.waitForFunction(() =>
      document.querySelector('.shopping_cart_badge')?.textContent === '1'
    );
    await inventoryPage.addToCartButtons.nth(0).click();
    await standardUser.waitForFunction(() =>
      document.querySelector('.shopping_cart_badge')?.textContent === '2'
    );
    await inventoryPage.addToCartButtons.nth(0).click();

    await inventoryPage.goToCart();
    expect(await cartPage.getCartItemCount()).toBe(3);

    console.log('➖ Remove 1 item');
    await cartPage.removeFirstItem();
    expect(await cartPage.getCartItemCount()).toBe(2);

    console.log('💳 Proceed to checkout');
    await cartPage.proceedToCheckout();
    const checkoutPage = new CheckoutPage(standardUser);
    await checkoutPage.fillCheckoutInfo('Jane', 'Smith', '54321');
    await checkoutPage.continue();

    const overviewPage = new CheckoutOverviewPage(standardUser);
    expect(await overviewPage.getItemCount()).toBe(2);

    await overviewPage.finish();
    const completePage = new CheckoutCompletePage(standardUser);
    expect(await completePage.isOrderComplete()).toBe(true);

    console.log('🎉 TC034 - Journey with cart modifications successful!');
  });

  test('TC035 - Add items, cancel checkout, continue shopping', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    const cartPage      = new CartPage(standardUser);
    const checkoutPage  = new CheckoutPage(standardUser);

    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();

    console.log('❌ Cancel checkout');
    await checkoutPage.cancel();
    await expect(standardUser).toHaveURL(/.*cart\.html/);

    console.log('🛍️ Continue shopping');
    await cartPage.continueShopping();
    await expect(standardUser).toHaveURL(/.*inventory\.html/);

    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    console.log('🎉 TC035 - Cancel and continue shopping successful!');
  });

  test('TC036 - Multiple purchases journey', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    const cartPage      = new CartPage(standardUser);
    const checkoutPage  = new CheckoutPage(standardUser);
    const overviewPage  = new CheckoutOverviewPage(standardUser);
    const completePage  = new CheckoutCompletePage(standardUser);

    console.log('🛍️ First purchase');
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.finish();
    await completePage.backToHome();
    console.log('✅ First purchase complete');

    // Wait for inventory to fully re-render before second purchase.
    // webkit requires DOM to settle after a full checkout flow completes.
    await standardUser.locator('.inventory_item').nth(5).waitFor({ state: 'visible', timeout: 15000 });

    console.log('🛍️ Second purchase');
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCheckoutInfo('Jane', 'Smith', '54321');
    await checkoutPage.continue();
    await overviewPage.finish();
    expect(await completePage.isOrderComplete()).toBe(true);
    console.log('✅ Second purchase complete');

    console.log('🎉 TC036 - Multiple purchases successful!');
  });
});
