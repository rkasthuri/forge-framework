// @generated from app-model.json v1.0.17 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'
import { InventoryHtmlPage } from '../pages/InventoryHtmlPage.generated'

test.describe('checkout-happy-path', () => {

  test('TC-GEN-001 Add item to cart, proceed through checkout to completion full flow', async ({ standardUser }) => {
    await standardUser.fill('[data-test="username"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await standardUser.fill('[data-test="password"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await standardUser.click('[data-test="login-button"]')
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
  })

  test('TC-GEN-002 critical elements visible on inventory-html', async ({ standardUser }) => {
    await standardUser.fill('[data-test="username"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await standardUser.fill('[data-test="password"]', (process.env.STANDARD_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await standardUser.click('[data-test="login-button"]')
    await expect(standardUser).toHaveURL(/\/inventory\.html/)
    await expect(standardUser.locator('[data-test="header-container"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="primary-header"]')).toBeVisible()
    await expect(standardUser.locator('[data-test="inventory-sidebar-link"]')).toBeVisible()
  })

})
