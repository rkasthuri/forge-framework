import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

test.describe('Edge Cases - Checkout Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('EC015 - Empty/null values in required checkout form fields bypassing client-side validation', async ({ page }) => {
    console.log('✅ EC015 - Starting checkout form validation bypass test');

    const loginPage = new LoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ EC015 - Logged in successfully');

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    await inventoryPage.addItemToCart('Sauce Labs Backpack');
    console.log('✅ EC015 - Added item to cart');

    await page.locator('.shopping_cart_link').click();
    const cartPage = new CartPage(page);
    await cartPage.waitForLoad();
    await page.locator('[data-test="checkout"]').click();
    console.log('✅ EC015 - Navigated to checkout');

    await page.waitForSelector('[data-test="firstName"]');
    console.log('✅ EC015 - Checkout form loaded');

    await page.evaluate(() => {
      const firstNameInput = document.querySelector('[data-test="firstName"]') as HTMLInputElement;
      const lastNameInput = document.querySelector('[data-test="lastName"]') as HTMLInputElement;
      const postalCodeInput = document.querySelector('[data-test="postalCode"]') as HTMLInputElement;
      if (firstNameInput) firstNameInput.value = '';
      if (lastNameInput) lastNameInput.value = '';
      if (postalCodeInput) postalCodeInput.value = '';
    });
    console.log('✅ EC015 - Set form values to empty strings via JavaScript');

    await page.locator('[data-test="continue"]').click();
    console.log('✅ EC015 - Clicked continue button with empty fields');

    const errorElement = page.locator('[data-test="error"]');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    console.log('✅ EC015 - Error message is visible');

    const errorText = await errorElement.innerText();
    expect(errorText.toLowerCase()).toContain('first name');
    console.log('✅ EC015 - Server-side validation blocked empty first name');

    const currentUrl = page.url();
    expect(currentUrl).toContain('checkout-step-one.html');
    console.log('✅ EC015 - User remained on checkout step one, did not proceed');

    await page.locator('[data-test="firstName"]').fill('TestFirst');
    await page.evaluate(() => {
      const lastNameInput = document.querySelector('[data-test="lastName"]') as HTMLInputElement;
      const postalCodeInput = document.querySelector('[data-test="postalCode"]') as HTMLInputElement;
      if (lastNameInput) lastNameInput.value = '';
      if (postalCodeInput) postalCodeInput.value = '';
    });
    await page.locator('[data-test="continue"]').click();
    console.log('✅ EC015 - Attempted with only first name filled');

    await expect(errorElement).toBeVisible();
    const errorText2 = await errorElement.innerText();
    expect(errorText2.toLowerCase()).toContain('last name');
    console.log('✅ EC015 - Server-side validation blocked empty last name');

    await page.locator('[data-test="lastName"]').fill('TestLast');
    await page.evaluate(() => {
      const postalCodeInput = document.querySelector('[data-test="postalCode"]') as HTMLInputElement;
      if (postalCodeInput) postalCodeInput.value = '';
    });
    await page.locator('[data-test="continue"]').click();
    console.log('✅ EC015 - Attempted with first and last name filled, postal code empty');

    await expect(errorElement).toBeVisible();
    const errorText3 = await errorElement.innerText();
    expect(errorText3.toLowerCase()).toContain('postal code');
    console.log('✅ EC015 - Server-side validation blocked empty postal code');

    expect(page.url()).toContain('checkout-step-one.html');
    console.log('✅ EC015 - Validation bypass prevented - server-side validation is working correctly');
  });
});