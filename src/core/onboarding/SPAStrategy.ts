import { BrowserContext } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker }  from './types'
import { PageVisitor, isDenied, isSameOrigin, normalizeUrl } from './PageVisitor'
import { CrawlConfig }    from './BFSStrategy'

const NAV_SELECTORS = [
  '.oxd-main-menu-item',
  '[data-test*="nav"]',
  '[role="menuitem"]',
  '[role="navigation"] a',
  '[role="tab"]',
  '[class*="nav-item"]',
  '[class*="sidebar"] a',
  '[class*="menu-item"]',
  '[class*="sidebar-item"]',
  'nav a',
  'nav button',
  'a[href="#"]',
  'a[href=""]',
  '.shopping_cart_link',
  '.inventory_item_name',
  '.inventory_item_img a',
]

const NAV_TEXT_PATTERNS = [
  /cart/i, /menu/i, /product/i, /inventory/i,
  /checkout/i, /account/i, /profile/i, /dashboard/i,
  /admin/i, /report/i, /setting/i, /module/i,
]

// Buttons whose action mutates app state rather than navigating — clicking
// these during exploration silently pollutes shared browser-context state
// (e.g. "Add to cart" matches /cart/i but adds an item instead of navigating)
const MUTATING_TEXT_PATTERNS = [
  /add.*cart/i, /remove/i, /delete/i,
]

export class SPAStrategy {
  private visitor: PageVisitor

  constructor(
    private config: CrawlConfig,
    private budget: AiBudgetTracker
  ) {
    this.visitor = new PageVisitor(config.baseUrl, budget)
  }

  async crawl(
    context:  BrowserContext,
    startUrl: string,
    visited:  Set<string> = new Set(),
    budget:   number      = this.config.maxPages,
  ): Promise<PageDiscovery[]> {
    const discovered: PageDiscovery[] = []
    console.log(`[SPAStrategy] Starting from: ${startUrl} | Budget: ${budget} pages`)

    // Visit startUrl first
    const normalizedStart = normalizeUrl(startUrl)
    if (!visited.has(normalizedStart)) {
      visited.add(normalizedStart)
      const startDiscovery = await this.visitor.visit(context, normalizedStart, 'spa', 0)
      discovered.push(startDiscovery)
    }

    // Phase 1 & 2: Discover candidate URLs � use a local set to deduplicate
    // discoveries without polluting visited (visited gates Phase 3 visits)
    const candidateSet = new Set<string>(visited)
    const navUrls    = await this.discoverViaSelectors(context, startUrl, candidateSet)
    const buttonUrls = await this.discoverViaButtonText(context, startUrl, candidateSet)

    const allUrls = [...new Set([...navUrls, ...buttonUrls])]
    console.log(`[SPAStrategy] Total URLs discovered: ${allUrls.length}`)

    // Phase 3: Visit each discovered URL
    for (const url of allUrls) {
      if (discovered.length >= budget) break
      const normalized = normalizeUrl(url)
      if (visited.has(normalized)) continue
      visited.add(normalized)

      const discovery = await this.visitor.visit(context, normalized, 'spa', 1)
      discovered.push(discovery)
    }

    console.log(`[SPAStrategy] Complete | ${discovered.length} pages discovered`)
    return discovered
  }

  private async discoverViaSelectors(
    context:    BrowserContext,
    startUrl:   string,
    candidates: Set<string>,
  ): Promise<string[]> {
    const discovered: string[] = []

    for (const selector of NAV_SELECTORS) {
      const page = await context.newPage()
      try {
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(2000)

        const count = await page.locator(selector).count()
        if (count === 0) {
          await page.close()
          continue
        }

        for (let i = 0; i < count; i++) {
          try {
            const el = page.locator(selector).nth(i)

            const href = await el.getAttribute('href').catch(() => null)
            if (href && href !== '#' && href !== '' && !href.startsWith('#')) {
              try {
                const absolute = new URL(href, this.config.baseUrl).toString()
                const norm = normalizeUrl(absolute)
                if (isSameOrigin(norm, this.config.baseUrl) &&
                    !isDenied(norm) &&
                    !candidates.has(norm)) {
                  discovered.push(norm)
                  candidates.add(norm)
                }
              } catch {}
              continue
            }

            const urlBefore = normalizeUrl(page.url())
            await el.click({ timeout: 3000 })
            let urlAfter = urlBefore
            for (let j = 0; j < 8; j++) {
              await page.waitForTimeout(250)
              urlAfter = normalizeUrl(page.url())
              if (urlAfter !== urlBefore) break
            }

            if (urlAfter !== urlBefore &&
                isSameOrigin(urlAfter, this.config.baseUrl) &&
                !isDenied(urlAfter) &&
                !candidates.has(urlAfter)) {
              discovered.push(urlAfter)
              candidates.add(urlAfter)
            }

            if (normalizeUrl(page.url()) !== normalizeUrl(startUrl)) {
              await page.goto(startUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              }).catch(() => {})
              await page.waitForTimeout(1200)
            }
          } catch {
            try {
              if (normalizeUrl(page.url()) !== normalizeUrl(startUrl)) {
                await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
                await page.waitForTimeout(1000)
              }
            } catch {}
          }
        }
      } catch (e: any) {
        console.warn(`[SPAStrategy] Selector "${selector}" failed: ${e.message}`)
      } finally {
        await page.close()
      }
    }

    return [...new Set(discovered)]
  }

  private async discoverViaButtonText(
    context:    BrowserContext,
    startUrl:   string,
    candidates: Set<string>,
  ): Promise<string[]> {
    const discovered: string[] = []
    const page = await context.newPage()

    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      try {
        const burgerBtn = page.locator('#react-burger-menu-btn, .bm-burger-button button')
        if (await burgerBtn.count() > 0) {
          await burgerBtn.first().click({ timeout: 2000 })
          await page.waitForTimeout(800)
        }
      } catch {}

      const count = await page.locator('button, [role=button]').count()

      for (let i = 0; i < count; i++) {
        try {
          const btn = page.locator('button, [role=button]').nth(i)
          const text = await btn.textContent().catch(() => '')
          if (!text) continue

          const isNavButton = NAV_TEXT_PATTERNS.some(p => p.test(text))
          const isMutating  = MUTATING_TEXT_PATTERNS.some(p => p.test(text))
          if (!isNavButton || isMutating) continue

          const urlBefore = normalizeUrl(page.url())
          await btn.click({ timeout: 3000 })
          await page.waitForTimeout(600)
          const urlAfter = normalizeUrl(page.url())

          if (urlAfter !== urlBefore &&
              isSameOrigin(urlAfter, this.config.baseUrl) &&
              !isDenied(urlAfter) &&
              !candidates.has(urlAfter)) {
            discovered.push(urlAfter)
            candidates.add(urlAfter)
          }

          if (normalizeUrl(page.url()) !== normalizeUrl(startUrl)) {
            await page.goto(startUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            }).catch(() => {})
            await page.waitForTimeout(1200)
          }
        } catch {}
      }
    } catch (e: any) {
      console.warn(`[SPAStrategy] Button discovery failed: ${e.message}`)
    } finally {
      await page.close()
    }

    return [...new Set(discovered)]
  }
}
