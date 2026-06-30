// @generated from app-model.json v1.0.26 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('locked-user-login', () => {

  test('TC-GEN-045 Locked User Login Attempt full flow', async ({ lockedUser }) => {
    await expect(lockedUser).toHaveURL(/\//)
  })

})
