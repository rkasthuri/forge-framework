// @generated from app-model.json v1.0.3 sha256:f4163003acf5c74e
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('inferred-flow-lockedUser-1781390062125', () => {

  test('TC-GEN-004 Locked Out User flow full flow', async ({ lockedUser }) => {
    await lockedUser.fill('[data-test="username"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await lockedUser.fill('[data-test="password"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await lockedUser.click('[data-test="login-button"]')
    await expect(lockedUser).toHaveURL(/\//)
  })

  test('TC-GEN-005 critical elements visible on home', async ({ lockedUser }) => {
    await lockedUser.fill('[data-test="username"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await lockedUser.fill('[data-test="password"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await lockedUser.click('[data-test="login-button"]')
    await expect(lockedUser).toHaveURL(/\//)
    await expect(lockedUser.locator('[data-test="login-container"]')).toBeVisible()
    await expect(lockedUser.locator('[data-test="username"]')).toBeVisible()
    await expect(lockedUser.locator('[data-test="password"]')).toBeVisible()
  })

})
