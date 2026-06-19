// @generated from app-model.json v1.0.17 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test, expect } from '../fixtures.generated'
import { HomePage } from '../pages/HomePage.generated'

test.describe('inferred-flow-lockedUser-1781895312359', () => {

  test('TC-GEN-005 Locked Out User flow full flow', async ({ lockedUser }) => {
    await lockedUser.fill('[data-test="username"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[0] ?? ''))
    await lockedUser.fill('[data-test="password"]', (process.env.LOCKED_USER_CREDENTIALS?.split(':')[1] ?? ''))
    await lockedUser.click('[data-test="login-button"]')
  })

})
