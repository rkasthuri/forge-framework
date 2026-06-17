import { BrowserContext, Page } from '@playwright/test'
import * as crypto              from 'crypto'
import { ElementClassifier }    from './ElementClassifier'
import { PageDiscovery, AiBudgetTracker } from './types'

const DENY_PATTERNS = [
  /logout/i, /sign.?out/i, /signout/i,
  /delete/i, /remove/i,
  /confirm.*order/i, /place.*order/i, /submit.*payment/i,
]

export function isDenied(url: string): boolean {
  return DENY_PATTERNS.some(p => p.test(url))
}

export function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

export function urlToPageId(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'home'
  } catch {
    return 'home'
  }
}

export class PageVisitor {
  constructor(
    private baseUrl: string,
    private budget:  AiBudgetTracker
  ) {}

  async visit(
    context: BrowserContext,
    url:     string,
    roleId:  string,
    depth:   number,
  ): Promise<PageDiscovery> {
    const page = await context.newPage()
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1000)

      const pageId    = urlToPageId(url)
      const classifier = new ElementClassifier(page, pageId, this.budget)
      let elements  = await classifier.classifyPage()
      const outboundUrls = await this.extractLinks(page, url)

      // Pages keyed by a numeric query-param id (e.g. ?id=4) aren't durably
      // reproducible across sessions on some apps — the id-to-content mapping
      // can shift, leaving a fresh visit pointing at different/missing content.
      // Treat them as non-critical rather than have verify hard-fail on it.
      if (/[?&]\w+=\d+(&|$)/.test(url)) {
        elements = elements.map(e => ({ ...e, critical: false }))
        console.log(
          `[PageVisitor] ${url} has a numeric id param — ` +
          `treating as volatile, marking elements non-critical`
        )
      }

      const domContent = await page.content().catch(() => '')
      const domHash    = crypto
        .createHash('sha256')
        .update(domContent.slice(0, 5000))
        .digest('hex')
        .slice(0, 16)

      const isAuthPage = await page.locator(
        'input[type=password], input[name*=pass i], input[placeholder*=pass i]'
      ).count() > 0

      console.log(
        `[FORGE Crawler] Discovered: ${url} ` +
        `(depth ${depth}, role: ${roleId}, ` +
        `elements: ${elements.length}, links: ${outboundUrls.length})`
      )

      return { pageId, urlPattern: new URL(url).pathname, elements, outboundUrls, domHash, isAuthPage }
    } catch (e: any) {
      console.warn(`[FORGE Crawler] Failed to visit ${url}: ${e.message}`)
      return {
        pageId:       urlToPageId(url),
        urlPattern:   (() => { try { return new URL(url).pathname } catch { return '/' } })(),
        elements:     [],
        outboundUrls: [],
        domHash:      '',
        isAuthPage:   false,
      }
    } finally {
      await page.close()
    }
  }

  async extractLinks(page: Page, currentUrl: string): Promise<string[]> {
    try {
      const raw = await page.evaluate((current) => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => {
            const href = (a as HTMLAnchorElement).getAttribute('href') || ''
            // Skip non-navigating hrefs
            if (!href ||
                href === '#' ||
                href.startsWith('#') ||
                href.startsWith('javascript') ||
                href.startsWith('mailto') ||
                href.startsWith('tel')) return null
            // Resolve relative and root-relative URLs against current page
            try {
              const resolved = new URL(href, current).toString()
              // Skip if only hash changed — same page
              const currentPath  = new URL(current).pathname
              const resolvedPath = new URL(resolved).pathname
              if (resolvedPath === currentPath) return null
              return resolved
            } catch { return null }
          })
          .filter((u): u is string => u !== null)
      }, currentUrl)
      return raw.filter(url =>
        isSameOrigin(url, this.baseUrl) && !isDenied(url)
      )
    } catch {
      return []
    }
  }
}
