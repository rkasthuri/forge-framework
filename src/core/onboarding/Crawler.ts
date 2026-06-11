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
    const startTime = Date.now()
    console.log(`[Crawler] Starting crawl of ${this.config.app.baseUrl}`)
    console.log(`[Crawler] Budget — pages: ${this.config.budgets?.maxPages ?? 50}, ` +
                `depth: ${this.config.budgets?.maxDepth ?? 5}, ` +
                `AI calls: ${this.config.budgets?.aiCalls ?? 50}`)

    const browser     = await chromium.launch({ headless: true })
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
      await page.goto(this.config.app.baseUrl, { waitUntil: 'networkidle' })

      const usernameEl = page.locator(
        'input[type=text], input[name*=user], input[data-test*=user], ' +
        'input[placeholder*=user i], input[id*=user]'
      ).first()
      await usernameEl.fill(credentials.username)

      const passwordEl = page.locator('input[type=password]').first()
      await passwordEl.fill(credentials.password)

      const submitEl = page.locator(
        'button[type=submit], input[type=submit], ' +
        'button:has-text("Login"), button:has-text("Sign in")'
      ).first()

      const urlBefore = page.url()
      await submitEl.click()
      await page.waitForLoadState('networkidle')
      const urlAfter = page.url()

      const urlChanged         = urlBefore !== urlAfter
      const hasPostLoginElement = await page.locator(
        '[data-test="inventory-container"], ' +
        '.inventory_container, ' +
        '[data-test="dashboard"], ' +
        '.dashboard, main, #main-content'
      ).count() > 0

      if (!urlChanged && !hasPostLoginElement) {
        console.warn(`[Crawler] Auth may have failed for role ${role.id}`)
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
        await page.goto(normalized, { waitUntil: 'networkidle', timeout: 30000 })

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

    console.log(`[Crawler] [${role.id}] Crawl complete — ` +
                `${pages.length} pages, ${this.pagesSkipped} skipped`)

    return { roleId: role.id, pages, stateEdges: edges, pagesSkipped: this.pagesSkipped }
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
