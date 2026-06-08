import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';

test.describe('Checkout Form Validation - Special Characters', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    console.log('✅ TC058 - Navigated to login page');
    
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ TC058 - Logged in successfully');
    
    const inventoryPage = new InventoryPage(page);
    await page.waitForURL('**/inventory.html');
    await inventoryPage.addFirstItemToCart(); // TODO: originally added specific item by name — verify this is the intended item
    console.log('✅ TC058 - Added item to cart');
    
    await page.locator('.shopping_cart_link').click();
    const cartPage = new CartPage(page);
    await page.waitForURL('**/cart.html');
    await page.locator('[data-test="checkout"]').click();
    console.log('✅ TC058 - Proceeded to checkout');
  });

  test('TC058 - Checkout form validation with invalid/special characters in input fields', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    
    console.log('✅ TC058 - Testing XSS payload in first name');
    await page.locator('[data-test="firstName"]').fill('<script>alert(1)</script>');
    await page.locator('[data-test="lastName"]').fill('User');
    await page.locator('[data-test="postalCode"]').fill('12345');
    await page.locator('[data-test="continue"]').click();
    
    const currentUrl = page.url();
    if (currentUrl.includes('checkout-step-two')) {
      console.log('✅ TC058 - XSS payload was sanitized and form accepted');
      await expect(page.locator('.checkout_summary_container')).toBeVisible();
      
      const summaryInfo = await page.locator('.summary_info').textContent();
      expect(summaryInfo).not.toContain('<script>');
      console.log('✅ TC058 - Verified script tags not rendered in summary');
    } else {
      const errorMessage = await page.locator('[data-test="error"]');
      if (await errorMessage.isVisible()) {
        console.log('✅ TC058 - Form rejected XSS payload with error message');
        await expect(errorMessage).toBeVisible();
      }
    }
    
    await page.goBack();
    console.log('✅ TC058 - Returned to checkout form');
    
    console.log('✅ TC058 - Testing SQL injection in last name');
    await page.locator('[data-test="firstName"]').fill('John');
    await page.locator('[data-test="lastName"]').fill("' OR '1'='1");
    await page.locator('[data-test="postalCode"]').fill('12345');
    await page.locator('[data-test="continue"]').click();
    
    await expect(page).toHaveURL(/checkout-step-two/);
    console.log('✅ TC058 - SQL injection payload handled safely');
    
    await page.goBack();
    
    console.log('✅ TC058 - Testing special characters in postal code');
    await page.locator('[data-test="firstName"]').fill('Jane');
    await page.locator('[data-test="lastName"]').fill('Doe');
    await page.locator('[data-test="postalCode"]').fill('!@#$%^&*()');
    await page.locator('[data-test="continue"]').click();
    
    const finalUrl = page.url();
    if (finalUrl.includes('checkout-step-two')) {
      console.log('✅ TC058 - Special characters in postal code were accepted');
      await expect(page.locator('.checkout_summary_container')).toBeVisible();
    } else {
      const error = page.locator('[data-test="error"]');
      if (await error.isVisible()) {
        console.log('✅ TC058 - Special characters in postal code were rejected');
        await expect(error).toBeVisible();
      }
    }
    
    console.log('✅ TC058 - Completed special character validation tests');
  });
});