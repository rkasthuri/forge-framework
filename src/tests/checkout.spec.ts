import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage, CheckoutOverviewPage, CheckoutCompletePage } from '../pages/CheckoutPage';

test.describe('Checkout Flow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login, add items, go to checkout
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);
    
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');
    
    // Add items
    await inventoryPage.addToCartButtons.nth(0).click();
    
    // Go to cart and checkout
    await inventoryPage.shoppingCartLink.click();
    await cartPage.proceedToCheckout();
    await page.waitForURL('**/checkout-step-one.html');
  });

  test('TC025 - Complete checkout with valid information', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);
    const completePage = new CheckoutCompletePage(page);

    // Fill checkout info
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    // Verify on overview page
    await expect(page).toHaveURL(/.*checkout-step-two\.html/);
    await expect(overviewPage.pageTitle).toContainText('Checkout: Overview');

    // Finish checkout
    await overviewPage.finish();

    // Verify order complete
    await expect(page).toHaveURL(/.*checkout-complete\.html/);
    const isComplete = await completePage.isOrderComplete();
    expect(isComplete).toBe(true);

    const message = await completePage.getCompleteMessage();
    expect(message).toContain('Thank you for your order');

    console.log('✅ TC025 - Checkout completed successfully');
  });

  test('TC026 - Checkout validation - empty first name', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    // Leave first name empty
    await checkoutPage.fillCheckoutInfo('', 'Doe', '12345');
    await checkoutPage.continue();

    // Verify error message
    const isErrorVisible = await checkoutPage.isErrorVisible();
    expect(isErrorVisible).toBe(true);

    const errorMessage = await checkoutPage.getErrorMessage();
    expect(errorMessage).toContain('First Name is required');

    console.log('✅ TC026 - First name validation working');
  });

  test('TC027 - Checkout validation - empty last name', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    // Leave last name empty
    await checkoutPage.fillCheckoutInfo('John', '', '12345');
    await checkoutPage.continue();

    // Verify error message
    const isErrorVisible = await checkoutPage.isErrorVisible();
    expect(isErrorVisible).toBe(true);

    const errorMessage = await checkoutPage.getErrorMessage();
    expect(errorMessage).toContain('Last Name is required');

    console.log('✅ TC027 - Last name validation working');
  });

  test('TC028 - Checkout validation - empty postal code', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    // Leave postal code empty
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '');
    await checkoutPage.continue();

    // Verify error message
    const isErrorVisible = await checkoutPage.isErrorVisible();
    expect(isErrorVisible).toBe(true);

    const errorMessage = await checkoutPage.getErrorMessage();
    expect(errorMessage).toContain('Postal Code is required');

    console.log('✅ TC028 - Postal code validation working');
  });

  test('TC029 - Cancel checkout and return to cart', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    // Cancel checkout
    await checkoutPage.cancel();

    // Verify back on cart page
    await expect(page).toHaveURL(/.*cart\.html/);

    console.log('✅ TC029 - Checkout cancelled successfully');
  });

  test('TC030 - Verify checkout overview displays correct info', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);

    // Complete step 1
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await page.waitForURL('**/checkout-step-two.html');

    // Verify items displayed
    const itemCount = await overviewPage.getItemCount();
    expect(itemCount).toBeGreaterThan(0);

    // Verify pricing info
    const itemTotal = await overviewPage.getItemTotal();
    const tax = await overviewPage.getTax();
    const total = await overviewPage.getTotal();

    expect(itemTotal).toBeGreaterThan(0);
    expect(tax).toBeGreaterThan(0);
    expect(total).toBe(itemTotal + tax);

    console.log(`✅ TC030 - Order summary: Items=$${itemTotal}, Tax=$${tax}, Total=$${total}`);
  });

  test('TC031 - Cancel from checkout overview', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);

    // Complete step 1
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await page.waitForURL('**/checkout-step-two.html');

    // Cancel from overview
    await overviewPage.cancel();

    // Verify back on inventory page
    await expect(page).toHaveURL(/.*inventory\.html/);

    console.log('✅ TC031 - Cancelled from overview successfully');
  });

  test('TC032 - Return to products after order complete', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    const overviewPage = new CheckoutOverviewPage(page);
    const completePage = new CheckoutCompletePage(page);

    // Complete full checkout
    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.finish();
    await page.waitForURL('**/checkout-complete.html');

    // Return to products
    await completePage.backToProducts();

    // Verify on inventory page
    await expect(page).toHaveURL(/.*inventory\.html/);

    // Verify cart is empty (badge should not be visible)
    const isBadgeVisible = await page.locator('.shopping_cart_badge').isVisible();
    expect(isBadgeVisible).toBe(false);

    console.log('✅ TC032 - Returned to products, cart is empty');
  });
});