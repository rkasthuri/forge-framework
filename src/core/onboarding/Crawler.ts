import { chromium }            from '@playwright/test'
import * as fs                 from 'fs'
import * as path               from 'path'
import * as crypto             from 'crypto'
import {
  OnboardingConfig, RoleConfig, RoleCrawlResult,
  PageDiscovery, StateGraph, StateEdge, PageNode,
  AiBudgetTracker, AppModel, RoleDefinition, PageDefinition, FlowStep
} from './types'
import { FlowDetector }        from './FlowDetector'
import { validateAppModel }    from './ModelValidator'
import { AppModelRepository }  from '../storage/repositories/AppModelRepository'
import { ApiSpecCrawler }      from './ApiSpecCrawler'
import { AuthManager }         from './AuthManager'
import { StrategyDetector }    from './StrategyDetector'
import { BFSStrategy }         from './BFSStrategy'
import { SPAStrategy }         from './SPAStrategy'
import { HybridStrategy }      from './HybridStrategy'
import { SelfCorrectionEngine } from './SelfCorrectionEngine'
import { normalizeUrl, isDenied, isSameOrigin } from './PageVisitor'

export class Crawler {

  private budget: AiBudgetTracker
  private pagesSkipped = 0

  constructor(private config: OnboardingConfig) {
    const limit = config.budgets?.aiCalls ?? 50
    const tracker = { remaining: limit }
    this.budget = {
      get remaining() { return tracker.remaining },
      consume(n: number) {
        if (tracker.remaining <= 0) return false
        tracker.remaining -= n
        return true
      },
      isExhausted() { return tracker.remaining <= 0 },
    }
  }

