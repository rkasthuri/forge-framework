// @generated from app-model.json v1.0.3 sha256:f4163003acf5c74e
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('user-login', () => {

  test('TC-GEN-006 User Login full flow', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
  })

  test('TC-GEN-007 critical elements visible on home', async ({ standardUser }) => {
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser.locator('[data-test="login-container"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="username"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="password"]')).toBeVisible()
  })

})
