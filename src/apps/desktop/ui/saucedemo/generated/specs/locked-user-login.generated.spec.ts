// @generated from app-model.json v1.0.3 sha256:f4163003acf5c74e
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('locked-user-login', () => {

  test('TC-GEN-008 Locked User Login Attempt full flow', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
  })

  test('TC-GEN-009 critical elements visible on home', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
    await expect(lockedUser.locator('[data-test="login-container"]')).toBeVisible()
    await expect(lockedUser.locator('[data-test="username"]')).toBeVisible()
    await expect(lockedUser.locator('[data-test="password"]')).toBeVisible()
  })

})
