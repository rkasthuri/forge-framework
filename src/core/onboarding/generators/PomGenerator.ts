import * as path from 'path'
import {
  AppModel, PageDefinition, ElementDefinition
} from '../types'
import {
  lines, indent, generatedHeader,
  toClassName, strategyToSelector, writeFile,
  BASE_PAGE_PROPERTIES,
} from './EmitHelper'

export class PomGenerator {

  constructor(private model: AppModel) {}

  generate(outputDir: string): void {
    const pages = this.model.pages || []
    for (const page of pages) {
      const content  = this.generatePage(page)
      const fileName = `${toClassName(page.id)}.generated.ts`
      const filePath = path.join(outputDir, 'pages', fileName)
      writeFile(filePath, content)
    }
    console.log(`[PomGenerator] Generated ${pages.length} page objects`)
  }

  private generatePage(page: PageDefinition): string {
    const className   = toClassName(page.id)
    // Filter out elements that would shadow BasePage's own concrete properties
    const critical    = page.elements.filter(e => e.critical    && !BASE_PAGE_PROPERTIES.has(e.name))
    const nonCritical = page.elements.filter(e => !e.critical   && !BASE_PAGE_PROPERTIES.has(e.name))
    const hash        = this.model.app.crawlConfigHash

    const criticalProps    = critical.map(e => this.generateSmartProp(e)).join('\n\n')
    const nonCriticalProps = nonCritical.map(e => this.generatePlainProp(e)).join('\n\n')
    const actions          = this.generateActions(page, critical)

    const depth = '../../../'
    const imports = lines(
      `import { Page, Locator } from '@playwright/test'`,
      `import { BasePage } from '${depth}pages/BasePage'`,
    )

    const criticalSection = critical.length > 0
      ? lines(
          `  // ── Critical elements — SmartLocator wired ` + `─`.repeat(40),
          indent(1, criticalProps),
        )
      : ''

    const nonCriticalSection = nonCritical.length > 0
      ? lines(
          ``,
          `  // ── Non-critical elements — plain locators ` + `─`.repeat(40),
          indent(1, nonCriticalProps),
        )
      : ''

    const actionSection = actions
      ? lines(``, `  // ── Actions ` + `─`.repeat(60), indent(1, actions))
      : ''

    // Escape urlPattern for use in isLoaded — avoid false positives for '/'
    const urlCheck = page.urlPattern && page.urlPattern !== '/'
      ? `this.page.url().includes(${JSON.stringify(page.urlPattern)})`
      : `this.page.url().length > 0`

    return lines(
      generatedHeader(this.model.app.modelVersion, hash),
      imports,
      ``,
      `export class ${className} extends BasePage {`,
      ``,
      `  constructor(page: Page) {`,
      `    super(page)`,
      `  }`,
      ``,
      `  // ── Abstract contract ` + `─`.repeat(52),
      `  readonly pageUrl = ${JSON.stringify(page.urlPattern)}`,
      `  async isLoaded(): Promise<boolean> { return ${urlCheck} }`,
      ``,
      `  // ── Navigation ` + `─`.repeat(60),
      `  async navigateTo(): Promise<void> {`,
      `    await this.page.goto(${JSON.stringify(page.urlPattern)})`,
      `  }`,
      ``,
      criticalSection,
      nonCriticalSection,
      actionSection,
      `}`,
      ``
    )
  }

  private generateSmartProp(el: ElementDefinition): string {
    const strategies = el.strategies.map(s => {
      const sel = strategyToSelector(s.type, s.value)
      return `    { name: '${s.type}', selector: ${JSON.stringify(sel)} },`
    }).join('\n')

    return lines(
      `readonly ${el.name} = this.smart({`,
      `  key: '${el.id}',`,
      `  description: ${JSON.stringify(el.label)},`,
      `  strategies: [`,
      strategies,
      `  ],`,
      `})`,
    )
  }

  private generatePlainProp(el: ElementDefinition): string {
    const best = el.strategies[0]
    const selector = best ? strategyToSelector(best.type, best.value) : `[data-test="${el.name}"]`
    return `readonly ${el.name}: Locator = this.page.locator(${JSON.stringify(selector)})`
  }

  private generateActions(
    page: PageDefinition,
    critical: ElementDefinition[]
  ): string {
    const actions: string[] = []

    const inputs  = critical.filter(e => e.kind === 'input')
    const buttons = critical.filter(e => e.kind === 'button')

    if (inputs.length > 0 && buttons.length > 0) {
      const params = inputs.map(e => `${e.name}: string`).join(', ')
      const fills  = inputs.map(e =>
        `await (await this.${e.name}.resolve()).fill(${e.name})`
      ).join('\n')
      const click  = `await (await this.${buttons[0].name}.resolve()).click()`
      const fnName = page.isAuthPage ? 'login' : 'submit'

      actions.push(lines(
        `async ${fnName}(${params}): Promise<void> {`,
        indent(1, fills),
        indent(1, click),
        `}`,
      ))
    }

    return actions.join('\n\n')
  }
}
