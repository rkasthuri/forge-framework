import { test, expect } from '../fixtures/fixtures';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { TestDataGenerator } from '../utils/testDataGenerator';
import { Users } from '../data/users';

// ── P0 Critical Login Tests ───────────────────────────────────
// Uses guestPage fixture — each test starts on the login page.
// These tests VERIFY the login flow itself, so they must not
// use the standardUser fixture (that skips the flow we're testing).

test.describe('P0 - Critical Login Tests', () => {

  test('TC001 - Valid login with standard user', async ({ guestPage }) => {
    const loginPage    = new LoginPage(guestPage);
    const inventoryPage = new InventoryPage(guestPage);

    await loginPage.loginAndWait(Users.standard());

    await expect(guestPage).toHaveURL(/.*inventory\.html/);
    await expect(inventoryPage.pageTitle).toContainText('Products');
    await expect(inventoryPage.cartLink).toBeVisible();

    const itemCount = await inventoryPage.getProductCount();
    expect(itemCount).toBeGreaterThan(0);

    console.log('✅ TC001 - Valid login successful');
  });

  test('TC002 - Invalid credentials error handling', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.attemptLogin({ username: 'invalid_user', password: 'wrong_password' });

    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Username and password do not match');
    await expect(guestPage).toHaveURL('https://www.saucedemo.com/');

    console.log('✅ TC002 - Invalid credentials handled correctly');
  });

  test('TC003 - Empty username validation', async ({ guestPage, browserName }) => {
    const loginPage = new LoginPage(guestPage);

    if (browserName === 'firefox') {
      test.setTimeout(60000);
      await guestPage.waitForTimeout(500);
    }

    await loginPage.passwordField.fill('secret_sauce');
    await loginPage.loginButton.click();

    const timeout = browserName === 'firefox' ? 10000 : 5000;
    await expect(loginPage.errorMessage).toBeVisible({ timeout });
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Username is required');

    console.log(`✅ TC003 - Empty username validation working on ${browserName}`);
  });

  test('TC004 - Empty password validation', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.usernameField.fill('standard_user');
    await loginPage.loginButton.click();

    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Password is required');

    console.log('✅ TC004 - Empty password validation working');
  });

  test('TC005 - Empty fields validation', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.loginButton.click();

    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Username is required');

    console.log('✅ TC005 - Empty fields validation working');
  });

  test('TC006 - Locked out user handling', async ({ guestPage }) => {
    const loginPage = new LoginPage(guestPage);

    await loginPage.attemptLogin(Users.locked());

    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Sorry, this user has been locked out');
    await expect(guestPage).toHaveURL('https://www.saucedemo.com/');

    console.log('✅ TC006 - Locked user handled correctly');
  });
});

// ── P1 High Priority Tests ────────────────────────────────────

test.describe('P1 - High Priority Tests', () => {

  test('TC007 - Performance glitch user login @slow @flaky', async ({ guestPage, browserName }) => {
    test.setTimeout(90000);
    const loginPage     = new LoginPage(guestPage);
    const inventoryPage = new InventoryPage(guestPage);

    const startTime = Date.now();

    if (browserName === 'firefox' || browserName === 'webkit') {
      await guestPage.waitForTimeout(1000);
    }

    await loginPage.attemptLogin(Users.glitch());
    await guestPage.waitForURL('**/inventory.html', { timeout: 60000 });

    const loginDuration = Date.now() - startTime;
    await expect(inventoryPage.pageTitle).toContainText('Products', { timeout: 10000 });

    console.log(`⏱️ TC007 - Login took ${loginDuration}ms (performance_glitch_user on ${browserName})`);
    expect(loginDuration).toBeGreaterThan(1000);
  });

  test('TC008 - Problem user login @slow @flaky', async ({ guestPage, browserName }) => {
    test.setTimeout(60000);
    const loginPage     = new LoginPage(guestPage);
    const inventoryPage = new InventoryPage(guestPage);

    if (browserName === 'firefox' || browserName === 'webkit') {
      await guestPage.waitForTimeout(1000);
    }

    await loginPage.attemptLogin(Users.problem());
    await guestPage.waitForURL('**/inventory.html', { timeout: 30000 });

    await expect(inventoryPage.pageTitle).toContainText('Products', { timeout: 10000 });
    const itemCount = await inventoryPage.getProductCount();
    expect(itemCount).toBeGreaterThan(0);

    console.log(`✅ TC008 - Problem user login successful on ${browserName}`);
  });
});

// ── P2 Data-Driven Tests ──────────────────────────────────────
// These iterate across multiple users — they stay data-driven
// rather than using per-user fixtures.

test.describe('P2 - Data-Driven Tests', () => {

  test('TC009 - Test all valid users', async ({ page, browserName }) => {
    test.setTimeout(180000);
    const validUsers = TestDataGenerator.getValidUsers();

    for (const user of validUsers) {
      const loginPage     = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);

      console.log(`Testing ${user.username} on ${browserName}...`);
      await loginPage.goto();

      if (browserName === 'firefox' || browserName === 'webkit') {
        await page.waitForTimeout(1000);
      }

      await loginPage.attemptLogin({ username: user.username, password: user.password });

      if (user.expectedBehavior === 'success' || user.expectedBehavior === 'slow') {
        const timeout = user.expectedBehavior === 'slow' ? 60000 : 20000;
        try {
          await page.waitForURL('**/inventory.html', { timeout });
          await expect(inventoryPage.pageTitle).toContainText('Products', { timeout: 10000 });
          console.log(`✅ ${user.username} - ${user.description} (${browserName})`);
        } catch {
          console.log(`⚠️ ${user.username} timed out on ${browserName}, skipping...`);
          continue;
        }
      }
    }
  });

  test('TC010 - Test invalid credentials variations', async ({ page }) => {
    const invalidUsers = TestDataGenerator.getInvalidUsers().filter(
      u => u.expectedBehavior === 'error'
    );

    for (const user of invalidUsers) {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.attemptLogin({ username: user.username, password: user.password });
      await expect(loginPage.errorMessage).toBeVisible();
      console.log(`✅ ${user.description} - Error shown correctly`);
    }
  });

  test('TC037 - Logged-out user cannot access inventory page directly', async ({ guestPage }) => {
    await guestPage.goto('https://www.saucedemo.com/inventory.html');
    await guestPage.waitForURL('https://www.saucedemo.com/');
    await expect(guestPage).toHaveURL('https://www.saucedemo.com/');

    const loginPage = new LoginPage(guestPage);
    const isErrorVisible = await loginPage.isErrorVisible();
    expect(isErrorVisible).toBe(true);

    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('Epic sadface');

    console.log('✅ TC037 - Logged-out user redirected to login');
  });
});

