import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { CartPage } from '../../pages/CartPage';

test.describe('Cart - Empty Cart State', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC053 - Navigate to cart with empty cart state', async ({ page }) => {
    console.log('✅ TC053 - Starting empty cart state test');

    const loginPage = new LoginPage(page);
    await loginPage.login('standard_user', 'secret_sauce');
    console.log('✅ TC053 - Logged in successfully');

    await page.locator('.shopping_cart_link').click();
    console.log('✅ TC053 - Clicked cart icon');

    const cartPage = new CartPage(page);
    await cartPage.waitForLoad();
    console.log('✅ TC053 - Cart page loaded');

    await expect(page).toHaveURL(/.*cart\.html/);
    console.log('✅ TC053 - Verified cart URL');

    const cartBadge = page.locator('.shopping_cart_badge');
    await expect(cartBadge).not.toBeVisible();
    console.log('✅ TC053 - Verified cart badge is not visible');

    const cartItems = await cartPage.getCartItems();
    expect(cartItems.length).toBe(0);
    console.log('✅ TC053 - Verified cart has no items');

    const checkoutButton = page.locator('[data-test="checkout"]');
    await expect(checkoutButton).toBeVisible();
    console.log('✅ TC053 - Verified checkout button is present');

    const continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    await expect(continueShoppingButton).toBeVisible();
    console.log('✅ TC053 - Verified continue shopping button is visible');

    const cartList = page.locator('.cart_list');
    await expect(cartList).toBeVisible();
    console.log('✅ TC053 - Verified cart container is visible without items');

    console.log('✅ TC053 - Empty cart state verified successfully');
  });
});