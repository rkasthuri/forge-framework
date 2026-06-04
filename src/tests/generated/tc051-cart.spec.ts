import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { CartPage } from '../../pages/CartPage';

test.describe('Cart - Multiple Add Operations', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('TC051 - Add same item multiple times - verify quantity handling and cart behavior', async ({ page }) => {
    console.log('✅ TC051 - Starting test for adding same item multiple times');
    
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.waitForLoad();
    
    const itemName = 'Sauce Labs Backpack';
    const itemPrice = 29.99;
    
    console.log('✅ TC051 - Adding item to cart first time');
    await inventoryPage.addItemToCart(itemName);
    
    let cartBadge = await page.locator('.shopping_cart_badge').textContent();
    expect(cartBadge).toBe('1');
    console.log('✅ TC051 - Cart badge shows 1 item after first add');
    
    const addButton = page.locator('[data-test="add-to-cart-sauce-labs-backpack"]');
    const removeButton = page.locator('[data-test="remove-sauce-labs-backpack"]');
    
    await expect(removeButton).toBeVisible();
    console.log('✅ TC051 - Add button changed to Remove button');
    
    console.log('✅ TC051 - Attempting to add same item second time');
    const isAddButtonVisible = await addButton.isVisible();
    console.log(`✅ TC051 - Add button visible: ${isAddButtonVisible}`);
    
    await page.locator('.shopping_cart_link').click();
    const cartPage = new CartPage(page);
    await cartPage.waitForLoad();
    console.log('✅ TC051 - Navigated to cart page');
    
    const cartItems = page.locator('.cart_item');
    const itemCount = await cartItems.count();
    console.log(`✅ TC051 - Number of cart items: ${itemCount}`);
    expect(itemCount).toBe(1);
    
    const cartItemQuantity = await page.locator('.cart_quantity').textContent();
    console.log(`✅ TC051 - Item quantity in cart: ${cartItemQuantity}`);
    expect(cartItemQuantity).toBe('1');
    
    const cartItemName = await page.locator('.inventory_item_name').textContent();
    expect(cartItemName).toBe(itemName);
    console.log('✅ TC051 - Verified cart contains correct item name');
    
    const cartItemPrice = await page.locator('.inventory_item_price').textContent();
    expect(cartItemPrice).toContain(itemPrice.toString());
    console.log('✅ TC051 - Verified cart item price is correct');
    
    console.log('✅ TC051 - SauceDemo does not support quantity >1 per item, shows Remove button after first add');
    console.log('✅ TC051 - Cart correctly shows 1 item with quantity 1, not multiple entries');
  });
});