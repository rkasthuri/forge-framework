export function lines(...args: string[]): string {
  return args.join('\n')
}

export function indent(n: number, code: string): string {
  const pad = '  '.repeat(n)
  return code.split('\n').map(l => l.length > 0 ? pad + l : l).join('\n')
}

export function generatedHeader(modelVersion: string, hash: string): string {
  return lines(
    `// @generated from app-model.json v${modelVersion} ${hash}`,
    `// DO NOT EDIT — regenerate with: npm run onboard:generate`,
    ``
  )
}

export function toClassName(id: string): string {
  return id
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') + 'Page'
}

export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toLowerCase())
    .trim()
}

export function toDisplayName(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function writeFile(filePath: string, content: string): void {
  const fs   = require('fs')
  const path = require('path')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`[Generator] Written: ${filePath}`)
}

// Converts a model Strategy into the CSS selector string SmartLocator expects
export function strategyToSelector(type: string, value: string): string {
  switch (type) {
    case 'data-test': return `[data-test="${value}"]`
    case 'id':        return `#${value}`
    case 'text':      return `text=${value}`
    case 'css':       return value
    case 'role':      return value   // kept as-is; SmartLocator treats as page.locator()
    default:          return value
  }
}

/**
 * Properties already declared (concrete) in BasePage.
 * Generated pages must not re-declare these — TypeScript will reject
 * a SmartLocator override of a Locator-typed BasePage property.
 */
export const BASE_PAGE_PROPERTIES = new Set([
  'menuButton', 'menuCloseButton', 'allItemsLink', 'aboutLink',
  'logoutLink', 'resetAppStateLink', 'cartLink', 'cartBadge', 'pageTitle',
  'page', 'pageUrl', 'isLoaded',
])
