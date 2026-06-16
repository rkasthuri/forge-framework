import * as path from 'path'
import {
  AppModel, FlowDefinition, FlowStep, PageDefinition,
  EndpointDefinition, ElementDefinition
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
    // ── UI branch ─ existing per-flow spec generation ──────────────────────
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
    const body    = this.generateFlowTests(flow)

    return lines(
      generatedHeader(this.model.app.modelVersion, hash),
      imports,
      ``,
      `test.describe('${flow.id}', () => {`,
      ``,
      indent(1, body),
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

  private resolveValueExpr(value: string, fieldHint?: 'username' | 'password'): string {
    const exact = value.match(/^\{\{(\w+)\}\}$/)
    if (exact) {
      const key = exact[1]
      if (key.endsWith('_USERNAME')) {
        const credKey = key.replace(/_USERNAME$/, '_CREDENTIALS')
        return `(process.env.${credKey}?.split(':')[0] ?? '')`
      }
      if (key.endsWith('_PASSWORD')) {
        const credKey = key.replace(/_PASSWORD$/, '_CREDENTIALS')
        return `(process.env.${credKey}?.split(':')[1] ?? '')`
      }
      if (key.endsWith('_CREDENTIALS') && fieldHint) {
        const idx = fieldHint === 'password' ? 1 : 0
        return `(process.env.${key}?.split(':')[${idx}] ?? '')`
      }
      return `(process.env.${key} ?? '')`
    }
    if (/\{\{\w+\}\}/.test(value)) {
      const interpolated = value.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
        return '${' + this.resolveValueExpr(`{{${key}}}`, fieldHint) + '}'
      })
      return '`' + interpolated + '`'
    }
    return JSON.stringify(value)
  }

  private fieldHintFor(el: ElementDefinition | undefined): 'username' | 'password' | undefined {
    if (!el) return undefined
    const name = el.name.toLowerCase()
    if (name.includes('password') || name.includes('pass')) return 'password'
    if (name.includes('username') || name.includes('user')) return 'username'
    return undefined
  }

  private bestSelector(el: ElementDefinition): string {
    const strategy = el.strategies && el.strategies[0]
    if (!strategy) return `[data-test="${el.name}"]`
    switch (strategy.type) {
      case 'data-test': return `[data-test="${strategy.value}"]`
      case 'id':         return `#${strategy.value}`
      case 'role':       return `[role="${strategy.value}"]`
      case 'text':       return `text=${strategy.value}`
      case 'css':        return strategy.value
      default:           return strategy.value
    }
  }

  private resolveElement(step: FlowStep): ElementDefinition | undefined {
    if (!step.elementId) return undefined
    const page = this.model.pages?.find(p => p.id === step.pageId)
    return page?.elements.find(
      e => e.id === step.elementId || `${step.pageId}:${e.name}` === step.elementId
    )
  }

  private emitStep(step: FlowStep, role: string): string | null {
    const el       = this.resolveElement(step)
    const selector = el ? this.bestSelector(el) : (step.elementId?.split(':')[1] ?? step.elementId ?? '')

    switch (step.action) {
      case 'navigate':
        return `await ${role}.goto('${step.value || '/'}')`

      case 'fill':
        return `await ${role}.fill('${selector}', ${this.resolveValueExpr(step.value || '', this.fieldHintFor(el))})`

      case 'click':
        return `await ${role}.click('${selector}')`

      case 'select':
        return `await ${role}.selectOption('${selector}', ${this.resolveValueExpr(step.value || '')})`

      case 'assert-navigation': {
        const targetPage = step.targetPageId
          ? this.model.pages?.find(p => p.id === step.targetPageId)
          : null
        const pattern = targetPage?.urlPattern || step.value || '/'
        const escaped = pattern.replace(/\//g, '\\/').replace(/\./g, '\\.')
        return `await expect(${role}).toHaveURL(/${escaped}/)`
      }

      case 'assert-element-visible':
        return `await expect(${role}.locator('${selector}')).toBeVisible()`

      default:
        return null
    }
  }

  private generateFlowTests(flow: FlowDefinition): string {
    const role  = flow.roleId
    const steps = flow.steps || []

    if (steps.length === 0) {
      const id = nextTestId()
      return lines(
        `test('${id} ${flow.displayName} smoke test', async ({ ${role} }) => {`,
        `  await expect(${role}).not.toHaveURL(/error|404/)`,
        `})`,
      )
    }

    const tests: string[] = []

    const mainId   = nextTestId()
    const mainBody = steps
      .map(s => this.emitStep(s, role))
      .filter((l): l is string => !!l)

    tests.push(lines(
      `test('${mainId} ${flow.displayName} full flow', async ({ ${role} }) => {`,
      indent(1, mainBody.join('\n')),
      `})`,
    ))

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (step.action !== 'assert-navigation' || !step.targetPageId) continue

      const targetPage = this.model.pages?.find(p => p.id === step.targetPageId)
      if (!targetPage) continue

      const criticalEls = targetPage.elements
        .filter(e => e.critical && !BASE_PAGE_PROPERTIES.has(e.name))
        .slice(0, 3)
      if (criticalEls.length === 0) continue

      const replaySteps = steps.slice(0, i + 1)
      const body = replaySteps
        .map(s => this.emitStep(s, role))
        .filter((l): l is string => !!l)

      for (const critEl of criticalEls) {
        body.push(`await expect(${role}.locator('${this.bestSelector(critEl)}')).toBeVisible()`)
      }

      const critId = nextTestId()
      tests.push(lines(
        `test('${critId} critical elements visible on ${targetPage.id}', async ({ ${role} }) => {`,
        indent(1, body.join('\n')),
        `})`,
      ))
    }

    return tests.join('\n\n')
  }
}
