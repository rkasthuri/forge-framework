import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Checkout - Empty Cart Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC057 - Checkout with empty cart (direct URL navigation to checkout step)', async ({ page }) => {
    console.log('✅ TC057 - Starting test: Direct navigation to checkout with empty cart');
    
    const loginPage = new LoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ TC057 - Logged in successfully');

    await page.goto('https://www.saucedemo.com/checkout-step-one.html');
    console.log('✅ TC057 - Navigated directly to checkout step one URL');

    const currentUrl = page.url();
    console.log('✅ TC057 - Current URL after direct navigation: ' + currentUrl);

    if (currentUrl.includes('checkout-step-one.html')) {
      console.log('✅ TC057 - Application allows access to checkout with empty cart');
      
      await page.fill('[data-test="firstName"]', 'John');
      await page.fill('[data-test="lastName"]', 'Doe');
      await page.fill('[data-test="postalCode"]', '12345');
      console.log('✅ TC057 - Filled checkout information');
      
      await page.click('[data-test="continue"]');
      console.log('✅ TC057 - Clicked continue button');
      
      await page.waitForLoadState('networkidle');
      const step2Url = page.url();
      console.log('✅ TC057 - URL after continue: ' + step2Url);
      
      if (step2Url.includes('checkout-step-two.html')) {
        const itemsList = await page.locator('.cart_item').count();
        console.log('✅ TC057 - Number of items in checkout overview: ' + itemsList);
        expect(itemsList).toBe(0);
        console.log('✅ TC057 - Verified empty cart in checkout step two');
      }
    } else {
      console.log('✅ TC057 - Application redirected away from checkout');
      expect(currentUrl).toMatch(/inventory|cart/);
      console.log('✅ TC057 - Verified redirect to valid page');
    }
  });
});
