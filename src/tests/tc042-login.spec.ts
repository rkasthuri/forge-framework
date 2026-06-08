import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Field Character Limit and Special Character Handling', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC042 - Username/password field character limit and special character handling', async ({ page }) => {
    console.log('✅ TC042 - Starting SQL injection attempt test');
    
    const loginPage = new LoginPage(page);
    
    // Test 1: SQL Injection attempt
    await page.fill('#user-name', "' OR '1'='1");
    await page.fill('#password', "' OR '1'='1");
    await page.click('#login-button');
    
    const sqlInjectionError = page.locator('[data-test="error"]');
    await expect(sqlInjectionError).toBeVisible();
    console.log('✅ TC042 - SQL injection attempt properly rejected');
    
    // Clear error and reset
    await page.click('[data-test="error-button"]');
    await page.fill('#user-name', '');
    await page.fill('#password', '');
    
    // Test 2: XSS attempt
    console.log('✅ TC042 - Testing XSS attempt handling');
    await page.fill('#user-name', '<script>alert("xss")</script>');
    await page.fill('#password', '<img src=x onerror=alert(1)>');
    await page.click('#login-button');
    
    await expect(sqlInjectionError).toBeVisible();
    const errorText = await sqlInjectionError.textContent();
    expect(errorText).not.toContain('<script>');
    console.log('✅ TC042 - XSS attempt properly sanitized and rejected');
    
    await page.click('[data-test="error-button"]');
    await page.fill('#user-name', '');
    await page.fill('#password', '');
    
    // Test 3: Very long input (1000+ characters)
    console.log('✅ TC042 - Testing 1000+ character input handling');
    const longString = 'a'.repeat(1500);
    await page.fill('#user-name', longString);
    await page.fill('#password', longString);
    await page.click('#login-button');
    
    await expect(sqlInjectionError).toBeVisible();
    console.log('✅ TC042 - Long input handled safely without crash');
    
    await page.click('[data-test="error-button"]');
    await page.fill('#user-name', '');
    await page.fill('#password', '');
    
    // Test 4: Unicode and emoji characters
    console.log('✅ TC042 - Testing unicode and emoji character handling');
    await page.fill('#user-name', '用户名👨‍💻🔐');
    await page.fill('#password', 'пароль😀🎉');
    await page.click('#login-button');
    
    await expect(sqlInjectionError).toBeVisible();
    console.log('✅ TC042 - Unicode and emoji characters handled safely');
    
    await page.click('[data-test="error-button"]');
    await page.fill('#user-name', '');
    await page.fill('#password', '');
    
    // Test 5: Special characters and null bytes
    console.log('✅ TC042 - Testing special characters');
    await page.fill('#user-name', 'user\x00name!@#$%^&*()');
    await page.fill('#password', 'pass\nword\ttab');
    await page.click('#login-button');
    
    await expect(sqlInjectionError).toBeVisible();
    console.log('✅ TC042 - Special characters properly rejected');
    
    // Test 6: Verify normal login still works after all invalid attempts
    console.log('✅ TC042 - Verifying normal login still functional');
    await page.click('[data-test="error-button"]');
    await loginPage.login('standard_user', 'secret_sauce');
    
    await expect(page.locator('.inventory_list')).toBeVisible();
    console.log('✅ TC042 - Normal login still works after security tests - authentication remains intact');
  });
});

