import { BrowserContext } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker }  from './types'
import { BFSStrategy, CrawlConfig } from './BFSStrategy'
import { SPAStrategy }    from './SPAStrategy'
import { normalizeUrl }   from './PageVisitor'
import { ExplorationMap, createExplorationMap } from './PageExplorationRecord'

export class HybridStrategy {
  constructor(
    private config: CrawlConfig,
    private budget: AiBudgetTracker
  ) {}

  async crawl(
    context:        BrowserContext,
    startUrl:       string,
    explorationMap: ExplorationMap = createExplorationMap(),
    budget:         number         = this.config.maxPages,
  ): Promise<PageDiscovery[]> {
    console.log(`[HybridStrategy] Starting | Budget: ${budget} pages`)

    // Split budget 60% BFS / 40% SPA
    const bfsBudget = Math.ceil(budget * 0.6)
    const spaBudget = Math.floor(budget * 0.4)

    // Run BFS first
    const bfs = new BFSStrategy(this.config, this.budget)
    const bfsResults = await bfs.crawl(context, startUrl, explorationMap, bfsBudget)

    // TD-124 (Nova Q3): seed SPA's frontier with ALL BFS-discovered-but-unswept
    // pages — BFS never click-discovers, so every page it found is unswept and
    // may hide click-only child pages. (Pre-TD-124, SPA started from startUrl,
    // found it already "visited", and swept NOTHING — the whole bug.) Budget
    // caps how many actually get swept; explicit prioritization is crawl
    // planning, out of scope (Nova Q5).
    const unsweptPages = [...explorationMap]
      .filter(([, r]) => r.discovered && !r.swept)
      .map(([url]) => url)
    console.log(`[HybridStrategy] Seeding SPA frontier with ${unsweptPages.length} unswept BFS page(s)`)

    // Pass the same explorationMap so SPA sees BFS's discoveries (swept-gated).
    const bfsSpa = new SPAStrategy(this.config, this.budget)
    const spaResults = await bfsSpa.crawl(
      context, startUrl, explorationMap, spaBudget,
      unsweptPages.length > 0 ? unsweptPages : undefined,
    )

    const all = [...bfsResults, ...spaResults]

    // Deduplicate by normalised URL
    const seen  = new Set<string>()
    const deduped: PageDiscovery[] = []
    for (const p of all) {
      const norm = normalizeUrl(
        p.urlPattern.startsWith('http')
          ? p.urlPattern
          : 'https://placeholder.com' + p.urlPattern
      )
      if (!seen.has(norm)) {
        seen.add(norm)
        deduped.push(p)
      }
    }

    console.log(
      `[HybridStrategy] Complete | BFS: ${bfsResults.length} + ` +
      `SPA: ${spaResults.length} = ${deduped.length} unique pages`
    )

    return deduped
  }
}
