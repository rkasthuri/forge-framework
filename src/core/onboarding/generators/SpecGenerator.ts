import * as path from 'path'
import {
  AppModel, FlowDefinition, FlowStep, PageDefinition,
  EndpointDefinition
} from '../types'
import {
  lines, indent, generatedHeader,
  toClassName, writeFile, BASE_PAGE_PROPERTIES,
} from './EmitHelper'

let globalTestCounter = 0

function nextTestId(): string {
  globalTestCounter++
  return `TC-GEN-${String(globalTestCounter).padStart(3, '0')}`
}

export class SpecGenerator {

  constructor(private model: AppModel) {}

  generate(outputDir: string): void {
    const appType = this.model.app.appType
    if (appType === 'rest-api' || appType === 'graphql-api') {
      this.generateApiSpec(outputDir)
      return
    }
    // ── UI branch — existing per-flow spec generation ────────────────────────
    globalTestCounter = 0
    const flows = this.model.flows || []
    for (const flow of flows) {
      const content  = this.generateSpec(flow)
      const fileName = `${flow.id}.generated.spec.ts`
      const filePath = path.join(outputDir, 'specs', fileName)
      writeFile(filePath, content)
    }
    console.log(`[SpecGenerator] Generated ${flows.length} spec files`)
  }

  private generateApiSpec(outputDir: string): void {
    const endpoints = this.model.endpoints || []
    const flows     = this.model.flows     || []
    const appName   = this.model.app.name
    const baseUrl   = this.model.app.baseUrl
    const ver       = this.model.app.modelVersion
    const hash      = this.model.app.crawlConfigHash

    const className = toClassName(appName).replace(/Page$/, 'ApiClient')

    const blocks: string[] = []

    for (const flow of flows) {
      if (flow.displayName === 'Authentication') {
        blocks.push(this.genAuthDescribe(endpoints, className, baseUrl))
      } else if (flow.displayName.endsWith('CRUD')) {
        const resource = flow.displayName.replace(' CRUD', '').toLowerCase()
        blocks.push(this.genCrudDescribe(endpoints, className, baseUrl, resource))
      } else if (flow.displayName === 'Health Check') {
        blocks.push(this.genHealthDescribe(endpoints, className, baseUrl))
      }
    }

    const content = lines(
      `// @generated from app-model.json v${ver} ${hash}`,
      `// DO NOT EDIT — regenerate with: npm run onboard:generate`,
      ``,
      `import { test, expect } from '@playwright/test'`,
      `import { ${className} } from './ApiClient'`,
      `import { newBooking, adminCredentials } from './fixtures'`,
      ``,
      blocks.join('\n\n'),
      ``,
    )

    const filePath = path.join(outputDir, 'api.generated.spec.ts')
    writeFile(filePath, content)
    console.log(`[SpecGenerator] Generated api.generated.spec.ts`)
  }

  private genAuthDescribe(
    endpoints: EndpointDefinition[],
    className: string,
    baseUrl:   string
  ): string {
    return lines(
      `test.describe('Authentication', () => {`,
      `  test('should create auth token with valid credentials', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    const token  = await client.createToken(adminCredentials)`,
      `    expect(token).toBeTruthy()`,
      `    expect(typeof token).toBe('string')`,
      `  })`,
      `})`,
    )
  }

  private genCrudDescribe(
    endpoints: EndpointDefinition[],
    className: string,
    baseUrl:   string,
    resource:  string
  ): string {
    const capitalized = resource.charAt(0).toUpperCase() + resource.slice(1)
    return lines(
      `test.describe('${capitalized} CRUD', () => {`,
      `  let token:     string`,
      `  let bookingId: number`,
      ``,
      `  test.beforeAll(async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    token = await client.createToken(adminCredentials)`,
      `  })`,
      ``,
      `  test('should get all ${resource} ids', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    const ids = await client.get${capitalized}Ids()`,
      `    expect(Array.isArray(ids)).toBe(true)`,
      `  })`,
      ``,
      `  test('should create a ${resource}', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    const res = await client.create${capitalized}(newBooking)`,
      `    expect(res).toHaveProperty('${resource}id')`,
      `    bookingId = res.${resource}id`,
      `  })`,
      ``,
      `  test('should get ${resource} by id', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    const res = await client.get${capitalized}(String(bookingId))`,
      `    expect(res.firstname).toBe(newBooking.firstname)`,
      `  })`,
      ``,
      `  test('should update a ${resource}', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    client['token'] = token`,
      `    const updated = { ...newBooking, firstname: 'UpdatedName' }`,
      `    const res = await client.update${capitalized}(String(bookingId), updated)`,
      `    expect(res.firstname).toBe('UpdatedName')`,
      `  })`,
      ``,
      `  test('should partial update a ${resource}', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    client['token'] = token`,
      `    const res = await client.partialUpdate${capitalized}(String(bookingId), { firstname: 'Updated' })`,
      `    expect(res.firstname).toBe('Updated')`,
      `  })`,
      ``,
      `  test('should delete a ${resource}', async ({ request }) => {`,
      `    const client = new ${className}('${baseUrl}', request)`,
      `    client['token'] = token`,
      `    await client.delete${capitalized}(String(bookingId))`,
      `  })`,
      ``,
      `  test('should return 404 for deleted ${resource}', async ({ request }) => {`,
      `    const res = await request.get(\`${baseUrl}/${resource}/\${bookingId}\`)`,
      `    expect(res.status()).toBe(404)`,
      `  })`,
      `})`,
    )
  }

