// @generated from app-model.json v1.0.3 sha256:f4163003acf5c74e
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'


test.describe('checkout-happy-path', () => {

  test('TC-GEN-001 Add item to cart, proceed through checkout to comp smoke test', async ({ standardUser }) => {
    await expect(standardUser).not.toHaveURL(/error|404/)
  })

})
