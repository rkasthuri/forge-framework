import { BrowserContext, Locator, Page } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker, ElementDefinition }  from './types'
import { PageVisitor, isDenied, isSameOrigin, normalizeUrl } from './PageVisitor'
import { CrawlConfig }    from './BFSStrategy'
import { ExplorationMap, createExplorationMap, isDiscovered, isSwept, markDiscovered, markSwept } from './PageExplorationRecord'

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

const BUTTON_TEXT_SELECTOR = 'button, [role=button]'

// Mirrors ElementClassifier.buildRoleSelector()'s tag->role map (ElementClassifier.ts:379)
// -- needed here to compute the same "role" signal off a live clicked element
// that classification already computed off the same element during harvest.
const ROLE_MAP: Record<string, string> = {
  'input':    'textbox',
  'button':   'button',
  'a':        'link',
  'select':   'combobox',
  'textarea': 'textbox',
}

export class SPAStrategy {
  private visitor: PageVisitor

  // TD-026/TD-027 (SPA half) -- real {fromUrl, toUrl, trigger} relationships
  // discovered during the merged classify+discover pass, read by Crawler.ts
  // after crawl() resolves (crawlMode === 'spa' only). Kept as a side-effect
  // property rather than changing crawl()'s return type, so HybridStrategy.ts
  // (which also calls crawl() internally) needs no changes at all.
  readonly discoveredEdges: { fromUrl: string; toUrl: string; trigger: string }[] = []

  constructor(
    private config: CrawlConfig,
    private budget: AiBudgetTracker
  ) {
    this.visitor = new PageVisitor(config.baseUrl, budget)
  }

  async crawl(
    context:        BrowserContext,
    startUrl:       string,
    explorationMap: ExplorationMap = createExplorationMap(),
    budget:         number         = this.config.maxPages,
    initialFrontier?: string[],
  ): Promise<PageDiscovery[]> {
    const discovered: PageDiscovery[] = []
    const maxDepth = this.config.maxDepth
    // TD-124 (Nova Q2): budget measures WORK (page opens), not just new
    // discoveries — a sweep-only open of a BFS-discovered page consumes budget.
    let pagesOpened = 0
    console.log(
      `[SPAStrategy] Starting from: ${startUrl} | Budget: ${budget} page opens | maxDepth: ${maxDepth}`
    )

    // TD-124: candidateSet dedups discovery proposals against SWEPT urls only
    // (not all discovered) — a BFS-discovered-but-unswept page is a valid
    // candidate for click-discovery to surface so it enters the frontier.
    const candidateSet = new Set<string>(
      [...explorationMap].filter(([, r]) => r.swept).map(([u]) => u),
    )
    // TD-124: HybridStrategy seeds the frontier with all BFS-discovered pages;
    // standalone SPA starts from the login/start URL as before.
    let frontier: string[] = initialFrontier ?? [normalizeUrl(startUrl)]
    let depth = 0

    while (frontier.length > 0 && pagesOpened < budget) {
      const shouldDiscover = depth < maxDepth
      const nextCandidates: string[] = []

      // Merged per-URL pass: one page instance per frontier URL, classify
      // then discover on that same still-open page (TD-021/TD-026/TD-027 SPA
      // half). Replaces the old two-loop structure (visit-all-frontier, then
      // discover-all-frontier via 17 extra throwaway page loads per URL).
      for (const url of frontier) {
        if (pagesOpened >= budget) break
        const normalized = normalizeUrl(url)
        // TD-124 KEY FIX: skip only if already SWEPT (click-discovered), not
        // merely discovered — a BFS-discovered page is unswept and MUST be
        // opened so its click-only child pages are found.
        if (isSwept(explorationMap, normalized)) continue

        const wasDiscovered = isDiscovered(explorationMap, normalized)
        candidateSet.add(normalized)

        // New page → full classify (visitKeepOpen) and record the discovery.
        // Already-discovered-but-unswept page → TD-129 sweep-only: open WITHOUT
        // ElementClassifier (no AI budget consumed — BFS already classified it);
        // discovery runs with elements:[] (matchClickedElement degrades to
        // selector-string triggers; discovery completeness preserved).
        let page: Page
        let elementsForDiscovery: ElementDefinition[]
        if (!wasDiscovered) {
          const res = await this.visitor.visitKeepOpen(context, normalized, 'spa', depth)
          page = res.page
          discovered.push(res.discovery)
          markDiscovered(explorationMap, normalized)
          elementsForDiscovery = res.discovery.elements
        } else {
          const res = await this.visitor.visitForDiscoveryOnly(context, normalized)
          page = res.page
          console.log(`[SPAStrategy] Sweep-only discovery: ${normalized} (no AI — BFS already classified)`)
          elementsForDiscovery = []
        }
        pagesOpened++
        markSwept(explorationMap, normalized)

        try {
          if (shouldDiscover && pagesOpened < budget) {
            const navResults    = await this.discoverViaSelectors(page, normalized, candidateSet, elementsForDiscovery)
            const buttonResults = await this.discoverViaButtonText(page, normalized, candidateSet, elementsForDiscovery)
            for (const r of [...navResults, ...buttonResults]) {
              nextCandidates.push(r.url)
              this.discoveredEdges.push({ fromUrl: normalized, toUrl: r.url, trigger: r.trigger })
            }
          }
        } finally {
          await page.close()
        }
      }

      if (!shouldDiscover || pagesOpened >= budget) break

      // TD-124: allow discovered-but-UNSWEPT urls into the next frontier (they
      // still need a click-discovery sweep); skip only already-swept urls.
      const nextFrontier = [...new Set(nextCandidates)].filter(u => !isSwept(explorationMap, normalizeUrl(u)))
      console.log(
        `[SPAStrategy] Depth ${depth} → ${depth + 1}: ${nextFrontier.length} new URL(s) discovered`
      )
      if (nextFrontier.length === 0) break

      frontier = nextFrontier
      depth++
    }

    console.log(
      `[SPAStrategy] Complete | ${discovered.length} pages discovered (${pagesOpened} opened) | reached depth ${depth} of maxDepth ${maxDepth}`
    )
    return discovered
  }

