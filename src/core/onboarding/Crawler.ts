import { chromium, Browser, BrowserContext, Page } from '@playwright/test'
import * as fs    from 'fs'
import * as path  from 'path'
import * as crypto from 'crypto'
import {
  OnboardingConfig, RoleConfig, RoleCrawlResult,
  PageDiscovery, StateGraph, StateEdge, PageNode,
  AiBudgetTracker, AppModel, RoleDefinition, PageDefinition
} from './types'
import { ElementClassifier }   from './ElementClassifier'
import { FlowDetector }        from './FlowDetector'
import { validateAppModel }    from './ModelValidator'
import { getAppName }          from '../config/appConfig'
import { AppModelRepository }  from '../storage/repositories/AppModelRepository'
import { ApiSpecCrawler }        from './ApiSpecCrawler'

const DENY_PATTERNS = [
  /logout/i, /sign.?out/i, /signout/i,
  /delete/i, /remove/i,
  /confirm.*order/i, /place.*order/i, /submit.*payment/i,
]

export class Crawler {

  private budget: AiBudgetTracker
  private pagesSkipped = 0

  constructor(private config: OnboardingConfig) {
    const limit = config.budgets?.aiCalls ?? 50
    let remaining = limit
    this.budget = {
      remaining,
      consume(n: number) {
        if (remaining <= 0) return false
        remaining -= n
        return true
      },
      isExhausted() { return remaining <= 0 },
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
    // ── Fall through: existing UI BFS flow (zero changes below) ──────────────

    const startTime = Date.now()
    console.log(`[Crawler] Starting crawl of ${this.config.app.baseUrl}`)
    console.log(`[Crawler] Budget — pages: ${this.config.budgets?.maxPages ?? 50}, ` +
                `depth: ${this.config.budgets?.maxDepth ?? 5}, ` +
                `AI calls: ${this.config.budgets?.aiCalls ?? 50}`)

    const browser     = await chromium.launch({
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
        console.log(`[Crawler] Crawling as role: ${role.id}`)
        const context = await this.authenticateRole(role, browser)
        const result  = await this.crawlRole(role, context)
        roleCrawls.push(result)
        await context.close()
      }
    } finally {
      await browser.close()
    }

    const { pages, roles } = this.mergeRoleCrawls(roleCrawls)
    const stateGraph       = this.buildStateGraph(roleCrawls)

    const detector = new FlowDetector(
      stateGraph, pages, roles, this.config, this.budget
    )
    const flows = await detector.detectFlows()

    const model = this.buildModel(pages, roles, flows, startTime)

    await this.saveModel(model)
    return model
  }

  private async authenticateRole(
    role:    RoleConfig,
    browser: Browser
  ): Promise<BrowserContext> {
    const context = await browser.newContext()
    if (role.authFlow === 'none') {
      return context
    }
    if (role.authFlow === 'oauth' || role.authFlow === 'api-key') {
      await context.close()
      throw new Error(
        `Auth flow "${role.authFlow}" is not implemented yet. ` +
        `Use "form-login" or "none" for Phase 5.`
      )
    }
    // form-login
    const credentials = this.resolveCredentials(role)
    if (!credentials) {
      console.warn(`[Crawler] No credentials for role ${role.id} — skipping auth`)
      return context
    }
    const page = await context.newPage()
    try {
      // Use role.loginUrl if defined, fall back to baseUrl
      const loginUrl = (role as any).loginUrl ?? this.config.app.baseUrl
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
      // Extra wait for SPA hydration
      await page.waitForTimeout(2000)
      // Use role.selectors if defined, fall back to generic selectors
      const roleSelectors    = (role as any).selectors ?? {}
      const usernameSelector = roleSelectors.username ??
        'input[type=text], input[name*=user], input[data-test*=user], input[placeholder*=user i], input[id*=user]'
      const passwordSelector = roleSelectors.password ??
        'input[type=password]'
      const submitSelector   = roleSelectors.submit ??
        'button[type=submit], input[type=submit], button:has-text("Login"), button:has-text("Sign in")'
      const usernameEl = page.locator(usernameSelector).first()
      await usernameEl.waitFor({ state: 'visible', timeout: 15000 })
      await usernameEl.fill(credentials.username)
      const passwordEl = page.locator(passwordSelector).first()
      await passwordEl.waitFor({ state: 'visible', timeout: 10000 })
      await passwordEl.fill(credentials.password)
      const submitEl = page.locator(submitSelector).first()
      await submitEl.waitFor({ state: 'visible', timeout: 10000 })
      const urlBefore  = page.url()
      const successUrl = role.successUrl ?? null
      await submitEl.click()
      // Wait for SPA route change first, fall back to networkidle
      try {
        if (successUrl) {
          await page.waitForURL(`**${successUrl}**`, { timeout: 20000 })
        } else {
          await page.waitForURL(url => url.href !== urlBefore, { timeout: 15000 })
        }
      } catch {
        await page.waitForLoadState('domcontentloaded')
      }
      const urlAfter         = page.url()
      const urlChanged       = urlBefore !== urlAfter
      const successUrlHit    = successUrl ? urlAfter.includes(successUrl) : false
      const hasPostLoginElement = await page.locator(
        '[data-test="dashboard"], .dashboard, main, #main-content, ' +
        'nav, .sidebar, [class*="menu"], [class*="nav"]'
      ).count() > 0
      if (!urlChanged && !successUrlHit && !hasPostLoginElement) {
        console.warn(`[Crawler] Auth may have failed for role ${role.id} — landed on: ${urlAfter}`)
      } else {
        console.log(`[Crawler] Authenticated as ${role.id} — URL: ${urlAfter}`)
        const statePath = path.resolve(`.auth/${role.id}.json`)
        fs.mkdirSync(path.dirname(statePath), { recursive: true })
        await context.storageState({ path: statePath })
      }
    } catch (e) {
      console.warn(`[Crawler] Auth failed for role ${role.id}:`, e)
    } finally {
      await page.close()
    }
    return context
  }

  private async crawlRole(
    role:    RoleConfig,
    context: BrowserContext
  ): Promise<RoleCrawlResult> {
    const maxPages = this.config.budgets?.maxPages ?? 50
    const maxDepth = this.config.budgets?.maxDepth ?? 5
    const visited  = new Set<string>()
    const queue:   { url: string; depth: number }[] = [
      { url: this.config.app.baseUrl, depth: 0 }
    ]
    const pages:   PageDiscovery[] = []
    const edges:   StateEdge[]     = []

    while (queue.length > 0 && visited.size < maxPages) {
      const { url, depth } = queue.shift()!
      const normalized     = this.normalizeUrl(url)

      if (visited.has(normalized)) continue
      if (this.isInDenyList(normalized)) { this.pagesSkipped++; continue }
      if (!this.isSameOrigin(normalized)) continue
      if (depth > maxDepth) { this.pagesSkipped++; continue }

      visited.add(normalized)
      console.log(`[Crawler] [${role.id}] Visiting: ${normalized} (depth ${depth})`)

      const page = await context.newPage()
      try {
        await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 30000 })

        const discovery = await this.visitPage(page, normalized, role.id)
        pages.push(discovery)

        for (const outUrl of discovery.outboundUrls) {
          const norm = this.normalizeUrl(outUrl)
          if (!visited.has(norm) && !this.isInDenyList(norm)) {
            queue.push({ url: norm, depth: depth + 1 })
            edges.push({
              fromUrl: normalized,
              toUrl:   norm,
              trigger: 'navigation',
              roleId:  role.id,
            })
          }
        }
      } catch (e) {
        console.warn(`[Crawler] Failed to visit ${normalized}:`, e)
        this.pagesSkipped++
      } finally {
        await page.close()
      }
    }

