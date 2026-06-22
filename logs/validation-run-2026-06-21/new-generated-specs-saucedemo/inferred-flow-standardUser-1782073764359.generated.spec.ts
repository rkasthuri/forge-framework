// @generated from app-model.json v1.0.20 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { InventoryPage } from '../pages/InventoryPage.generated'
import { InventoryItemPage } from '../pages/InventoryItemPage.generated'

test.describe('inferred-flow-standardUser-1782073764359', () => {

  test('TC-GEN-002 Standard User flow full flow', async ({ standardUser }) => {
    await standardUser.locator("navigation").click()
    await standardUser.locator("navigation").click()
    await standardUser.locator("navigation").click()
    await standardUser.locator("navigation").click()
    await standardUser.locator("navigation").click()
    await standardUser.locator("navigation").click()
  })

})
