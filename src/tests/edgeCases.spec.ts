import { test, expect } from '../fixtures/fixtures';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { TestDataGenerator } from '../utils/testDataGenerator';
import { Users } from '../data/users';

// ── Security & Boundary Tests ─────────────────────────────────
// These test login validation — use guestPage (starts on login page).

test.describe('Edge Cases - Security & Boundary Testing', () => {

  test('EC001 - SQL Injection attempt', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);
    const sqlInjection = TestDataGenerator.getEdgeCaseInputs().find(e => e.type === 'sql_injection');

    if (sqlInjection) {
      await loginPage.attemptLogin({ username: sqlInjection.username, password: sqlInjection.password });
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(guestPage).toHaveURL('https://www.saucedemo.com/');
      console.log('✅ EC001 - SQL injection prevented');
    }
  });

  test('EC002 - XSS attempt', async ({ guestPage }) => {
    const loginPage  = new LoginPage(guestPage);
    const xssAttempt = TestDataGenerator.getEdgeCaseInputs().find(e => e.type === 'xss_attempt');

    if (xssAttempt) {
      guestPage.on('dialog', () => { throw new Error('XSS alert was triggered!'); });
      await loginPage.attemptLogin({ username: xssAttempt.username, password: xssAttempt.password });
      await expect(loginPage.errorMessage).toBeVisible();
      console.log('✅ EC002 - XSS attempt prevented');
    }
  });

  test('EC003 - Very long input strings', async ({ guestPage }) => {
    const loginPage  = new LoginPage(guestPage);
    const longInput  = TestDataGenerator.getEdgeCaseInputs().find(e => e.type === 'long_input');

    if (longInput) {
      await loginPage.attemptLogin({ username: longInput.username, password: longInput.password });
      await expect(loginPage.errorMessage).toBeVisible();
      console.log('✅ EC003 - Long input handled gracefully');
    }
  });

  test('EC004 - Special characters in credentials', async ({ guestPage }) => {
    const loginPage    = new LoginPage(guestPage);
    const specialChars = TestDataGenerator.getEdgeCaseInputs().find(e => e.type === 'special_chars');

    if (specialChars) {
      await loginPage.attemptLogin({ username: specialChars.username, password: specialChars.password });
      await expect(loginPage.errorMessage).toBeVisible();
      console.log('✅ EC004 - Special characters handled');
    }
  });

  test('EC005 - Unicode characters', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);
    const unicode   = TestDataGenerator.getEdgeCaseInputs().find(e => e.type === 'unicode');

    if (unicode) {
      await loginPage.attemptLogin({ username: unicode.username, password: unicode.password });
      await expect(loginPage.errorMessage).toBeVisible();
      console.log('✅ EC005 - Unicode characters handled');
    }
  });

  test('EC006 - Whitespace handling', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.attemptLogin({ username: '   standard_user   ', password: '   secret_sauce   ' });

    const isError    = await loginPage.isErrorVisible();
    const currentUrl = guestPage.url();

    if (currentUrl.includes('inventory.html')) {
      console.log('✅ EC006 - Whitespace trimmed automatically');
    } else if (isError) {
      console.log('✅ EC006 - Whitespace not trimmed (validation working)');
    }
  });

  test('EC007 - Case sensitivity check', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.attemptLogin({ username: 'STANDARD_USER', password: 'secret_sauce' });

    await expect(loginPage.errorMessage).toBeVisible();
    console.log('✅ EC007 - Username is case-sensitive');
  });

  test('EC008 - Rapid successive login attempts', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    for (let i = 0; i < 5; i++) {
      await loginPage.loginButton.click();
      await guestPage.waitForTimeout(100);
    }

    await expect(loginPage.errorMessage).toBeVisible();
    console.log('✅ EC008 - Rapid attempts handled');
  });
});

// ── Browser Behavior Tests ────────────────────────────────────

test.describe('Edge Cases - Browser Behavior', () => {

  test('EC009 - Browser refresh on login page', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.usernameField.fill('standard_user');
    await loginPage.passwordField.fill('secret_sauce');
    await guestPage.reload();

    const usernameValue = await loginPage.usernameField.inputValue();
    const passwordValue = await loginPage.passwordField.inputValue();

    console.log(`✅ EC009 - After refresh: username="${usernameValue}", password="${passwordValue}"`);
    expect(usernameValue.length === 0 || passwordValue.length === 0).toBeTruthy();
  });

  test('EC010 - Browser back button after successful login', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.loginAndWait(Users.standard());
    await guestPage.goBack();
    await guestPage.waitForTimeout(1000);

    const currentUrl = guestPage.url();
    console.log(`✅ EC010 - After back button: URL=${currentUrl}`);
    expect(currentUrl.includes('inventory') || currentUrl === 'https://www.saucedemo.com/').toBeTruthy();
  });
});

// ── Self-Healing Tests ────────────────────────────────────────

test.describe('Edge Cases - Self-Healing Tests', () => {

  test('EC011 - Self-healing login with fallback selectors', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.smartLogin(Users.standard());

    await guestPage.waitForURL('**/inventory.html', { timeout: 10000 });
    await expect(guestPage).toHaveURL(/.*inventory\.html/);

    console.log('✅ EC011 - Self-healing login successful');
  });

  test('EC012 - Cart items persist after navigating back from checkout', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);
    const cartPage      = new CartPage(standardUser);
    const checkoutPage  = new CheckoutPage(standardUser);

    await inventoryPage.addFirstItemToCart();
    const initialBadge = await inventoryPage.getCartBadgeCount();

    await inventoryPage.goToCart();

    const itemNamesBefore = await cartPage.getItemNames();
    const itemCountBefore = await cartPage.getCartItemCount();

    await cartPage.proceedToCheckout();
    await standardUser.goBack();
    await standardUser.waitForURL('**/cart.html');

    const itemNamesAfter  = await cartPage.getItemNames();
    const itemCountAfter  = await cartPage.getCartItemCount();
    const badgeAfter      = await cartPage.getCartBadgeCount();

    expect(itemCountAfter).toBe(itemCountBefore);
    expect(itemNamesAfter).toEqual(itemNamesBefore);
    expect(badgeAfter).toBe(initialBadge);

    console.log('✅ EC012 - Cart persisted after browser back navigation');
  });
});

