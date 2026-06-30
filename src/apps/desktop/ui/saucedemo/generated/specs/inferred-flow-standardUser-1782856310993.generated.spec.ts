// @generated from app-model.json v1.0.27 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { InventoryPage } from '../pages/InventoryPage.generated'

test.describe('inferred-flow-standardUser-1782856310993', () => {

  test('TC-GEN-002 Standard User flow full flow', async ({ standardUser }) => {
    await standardUser.locator("item4ImgLink").click()
    await standardUser.locator("item0ImgLink").click()
    await standardUser.locator("item1ImgLink").click()
    await standardUser.locator("item5ImgLink").click()
    await standardUser.locator("item2ImgLink").click()
    await standardUser.locator("item3ImgLink").click()
  })

})
