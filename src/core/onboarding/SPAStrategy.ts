import { BrowserContext } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker }  from './types'
import { PageVisitor, isDenied, isSameOrigin, normalizeUrl } from './PageVisitor'
import { CrawlConfig }    from './BFSStrategy'

// Navigation selectors in priority order
const NAV_SELECTORS = [
  // Framework-specific
  '.oxd-main-menu-item',
  '[data-test*="nav"]',
  // ARIA navigation
  '[role="menuitem"]',
  '[role="navigation"] a',
  '[role="tab"]',
  // Class-based patterns
  '[class*="nav-item"]',
  '[class*="sidebar"] a',
  '[class*="menu-item"]',
  '[class*="sidebar-item"]',
  // Generic nav links
  'nav a',
  'nav button',
  // JS-link patterns (SauceDemo style)
  'a[href="#"]',
  'a[href=""]',
  // SauceDemo specific — cart and product links
  '.shopping_cart_link',
  '.inventory_item_name',
  '.inventory_item_img a',
]

// Button text patterns that suggest navigation
const NAV_TEXT_PATTERNS = [
  /cart/i, /menu/i, /product/i, /inventory/i,
  /checkout/i, /account/i, /profile/i, /dashboard/i,
  /admin/i, /report/i, /setting/i, /module/i,
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

    // Phase 1: Discover URLs via nav selector clicks
    const navUrls = await this.discoverViaSelectors(context, startUrl, visited)

    // Phase 2: Discover URLs via button text patterns
    const buttonUrls = await this.discoverViaButtonText(context, startUrl, visited)

    // Combine and deduplicate
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
    context:  BrowserContext,
    startUrl: string,
    visited:  Set<string>,
  ): Promise<string[]> {
    const discovered: string[] = []

    for (const selector of NAV_SELECTORS) {
      const page = await context.newPage()
      try {
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(2000)

        const elements = await page.locator(selector).all()
        if (elements.length === 0) {
          await page.close()
          continue
        }

        for (const el of elements) {
          try {
            // Check for real href first
            const href = await el.getAttribute('href').catch(() => null)
            if (href && href !== '#' && href !== '' && !href.startsWith('#')) {
              try {
                const absolute = new URL(href, this.config.baseUrl).toString()
                const norm = normalizeUrl(absolute)
                if (isSameOrigin(norm, this.config.baseUrl) &&
                    !isDenied(norm) &&
                    !visited.has(norm) &&
                    !discovered.includes(norm)) {
                  discovered.push(norm)
                }
              } catch {}
              continue
            }

            // No real href — click and poll for URL change
            const urlBefore = normalizeUrl(page.url())
            await el.click({ timeout: 3000 })
            // Poll for URL change up to 2000ms
            let urlAfter = urlBefore
            for (let i = 0; i < 8; i++) {
              await page.waitForTimeout(250)
              urlAfter = normalizeUrl(page.url())
              if (urlAfter !== urlBefore) break
            }

            if (urlAfter !== urlBefore &&
                isSameOrigin(urlAfter, this.config.baseUrl) &&
                !isDenied(urlAfter) &&
                !visited.has(urlAfter) &&
                !discovered.includes(urlAfter)) {
              discovered.push(urlAfter)
            }

            // Return to start for next click
            if (page.url() !== startUrl) {
              await page.goto(startUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              }).catch(() => {})
              await page.waitForTimeout(1200)
            }
          } catch {
            // Element not clickable — skip
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
    context:  BrowserContext,
    startUrl: string,
    visited:  Set<string>,
  ): Promise<string[]> {
    const discovered: string[] = []
    const page = await context.newPage()

    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      // Open burger menu if present — reveals hidden nav items
      try {
        const burgerBtn = page.locator('#react-burger-menu-btn, .bm-burger-button button')
        if (await burgerBtn.count() > 0) {
          await burgerBtn.first().click({ timeout: 2000 })
          await page.waitForTimeout(800)
        }
      } catch {}

      // Find all buttons and check text against nav patterns
      const buttons = await page.locator('button, [role=button]').all()

      for (const btn of buttons) {
        try {
          const text = await btn.textContent().catch(() => '')
          if (!text) continue

          const isNavButton = NAV_TEXT_PATTERNS.some(p => p.test(text))
          if (!isNavButton) continue

          const urlBefore = normalizeUrl(page.url())
          await btn.click({ timeout: 3000 })
          await page.waitForTimeout(600)
          const urlAfter = normalizeUrl(page.url())

          if (urlAfter !== urlBefore &&
              isSameOrigin(urlAfter, this.config.baseUrl) &&
              !isDenied(urlAfter) &&
              !visited.has(urlAfter) &&
              !discovered.includes(urlAfter)) {
            discovered.push(urlAfter)
          }

          // Return to start
          if (page.url() !== startUrl) {
            await page.goto(startUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            }).catch(() => {})
            await page.waitForTimeout(1200)
          }
        } catch {
          // Skip unclickable buttons
        }
      }
    } catch (e: any) {
      console.warn(`[SPAStrategy] Button discovery failed: ${e.message}`)
    } finally {
      await page.close()
    }

    return [...new Set(discovered)]
  }
}
