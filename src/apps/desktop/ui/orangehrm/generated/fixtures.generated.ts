// @generated from app-model.json v1.0.8 sha256:15cff9c58b7f2b62
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test as base, Page } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config()

function resolveCredentials(envKey: string): { username: string; password: string } {
  const raw = process.env[envKey]
  if (!raw) throw new Error(`Missing env var: ${envKey}`)
  const [username, password] = raw.split(':')
  if (!username || !password) {
    throw new Error(`Invalid format for ${envKey} — expected username:password`)
  }
  return { username, password }
}

type OrangehrmFixtures = {
  adminUser: Page
}

export const test = base.extend<OrangehrmFixtures>({

  adminUser: async ({ page }, use) => {
    const creds = resolveCredentials("ORANGEHRM_ADMIN_CREDENTIALS")
    await page.goto("https://opensource-demo.orangehrmlive.com")
    await page.fill("[data-test=\"username\"]", creds.username)
    await page.fill("[data-test=\"password\"]", creds.password)
    await page.click("[data-test=\"login-button\"]")
    await page.waitForURL('**/')
    await use(page)
  },
})

export { expect } from '@playwright/test'
