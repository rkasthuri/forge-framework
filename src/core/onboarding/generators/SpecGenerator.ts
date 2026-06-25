import * as path from 'path'
import * as fs   from 'fs'
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
    const currentFileNames = new Set(flows.map(flow => `${flow.id}.generated.spec.ts`))
    for (const flow of flows) {
      const content  = this.generateSpec(flow)
      const fileName = `${flow.id}.generated.spec.ts`
      const filePath = path.join(outputDir, 'specs', fileName)
      writeFile(filePath, content)
    }
    this.pruneOrphanedSpecs(outputDir, currentFileNames)
    console.log(`[SpecGenerator] Generated ${flows.length} spec files`)
  }

  // Removes previously-generated spec files whose flow ID no longer exists
  // in the current model (e.g. a renamed flow, or a re-timestamped inferred
  // flow) -- without this, every regeneration accumulates orphans that keep
  // executing against stale fixtures/selectors indefinitely.
  private pruneOrphanedSpecs(outputDir: string, currentFileNames: Set<string>): void {
    const specsDir = path.join(outputDir, 'specs')
    if (!fs.existsSync(specsDir)) return
    const existing = fs.readdirSync(specsDir).filter(f => f.endsWith('.generated.spec.ts'))
    for (const fileName of existing) {
      if (!currentFileNames.has(fileName)) {
        fs.unlinkSync(path.join(specsDir, fileName))
        console.log(`[SpecGenerator] Removed orphaned spec (no matching flow in current model): ${fileName}`)
      }
    }
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
      `import { newBooking, adminCredentials } from './fixtures.generated'`,
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
      `  test.describe.configure({ mode: 'serial' })`,
      ``,
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
      case 'role': {
        this.assertValidRoleStrategy(strategy.value)
        // Playwright's `role=` selector-engine string — the string-selector
        // equivalent of getByRole(value, { name: accessibleName }). Callers
        // that need a Locator (emitStep/critical-element loop, below) bypass
        // this and call locatorExprFor() instead, which emits a literal
        // getByRole(...) call; this stays as a correct fallback for any
        // caller that genuinely needs a bare selector string.
        return strategy.accessibleName
          ? `role=${strategy.value}[name="${this.escapeRoleAccessibleName(strategy.accessibleName)}"]`
          : `role=${strategy.value}`
      }
      case 'text':       return `text=${strategy.value}`
      case 'css':        return strategy.value
      default:           return strategy.value
    }
  }

  // See TD-029 — fails loudly if a role strategy's value still carries the
  // pre-fix compound format instead of a bare ARIA role token with
  // accessibleName as its own field.
  private assertValidRoleStrategy(value: string): void {
    if (/[[\]'"]/.test(value)) {
      throw new Error(
        `[SpecGenerator] Role strategy value "${value}" is compound (contains '[', ']', or a quote) — expected a ` +
        `bare ARIA role token with accessibleName as a separate field (see TD-029). This indicates ` +
        `ElementClassifier.buildRoleSelector() regressed to the pre-fix compound-string format, or this model ` +
        `predates TD-029 — re-run the crawl step to refresh it.`
      )
    }
  }

  private escapeRoleAccessibleName(name: string): string {
    return name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  }

  // Builds the full Playwright locator expression for a step/critical-element
  // target — a literal `${roleFixture}.getByRole(...)` call for a role-type
  // primary strategy (consistent with what SmartLocator does at runtime),
  // `${roleFixture}.locator(...)` otherwise. No consumer downstream of this
  // parses/guesses a string's internal format — see TD-029.
  private locatorExprFor(
    roleFixture: string,
    el:          ElementDefinition | undefined,
    fallbackId?: string | null
  ): string {
    const strategy = el?.strategies?.[0]
    if (strategy?.type === 'role') {
      this.assertValidRoleStrategy(strategy.value)
      const roleArg = JSON.stringify(strategy.value)
      return strategy.accessibleName
        ? `${roleFixture}.getByRole(${roleArg}, { name: ${JSON.stringify(strategy.accessibleName)} })`
        : `${roleFixture}.getByRole(${roleArg})`
    }
    const selector = el ? this.bestSelector(el) : (fallbackId?.split(':')[1] ?? fallbackId ?? '')
    return `${roleFixture}.locator(${JSON.stringify(selector)})`
  }

  private resolveElement(step: FlowStep): ElementDefinition | undefined {
    if (!step.elementId) return undefined
    const page = this.model.pages?.find(p => p.id === step.pageId)
    return page?.elements.find(
      e => e.id === step.elementId || `${step.pageId}:${e.name}` === step.elementId
    )
  }

  private emitStep(step: FlowStep, role: string): string | null {
    const el = this.resolveElement(step)

    switch (step.action) {
      case 'navigate':
        return `await ${role}.goto('${step.value || '/'}')`

      case 'fill':
        return `await ${this.locatorExprFor(role, el, step.elementId)}.fill(${this.resolveValueExpr(step.value || '', this.fieldHintFor(el))})`

      case 'click':
        return `await ${this.locatorExprFor(role, el, step.elementId)}.click()`

      case 'select':
        return `await ${this.locatorExprFor(role, el, step.elementId)}.selectOption(${this.resolveValueExpr(step.value || '')})`

      case 'assert-navigation': {
        const targetPage = step.targetPageId
          ? this.model.pages?.find(p => p.id === step.targetPageId)
          : null
        const pattern = targetPage?.urlPattern || step.value || '/'
        const escaped = pattern.replace(/\//g, '\\/').replace(/\./g, '\\.')
        return `await expect(${role}).toHaveURL(/${escaped}/)`
      }

      case 'assert-element-visible':
        return `await expect(${this.locatorExprFor(role, el, step.elementId)}).toBeVisible()`

      default:
        return null
    }
  }

  private generateFlowTests(flow: FlowDefinition): string {
    const role    = flow.roleId
    const roleDef = this.model.roles?.find(r => r.id === role)
    const steps   = flow.steps || []

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

      // TD-034 — a flow's own step list (state-graph walk) can include the
      // pre-auth entry page, which the role's fixture has already passed
      // through before the test body runs. reachablePageIds is populated
      // from the role's own crawl session (Crawler.ts), so it already
      // reflects which pages that role's session actually lands on.
      if (roleDef && !roleDef.reachablePageIds.includes(targetPage.id)) continue

      const criticalEls = targetPage.elements
        .filter(e => e.critical && !BASE_PAGE_PROPERTIES.has(e.name))
      if (criticalEls.length === 0) continue

      const replaySteps = steps.slice(0, i + 1)
      const prereqBody = replaySteps
        .map(s => this.emitStep(s, role))
        .filter((l): l is string => !!l)

      // TD-049 — was a flat .slice(0, 3): with TD-032's broader critical-flag
      // rules, a single page can have dozens of critical elements, and a
      // bare truncation silently dropped ~90% of them app-wide (confirmed
      // live on both reference apps) with no signal that anything was
      // dropped. Batching into fixed-size groups, each its own test case,
      // gives every critical element real coverage instead of an arbitrary
      // ordering-dependent subset, while keeping any one test's blast radius
      // bounded — one bad element fails its own batch, not the whole page's
      // worth of checks.
      const BATCH_SIZE = 10
      const batches: ElementDefinition[][] = []
      for (let b = 0; b < criticalEls.length; b += BATCH_SIZE) {
        batches.push(criticalEls.slice(b, b + BATCH_SIZE))
      }

      batches.forEach((batch, batchIndex) => {
        const body = [...prereqBody]
        for (const critEl of batch) {
          body.push(`await expect(${this.locatorExprFor(role, critEl)}).toBeVisible()`)
        }
        const batchSuffix = batches.length > 1 ? ` (batch ${batchIndex + 1} of ${batches.length})` : ''
        const critId = nextTestId()
        tests.push(lines(
          `test('${critId} critical elements visible on ${targetPage.id}${batchSuffix}', async ({ ${role} }) => {`,
          indent(1, body.join('\n')),
          `})`,
        ))
      })
    }

    return tests.join('\n\n')
  }
}
