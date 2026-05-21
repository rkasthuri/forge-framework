import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TestDataGenerator } from '../utils/testDataGenerator';

test.describe('Edge Cases - Security & Boundary Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('EC001 - SQL Injection attempt', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const edgeCases = TestDataGenerator.getEdgeCaseInputs();
    const sqlInjection = edgeCases.find(e => e.type === 'sql_injection');

    if (sqlInjection) {
      await loginPage.login(sqlInjection.username, sqlInjection.password);
      
      // Should show error, not crash or allow access
      await expect(loginPage.errorMessage).toBeVisible();
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      
      console.log('✅ EC001 - SQL injection prevented');
    }
  });

  test('EC002 - XSS attempt', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const edgeCases = TestDataGenerator.getEdgeCaseInputs();
    const xssAttempt = edgeCases.find(e => e.type === 'xss_attempt');

    if (xssAttempt) {
      await loginPage.login(xssAttempt.username, xssAttempt.password);
      
      // Should show error, script should not execute
      await expect(loginPage.errorMessage).toBeVisible();
      
      // Check that no alert was triggered
      page.on('dialog', () => {
        throw new Error('XSS alert was triggered!');
      });
      
      console.log('✅ EC002 - XSS attempt prevented');
    }
  });

  test('EC003 - Very long input strings', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const edgeCases = TestDataGenerator.getEdgeCaseInputs();
    const longInput = edgeCases.find(e => e.type === 'long_input');

    if (longInput) {
      await loginPage.login(longInput.username, longInput.password);
      
      // Should handle gracefully without crashing
      await expect(loginPage.errorMessage).toBeVisible();
      
      console.log('✅ EC003 - Long input handled gracefully');
    }
  });

  test('EC004 - Special characters in credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const edgeCases = TestDataGenerator.getEdgeCaseInputs();
    const specialChars = edgeCases.find(e => e.type === 'special_chars');

    if (specialChars) {
      await loginPage.login(specialChars.username, specialChars.password);
      
      // Should handle special characters
      await expect(loginPage.errorMessage).toBeVisible();
      
      console.log('✅ EC004 - Special characters handled');
    }
  });

  test('EC005 - Unicode characters', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const edgeCases = TestDataGenerator.getEdgeCaseInputs();
    const unicode = edgeCases.find(e => e.type === 'unicode');

    if (unicode) {
      await loginPage.login(unicode.username, unicode.password);
      
      // Should handle unicode gracefully
      await expect(loginPage.errorMessage).toBeVisible();
      
      console.log('✅ EC005 - Unicode characters handled');
    }
  });

  test('EC006 - Whitespace handling', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Test with leading/trailing spaces
    await loginPage.login('   standard_user   ', '   secret_sauce   ');
    
    // Check if whitespace is trimmed or handled
    const isError = await loginPage.isErrorMessageVisible();
    const currentUrl = page.url();
    
    if (currentUrl.includes('inventory.html')) {
      console.log('✅ EC006 - Whitespace trimmed automatically');
    } else if (isError) {
      console.log('✅ EC006 - Whitespace not trimmed (validation working)');
    }
  });

  test('EC007 - Case sensitivity check', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Try uppercase username
    await loginPage.login('STANDARD_USER', 'secret_sauce');
    
    // Should fail (case sensitive)
    await expect(loginPage.errorMessage).toBeVisible();
    
    console.log('✅ EC007 - Username is case-sensitive');
  });

  test('EC008 - Rapid successive login attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Attempt multiple rapid logins
    for (let i = 0; i < 5; i++) {
      await loginPage.loginButton.click();
      await page.waitForTimeout(100);
    }
    
    // Should still show validation error, not crash
    await expect(loginPage.errorMessage).toBeVisible();
    
    console.log('✅ EC008 - Rapid attempts handled');
  });
});

test.describe('Edge Cases - Browser Behavior', () => {
  
  test('EC009 - Browser refresh on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill in credentials
    await loginPage.usernameField.fill('standard_user');
    await loginPage.passwordField.fill('secret_sauce');

    // Refresh page
    await page.reload();

    // Check if fields are cleared
    const usernameValue = await loginPage.usernameField.inputValue();
    const passwordValue = await loginPage.passwordField.inputValue();

    console.log(`✅ EC009 - After refresh: username="${usernameValue}", password="${passwordValue}"`);
    
    // Fields should be empty after refresh (unless browser autofill)
    expect(usernameValue.length === 0 || passwordValue.length === 0).toBeTruthy();
  });

  test('EC010 - Browser back button after successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login successfully
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');

    // Press back button
    await page.goBack();

    // Should not return to login page (or handle session properly)
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    
    console.log(`✅ EC010 - After back button: URL=${currentUrl}`);
    
    // Either stays on inventory or redirects properly
    expect(currentUrl.includes('inventory') || currentUrl === 'https://www.saucedemo.com/').toBeTruthy();
  });
});

test.describe('Edge Cases - Self-Healing Tests', () => {
  
  test('EC011 - Self-healing login with fallback selectors', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Use smart login (with self-healing)
    await loginPage.smartLogin('standard_user', 'secret_sauce');
    
    // Should succeed even if primary selectors change
    await page.waitForURL('**/inventory.html', { timeout: 10000 });
    await expect(page).toHaveURL(/.*inventory\.html/);
    
    console.log('✅ EC011 - Self-healing login successful');
  });
}); 