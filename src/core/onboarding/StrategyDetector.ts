import { Page } from '@playwright/test'

export type CrawlMode = 'bfs' | 'spa' | 'hybrid'

export class StrategyDetector {
  async detect(page: Page, configOverride?: string): Promise<CrawlMode> {
    // Honour explicit config override
    if (configOverride && configOverride !== 'auto') {
      console.log(`[StrategyDetector] Using config override: ${configOverride}`)
      return configOverride as CrawlMode
    }

    // Wait for SPA frameworks to fully initialise
    await page.waitForTimeout(2000)

    const currentUrl = page.url()

    const indicators = await page.evaluate((currentPathname) => {
      const w = window as any

      // SPA framework detection
      const isSpa =
        !!(w.__vue_app__ || w.Vue) ||
        !!(w.React || w.__REACT_DEVTOOLS_GLOBAL_HOOK__) ||
        !!(w.ng || w.getAllAngularRootElements) ||
        !!(w.__NEXT_DATA__ || w.nuxt) ||
        window.location.href.includes('/#/')

      // Count REAL navigable links — different pathname, same origin, no hash tricks
      const allAnchors = Array.from(document.querySelectorAll('a[href]'))
      const realLinks = allAnchors.filter(a => {
        const href = (a as HTMLAnchorElement).getAttribute('href') || ''
        if (!href || href === '#' || href.startsWith('#') ||
            href.startsWith('javascript') || href.startsWith('mailto') ||
            href.startsWith('tel')) return false
        try {
          const resolved = new URL(href, window.location.href)
          // Must be same origin and different pathname
          return resolved.origin === window.location.origin &&
                 resolved.pathname !== currentPathname
        } catch { return false }
      }).length

      // Count JS-only clickables — navigation disguised as non-links
      const jsClickables =
        // hash-only links
        allAnchors.filter(a => {
          const href = (a as HTMLAnchorElement).getAttribute('href') || ''
          return href === '#' || href === '' || href.startsWith('#')
        }).length +
        // buttons excluding submit
        document.querySelectorAll('button:not([type=submit])').length +
        // ARIA nav elements
        document.querySelectorAll(
          '[role="menuitem"],[role="tab"],[role="link"]'
        ).length +
        // Class-based nav patterns
        document.querySelectorAll(
          '[class*="nav-item"],[class*="menu-item"],[class*="sidebar-item"],' +
          '.oxd-main-menu-item'
        ).length

      return { isSpa, realLinks, jsClickables }
    }, new URL(currentUrl).pathname)

    let mode: CrawlMode

    if (indicators.isSpa) {
      // SPA framework detected
      if (indicators.realLinks > 3) {
        mode = 'hybrid'  // Has real links too — use both strategies
      } else {
        mode = 'spa'
      }
    } else if (indicators.jsClickables > indicators.realLinks) {
      // More JS navigation than real links — treat as SPA
      mode = indicators.realLinks > 1 ? 'hybrid' : 'spa'
    } else if (indicators.realLinks > 3) {
      mode = 'bfs'
    } else if (indicators.realLinks === 0 && indicators.jsClickables === 0) {
      mode = 'bfs'  // Sparse page (login page etc) — safe default
    } else {
      mode = 'hybrid'  // Uncertain — try both
    }

    console.log(
      `[StrategyDetector] Mode: ${mode} | ` +
      `spa:${indicators.isSpa} ` +
      `realLinks:${indicators.realLinks} ` +
      `jsClickables:${indicators.jsClickables}`
    )

    return mode
  }
}