    // SPA nav discovery — finds click-routed pages the BFS missed
    if (this.config.appType === 'web-ui') {
      const authStatePath = path.resolve(`.auth/${role.id}.json`)
      if (fs.existsSync(authStatePath)) {
        const spaPage = await context.newPage()
        try {
          const configRole = (this.config.roles ?? []).find((r: any) => r.id === role.id)
          const successUrl = (configRole as any)?.successUrl
          const startUrl   = successUrl
            ? (successUrl.startsWith('http') ? successUrl : this.config.app.baseUrl.replace(/\/$/, '') + successUrl)
            : this.config.app.baseUrl
          await spaPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
          // Wait for SPA (Vue/React) to fully hydrate nav elements
          await spaPage.waitForTimeout(3000)
          const spaLinks = await this.extractSpaNavLinks(spaPage, visited, this.config.app.baseUrl)
          console.log(`[Crawler] SPA nav discovered ${spaLinks.length} additional URLs for role ${role.id}`)
          for (const link of spaLinks) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: 1 })
            }
          }
          while (queue.length > 0 && pages.length < maxPages) {
            const { url: nextUrl, depth: nextDepth } = queue.shift()!
            if (visited.has(nextUrl) || nextDepth > (this.config.budgets?.maxDepth ?? 5)) continue
            visited.add(nextUrl)
            const nextPage = await context.newPage()
            try {
              await nextPage.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
              const discovery = await this.visitPage(nextPage, nextUrl, role.id)
              pages.push(discovery)
            } catch (e) {
              console.warn(`[Crawler] SPA page visit failed ${nextUrl}:`, e)
            } finally {
              await nextPage.close()
            }
          }
        } finally {
          await spaPage.close()
        }
      }
    }

    console.log(`[Crawler] [${role.id}] Crawl complete — ` +
                `${pages.length} pages, ${this.pagesSkipped} skipped`)

    return { roleId: role.id, pages, stateEdges: edges, pagesSkipped: this.pagesSkipped }
  }

  private async extractSpaNavLinks(
    page:    Page,
    visited: Set<string>,
    baseUrl: string
  ): Promise<string[]> {
    const discovered: string[] = []
    try {
      const navSelectors = [
        'nav a[href]',
        '.oxd-main-menu-item',
        '[class*="nav-item"]',
        '[class*="sidebar"] a',
        '[class*="menu-item"]',
        '[role="menuitem"]',
        '[role="navigation"] a',
      ]
      for (const selector of navSelectors) {
        const elements = await page.locator(selector).all()
        for (const el of elements) {
          try {
            const href = await el.getAttribute('href').catch(() => null)
            if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
              const absolute = href.startsWith('http')
                ? href
                : new URL(href, baseUrl).toString()
              if (!visited.has(absolute) && absolute.startsWith(baseUrl)) {
                discovered.push(absolute)
              }
              continue
            }
            // No href — click and capture URL change (SPA routing)
            const urlBefore = page.url()
            await el.click({ timeout: 3000 }).catch(() => null)
            // SPA routing updates URL without firing load events — just wait briefly
            await page.waitForTimeout(1500)
            const urlAfter = page.url()
            if (urlAfter !== urlBefore && urlAfter.startsWith(baseUrl) && !visited.has(urlAfter)) {
              discovered.push(urlAfter)
              await page.goto(urlBefore, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
              await page.waitForTimeout(1500)
            }
          } catch { /* skip unclickable elements */ }
        }
      }
    } catch (e) {
      console.warn('[Crawler] SPA nav extraction error:', e)
    }
    return [...new Set(discovered)]
  }

  private async visitPage(
    page:   Page,
    url:    string,
    roleId: string
  ): Promise<PageDiscovery> {
    const pageId     = this.urlToPageId(url)
    const domHash    = await ElementClassifier.computeDomHash(page)
    const classifier = new ElementClassifier(page, pageId, this.budget)
    const elements   = await classifier.classifyPage()
    const isAuthPage = url === this.normalizeUrl(this.config.app.baseUrl) ||
                       /login|signin|auth/i.test(url)

    const outboundUrls = await page.evaluate((base: string) => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => href && href.startsWith(base))
        .slice(0, 20)
    }, this.config.app.baseUrl)

    const urlObj    = new URL(url)
    const urlPath   = urlObj.pathname

    return {
      pageId,
      urlPattern:  urlPath || '/',
      elements,
      outboundUrls,
      domHash,
      isAuthPage,
    }
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

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url, this.config.app.baseUrl)
      u.hash  = ''
      return u.href.replace(/\/$/, '') || '/'
    } catch {
      return url
    }
  }

  private isInDenyList(url: string): boolean {
    const custom = this.config.denyList || []
    const all    = [
      ...DENY_PATTERNS,
      ...custom.map(p => new RegExp(p, 'i')),
    ]
    return all.some(pattern => pattern.test(url))
  }

  private isSameOrigin(url: string): boolean {
    try {
      const base   = new URL(this.config.app.baseUrl)
      const target = new URL(url)
      return base.origin === target.origin
    } catch {
      return false
    }
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