  // TD-026 -- matches the clicked element against this page's already-
  // classified elements by reading the same identifying signals
  // ElementClassifier.buildStrategyChain() itself prioritizes (data-test >
  // id > role+accessibleName > text), read live off the exact DOM node
  // discovery just resolved via (selector, position) -- not by href
  // presence, and identically for both the href-read and click-fallback
  // paths. Conservative on the lower-confidence tiers: an ambiguous
  // role/text match (matches more than one classified element) is treated
  // as no match rather than guessed.
  private async matchClickedElement(
    el:       Locator,
    elements: ElementDefinition[],
  ): Promise<string | null> {
    const dataTest = await el.getAttribute('data-test').catch(() => null)
    if (dataTest) {
      const match = elements.find(e => e.strategies.some(s => s.type === 'data-test' && s.value === dataTest))
      if (match) return match.id
    }

    const domId = await el.getAttribute('id').catch(() => null)
    if (domId) {
      const match = elements.find(e => e.strategies.some(s => s.type === 'id' && s.value === domId))
      if (match) return match.id
    }

    const tag       = await el.evaluate(node => node.tagName.toLowerCase()).catch(() => null)
    const roleAttr  = await el.getAttribute('role').catch(() => null)
    const ariaLabel = await el.getAttribute('aria-label').catch(() => null)
    const text      = (await el.textContent().catch(() => null))?.trim().slice(0, 30) || null
    const role      = roleAttr || (tag ? ROLE_MAP[tag] : null)

    if (role) {
      const candidates = elements.filter(e => e.strategies.some(s => s.type === 'role' && s.value === role))
      const exact = candidates.filter(e => e.strategies.some(
        s => s.type === 'role' && s.value === role && (s.accessibleName ?? null) === (ariaLabel || text || null)
      ))
      if (exact.length === 1) return exact[0].id
      if (exact.length === 0 && candidates.length === 1) return candidates[0].id
    }

    if (text) {
      const candidates = elements.filter(e => e.strategies.some(s => s.type === 'text' && s.value === text))
      if (candidates.length === 1) return candidates[0].id
    }

    return null
  }

  private async discoverViaSelectors(
    page:       Page,
    startUrl:   string,
    candidates: Set<string>,
    elements:   ElementDefinition[],
  ): Promise<{ url: string; trigger: string }[]> {
    const discovered: { url: string; trigger: string }[] = []

    for (const selector of NAV_SELECTORS) {
      try {
        const count = await page.locator(selector).count()
        if (count === 0) continue

        for (let i = 0; i < count; i++) {
          try {
            const el = page.locator(selector).nth(i)

            const href = await el.getAttribute('href').catch(() => null)
            const trigger = await this.matchClickedElement(el, elements) ?? selector

            if (href && href !== '#' && href !== '' && !href.startsWith('#')) {
              try {
                const absolute = new URL(href, this.config.baseUrl).toString()
                const norm = normalizeUrl(absolute)
                if (isSameOrigin(norm, this.config.baseUrl) &&
                    !isDenied(norm) &&
                    !candidates.has(norm)) {
                  discovered.push({ url: norm, trigger })
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
              discovered.push({ url: urlAfter, trigger })
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
      }
    }

    const seen = new Set<string>()
    return discovered.filter(d => !seen.has(d.url) && seen.add(d.url))
  }

  private async discoverViaButtonText(
    page:       Page,
    startUrl:   string,
    candidates: Set<string>,
    elements:   ElementDefinition[],
  ): Promise<{ url: string; trigger: string }[]> {
    const discovered: { url: string; trigger: string }[] = []

    try {
      try {
        const burgerBtn = page.locator('#react-burger-menu-btn, .bm-burger-button button')
        if (await burgerBtn.count() > 0) {
          await burgerBtn.first().click({ timeout: 2000 })
          await page.waitForTimeout(800)
        }
      } catch {}

      const count = await page.locator(BUTTON_TEXT_SELECTOR).count()

      for (let i = 0; i < count; i++) {
        try {
          const btn = page.locator(BUTTON_TEXT_SELECTOR).nth(i)
          const text = await btn.textContent().catch(() => '')
          if (!text) continue

          const isNavButton = NAV_TEXT_PATTERNS.some(p => p.test(text))
          const isMutating  = MUTATING_TEXT_PATTERNS.some(p => p.test(text))
          if (!isNavButton || isMutating) continue

          const trigger = await this.matchClickedElement(btn, elements) ?? BUTTON_TEXT_SELECTOR

          const urlBefore = normalizeUrl(page.url())
          await btn.click({ timeout: 3000 })
          await page.waitForTimeout(600)
          const urlAfter = normalizeUrl(page.url())

          if (urlAfter !== urlBefore &&
              isSameOrigin(urlAfter, this.config.baseUrl) &&
              !isDenied(urlAfter) &&
              !candidates.has(urlAfter)) {
            discovered.push({ url: urlAfter, trigger })
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
    }

    const seen = new Set<string>()
    return discovered.filter(d => !seen.has(d.url) && seen.add(d.url))
  }
}
