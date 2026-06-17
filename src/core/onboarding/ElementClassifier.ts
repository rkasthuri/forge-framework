import { Page } from '@playwright/test'
import * as crypto from 'crypto'
import {
  RawElement, Strategy, ElementKind,
  ElementDefinition, AiBudgetTracker, EndpointDefinition
} from './types'
import { aiCall } from '../ai/AiClient'
import { getAppName } from '../config/appConfig'

export class ElementClassifier {

  constructor(
    private page:   Page,
    private pageId: string,
    private budget: AiBudgetTracker
  ) {}

  async classifyPage(
    appType?:   string,
    endpoints?: EndpointDefinition[]
  ): Promise<ElementDefinition[]> {
    // ── API branch — classify endpoints instead of DOM ─────────────────────
    if (appType === 'rest-api' || appType === 'graphql-api') {
      return ElementClassifier.classifyEndpoints(endpoints || [])
    }
    // ── UI branch — existing DOM element classification ─────────────────────
    const raw      = await this.harvestElements()
    const elements = raw.map(el => this.classifyElement(el))
    const unnamed  = elements.filter(e => !e.name || e.name.startsWith('unnamed-'))

    if (unnamed.length > 0 && !this.budget.isExhausted()) {
      const namedMap = await this.nameWithAi(unnamed, raw)
      for (const el of elements) {
        if (namedMap.has(el.id)) {
          el.name    = namedMap.get(el.id)!
          el.aiNamed = true
        }
      }
    }

    return elements.sort((a, b) =>
      (b.critical ? 1 : 0) - (a.critical ? 1 : 0)
    )
  }

