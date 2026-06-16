import { Browser, BrowserContext } from '@playwright/test'
import * as fs   from 'fs'
import * as path from 'path'
import { OnboardingConfig, RoleConfig } from './types'

export interface AuthResult {
  context:       BrowserContext
  startUrl:      string
  authenticated: boolean
}

export class AuthManager {
  constructor(private config: OnboardingConfig) {}

  async authenticate(role: RoleConfig, browser: Browser): Promise<AuthResult> {
    const context = await browser.newContext()

    // No auth needed
    if (role.authFlow === 'none') {
      return { context, startUrl: this.config.app.baseUrl, authenticated: true }
    }

    // Unsupported auth flows
    if (role.authFlow === 'oauth' || role.authFlow === 'api-key') {
      console.warn(
        `[AuthManager] Auth flow "${role.authFlow}" not supported — skipping auth for ${role.id}`
      )
      return { context, startUrl: this.config.app.baseUrl, authenticated: false }
    }

    // form-login
    const credentials = this.resolveCredentials(role)
    if (!credentials) {
      console.warn(`[AuthManager] No credentials found for role ${role.id} — skipping auth`)
      return { context, startUrl: this.config.app.baseUrl, authenticated: false }
    }

    const configRole  = (this.config.roles ?? []).find((r: any) => r.id === role.id)
    const loginUrl    = (configRole as any)?.loginUrl    ?? this.config.app.baseUrl
    const successUrl  = (configRole as any)?.successUrl  ?? null
    const roleSelectors = (configRole as any)?.selectors ?? {}

    const userSel   = roleSelectors.username ??
      'input[name="username"], input[type=text], input[placeholder*=user i], input[id*=user]'
    const passSel   = roleSelectors.password ??
      'input[name="password"], input[type=password], input[placeholder*=pass i]'
    const submitSel = roleSelectors.submit ??
      'button[type=submit], input[type=submit], button:has-text("Login"), button:has-text("Sign in")'

    const page = await context.newPage()
    try {
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1500)

      // Fill credentials
      const usernameEl = page.locator(userSel).first()
      await usernameEl.waitFor({ state: 'visible', timeout: 15000 })
      await usernameEl.fill(credentials.username)

      const passwordEl = page.locator(passSel).first()
      await passwordEl.waitFor({ state: 'visible', timeout: 10000 })
      await passwordEl.fill(credentials.password)

      const submitEl = page.locator(submitSel).first()
      await submitEl.waitFor({ state: 'visible', timeout: 10000 })

      const urlBefore = page.url()
      await submitEl.click()

      try {
        if (successUrl) {
          await page.waitForURL(
            (u) => u.href.includes(successUrl),
            { timeout: 15000 }
          )
        } else {
          await page.waitForURL(
            (u) => u.href !== urlBefore,
            { timeout: 15000 }
          )
        }
      } catch {
        // Timeout — check if we moved at all
      }

      // Allow page to fully settle
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)

      const urlAfter = page.url()

      // Validate auth succeeded — URL must differ from login URL
      const stillOnLogin = urlAfter === urlBefore ||
        urlAfter.includes('login') && urlBefore.includes('login')

      if (stillOnLogin) {
        console.warn(
          `[AuthManager] Auth may have failed for role ${role.id} — ` +
          `still on: ${urlAfter}`
        )
        await page.close()
        return { context, startUrl: this.config.app.baseUrl, authenticated: false }
      }

      // Auth succeeded — save storage state
      const statePath = path.resolve(`.auth/${role.id}.json`)
      fs.mkdirSync(path.dirname(statePath), { recursive: true })
      await context.storageState({ path: statePath })

      const startUrl = urlAfter  // Use actual post-auth URL as crawl start

      console.log(
        `[AuthManager] Authenticated as ${role.id} — start URL: ${startUrl}`
      )

      await page.close()
      return { context, startUrl, authenticated: true }
    } catch (e: any) {
      console.warn(`[AuthManager] Auth error for role ${role.id}: ${e.message}`)
      try { await page.close() } catch {}
      return { context, startUrl: this.config.app.baseUrl, authenticated: false }
    }
  }

  private resolveCredentials(
    role: RoleConfig
  ): { username: string; password: string } | null {
    if (!role.credentialsEnvKey) return null
    const raw = process.env[role.credentialsEnvKey]
    if (!raw) return null
    const [username, password] = raw.split(':')
    if (!username || !password) return null
    return { username, password }
  }
}
