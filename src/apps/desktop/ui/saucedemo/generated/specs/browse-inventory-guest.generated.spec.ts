// @generated from app-model.json v1.0.19 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'

test.describe('browse-inventory-guest', () => {

  test('TC-GEN-014 Browse Inventory as Guest full flow', async ({ guestPage }) => {
    await expect(guestPage).toHaveURL(/\/inventory\.html/)
  })

})
