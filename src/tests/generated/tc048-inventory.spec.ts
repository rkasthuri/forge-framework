import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';

test.describe('Inventory - Problem User Issues', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC048 - Problem_user experience on inventory page not validated', async ({ page }) => {
    console.log('✅ TC048 - Starting problem_user validation test');

    const loginPage = new LoginPage(page);
    await loginPage.login('problem_user', 'secret_sauce');
    console.log('✅ TC048 - Logged in as problem_user');

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    console.log('✅ TC048 - Inventory page loaded');

    // Verify product images are present but may have known issues
    const inventoryItems = page.locator('.inventory_item');
    const itemCount = await inventoryItems.count();
    expect(itemCount).toBeGreaterThan(0);
    console.log(`✅ TC048 - Found ${itemCount} inventory items`);

    // Check if images exist on all products
    for (let i = 0; i < itemCount; i++) {
      const item = inventoryItems.nth(i);
      const image = item.locator('.inventory_item_img img');
      await expect(image).toBeVisible();
      const imgSrc = await image.getAttribute('src');
      expect(imgSrc).toBeTruthy();
    }
    console.log('✅ TC048 - All product images are present (note: problem_user may show incorrect images)');

    // Document known issue: Images may all show the same dog picture
    const firstImage = inventoryItems.first().locator('.inventory_item_img img');
    const firstImageSrc = await firstImage.getAttribute('src');
    console.log(`✅ TC048 - First image src: ${firstImageSrc}`);

    // Attempt to add items to cart and verify button behavior anomalies
    const backpackButton = page.locator('[data-test="add-to-cart-sauce-labs-backpack"]');
    await expect(backpackButton).toBeVisible();
    await backpackButton.click();
    console.log('✅ TC048 - Clicked add-to-cart button for backpack');

    // Verify the button text changes (may have anomalies for problem_user)
    const removeButton = page.locator('[data-test="remove-sauce-labs-backpack"]');
    await expect(removeButton).toBeVisible();
    console.log('✅ TC048 - Button changed to Remove after adding to cart');

    // Try adding another item
    const bikeLightButton = page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]');
    await expect(bikeLightButton).toBeVisible();
    await bikeLightButton.click();
    console.log('✅ TC048 - Clicked add-to-cart button for bike light');

    // Verify cart badge shows items added
    const cartBadge = page.locator('.shopping_cart_badge');
    await expect(cartBadge).toBeVisible();
    const badgeCount = await cartBadge.textContent();
    expect(badgeCount).toBe('2');
    console.log('✅ TC048 - Cart badge shows 2 items');

    // Verify navigation to cart works
    await page.locator('.shopping_cart_link').click();
    await expect(page).toHaveURL(/.*cart.html/);
    console.log('✅ TC048 - Successfully navigated to cart page');

    console.log('✅ TC048 - Problem_user inventory experience validated with known defects documented');
  });
});