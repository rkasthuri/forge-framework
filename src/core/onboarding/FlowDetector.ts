import {
  StateGraph, FlowDefinition, FlowStep, FlowCandidate,
  PageDefinition, RoleDefinition, OnboardingConfig,
  AiBudgetTracker
} from './types'
import { aiCall }     from '../ai/AiClient'
import { getAppName } from '../config/appConfig'

export class FlowDetector {

  constructor(
    private stateGraph: StateGraph,
    private pages:      PageDefinition[],
    private roles:      RoleDefinition[],
    private config:     OnboardingConfig,
    private budget:     AiBudgetTracker
  ) {}

  async detectFlows(): Promise<FlowDefinition[]> {
    const candidates  = this.identifyCandidates()
    const configFlows = this.mergeConfigSeeded()
    const inferred    = candidates.map(c => this.candidateToFlow(c))
    const enriched    = await this.enrichWithAi(candidates)
    const all         = [...configFlows, ...inferred, ...enriched]
    return this.deduplicateFlows(all)
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
            ? `{{${role.credentialsEnvKey || 'CREDENTIALS'}}}`
            : null,
        }))

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
    return this.config.flows.map(hint => ({
      id:                   hint.id,
      displayName:          hint.hint.slice(0, 50),
      confidence:           0.99,
      source:               'config-seeded' as const,
      roleId:               hint.roleId,
      steps:                [],
      linkedApiEndpointIds: [],
    }))
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
