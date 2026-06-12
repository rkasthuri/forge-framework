export interface OnboardingConfig {
  app: {
    name:    string
    baseUrl: string
    appType: 'mpa' | 'spa' | 'api'
  }
  roles:    RoleConfig[]
  flows?:   FlowHint[]
  budgets?: {
    maxPages: number
    maxDepth: number
    aiCalls:  number
  }
  denyList?: string[]
}

export interface RoleConfig {
  id:                string
  displayName:       string
  authFlow:          'form-login' | 'oauth' | 'api-key' | 'none'
  credentialsEnvKey?: string
}

export interface FlowHint {
  id:          string
  hint:        string
  startPageId: string
  roleId:      string
}

export interface StateGraph {
  nodes: Map<string, PageNode>
  edges: StateEdge[]
}

export interface PageNode {
  urlPattern:  string
  visitCount:  number
  roleIds:     string[]
  domHash:     string
}

export interface StateEdge {
  fromUrl:  string
  toUrl:    string
  trigger:  string
  roleId:   string
}

export interface AiBudgetTracker {
  remaining:  number
  consume:    (n: number) => boolean
  isExhausted: () => boolean
}

export interface RawElement {
  tag:          string
  type:         string | null
  dataTest:     string | null
  id:           string | null
  ariaLabel:    string | null
  labelText:    string | null
  placeholder:  string | null
  textContent:  string | null
  role:         string | null
  name:         string | null
  href:         string | null
  index:        number
}

export interface Strategy {
  type:       'data-test' | 'id' | 'role' | 'text' | 'css'
  value:      string
  confidence: number
}

export type ElementKind =
  | 'input' | 'button' | 'link' | 'select'
  | 'checkbox' | 'radio' | 'textarea' | 'other'

export interface ElementDefinition {
  id:               string
  name:             string
  kind:             ElementKind
  label:            string
  critical:         boolean
  aiNamed:          boolean
  strategies:       Strategy[]
  tier3Assertions:  any[]
}

export interface PageDefinition {
  id:               string
  displayName:      string
  urlPattern:       string
  urlPatternType:   'exact' | 'prefix' | 'regex'
  fingerprint:      string
  fingerprintBasis: 'url-only' | 'url+dom-hash'
  appType:          'mpa' | 'spa' | 'api'
  accessibleByRoles: string[]
  isAuthPage:       boolean
  elements:         ElementDefinition[]
}

export interface FlowStep {
  stepIndex:    number
  pageId:       string
  action:       string
  elementId:    string | null
  targetPageId: string | null
  value:        string | null
}

export interface FlowDefinition {
  id:                   string
  displayName:          string
  confidence:           number
  source:               'inferred' | 'config-seeded' | 'agent-proposed'
  roleId:               string
  steps:                FlowStep[]
  linkedApiEndpointIds: string[]
}

export interface RoleDefinition {
  id:                string
  displayName:       string
  authFlow:          string
  credentialsEnvKey: string | null
  storageStatePath:  string | null
  reachablePageIds:  string[]
  restrictedPageIds: string[]
}

export interface AppModel {
  schemaVersion: string
  generatedAt:   string
  generatedBy:   'human' | 'agent'
  app: {
    name:             string
    displayName:      string
    baseUrl:          string
    appType:          'mpa' | 'spa' | 'api'
    crawlConfigHash:  string
    crawledAt:        string
    crawledBy:        'human' | 'agent'
    crawlDurationMs:  number
    pagesBudget:      number
    pagesDiscovered:  number
    pagesSkipped:     number
    modelVersion:     string
    spaConfig:        null
  }
  roles:  RoleDefinition[]
  pages:  PageDefinition[] | null
  flows:  FlowDefinition[] | null
  api:    null
  diff:   null | {
    previousModelVersion:   string
    diffGeneratedAt:        string
    pagesAdded:             string[]
    pagesRemoved:           string[]
    pagesModified:          string[]
    elementsAdded:          string[]
    elementsRemoved:        string[]
    strategiesInvalidated:  string[]
    flowsAdded:             string[]
    flowsRemoved:           string[]
  }
}

export interface PageDiscovery {
  pageId:       string
  urlPattern:   string
  elements:     ElementDefinition[]
  outboundUrls: string[]
  domHash:      string
  isAuthPage:   boolean
}

export interface RoleCrawlResult {
  roleId:       string
  pages:        PageDiscovery[]
  stateEdges:   StateEdge[]
  pagesSkipped: number
}

export interface FlowCandidate {
  steps:      FlowStep[]
  confidence: number
  roleId:     string
}
