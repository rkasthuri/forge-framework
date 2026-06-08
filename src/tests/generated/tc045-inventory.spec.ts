import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Inventory Sorting', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC045 - Product sorting functionality (A-Z, Z-A, Price Low-High, Price High-Low)', async ({ page }) => {
    console.log('✅ TC045 - Starting product sorting verification');
    
    const inventoryPage = new InventoryPage(page);
   await page.waitForURL('**/inventory.html');
   await page.locator('[data-test="product_sort_container"]').waitFor({ state: 'visible' });

    // Test 1: Default sort (A-Z)
    console.log('✅ TC045 - Verifying default sort (A-Z)');
    let productNames = await page.locator('.inventory_item_name').allTextContents();
    const sortedAZ = [...productNames].sort();
    expect(productNames).toEqual(sortedAZ);

    // Test 2: Sort Z-A
    console.log('✅ TC045 - Testing Z-A sort');
    await page.locator('[data-test="product_sort_container"]').selectOption('za');
    await page.waitForTimeout(500);
    productNames = await page.locator('.inventory_item_name').allTextContents();
    const sortedZA = [...productNames].sort().reverse();
    expect(productNames).toEqual(sortedZA);

    // Test 3: Sort Price Low to High
    console.log('✅ TC045 - Testing Price (low to high) sort');
    await page.locator('[data-test="product_sort_container"]').selectOption('lohi');
    await page.waitForTimeout(500);
    const pricesLowHigh = await page.locator('.inventory_item_price').allTextContents();
    const pricesLowHighNumbers = pricesLowHigh.map(price => parseFloat(price.replace('$', '')));
    const sortedLowHigh = [...pricesLowHighNumbers].sort((a, b) => a - b);
    expect(pricesLowHighNumbers).toEqual(sortedLowHigh);

    // Test 4: Sort Price High to Low
    console.log('✅ TC045 - Testing Price (high to low) sort');
    await page.locator('[data-test="product_sort_container"]').selectOption('hilo');
    await page.waitForTimeout(500);
    const pricesHighLow = await page.locator('.inventory_item_price').allTextContents();
    const pricesHighLowNumbers = pricesHighLow.map(price => parseFloat(price.replace('$', '')));
    const sortedHighLow = [...pricesHighLowNumbers].sort((a, b) => b - a);
    expect(pricesHighLowNumbers).toEqual(sortedHighLow);

    console.log('✅ TC045 - All sorting options verified successfully');
  });
});