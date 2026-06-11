import * as path from 'path'
import {
  AppModel, RoleDefinition, PageDefinition, ElementDefinition
} from '../types'
import {
  lines, indent, generatedHeader,
  toClassName, strategyToSelector, writeFile
} from './EmitHelper'

export class FixtureGenerator {

  constructor(private model: AppModel) {}

  generate(outputDir: string): void {
    const content  = this.generateFixtures()
    const filePath = path.join(outputDir, 'fixtures.generated.ts')
    writeFile(filePath, content)
    console.log(`[FixtureGenerator] Generated fixtures for ${this.model.roles.length} roles`)
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

    const userSel   = this.elementToSelector(loginEl,   '[data-test="username"]')
    const passSel   = this.elementToSelector(passwordEl, '[data-test="password"]')
    const submitSel = this.elementToSelector(submitEl,   '[data-test="login-button"]')

    const firstReachable = role.reachablePageIds[0]
    const firstPage      = this.model.pages?.find(p => p.id === firstReachable)
    const waitLine       = firstPage?.urlPattern
      ? `  await page.waitForURL('**${firstPage.urlPattern}')`
      : ''

    return lines(
      `${role.id}: async ({ page }, use) => {`,
      `  const creds = resolveCredentials(${JSON.stringify(role.credentialsEnvKey || '')})`,
      `  await page.goto(${JSON.stringify(this.model.app.baseUrl)})`,
      `  await page.fill(${JSON.stringify(userSel)}, creds.username)`,
      `  await page.fill(${JSON.stringify(passSel)}, creds.password)`,
      `  await page.click(${JSON.stringify(submitSel)})`,
      waitLine,
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
