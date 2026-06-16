// @generated from app-model.json v1.0.3 sha256:f4163003acf5c74e
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('inferred-flow-standardUser-1781390062125', () => {

  test('TC-GEN-002 Standard User flow full flow', async ({ standardUser }) => {
    await standardUser.fill('[data-test="username"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await standardUser.fill('[data-test="password"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await standardUser.click('[data-test="login-button"]')
    await expect(standardUser).toHaveURL(/\//)
  })

  test('TC-GEN-003 critical elements visible on home', async ({ standardUser }) => {
    await standardUser.fill('[data-test="username"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await standardUser.fill('[data-test="password"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await standardUser.click('[data-test="login-button"]')
    await expect(standardUser).toHaveURL(/\//)
    await expect(standardUser.locator('[data-test="login-container"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="username"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="password"]')).toBeVisible()
  })

})
