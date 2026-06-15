// @generated from app-model.json v1.0.9 sha256:15cff9c58b7f2b62
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
    await page.click("button[type=submit], input[type=submit], button:has-text(\"Login\")")
    await page.waitForURL("**/web/index.php/dashboard/**", { timeout: 20000 })
    await use(page)
  },

})

export { expect } from '@playwright/test'
