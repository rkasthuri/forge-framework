import { BrowserContext } from '@playwright/test'
import { PageDiscovery, AiBudgetTracker }  from './types'
import { PageVisitor, isDenied, isSameOrigin, normalizeUrl } from './PageVisitor'

export interface CrawlConfig {
  baseUrl:  string
  maxPages: number
  maxDepth: number
}

export class BFSStrategy {
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
    const queue: { url: string; depth: number }[] = [
      { url: normalizeUrl(startUrl), depth: 0 }
    ]

    console.log(`[BFSStrategy] Starting from: ${startUrl} | Budget: ${budget} pages`)

    while (queue.length > 0 && discovered.length < budget) {
      const { url, depth } = queue.shift()!
      const normalized     = normalizeUrl(url)

      if (visited.has(normalized))                        continue
      if (isDenied(normalized))                           continue
      if (!isSameOrigin(normalized, this.config.baseUrl)) continue
      if (depth > this.config.maxDepth)                  continue

      visited.add(normalized)

      const discovery = await this.visitor.visit(
        context, normalized, 'bfs', depth
      )
      discovered.push(discovery)

      for (const outUrl of discovery.outboundUrls) {
        const norm = normalizeUrl(outUrl)
        if (!visited.has(norm)) {
          queue.push({ url: norm, depth: depth + 1 })
        }
      }
    }

    console.log(`[BFSStrategy] Complete | ${discovered.length} pages discovered`)
    return discovered
  }
}
