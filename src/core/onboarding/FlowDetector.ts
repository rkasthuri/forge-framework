import {
  StateGraph, FlowDefinition, FlowStep, FlowCandidate,
  PageDefinition, RoleDefinition, OnboardingConfig,
  AiBudgetTracker, EndpointDefinition
} from './types'
import { aiCall }     from '../ai/AiClient'
import { getAppName } from '../config/appConfig'

export class FlowDetector {

  constructor(
    private stateGraph:    StateGraph,
    private pages:         PageDefinition[],
    private roles:         RoleDefinition[],
    private config:        OnboardingConfig,
    private budget:        AiBudgetTracker,
    private apiEndpoints?: EndpointDefinition[]
  ) {}

  async detectFlows(): Promise<FlowDefinition[]> {
    // ── API branch — detect flows from endpoint definitions ─────────────────
    if (this.config.appType === 'rest-api' || this.config.appType === 'graphql-api') {
      const endpoints = this.apiEndpoints || this.config.apiEndpoints || []
      return this.detectApiFlows(endpoints)
    }
    // ── UI branch — existing graph-based flow detection ───────────────────────
    const configFlows = this.mergeConfigSeeded()
    // If config-seeded flows exist for this app type, skip inferred flows —
    // they are low quality for SPAs and add noise over explicit config hints
    const hasConfigFlows = configFlows.length > 0
    const isSpa = this.config.appType === 'web-ui' &&
      this.pages.length > 3  // more than a few pages = likely SPA
    let inferred: FlowDefinition[] = []
    let enriched: FlowDefinition[] = []
    if (!hasConfigFlows || !isSpa) {
      const candidates = this.identifyCandidates()
      inferred = candidates.map(c => this.candidateToFlow(c))
      enriched = await this.enrichWithAi(candidates)
    }
    const all = [...configFlows, ...inferred, ...enriched]
    return this.deduplicateFlows(all)
  }

