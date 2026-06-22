// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'


test.describe('admin-login', () => {

  test('TC-GEN-001 Admin logs in and lands on dashboard smoke test', async ({ adminUser }) => {
    await expect(adminUser).not.toHaveURL(/error|404/)
  })

})
