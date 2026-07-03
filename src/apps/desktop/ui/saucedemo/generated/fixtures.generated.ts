// @generated from app-model.json v1.0.28 sha256:98573e6ac4881472
// DO NOT EDIT — regenerate with: npm run onboard:generate

import { test as base, Page } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config()

// FORGE[omissionReason=role-authentication-failed]: lockedUser omitted —
// authentication failed at crawl; no authenticated behavior observed.

function resolveCredentials(envKey: string): { username: string; password: string } {
  const raw = process.env[envKey]
  if (!raw) throw new Error(`Missing env var: ${envKey}`)
  const [username, password] = raw.split(':')
  if (!username || !password) {
    throw new Error(`Invalid format for ${envKey} — expected username:password`)
  }
  return { username, password }
}

type SaucedemoFixtures = {
  standardUser: Page
  guestPage: Page
}

export const test = base.extend<SaucedemoFixtures>({

  standardUser: async ({ page }, use) => {
    const creds = resolveCredentials("STANDARD_USER_CREDENTIALS")
    await page.goto("https://www.saucedemo.com")
    await page.fill("[data-test=\"username\"]", creds.username)
    await page.fill("[data-test=\"password\"]", creds.password)
    await page.click("[data-test=\"login-button\"]")
    await page.waitForURL('**/inventory.html**', { timeout: 15000 })
    await page.waitForTimeout(1500)
    await use(page)
  },

  guestPage: async ({ page }, use) => {
    await page.goto("https://www.saucedemo.com")
    await use(page)
  },
})

export { forgeExpect as expect } from '../../../../../core/healing/forgeExpect'
