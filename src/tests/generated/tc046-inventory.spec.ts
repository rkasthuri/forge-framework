import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Inventory - Product Detail Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC046 - Clicking product name or image to navigate to product detail page', async ({ page }) => {
    console.log('✅ TC046 - Starting product detail navigation test');
    
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    console.log('✅ TC046 - Inventory page loaded');

    // Click on the first product name link (Sauce Labs Backpack)
    const productName = page.locator('#item_4_title_link');
    await expect(productName).toBeVisible();
    const productNameText = await productName.textContent();
    console.log(`✅ TC046 - Clicking product name: ${productNameText}`);
    await productName.click();

    // Verify URL contains inventory-item.html with correct product ID
    await expect(page).toHaveURL(/.*inventory-item\.html\?id=4/);
    console.log('✅ TC046 - Product detail URL verified with correct ID');

    // Verify product detail page elements are visible
    await expect(page.locator('.inventory_details_name')).toBeVisible();
    await expect(page.locator('.inventory_details_desc')).toBeVisible();
    await expect(page.locator('.inventory_details_price')).toBeVisible();
    await expect(page.locator('.inventory_details_img')).toBeVisible();
    console.log('✅ TC046 - Product detail page elements verified');

    // Verify the product name matches on detail page
    const detailPageName = await page.locator('.inventory_details_name').textContent();
    expect(detailPageName).toBe(productNameText);
    console.log('✅ TC046 - Product name matches on detail page');

    // Go back to inventory
    await page.locator('[data-test="back-to-products"]').click();
    await inventoryPage.waitForLoad();
    console.log('✅ TC046 - Returned to inventory page');

    // Click on product image instead of name (Sauce Labs Bike Light)
    const productImage = page.locator('#item_0_img_link');
    await expect(productImage).toBeVisible();
    console.log('✅ TC046 - Clicking product image');
    await productImage.click();

    // Verify URL contains inventory-item.html with correct product ID
    await expect(page).toHaveURL(/.*inventory-item\.html\?id=0/);
    console.log('✅ TC046 - Product detail URL verified for image click');

    // Verify product detail page loaded correctly
    await expect(page.locator('.inventory_details_name')).toBeVisible();
    await expect(page.locator('.inventory_details_name')).toContainText('Sauce Labs Bike Light');
    console.log('✅ TC046 - Product detail page loaded correctly via image click');
  });
});