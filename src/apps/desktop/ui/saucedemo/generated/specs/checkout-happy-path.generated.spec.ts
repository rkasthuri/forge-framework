// @generated from app-model.json v1.0.23 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'


test.describe('checkout-happy-path', () => {

  test('TC-GEN-001 Add item to cart, proceed through checkout to completion smoke test', async ({ standardUser }) => {
    await expect(standardUser).not.toHaveURL(/error|404/)
  })

})
