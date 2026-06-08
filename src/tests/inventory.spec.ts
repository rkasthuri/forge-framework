import { test, expect } from '../fixtures/fixtures';
import { InventoryPage } from '../pages/InventoryPage';

// standardUser fixture: already logged in and on /inventory.html
// No beforeEach needed — fixture handles login and navigation.

test.describe('Inventory Page Tests', () => {

  test('TC011 - Verify inventory page loads with products', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await expect(inventoryPage.pageTitle).toContainText('Products');

    const itemCount = await inventoryPage.getProductCount();
    expect(itemCount).toBe(6);

    console.log('✅ TC011 - Inventory page loaded with 6 products');
  });

  test('TC012 - Add single item to cart', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await inventoryPage.addFirstItemToCart();

    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(1);

    console.log('✅ TC012 - Item added to cart successfully');
  });

  test('TC013 - Add multiple items to cart', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await inventoryPage.addToCartButtons.nth(0).click();
    await inventoryPage.addToCartButtons.nth(1).click();
    await inventoryPage.addToCartButtons.nth(2).click();

    const badgeCount = await inventoryPage.getCartBadgeCount();
    expect(badgeCount).toBe(3);

    console.log('✅ TC013 - Multiple items added to cart');
  });

  test('TC014 - Remove item from inventory page', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await inventoryPage.addFirstItemToCart();
    expect(await inventoryPage.getCartBadgeCount()).toBe(1);

    await inventoryPage.removeButtons.first().click();

    const isBadgeVisible = await inventoryPage.isCartBadgeVisible();
    expect(isBadgeVisible).toBe(false);

    console.log('✅ TC014 - Item removed from cart');
  });

  test('TC015 - Navigate to cart from inventory', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await inventoryPage.addFirstItemToCart();
    await inventoryPage.goToCart();

    await expect(standardUser).toHaveURL(/.*cart\.html/);
    await expect(inventoryPage.pageTitle).toContainText('Your Cart');

    console.log('✅ TC015 - Navigated to cart successfully');
  });

  test('TC016 - Verify menu functionality', async ({ standardUser }) => {
    const inventoryPage = new InventoryPage(standardUser);

    await inventoryPage.openMenu();

    await expect(inventoryPage.logoutLink).toBeVisible();

    console.log('✅ TC016 - Menu opened successfully');
  });
});

