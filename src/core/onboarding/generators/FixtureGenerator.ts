import * as path from 'path'
import {
  AppModel, RoleDefinition, PageDefinition,
  ElementDefinition, EndpointDefinition, OnboardingConfig
} from '../types'
import {
  lines, indent, generatedHeader,
  toClassName, strategyToSelector, writeFile
} from './EmitHelper'

export class FixtureGenerator {

  constructor(private model: AppModel, private config?: OnboardingConfig) {}

  generate(outputDir: string): void {
    const appType = this.model.app.appType
    if (appType === 'rest-api' || appType === 'graphql-api') {
      this.generateApiFixtures(outputDir)
      return
    }
    // ── UI branch — existing role-based fixture generation ───────────────────
    const content  = this.generateFixtures()
    const filePath = path.join(outputDir, 'fixtures.generated.ts')
    writeFile(filePath, content)
    console.log(`[FixtureGenerator] Generated fixtures for ${this.model.roles.length} roles`)
  }

  private generateApiFixtures(outputDir: string): void {
    const endpoints = this.model.endpoints || []
    const ver       = this.model.app.modelVersion
    const hash      = this.model.app.crawlConfigHash
    const lines_buf: string[] = []

    lines_buf.push(
      `// @generated from app-model.json v${ver} ${hash}`,
      `// DO NOT EDIT — regenerate with: npm run onboard:generate`,
      ``,
      `import * as dotenv from 'dotenv'`,
      `dotenv.config()`,
      ``,
    )

    // Determine which interfaces to import from ApiClient
    const importedTypes: string[] = []
    const needsNewBooking = endpoints.some(
      e => e.summary === 'CreateBooking' && !e.auth && ['POST', 'PUT', 'PATCH'].includes(e.method)
    )
    const needsToken = endpoints.some(e => e.summary === 'CreateToken' && !e.auth)

    if (needsNewBooking) importedTypes.push('CreateBookingRequest')
    if (needsToken)      importedTypes.push('CreateTokenRequest')

    if (importedTypes.length > 0) {
      lines_buf.push(`import type { ${importedTypes.join(', ')} } from './ApiClient'`, ``)
    }

    // Generate fixture for CreateBooking
    if (needsNewBooking) {
      lines_buf.push(
        `export const newBooking: CreateBookingRequest = {`,
        `  firstname:       'John',`,
        `  lastname:        'Doe',`,
        `  totalprice:      100,`,
        `  depositpaid:     true,`,
        `  bookingdates:    { checkin: '2026-01-01', checkout: '2026-01-10' },`,
        `  additionalneeds: 'None',`,
        `}`,
        ``,
      )
    }

    // Generate fixture for CreateToken
    if (needsToken) {
      lines_buf.push(
        `export const adminCredentials: CreateTokenRequest = {`,
        `  username: process.env.BOOKER_CREDENTIALS?.split(':')[0] ?? '',`,
        `  password: process.env.BOOKER_CREDENTIALS?.split(':')[1] ?? '',`,
        `}`,
        ``,
      )
    }

    const content  = lines_buf.join('\n')
    const filePath = path.join(outputDir, 'fixtures.ts')
    writeFile(filePath, content)
    console.log(`[FixtureGenerator] Generated API fixtures at ${filePath}`)
  }

  private generateFixtures(): string {
    const appName   = this.model.app.name
    const typeName  = toClassName(appName).replace('Page', '') + 'Fixtures'
    const roles     = this.model.roles
    const pages     = this.model.pages || []
    const loginPage = pages.find(p => p.isAuthPage)
    const hash      = this.model.app.crawlConfigHash

    const typeFields = roles.map(r => `  ${r.id}: Page`).join('\n')

    const fixtures = roles.map(r =>
      this.generateRoleFixture(r, loginPage)
    ).join('\n\n')

    return lines(
      generatedHeader(this.model.app.modelVersion, hash),
      `import { test as base, Page } from '@playwright/test'`,
      `import * as dotenv from 'dotenv'`,
      `dotenv.config()`,
      ``,
      `function resolveCredentials(envKey: string): { username: string; password: string } {`,
      `  const raw = process.env[envKey]`,
      `  if (!raw) throw new Error(\`Missing env var: \${envKey}\`)`,
      `  const [username, password] = raw.split(':')`,
      `  if (!username || !password) {`,
      `    throw new Error(\`Invalid format for \${envKey} — expected username:password\`)`,
      `  }`,
      `  return { username, password }`,
      `}`,
      ``,
      `type ${typeName} = {`,
      typeFields,
      `}`,
      ``,
      `export const test = base.extend<${typeName}>({`,
      ``,
      indent(1, fixtures),
      `})`,
      ``,
      `export { expect } from '@playwright/test'`,
      ``
    )
  }

  private generateRoleFixture(
    role: RoleDefinition,
    loginPage: PageDefinition | undefined
  ): string {
    const isGuest  = role.authFlow === 'none'

    if (isGuest) {
      return lines(
        `${role.id}: async ({ page }, use) => {`,
        `  await page.goto(${JSON.stringify(this.model.app.baseUrl)})`,
        `  await use(page)`,
        `},`,
      )
    }

    const loginEl    = loginPage?.elements.find(
      e => e.kind === 'input' && e.name.toLowerCase().includes('username')
    )
    const passwordEl = loginPage?.elements.find(
      e => e.kind === 'input' && e.name.toLowerCase().includes('password')
    )
    const submitEl   = loginPage?.elements.find(e => e.kind === 'button')

    const userSel   = this.elementToSelector(loginEl,   'input[name="username"], input[placeholder*=user i], input[type=text]')
    const passSel   = this.elementToSelector(passwordEl, 'input[name="password"], input[placeholder*=pass i], input[type=password]')
    const submitSel = this.elementToSelector(submitEl,   'button[type=submit], input[type=submit], button:has-text("Login")')

    const configRole  = (this.config?.roles ?? []).find((r: any) => r.id === role.id)
    const loginUrl    = (configRole as any)?.loginUrl ?? this.model.app.baseUrl
    const successUrl  = (configRole as any)?.successUrl
    const waitPattern = successUrl
      ? `**${new URL(successUrl, this.model.app.baseUrl).pathname}**`
      : '**/dashboard**'

    return lines(
      `${role.id}: async ({ page }, use) => {`,
      `  const creds = resolveCredentials(${JSON.stringify(role.credentialsEnvKey || '')})`,
      `  await page.goto(${JSON.stringify(loginUrl)})`,
      `  await page.fill(${JSON.stringify(userSel)}, creds.username)`,
      `  await page.fill(${JSON.stringify(passSel)}, creds.password)`,
      `  await page.click(${JSON.stringify(submitSel)})`,
      `  await page.waitForURL('${waitPattern}', { timeout: 15000 })`,
      `  await page.waitForTimeout(1500)`,
      `  await use(page)`,
      `},`,
    )
  }

  private elementToSelector(
    el:       ElementDefinition | undefined,
    fallback: string
  ): string {
    if (!el) return fallback
    const best = el.strategies[0]
    if (!best) return fallback
    return strategyToSelector(best.type, best.value)
  }
}
