import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

test.describe('Checkout Form Validation - Boundary Values', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ TC060 - Logged in successfully');

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    console.log('✅ TC060 - Added item to cart');

    await page.click('.shopping_cart_link');
    const cartPage = new CartPage(page);
    await cartPage.waitForLoad();
    console.log('✅ TC060 - Navigated to cart');

    await page.click('[data-test="checkout"]');
    console.log('✅ TC060 - Navigated to checkout');
  });

  test('TC060 - Checkout form validation with boundary values (very long strings, max length)', async ({ page }) => {
    console.log('✅ TC060 - Starting checkout form boundary value validation test');

    const checkoutPage = new CheckoutPage(page);
    const veryLongString = 'A'.repeat(500);
    const longFirstName = 'FirstName'.repeat(50);
    const longLastName = 'LastName'.repeat(50);

    console.log('✅ TC060 - Filling form with extremely long postal code (500 characters)');
    await page.fill('[data-test="firstName"]', 'John');
    await page.fill('[data-test="lastName"]', 'Doe');
    await page.fill('[data-test="postalCode"]', veryLongString);

    const postalCodeValue = await page.inputValue('[data-test="postalCode"]');
    console.log(`✅ TC060 - Postal code input length: ${postalCodeValue.length}`);

    await page.click('[data-test="continue"]');
    await page.waitForTimeout(500);

    const currentUrl = page.url();
    console.log(`✅ TC060 - Current URL after submit: ${currentUrl}`);

    console.log('✅ TC060 - Testing very long first name (400 characters)');
    await page.fill('[data-test="firstName"]', longFirstName);
    await page.fill('[data-test="lastName"]', 'Doe');
    await page.fill('[data-test="postalCode"]', '12345');

    const firstNameValue = await page.inputValue('[data-test="firstName"]');
    console.log(`✅ TC060 - First name input length: ${firstNameValue.length}`);

    await page.click('[data-test="continue"]');
    await page.waitForTimeout(500);

    console.log('✅ TC060 - Testing very long last name (400 characters)');
    await page.fill('[data-test="firstName"]', 'John');
    await page.fill('[data-test="lastName"]', longLastName);
    await page.fill('[data-test="postalCode"]', '12345');

    const lastNameValue = await page.inputValue('[data-test="lastName"]');
    console.log(`✅ TC060 - Last name input length: ${lastNameValue.length}`);

    await page.click('[data-test="continue"]');
    await page.waitForTimeout(500);

    console.log('✅ TC060 - Verifying form accepts long inputs');
    const finalUrl = page.url();
    expect(finalUrl).toContain('checkout-step-two');

    const summaryContainer = await page.locator('.checkout_summary_container').isVisible();
    expect(summaryContainer).toBe(true);

    console.log('✅ TC060 - Checkout form successfully handled boundary value inputs');
  });
});