  private async harvestElements(): Promise<RawElement[]> {
    return this.page.evaluate(() => {
      const selector = [
        'input:not([type=hidden])',
        'button',
        'select',
        'textarea',
        'a[href]',
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="combobox"]',
        '[data-test]',
      ].join(',')

      const elements = Array.from(document.querySelectorAll(selector))
      return elements.slice(0, 100).map((el, index) => {
        const input = el as HTMLInputElement
        return {
          tag:         el.tagName.toLowerCase(),
          type:        input.type || null,
          dataTest:    el.getAttribute('data-test'),
          id:          el.id || null,
          ariaLabel:   el.getAttribute('aria-label'),
          labelText:   (() => {
            if (input.id) {
              const label = document.querySelector(`label[for="${input.id}"]`)
              return label?.textContent?.trim() || null
            }
            return null
          })(),
          placeholder: input.placeholder || null,
          textContent: el.textContent?.trim().slice(0, 50) || null,
          role:        el.getAttribute('role'),
          name:        (el as HTMLInputElement).name || null,
          href:        (el as HTMLAnchorElement).href || null,
          index,
        }
      })
    })
  }

  private classifyElement(raw: RawElement): ElementDefinition {
    const strategies = this.buildStrategyChain(raw)
    const kind       = this.determineKind(raw)
    const name       = this.determineName(raw) ||
                       `unnamed-${raw.tag}-${raw.index}`
    const critical   = this.determineCritical(raw)
    const label      = raw.ariaLabel || raw.labelText ||
                       raw.placeholder || raw.textContent || name

    return {
      id:              `${this.pageId}:${name}`,
      name,
      kind,
      label,
      critical,
      aiNamed:         false,
      strategies,
      tier3Assertions: [],
    }
  }

  private buildStrategyChain(raw: RawElement): Strategy[] {
    const chain: Strategy[] = []

    if (raw.dataTest) {
      chain.push({ type: 'data-test', value: raw.dataTest, confidence: 1.0 })
    }
    if (raw.id) {
      chain.push({ type: 'id', value: raw.id, confidence: 0.95 })
    }
    const roleName = this.buildRoleSelector(raw)
    if (roleName) {
      chain.push({ type: 'role', value: roleName, confidence: 0.85 })
    }
    if (raw.textContent && raw.textContent.length < 30) {
      chain.push({ type: 'text', value: raw.textContent, confidence: 0.75 })
    }
    const css = this.buildCssSelector(raw)
    if (css) {
      chain.push({ type: 'css', value: css, confidence: 0.6 })
    }

    return chain.length > 0
      ? chain
      : [{ type: 'css', value: `${raw.tag}:nth-child(${raw.index + 1})`, confidence: 0.3 }]
  }

  private buildRoleSelector(raw: RawElement): string | null {
    const roleMap: Record<string, string> = {
      'input':    'textbox',
      'button':   'button',
      'a':        'link',
      'select':   'combobox',
      'textarea': 'textbox',
    }
    const role = raw.role || roleMap[raw.tag]
    if (!role) return null
    const accessibleName = raw.ariaLabel || raw.labelText ||
                           raw.placeholder || raw.textContent
    return accessibleName
      ? `${role}[name='${accessibleName}']`
      : role
  }

  private buildCssSelector(raw: RawElement): string | null {
    if (raw.id)          return `#${raw.id}`
    if (raw.dataTest)    return `[data-test="${raw.dataTest}"]`
    if (raw.placeholder) return `${raw.tag}[placeholder='${raw.placeholder}']`
    if (raw.type)        return `${raw.tag}[type=${raw.type}]`
    return raw.tag || null
  }

  private determineKind(raw: RawElement): ElementKind {
    if (raw.tag === 'a') return 'link'
    if (raw.tag === 'select' || raw.role === 'combobox') return 'select'
    if (raw.tag === 'textarea') return 'textarea'
    if (raw.type === 'checkbox' || raw.role === 'checkbox') return 'checkbox'
    if (raw.type === 'radio'    || raw.role === 'radio')    return 'radio'
    if (raw.tag === 'button' ||
        raw.type === 'submit' ||
        raw.type === 'button' ||
        raw.role === 'button') return 'button'
    if (raw.tag === 'input') return 'input'
    return 'other'
  }

  private determineName(raw: RawElement): string | null {
    const candidates = [
      raw.dataTest,
      raw.ariaLabel,
      raw.labelText,
      raw.placeholder,
      raw.id,
      raw.textContent,
    ].filter(Boolean) as string[]

    for (const candidate of candidates) {
      const name = this.toCamelCase(candidate)
      if (name && name.length > 1 && name.length < 50) return name
    }
    return null
  }

  private determineCritical(raw: RawElement): boolean {
    if (raw.dataTest) return true
    if (raw.type === 'submit') return true
    if (raw.type === 'password') return true
    if (raw.role === 'button' && raw.textContent) return true
    return false
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^(.)/, (c: string) => c.toLowerCase())
      .trim()
  }

  private async nameWithAi(
  unnamed: ElementDefinition[],
  raw:     RawElement[]
): Promise<Map<string, string>> {
  const result    = new Map<string, string>()
  const BATCH_MAX = 20

  // Split into chunks of BATCH_MAX
  for (let i = 0; i < unnamed.length; i += BATCH_MAX) {
    const batch = unnamed.slice(i, i + BATCH_MAX)
    if (!this.budget.consume(1)) {
      console.warn(`[ElementClassifier] AI naming skipped on "${this.pageId}" — budget exhausted (${this.budget.remaining} remaining)`)
      break
    }
    console.log(`[ElementClassifier] AI naming ${batch.length} elements on "${this.pageId}" (budget remaining: ${this.budget.remaining})`)

    const context = batch.map((el, idx) => ({
      index: i + idx,
      id:    el.id,
      tag:   'unknown',
      label: el.label,
      kind:  el.kind,
    }))

    try {
      const response = await aiCall({
        operation: 'crawl-classify',
        appName:   getAppName(),
        messages:  [{
          role:    'user',
          content: `You are naming UI elements for a test automation framework.
Given these unnamed elements on page "${this.pageId}", suggest camelCase names.
Respond ONLY with a JSON array: [{"id": "...", "name": "camelCaseName"}, ...]

Elements:
${JSON.stringify(context, null, 2)}`,
        }],
        maxTokens: 1024,
      })

      const clean  = response.content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as { id: string; name: string }[]
      for (const item of parsed) {
        if (item.id && item.name) result.set(item.id, item.name)
      }
    } catch (e) {
      console.warn(`[ElementClassifier] AI naming failed on batch ${Math.floor(i / BATCH_MAX) + 1} of "${this.pageId}" — using fallback names`)
    }
  }

  return result
}

  /**
   * Classify API endpoint parameters and body fields as ElementDefinition items.
   * Called when appType is 'rest-api' or 'graphql-api'.
   */
  static classifyEndpoints(endpoints: EndpointDefinition[]): ElementDefinition[] {
    const elements: ElementDefinition[] = []

    for (const ep of endpoints) {
      const epId = `${ep.method}:${ep.path}`

      // Path parameters — segments wrapped in {}
      const pathParams = (ep.path.match(/\{([^}]+)\}/g) || [])
        .map(p => p.slice(1, -1))
      for (const param of pathParams) {
        elements.push({
          id:              `${epId}:${param}`,
          name:            param,
          kind:            'path-param',
          label:           `Path param: ${param} (${ep.method} ${ep.path})`,
          critical:        true,
          aiNamed:         false,
          strategies:      [{ type: 'api-path', value: ep.path, confidence: 1.0 }],
          tier3Assertions: [],
        })
      }

      // Query parameters
      for (const param of (ep.parameters || []).filter(p => p.in === 'query')) {
        elements.push({
          id:              `${epId}:${param.name}`,
          name:            param.name,
          kind:            'query-param',
          label:           `Query param: ${param.name} (${ep.method} ${ep.path})`,
          critical:        param.required,
          aiNamed:         false,
          strategies:      [{ type: 'api-path', value: ep.path, confidence: 0.9 }],
          tier3Assertions: [],
        })
      }

      // Request body fields
      const reqProps = ep.requestBody?.schema?.properties || {}
      for (const [field] of Object.entries(reqProps)) {
        elements.push({
          id:              `${epId}:req:${field}`,
          name:            field,
          kind:            'request-field',
          label:           `Request field: ${field} (${ep.method} ${ep.path})`,
          critical:        true,
          aiNamed:         false,
          strategies:      [{ type: 'api-path', value: ep.path, confidence: 0.8 }],
          tier3Assertions: [],
        })
      }

      // Response fields from 200 or 201
      const respSchema =
        ep.responses?.['200']?.schema?.properties ||
        ep.responses?.['200']?.content?.['application/json']?.schema?.properties ||
        ep.responses?.['201']?.schema?.properties ||
        ep.responses?.['201']?.content?.['application/json']?.schema?.properties ||
        {}
      for (const [field] of Object.entries(respSchema)) {
        elements.push({
          id:              `${epId}:res:${field}`,
          name:            field,
          kind:            'response-field',
          label:           `Response field: ${field} (${ep.method} ${ep.path})`,
          critical:        false,
          aiNamed:         false,
          strategies:      [{ type: 'api-path', value: ep.path, confidence: 0.8 }],
          tier3Assertions: [],
        })
      }
    }

    return elements
  }

  static async computeDomHash(page: Page): Promise<string> {
    const structure = await page.evaluate(() => {
      const tags = Array.from(document.querySelectorAll('*'))
        .slice(0, 200)
        .map(el => el.tagName)
        .join(',')
      return tags
    })
    return 'sha256:' + crypto
      .createHash('sha256')
      .update(structure)
      .digest('hex')
      .slice(0, 16)
  }
}