  private detectApiFlows(endpoints: EndpointDefinition[]): FlowDefinition[] {
    const flows: FlowDefinition[] = []

    // Auth flow — endpoints containing /auth or token/auth in summary
    const authEps = endpoints.filter(
      e => /\/auth/i.test(e.path) || /token|auth/i.test(e.summary)
    )
    if (authEps.length > 0) {
      flows.push({
        id:                   'api-flow-auth',
        displayName:          'Authentication',
        confidence:           0.99,
        source:               'inferred',
        roleId:               'api',
        steps:                authEps.map((e, i) => ({
          stepIndex:    i + 1,
          pageId:       `${e.method} ${e.path}`,
          action:       'api-call',
          elementId:    null,
          targetPageId: null,
          value:        `${e.method} ${e.path}`,
        })),
        linkedApiEndpointIds: [],
      })
    }

    // CRUD flows — group endpoints by base path (strip /{id})
    const basePathMap = new Map<string, EndpointDefinition[]>()
    for (const ep of endpoints) {
      if (/\/auth/i.test(ep.path) || ep.path === '/ping') continue
      const base = ep.path
        .replace(/\/\{[^}]+\}$/, '')   // strip trailing /{id}
        .replace(/\/\{[^}]+\}/g, '')   // strip other path params
        || '/'
      const bucket = basePathMap.get(base) || []
      bucket.push(ep)
      basePathMap.set(base, bucket)
    }

    for (const [base, eps] of basePathMap) {
      const methods = new Set(eps.map(e => e.method))
      if (methods.size < 2) continue
      const resourceName = base.replace(/^\//, '') || 'resource'
      const capitalized  = resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
      const methodOrder  = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      const sorted = [...eps].sort(
        (a, b) => methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method)
      )
      flows.push({
        id:                   `api-flow-crud-${resourceName}`,
        displayName:          `${capitalized} CRUD`,
        confidence:           0.9,
        source:               'inferred',
        roleId:               'api',
        steps:                sorted.map((e, i) => ({
          stepIndex:    i + 1,
          pageId:       `${e.method} ${e.path}`,
          action:       'api-call',
          elementId:    null,
          targetPageId: null,
          value:        `${e.method} ${e.path}`,
        })),
        linkedApiEndpointIds: [],
      })
    }

    // Health flow — /ping or HealthCheck summary
    const healthEps = endpoints.filter(
      e => e.path === '/ping' || /health/i.test(e.summary)
    )
    if (healthEps.length > 0) {
      flows.push({
        id:                   'api-flow-health',
        displayName:          'Health Check',
        confidence:           0.99,
        source:               'inferred',
        roleId:               'api',
        steps:                healthEps.map((e, i) => ({
          stepIndex:    i + 1,
          pageId:       `${e.method} ${e.path}`,
          action:       'api-call',
          elementId:    null,
          targetPageId: null,
          value:        `${e.method} ${e.path}`,
        })),
        linkedApiEndpointIds: [],
      })
    }

    return flows
  }

  private identifyCandidates(): FlowCandidate[] {
    const candidates: FlowCandidate[] = []
    const authPage = this.pages.find(p => p.isAuthPage)

    // Auth flow — login page -> first authenticated page
    if (authPage) {
      for (const role of this.roles) {
        if (role.authFlow === 'none') continue
        const loginElements = authPage.elements.filter(
          e => e.kind === 'input' || e.kind === 'button'
        )
        const steps: FlowStep[] = loginElements.map((el, i) => ({
          stepIndex:    i + 1,
          pageId:       authPage.id,
          action:       el.kind === 'input' ? 'fill' : 'click',
          elementId:    el.id,
          targetPageId: null,
          value:        el.kind === 'input'
            ? (() => {
                const key = (role.credentialsEnvKey || 'CREDENTIALS').replace(/_CREDENTIALS$/, '')
                const id  = (el.id ?? '').toLowerCase()
                if (id.includes('pass')) return `{{${key}_PASSWORD}}`
                return `{{${key}_USERNAME}}`
              })()
            : null,
        }))
        steps.sort((a, b) => {
          const order = (s: any) => {
            const id = (s.elementId ?? '').toLowerCase()
            if (id.includes('user') || id.includes('email') || id.includes('name')) return 0
            if (id.includes('pass')) return 1
            return 2
          }
          return order(a) - order(b)
        })
        steps.forEach((s, i) => { s.stepIndex = i + 1 })

        const firstPage = role.reachablePageIds[0]
        if (firstPage) {
          steps.push({
            stepIndex:    steps.length + 1,
            pageId:       firstPage,
            action:       'assert-navigation',
            elementId:    null,
            targetPageId: firstPage,
            value:        this.pages.find(p => p.id === firstPage)
              ?.urlPattern || null,
          })
        }

        candidates.push({ steps, confidence: 0.92, roleId: role.id })
      }
    }

    // Navigation flows — edges in state graph
    const edgesByRole = new Map<string, typeof this.stateGraph.edges>()
    for (const edge of this.stateGraph.edges) {
      const key    = edge.roleId
      const bucket = edgesByRole.get(key) || []
      bucket.push(edge)
      edgesByRole.set(key, bucket)
    }

    for (const [roleId, edges] of edgesByRole) {
      if (edges.length < 2) continue
      const steps: FlowStep[] = edges.slice(0, 6).map((edge, i) => ({
        stepIndex:    i + 1,
        pageId:       this.urlToPageId(edge.fromUrl),
        action:       'click',
        elementId:    edge.trigger || null,
        targetPageId: this.urlToPageId(edge.toUrl),
        value:        null,
      }))
      candidates.push({ steps, confidence: 0.70, roleId })
    }

    return candidates
  }

  private mergeConfigSeeded(): FlowDefinition[] {
    if (!this.config.flows) return []
    return this.config.flows.map(hint => {
      const role      = this.roles.find(r => r.id === hint.roleId)
      const authPage  = this.pages.find(p => p.isAuthPage)
      const steps: FlowStep[] = []
      // Build login steps from auth page elements if role requires auth
      if (role && role.authFlow !== 'none' && authPage) {
        const usernameEl = authPage.elements.find(
          e => e.name.toLowerCase().includes('username') ||
               e.name.toLowerCase().includes('user')
        )
        const passwordEl = authPage.elements.find(
          e => e.name.toLowerCase().includes('password') ||
               e.name.toLowerCase().includes('pass')
        )
        const submitEl = authPage.elements.find(
          e => e.kind === 'button' && e.critical
        )
        const credKeyBase = (role.credentialsEnvKey || 'CREDENTIALS').replace(/_CREDENTIALS$/, '')
        if (usernameEl) steps.push({
          stepIndex:    1,
          pageId:       authPage.id,
          action:       'fill',
          elementId:    usernameEl.id,
          targetPageId: null,
          value:        `{{${credKeyBase}_USERNAME}}`,
        })
        if (passwordEl) steps.push({
          stepIndex:    2,
          pageId:       authPage.id,
          action:       'fill',
          elementId:    passwordEl.id,
          targetPageId: null,
          value:        `{{${credKeyBase}_PASSWORD}}`,
        })
        if (submitEl) steps.push({
          stepIndex:    3,
          pageId:       authPage.id,
          action:       'click',
          elementId:    submitEl.id,
          targetPageId: null,
          value:        null,
        })
        // Assert post-login navigation using role.successUrl if defined
        const configRole  = (this.config.roles ?? []).find(
          (r: any) => r.id === hint.roleId
        )
        const successUrl  = (configRole as any)?.successUrl ?? null
        const successPage = successUrl
          ? this.pages.find(p => p.urlPattern && successUrl.includes(p.urlPattern))
          : null
        steps.push({
          stepIndex:    steps.length + 1,
          pageId:       successPage?.id ?? authPage.id,
          action:       'assert-navigation',
          elementId:    null,
          targetPageId: successPage?.id ?? null,
          value:        successUrl ?? null,
        })
      }
      // Re-index stepIndex
      steps.forEach((s, i) => { s.stepIndex = i + 1 })
      return {
        id:                   hint.id,
        displayName:          hint.hint.slice(0, 80),
        confidence:           0.99,
        source:               'config-seeded' as const,
        roleId:               hint.roleId,
        steps,
        linkedApiEndpointIds: [],
      }
    })
  }

  private candidateToFlow(candidate: FlowCandidate): FlowDefinition {
    const role = this.roles.find(r => r.id === candidate.roleId)
    return {
      id:                   `inferred-flow-${candidate.roleId}-${Date.now()}`,
      displayName:          `${role?.displayName || candidate.roleId} flow`,
      confidence:           candidate.confidence,
      source:               'inferred',
      roleId:               candidate.roleId,
      steps:                candidate.steps,
      linkedApiEndpointIds: [],
    }
  }

  private async enrichWithAi(
    candidates: FlowCandidate[]
  ): Promise<FlowDefinition[]> {
    if (candidates.length >= 3) return []
    if (this.budget.isExhausted()) return []
    if (!this.budget.consume(1)) return []

    const pageList = this.pages.map(p => ({
      id:       p.id,
      url:      p.urlPattern,
      isAuth:   p.isAuthPage,
      elements: p.elements.slice(0, 5).map(e => e.name),
    }))

    try {
      const response = await aiCall({
        operation: 'flow-detect',
        appName:   getAppName(),
        messages:  [{
          role:    'user',
          content: `You are analyzing a web app for test automation.
Given these pages, identify the most important user flows to test.
Respond ONLY with JSON array:
[{"id":"flow-id","displayName":"Flow name","roleId":"standardUser","pageSequence":["pageId1","pageId2"]}]

Pages: ${JSON.stringify(pageList, null, 2)}
Known roles: ${this.roles.map(r => r.id).join(', ')}`,
        }],
        maxTokens: 800,
      })

      const clean  = response.content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as any[]
      return parsed.map(f => ({
        id:                   f.id,
        displayName:          f.displayName,
        confidence:           0.65,
        source:               'agent-proposed' as const,
        roleId:               f.roleId || 'standardUser',
        steps:                (f.pageSequence || []).map((pid: string, i: number) => ({
          stepIndex:    i + 1,
          pageId:       pid,
          action:       'assert-navigation',
          elementId:    null,
          targetPageId: pid,
          value:        this.pages.find(p => p.id === pid)?.urlPattern || null,
        })),
        linkedApiEndpointIds: [],
      }))
    } catch {
      console.warn('[FlowDetector] AI enrichment failed — using heuristics only')
      return []
    }
  }

  private deduplicateFlows(flows: FlowDefinition[]): FlowDefinition[] {
    const seen  = new Set<string>()
    const dedup: FlowDefinition[] = []
    for (const flow of flows.sort((a, b) => b.confidence - a.confidence)) {
      const key = flow.id.replace(/-\d+$/, '')
      if (!seen.has(key)) {
        seen.add(key)
        dedup.push(flow)
      }
    }
    return dedup
  }

  private urlToPageId(url: string): string {
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
    return path
      .replace(/^\//, '')
      .replace(/\.html$/, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      || 'home'
  }
}
