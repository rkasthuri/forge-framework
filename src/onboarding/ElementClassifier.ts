import { Page } from '@playwright/test'
import * as crypto from 'crypto'
import {
  RawElement, Strategy, ElementKind,
  ElementDefinition, AiBudgetTracker
} from './types'
import { aiCall } from '../ai/AiClient'
import { getAppName } from '../config/appConfig'

export class ElementClassifier {

  constructor(
    private page:   Page,
    private pageId: string,
    private budget: AiBudgetTracker
  ) {}

  async classifyPage(): Promise<ElementDefinition[]> {
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
    raw: RawElement[]
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    if (!this.budget.consume(1)) return result

    const context = unnamed.map((el, i) => ({
      index: i,
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
        maxTokens: 500,
      })

      const clean  = response.content
        .replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as { id: string; name: string }[]
      for (const item of parsed) {
        if (item.id && item.name) result.set(item.id, item.name)
      }
    } catch (e) {
      console.warn('[ElementClassifier] AI naming failed — using fallback names')
    }

    return result
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
