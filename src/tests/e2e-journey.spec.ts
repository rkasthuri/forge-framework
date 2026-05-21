import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage, CheckoutOverviewPage, CheckoutCompletePage } from '../pages/CheckoutPage';

test.describe('E2E User Journey Tests', () => {

  test('TC033 - Complete user journey: Login → Browse → Add to Cart → Checkout → Complete', async ({ page }) => {
    // Step 1: Login
    console.log('🔐 Step 1: Login');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');
    console.log('✅ Logged in successfully');

    // Step 2: Browse and add items
    console.log('🛍️ Step 2: Browse products');
    const inventoryPage = new InventoryPage(page);
    await expect(inventoryPage.pageTitle).toContainText('Products');
    
    const initialItemCount = await inventoryPage.getInventoryItemCount();
    expect(initialItemCount).toBe(6);
    console.log(`✅ Found ${initialItemCount} products`);

    // Step 3: Add items to cart
    console.log('➕ Step 3: Add items to cart');
    await inventoryPage.addToCartButtons.nth(0).click(); // Add Backpack
    await inventoryPage.addToCartButtons.nth(1).click(); // Add Bike Light
    
    let badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe('2');
    console.log('✅ Added 2 items to cart');

    // Step 4: Go to cart
    console.log('🛒 Step 4: View cart');
    await inventoryPage.shoppingCartLink.click();
    await page.waitForURL('**/cart.html');
    
    const cartPage = new CartPage(page);
    const cartItemCount = await cartPage.getCartItemCount();
    expect(cartItemCount).toBe(2);
    
    const itemNames = await cartPage.getItemNames();
    console.log(`✅ Cart contains: ${itemNames.join(', ')}`);

    // Step 5: Proceed to checkout
    console.log('💳 Step 5: Checkout - Enter information');
    await cartPage.proceedToCheckout();
    await page.waitForURL('**/checkout-step-one.html');
    
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    console.log('✅ Personal information entered');

    // Step 6: Review order
    console.log('📋 Step 6: Review order');
    await page.waitForURL('**/checkout-step-two.html');
    
    const overviewPage = new CheckoutOverviewPage(page);
    const itemTotal = await overviewPage.getItemTotal();
    const tax = await overviewPage.getTax();
    const total = await overviewPage.getTotal();
    
    expect(total).toBe(itemTotal + tax);
    console.log(`✅ Order total: $${total} (Items: $${itemTotal} + Tax: $${tax})`);

    // Step 7: Complete order
    console.log('✅ Step 7: Complete order');
    await overviewPage.finish();
    await page.waitForURL('**/checkout-complete.html');
    
    const completePage = new CheckoutCompletePage(page);
    const isComplete = await completePage.isOrderComplete();
    expect(isComplete).toBe(true);
    
    const message = await completePage.getCompleteMessage();
    expect(message).toContain('Thank you');
    console.log('✅ Order completed successfully!');

    // Step 8: Return to products
    console.log('🏠 Step 8: Return to products');
    await completePage.backToProducts();
    await expect(page).toHaveURL(/.*inventory\.html/);
    
    // Verify cart is empty
    const isBadgeVisible = await page.locator('.shopping_cart_badge').isVisible();
    expect(isBadgeVisible).toBe(false);
    console.log('✅ Returned to products, cart is empty');

    console.log('🎉 TC033 - COMPLETE USER JOURNEY SUCCESSFUL!');
  });

  test('TC034 - User journey with cart modifications', async ({ page }) => {
    console.log('🔐 Login and browse');
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    // Add 3 items
    console.log('➕ Add 3 items');
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.addToCartButtons.nth(1).click();
    await inventoryPage.addToCartButtons.nth(2).click();

    // Go to cart
    await inventoryPage.shoppingCartLink.click();
    let itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(3);
    console.log('✅ 3 items in cart');

    // Remove one item
    console.log('➖ Remove 1 item');
    await cartPage.removeFirstItem();
    itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBe(2);
    console.log('✅ 2 items remaining');

    // Continue with checkout
    console.log('💳 Proceed to checkout');
    await cartPage.proceedToCheckout();
    
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.fillCheckoutInfo('Jane', 'Smith', '54321');
    await checkoutPage.continue();

    const overviewPage = new CheckoutOverviewPage(page);
    const finalItemCount = await overviewPage.getItemCount();
    expect(finalItemCount).toBe(2);
    
    await overviewPage.finish();
    
    const completePage = new CheckoutCompletePage(page);
    const isComplete = await completePage.isOrderComplete();
    expect(isComplete).toBe(true);

    console.log('🎉 TC034 - Journey with cart modifications successful!');
  });

  test('TC035 - User journey: Add items, cancel checkout, continue shopping', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    // Add items
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.shoppingCartLink.click();

    // Start checkout
    await cartPage.proceedToCheckout();
    
    // Cancel checkout
    console.log('❌ Cancel checkout');
    await checkoutPage.cancel();
    await expect(page).toHaveURL(/.*cart\.html/);
    console.log('✅ Back to cart');

    // Continue shopping
    console.log('🛍️ Continue shopping');
    await cartPage.continueShopping();
    await expect(page).toHaveURL(/.*inventory\.html/);
    console.log('✅ Back to products');

    // Verify item still in cart
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe('1');
    console.log('✅ Item still in cart');

    console.log('🎉 TC035 - Cancel and continue shopping successful!');
  });

  test('TC036 - Multiple purchases journey', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);
    const completePage = new CheckoutCompletePage(page);

    // Login once
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    // First purchase
    console.log('🛍️ First purchase');
    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.shoppingCartLink.click();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.finish();
    await completePage.backToProducts();
    console.log('✅ First purchase complete');

    // Second purchase
    console.log('🛍️ Second purchase');
    await inventoryPage.addToCartButtons.nth(1).click();
    await inventoryPage.shoppingCartLink.click();
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCheckoutInfo('Jane', 'Smith', '54321');
    await checkoutPage.continue();
    await overviewPage.finish();
    
    const isComplete = await completePage.isOrderComplete();
    expect(isComplete).toBe(true);
    console.log('✅ Second purchase complete');

    console.log('🎉 TC036 - Multiple purchases successful!');
  });
});