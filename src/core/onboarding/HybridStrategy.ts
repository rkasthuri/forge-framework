import { BrowserContext } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker }  from './types'
import { BFSStrategy, CrawlConfig } from './BFSStrategy'
import { SPAStrategy }    from './SPAStrategy'
import { normalizeUrl }   from './PageVisitor'

export class HybridStrategy {
  constructor(
    private config: CrawlConfig,
    private budget: AiBudgetTracker
  ) {}

  async crawl(
    context:  BrowserContext,
    startUrl: string,
    visited:  Set<string> = new Set(),
    budget:   number      = this.config.maxPages,
  ): Promise<PageDiscovery[]> {
    console.log(`[HybridStrategy] Starting | Budget: ${budget} pages`)

    // Split budget 60% BFS / 40% SPA
    const bfsBudget = Math.ceil(budget * 0.6)
    const spaBudget = Math.floor(budget * 0.4)

    // Run BFS first
    const bfs = new BFSStrategy(this.config, this.budget)
    const bfsResults = await bfs.crawl(context, startUrl, visited, bfsBudget)

    // Pass visited set to SPA so it doesn't revisit BFS pages
    const bfsSpa = new SPAStrategy(this.config, this.budget)
    const spaResults = await bfsSpa.crawl(context, startUrl, visited, spaBudget)

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