  async crawl(): Promise<AppModel> {
    // ── Strategy branch — delegate non-UI types before any browser launch ──────
    if (this.config.appType === 'rest-api' || this.config.appType === 'graphql-api') {
      const apiCrawler = new ApiSpecCrawler(this.config)
      return await apiCrawler.crawl()
    }

    const stubTypes = ['mobile-android', 'mobile-ios', 'iot', 'cloud', 'data']
    if (this.config.appType && stubTypes.includes(this.config.appType)) {
      console.log(`[Crawler] App type '${this.config.appType}' not yet supported — writing stub model`)
      const stub = this.buildStubModel()
      await this.saveModel(stub)
      return stub
    }

    // ── UI crawl — strategy-based ──────────────────────────────────────────────
    const startTime = Date.now()
    const crawlConfig = {
      baseUrl:  this.config.app.baseUrl,
      maxPages: this.config.budgets?.maxPages ?? 50,
      maxDepth: this.config.budgets?.maxDepth ?? 5,
    }
    console.log(
      `[FORGE Crawler] Starting crawl of ${this.config.app.baseUrl} | ` +
      `Budget: pages=${crawlConfig.maxPages} depth=${crawlConfig.maxDepth} ` +
      `ai=${this.config.budgets?.aiCalls ?? 50}`
    )

    const browser    = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    })
    const roleCrawls: RoleCrawlResult[] = []

    try {
      for (const role of this.config.roles) {
        console.log(`[FORGE Crawler] Role: ${role.id} — authenticating...`)

        // 1. Authenticate — get context + real post-auth startUrl
        const authResult = await new AuthManager(this.config).authenticate(role, browser)
        const { context, startUrl, authenticated } = authResult

        if (!authenticated && role.authFlow !== 'none') {
          console.warn(`[FORGE Crawler] Auth failed for ${role.id} — skipping role`)
          await context.close()
          continue
        }

        // 2. Detect crawl strategy from the start page
        const detectorPage = await context.newPage()
        let crawlMode = 'bfs'
        try {
          await detectorPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
          const configCrawlMode = (this.config as any).crawlMode
          crawlMode = await new StrategyDetector().detect(detectorPage, configCrawlMode)
        } catch {
          crawlMode = 'bfs'
        } finally {
          await detectorPage.close()
        }

        console.log(
          `[FORGE Crawler] Role: ${role.id} | Mode: ${crawlMode} | Start: ${startUrl}`
        )

        // 3. Run appropriate strategy
        const visited = new Set<string>()
        let pages: PageDiscovery[] = []

        if (crawlMode === 'bfs') {
          pages = await new BFSStrategy(crawlConfig, this.budget)
            .crawl(context, startUrl, visited, crawlConfig.maxPages)
        } else if (crawlMode === 'spa') {
          pages = await new SPAStrategy(crawlConfig, this.budget)
            .crawl(context, startUrl, visited, crawlConfig.maxPages)
        } else {
          pages = await new HybridStrategy(crawlConfig, this.budget)
            .crawl(context, startUrl, visited, crawlConfig.maxPages)
        }

        pages = await new SelfCorrectionEngine().evaluate(
          pages, context, startUrl, crawlConfig, this.budget, crawlMode as any, visited
        )

        // Build state edges from visited URLs for FlowDetector
        const stateEdges = this.buildRoleStateEdges(pages, visited, crawlMode, role.id)

        roleCrawls.push({
          roleId:       role.id,
          pages,
          stateEdges,
          pagesSkipped: 0,
        })

        console.log(
          `[FORGE Crawler] Role: ${role.id} | Complete | ${pages.length} pages`
        )

        await context.close()
      }
    } finally {
      await browser.close()
    }

    const { pages, roles } = this.mergeRoleCrawls(roleCrawls)
    this.applyPagePrerequisites(pages)
    const stateGraph       = this.buildStateGraph(roleCrawls)

    const detector = new FlowDetector(
      stateGraph, pages, roles, this.config, this.budget
    )
    const flows = await detector.detectFlows()

    const model = this.buildModel(pages, roles, flows, startTime)

    console.log(`════════════════════════════════════════════════════════`)
    console.log(
      model.app.aiBudgetStatus === 'degraded'
        ? `[FORGE Crawler] BUDGET STATUS: DEGRADED — AI budget exhausted before ` +
          `crawl finished at maxDepth=${crawlConfig.maxDepth}. Some element/flow ` +
          `names may have used fallback naming instead of AI naming.`
        : `[FORGE Crawler] BUDGET STATUS: WITHIN BUDGET — crawl completed at ` +
          `maxDepth=${crawlConfig.maxDepth} without exhausting the AI budget.`
    )
    console.log(`════════════════════════════════════════════════════════`)

    await this.saveModel(model)
    return model
  }

  // TD-027 (BFS half) -- bfs-mode builds edges from each page's actual
  // recorded outboundUrls (PageVisitor.extractLinks(), a real <a href>
  // relationship) instead of visit-order proximity: A connects to B only if
  // B's URL is actually in A's outboundUrls and B was itself visited. spa/
  // hybrid are deliberately left on visit-order pairs, unchanged -- SPA's
  // click-based discovery sweep doesn't attach a triggering element or
  // relationship to what it finds yet (TD-026/027, SPA half), pending the
  // separate discovery-restructuring design work. trigger stays the literal
  // 'navigation' string in both branches -- TD-026 (trigger identity) is
  // untouched here.
  //
  // Relies on pages[i] corresponding to the i-th URL added to `visited`,
  // which holds for a pure bfs run (BFSStrategy.crawl() adds to `visited`
  // immediately before pushing that page's discovery, every iteration, with
  // no gaps). Doesn't hold as reliably if SelfCorrectionEngine escalates a
  // bfs run to hybrid mid-role (HybridStrategy.crawl() dedupes its combined
  // pages by its own re-derived URL key, which can desync from `visited`'s
  // insertion order) -- out of scope for this BFS-only fix; flagged rather
  // than handled.
  private buildRoleStateEdges(
    pages:     PageDiscovery[],
    visited:   Set<string>,
    crawlMode: string,
    roleId:    string,
  ): StateEdge[] {
    const stateEdges: StateEdge[] = []
    const visitedArr = Array.from(visited)

    if (crawlMode !== 'bfs') {
      for (let i = 0; i < visitedArr.length - 1; i++) {
        stateEdges.push({
          fromUrl: visitedArr[i],
          toUrl:   visitedArr[i + 1],
          trigger: 'navigation',
          roleId,
        })
      }
      return stateEdges
    }

    const outboundByUrl = new Map<string, string[]>(
      visitedArr.map((url, i) => [url, pages[i]?.outboundUrls ?? []])
    )
    for (const fromUrl of visitedArr) {
      const targets = new Set<string>()
      for (const rawToUrl of outboundByUrl.get(fromUrl) ?? []) {
        const toUrl = normalizeUrl(rawToUrl)
        if (toUrl !== fromUrl && visited.has(toUrl)) targets.add(toUrl)
      }
      for (const toUrl of targets) {
        stateEdges.push({ fromUrl, toUrl, trigger: 'navigation', roleId })
      }
    }
    return stateEdges
  }

  private mergeRoleCrawls(roleCrawls: RoleCrawlResult[]): {
    pages: PageDefinition[]
    roles: RoleDefinition[]
  } {
    const pageMap = new Map<string, PageDefinition>()

    for (const crawl of roleCrawls) {
      for (const discovery of crawl.pages) {
        if (!pageMap.has(discovery.pageId)) {
          pageMap.set(discovery.pageId, {
            id:               discovery.pageId,
            displayName:      this.toDisplayName(discovery.pageId),
            urlPattern:       discovery.urlPattern,
            urlPatternType:   'exact',
            fingerprint:      discovery.domHash,
            fingerprintBasis: 'url-only',
            appType:          this.config.app.appType,
            accessibleByRoles: [crawl.roleId],
            isAuthPage:       discovery.isAuthPage,
            elements:         discovery.elements,
          })
        } else {
          const existing = pageMap.get(discovery.pageId)!
          if (!existing.accessibleByRoles.includes(crawl.roleId)) {
            existing.accessibleByRoles.push(crawl.roleId)
          }
        }
      }
    }

    const roles: RoleDefinition[] = this.config.roles.map(r => {
      const reachable  = roleCrawls
        .find(c => c.roleId === r.id)
        ?.pages.map(p => p.pageId) || []
      const allPageIds = Array.from(pageMap.keys())
      const restricted = allPageIds.filter(id => !reachable.includes(id))

      return {
        id:                r.id,
        displayName:       r.displayName,
        authFlow:          r.authFlow,
        credentialsEnvKey: r.credentialsEnvKey || null,
        storageStatePath:  r.authFlow !== 'none'
          ? `.auth/${r.id}.json`
          : null,
        reachablePageIds:  reachable,
        restrictedPageIds: restricted,
      }
    })

    return { pages: Array.from(pageMap.values()), roles }
  }

  // Compiles config-declared pagePrerequisites (TD-013) onto their matching
  // PageDefinition — same pattern FlowDetector.mergeConfigSeeded() already
  // uses to turn app-specific config hints into real, executable FlowSteps.
  // Keeps VerificationRunner app-agnostic: it only ever executes steps it's
  // handed, it never knows "cart" or "add-to-cart" are SauceDemo concepts.
  private applyPagePrerequisites(pages: PageDefinition[]): void {
    for (const hint of this.config.pagePrerequisites ?? []) {
      const page = pages.find(p => p.id === hint.pageId)
      if (!page) {
        console.warn(
          `[Crawler] pagePrerequisites references unknown pageId "${hint.pageId}" — skipping`
        )
        continue
      }
      const steps: FlowStep[] = hint.steps.map((s, i) => ({
        stepIndex:    i + 1,
        pageId:       s.pageId ?? hint.pageId,
        action:       s.action,
        elementId:    s.elementId ?? null,
        targetPageId: null,
        value:        s.value ?? null,
      }))
      page.prerequisites = [...(page.prerequisites ?? []), { roleId: hint.roleId, steps }]
    }
  }

  private buildStateGraph(roleCrawls: RoleCrawlResult[]): StateGraph {
    const nodes = new Map<string, PageNode>()
    const edges: StateEdge[] = []

    for (const crawl of roleCrawls) {
      for (const page of crawl.pages) {
        const existing = nodes.get(page.pageId)
        if (existing) {
          existing.visitCount++
          if (!existing.roleIds.includes(crawl.roleId)) {
            existing.roleIds.push(crawl.roleId)
          }
        } else {
          nodes.set(page.pageId, {
            urlPattern: page.urlPattern,
            visitCount: 1,
            roleIds:    [crawl.roleId],
            domHash:    page.domHash,
          })
        }
      }
      edges.push(...crawl.stateEdges)
    }

    return { nodes, edges }
  }

  private buildModel(
    pages:     PageDefinition[],
    roles:     RoleDefinition[],
    flows:     any[],
    startTime: number
  ): AppModel {
    const existing = this.loadExistingModel()
    const version  = existing
      ? this.bumpModelVersion(existing.app.modelVersion)
      : '1.0.0'

    return {
      schemaVersion: '1.0',
      generatedAt:   new Date().toISOString(),
      generatedBy:   'human',
      app: {
        name:             this.config.app.name,
        displayName:      this.toDisplayName(this.config.app.name),
        baseUrl:          this.config.app.baseUrl,
        appType:          this.config.app.appType,
        crawlConfigHash:  this.hashConfig(),
        crawledAt:        new Date().toISOString(),
        crawledBy:        'human',
        crawlDurationMs:  Date.now() - startTime,
        pagesBudget:      this.config.budgets?.maxPages ?? 50,
        pagesDiscovered:  pages.length,
        pagesSkipped:     this.pagesSkipped,
        modelVersion:     version,
        spaConfig:        null,
        aiBudgetStatus:   this.budget.isExhausted() ? 'degraded' : 'within-budget',
      },
      roles,
      pages,
      flows,
      endpoints: null,
      api:  null,
      diff: existing
        ? {
            previousModelVersion:  existing.app.modelVersion,
            diffGeneratedAt:       new Date().toISOString(),
            pagesAdded:    pages
              .filter(p => !(existing.pages ?? []).find((ep: any) => ep.id === p.id))
              .map(p => p.id),
            pagesRemoved:  (existing.pages ?? [])
              .filter((ep: any) => !pages.find(p => p.id === ep.id))
              .map((ep: any) => ep.id),
            pagesModified:          [],
            elementsAdded:          [],
            elementsRemoved:        [],
            strategiesInvalidated:  [],
            flowsAdded:             [],
            flowsRemoved:           [],
          }
        : null,
    }
  }

  private buildStubModel(): AppModel {
    const appType = this.config.appType || this.config.app.appType
    return {
      schemaVersion: '1.0',
      generatedAt:   new Date().toISOString(),
      generatedBy:   'agent',
      app: {
        name:             this.config.app.name,
        displayName:      this.config.app.name,
        baseUrl:          this.config.app.baseUrl,
        appType,
        crawlConfigHash:  this.hashConfig(),
        crawledAt:        new Date().toISOString(),
        crawledBy:        'agent',
        crawlDurationMs:  0,
        pagesBudget:      0,
        pagesDiscovered:  0,
        pagesSkipped:     0,
        modelVersion:     '1.0.0',
        spaConfig:        null,
        aiBudgetStatus:   'within-budget',
      },
      roles:     [],
      pages:     null,
      flows:     null,
      endpoints: null,
      api:       null,
      diff:      null,
    }
  }

  private async saveModel(model: AppModel): Promise<void> {
    const dir       = path.resolve(`models/${model.app.name}`)
    const modelPath = path.join(dir, 'app-model.json')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(modelPath, JSON.stringify(model, null, 2))
    console.log(`[Crawler] Model written to ${modelPath}`)

    const { valid, errors } = validateAppModel(modelPath)
    if (!valid) {
      console.error('[Crawler] Model validation failed:')
      errors.forEach(e => console.error(' ', e))
    } else {
      console.log('[Crawler] Model validated successfully')
    }

    try {
      const repo = new AppModelRepository()
      await repo.upsert({
        app_name:          model.app.name,
        version:           model.app.modelVersion,
        base_url:          model.app.baseUrl,
        app_type:          model.app.appType,
        intake_mode:       'crawl',
        crawl_config_hash: model.app.crawlConfigHash,
        page_count:        model.pages?.length ?? 0,
        flow_count:        model.flows?.length ?? 0,
        role_count:        model.roles.length,
        model_json:        JSON.stringify(model),
        crawled_at:        model.app.crawledAt,
        crawled_by:        model.app.crawledBy,
        status:            'active',
      })
      console.log('[Crawler] Model persisted to DB')
    } catch (e) {
      console.warn('[Crawler] DB persist failed (non-fatal):', e)
    }
  }

  private loadExistingModel(): AppModel | null {
    const modelPath = path.resolve(
      `models/${this.config.app.name}/app-model.json`
    )
    if (!fs.existsSync(modelPath)) return null
    try {
      return JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
    } catch {
      return null
    }
  }

  private resolveCredentials(
    role: RoleConfig
  ): { username: string; password: string } | null {
    if (!role.credentialsEnvKey) return null
    const raw = process.env[role.credentialsEnvKey]
    if (!raw) return null
    const [username, password] = raw.split(':')
    return username && password ? { username, password } : null
  }

  private urlToPageId(url: string): string {
    try {
      const pathname = new URL(url, this.config.app.baseUrl).pathname
      return pathname
        .replace(/^\//, '')
        .replace(/\.html$/, '')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+$/, '')
        || 'home'
    } catch {
      return 'unknown'
    }
  }

  private toDisplayName(id: string): string {
    return id
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  private bumpModelVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2]    = (parts[2] || 0) + 1
    return parts.join('.')
  }

  private hashConfig(): string {
    const str = JSON.stringify(this.config)
    return 'sha256:' + crypto
      .createHash('sha256')
      .update(str)
      .digest('hex')
      .slice(0, 16)
  }
}
