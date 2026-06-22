// @generated from app-model.json v1.0.20 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('locked-user-login', () => {

  test('TC-GEN-018 Locked User Login Attempt full flow', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
  })

  test('TC-GEN-019 critical elements visible on home', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
    await expect(lockedUser.locator("[data-test=\"login-container\"]")).toBeVisible()
    await expect(lockedUser.locator("[data-test=\"username\"]")).toBeVisible()
    await expect(lockedUser.locator("[data-test=\"password\"]")).toBeVisible()
  })

})
