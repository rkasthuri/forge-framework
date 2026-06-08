import { test, expect } from '../fixtures/fixtures';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';

// standardUser fixture: logged in on /inventory.html.
// beforeEach adds an item and navigates to checkout step 1.

test.describe('Checkout Flow Tests', () => {

  test.beforeEach(async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    const cartPage      = new CartPage(standardUser);

    await inventoryPage.addToCartButtons.nth(0).click();
    await standardUser.waitForFunction(() =>
      document.querySelector('.shopping_cart_badge')?.textContent === '1'
    );
    await inventoryPage.goToCart();
    await cartPage.proceedToCheckout();
  });

  test('TC025 - Complete checkout with valid information', async ({ standardUser }) => {
    const checkoutPage  = new CheckoutPage(standardUser);
    const overviewPage  = new CheckoutOverviewPage(standardUser);
    const completePage  = new CheckoutCompletePage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    await expect(standardUser).toHaveURL(/.*checkout-step-two\.html/);
    await overviewPage.finish();

    await expect(standardUser).toHaveURL(/.*checkout-complete\.html/);
    expect(await completePage.isOrderComplete()).toBe(true);
    expect(await completePage.getCompleteHeader()).toContain('Thank you for your order');

    console.log('✅ TC025 - Checkout completed successfully');
  });

  test('TC026 - Checkout validation - empty first name', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);

    await checkoutPage.fillCheckoutInfo('', 'Doe', '12345');
    await checkoutPage.continueButton.click();

    expect(await checkoutPage.isErrorVisible()).toBe(true);
    expect(await checkoutPage.getErrorMessage()).toContain('First Name is required');

    console.log('✅ TC026 - First name validation working');
  });

  test('TC027 - Checkout validation - empty last name', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', '', '12345');
    await checkoutPage.continueButton.click();

    expect(await checkoutPage.isErrorVisible()).toBe(true);
    expect(await checkoutPage.getErrorMessage()).toContain('Last Name is required');

    console.log('✅ TC027 - Last name validation working');
  });

  test('TC028 - Checkout validation - empty postal code', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '');
    await checkoutPage.continueButton.click();

    expect(await checkoutPage.isErrorVisible()).toBe(true);
    expect(await checkoutPage.getErrorMessage()).toContain('Postal Code is required');

    console.log('✅ TC028 - Postal code validation working');
  });

  test('TC029 - Cancel checkout and return to cart', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);

    await checkoutPage.cancel();

    await expect(standardUser).toHaveURL(/.*cart\.html/);

    console.log('✅ TC029 - Checkout cancelled successfully');
  });

  test('TC030 - Verify checkout overview displays correct info', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);
    const overviewPage = new CheckoutOverviewPage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    const itemCount = await overviewPage.getItemCount();
    expect(itemCount).toBeGreaterThan(0);

    const subtotal = await overviewPage.getSubtotal();
    const tax      = await overviewPage.getTax();
    const total    = await overviewPage.getTotal();

    expect(subtotal).toBeGreaterThan(0);
    expect(tax).toBeGreaterThan(0);
    expect(await overviewPage.verifyTotalIsCorrect()).toBe(true);

    console.log(`✅ TC030 - Order summary: Items=$${subtotal}, Tax=$${tax}, Total=$${total}`);
  });

  test('TC031 - Cancel from checkout overview', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);
    const overviewPage = new CheckoutOverviewPage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.cancel();

    await expect(standardUser).toHaveURL(/.*inventory\.html/);

    console.log('✅ TC031 - Cancelled from overview successfully');
  });

  test('TC032 - Return to products after order complete', async ({ standardUser }) => {
    const checkoutPage  = new CheckoutPage(standardUser);
    const overviewPage  = new CheckoutOverviewPage(standardUser);
    const completePage  = new CheckoutCompletePage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();
    await overviewPage.finish();
    await completePage.backToHome();

    await expect(standardUser).toHaveURL(/.*inventory\.html/);
    expect(await standardUser.locator('.shopping_cart_badge').isVisible()).toBe(false);

    console.log('✅ TC032 - Returned to products, cart is empty');
  });

  test('TC038 - Verify checkout total matches sum of item prices plus tax', async ({ standardUser }) => {
    const checkoutPage = new CheckoutPage(standardUser);
    const overviewPage = new CheckoutOverviewPage(standardUser);

    await checkoutPage.fillCheckoutInfo('John', 'Doe', '12345');
    await checkoutPage.continue();

    await expect(standardUser).toHaveURL(/.*checkout-step-two\.html/);

    expect(await overviewPage.verifyTotalIsCorrect()).toBe(true);

    const subtotal = await overviewPage.getSubtotal();
    const tax      = await overviewPage.getTax();
    const total    = await overviewPage.getTotal();

    console.log(`✅ TC038 - Total $${total} = Items $${subtotal} + Tax $${tax}`);
  });
});