  private genHealthDescribe(
    endpoints: EndpointDefinition[],
    className: string,
    baseUrl:   string
  ): string {
    return lines(
      `test.describe('Health Check', () => {`,
      `  test('should return healthy status', async ({ request }) => {`,
      `    const res = await request.get(\`${baseUrl}/ping\`)`,
      `    expect(res.status()).toBe(201)`,
      `  })`,
      `})`,
    )
  }

  private generateSpec(flow: FlowDefinition): string {
    const hash    = this.model.app.crawlConfigHash
    const imports = this.buildImports(flow)
    const tier1   = this.generateTier1(flow)
    const tier2   = this.generateTier2(flow)
    const tier3   = this.generateTier3(flow)

    return lines(
      generatedHeader(this.model.app.modelVersion, hash),
      imports,
      ``,
      `test.describe('${flow.id}', () => {`,
      ``,
      `  // ── Tier 1 — Invariants (always run) ` + `─`.repeat(36),
      indent(1, tier1),
      ``,
      `  // ── Tier 2 — Structural (high confidence) ` + `─`.repeat(30),
      indent(1, tier2),
      tier3
        ? lines(
            ``,
            `  // ── Tier 3 — Semantic (@unverified-oracle, excluded by default) ` + `─`.repeat(8),
            indent(1, tier3),
          )
        : '',
      ``,
      `})`,
      ``
    )
  }

  private buildImports(flow: FlowDefinition): string {
    const pageIds = [...new Set(
      (flow.steps || []).map(s => s.pageId)
    )]
    const pageImports = pageIds.map(id => {
      const cls = toClassName(id)
      return `import { ${cls} } from '../pages/${cls}.generated'`
    }).join('\n')

    return lines(
      `import { test, expect } from '../fixtures.generated'`,
      pageImports,
    )
  }

  private generateTier1(flow: FlowDefinition): string {
    const role       = flow.roleId
    const lastNav    = (flow.steps || []).filter(
      s => s.action === 'assert-navigation'
    ).pop()
    const targetPage = lastNav?.targetPageId
      ? this.model.pages?.find(p => p.id === lastNav.targetPageId)
      : null
    const urlPattern   = targetPage?.urlPattern || '/'
    const escapedUrl   = urlPattern.replace(/\//g, '\\/').replace(/\./g, '\\.')

    const t1a = nextTestId()
    const t1b = nextTestId()

    const navigationTest = lines(
      `test('${t1a} navigation succeeds', async ({ ${role} }) => {`,
      `  await expect(${role}).toHaveURL(/${escapedUrl}/)`,
      `})`,
    )

    const consoleTest = lines(
      `test('${t1b} no console errors', async ({ ${role} }) => {`,
      `  const errors: string[] = []`,
      `  ${role}.on('console', msg => {`,
      `    if (msg.type() === 'error') errors.push(msg.text())`,
      `  })`,
      `  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)`,
      `})`,
    )

    return lines(navigationTest, ``, consoleTest)
  }

  private generateTier2(flow: FlowDefinition): string {
    const tests: string[] = []

    for (const step of (flow.steps || [])) {
      if (!step.action.startsWith('assert-')) continue

      const id       = nextTestId()
      const page     = this.model.pages?.find(p => p.id === step.pageId)

      if (step.action === 'assert-navigation' && step.targetPageId) {
        const targetPage = this.model.pages?.find(p => p.id === step.targetPageId)
        const urlPattern = targetPage?.urlPattern || '/'
        const escaped    = urlPattern.replace(/\//g, '\\/').replace(/\./g, '\\.')
        tests.push(lines(
          `test('${id} navigates to ${step.targetPageId}', async ({ ${flow.roleId} }) => {`,
          `  await expect(${flow.roleId}).toHaveURL(/${escaped}/)`,
          `})`,
        ))
      }

      if (step.action === 'assert-element-visible' && step.elementId) {
        const elName = step.elementId.split(':')[1]
        if (elName) {
          tests.push(lines(
            `test('${id} ${elName} is visible', async ({ ${flow.roleId} }) => {`,
            `  await expect(${flow.roleId}.locator('[data-test="${elName}"]')).toBeVisible()`,
            `})`,
          ))
        }
      }
    }

    if (tests.length === 0) {
      tests.push(lines(
        `test('${nextTestId()} flow elements reachable', async ({ ${flow.roleId} }) => {`,
        `  await expect(${flow.roleId}).not.toHaveURL(/error|404/)`,
        `})`,
      ))
    }

    return tests.join('\n\n')
  }

  private generateTier3(flow: FlowDefinition): string {
    const tests: string[] = []
    const pages  = this.model.pages || []

    for (const step of (flow.steps || [])) {
      if (step.action !== 'assert-navigation') continue
      const page = pages.find(p => p.id === step.targetPageId)
      if (!page) continue

      // Only pick critical elements that are NOT shadowed by BasePage properties
      const criticalEl = page.elements.find(
        e => e.critical && !BASE_PAGE_PROPERTIES.has(e.name)
      )
      if (!criticalEl) continue

      const pageClass = toClassName(page.id)
      const id        = nextTestId()

      tests.push(lines(
        `test('${id} @unverified-oracle ${criticalEl.name} is visible on ${page.id}',`,
        `  async ({ ${flow.roleId} }) => {`,
        `  const pg = new ${pageClass}(${flow.roleId})`,
        `  await expect(pg.${criticalEl.name}.resolve()).resolves.toBeDefined()`,
        `})`,
      ))
    }

    return tests.join('\n\n')
  }
}
