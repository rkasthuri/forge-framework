import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

test.describe('Inventory Page Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.waitForURL('**/inventory.html');
  });

  test('TC011 - Verify inventory page loads with products', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Verify page loaded
    await expect(inventoryPage.pageTitle).toContainText('Products');
    
    // Verify products are displayed
    const itemCount = await inventoryPage.getInventoryItemCount();
    expect(itemCount).toBe(6); // SauceDemo has 6 products

    console.log('✅ TC011 - Inventory page loaded with 6 products');
  });

  test('TC012 - Add single item to cart', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Add first item to cart
    await inventoryPage.addFirstItemToCart();

    // Verify cart badge shows 1
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe('1');

    console.log('✅ TC012 - Item added to cart successfully');
  });

  test('TC013 - Add multiple items to cart', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Add 3 items
    const addButtons = inventoryPage.addToCartButtons;
    await addButtons.nth(0).click();
    await addButtons.nth(1).click();
    await addButtons.nth(2).click();

    // Verify cart badge shows 3
    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe('3');

    console.log('✅ TC013 - Multiple items added to cart');
  });

  test('TC014 - Remove item from inventory page', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Add item
    await inventoryPage.addFirstItemToCart();
    let badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe('1');

    // Remove item (button changes to "Remove" after adding)
    const removeButton = page.locator('[data-test^="remove-"]').first();
    await removeButton.click();

    // Verify cart is empty (badge should disappear)
    const isBadgeVisible = await inventoryPage.page.locator('.shopping_cart_badge').isVisible();
    expect(isBadgeVisible).toBe(false);

    console.log('✅ TC014 - Item removed from cart');
  });

  test('TC015 - Navigate to cart from inventory', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Add item first
    await inventoryPage.addFirstItemToCart();

    // Click cart icon
    await inventoryPage.shoppingCartLink.click();

    // Verify navigation to cart page
    await expect(page).toHaveURL(/.*cart\.html/);
    await expect(page.locator('.title')).toContainText('Your Cart');

    console.log('✅ TC015 - Navigated to cart successfully');
  });

  test('TC016 - Verify menu functionality', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Open menu
    await inventoryPage.menuButton.click();

    // Verify menu items are visible
    const logoutLink = page.locator('#logout_sidebar_link');
    await expect(logoutLink).toBeVisible();

    console.log('✅ TC016 - Menu opened successfully');
  });
});