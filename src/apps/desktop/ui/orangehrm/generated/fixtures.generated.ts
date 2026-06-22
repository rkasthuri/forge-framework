// @generated from app-model.json v1.0.21 sha256:9ab1f1a9e33a2f16
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
    const creds = resolveCredentials("ORANGEHRM_ADMINUSER_CREDENTIALS")
    await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
    await page.fill("input[name=\"username\"], input[placeholder*=user i], input[type=text]", creds.username)
    await page.fill("input[name=\"password\"], input[placeholder*=pass i], input[type=password]", creds.password)
    await page.click("role=button[name=\"Confirm\"]")
    await page.waitForURL('**/web/index.php/dashboard/index**', { timeout: 15000 })
    await page.waitForTimeout(1500)
    await use(page)
  },
})

export { expect } from '@playwright/test'
