export type AppTypeName =
  | 'mpa' | 'spa' | 'api'
  | 'web-ui'
  | 'rest-api' | 'graphql-api'
  | 'mobile-android' | 'mobile-ios'
  | 'iot' | 'cloud' | 'data'

export interface ApiParameter {
  name:     string
  in:       'path' | 'query' | 'header' | 'body'
  required: boolean
}

export interface EndpointDefinition {
  method:       'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path:         string
  summary:      string
  auth:         boolean
  parameters?:  ApiParameter[]
  requestBody?: { schema: Record<string, any> } | null
  responses?:   Record<string, any>
}

export interface OnboardingConfig {
  app: {
    name:    string
    baseUrl: string
    appType: AppTypeName
  }
  /** Top-level discriminator — drives ApiSpecCrawler vs UI BFS vs stub */
  appType?:       'web-ui' | 'rest-api' | 'graphql-api' |
                  'mobile-android' | 'mobile-ios' | 'iot' | 'cloud' | 'data'
  apiEndpoints?:  EndpointDefinition[]
  apiSpecFile?:   string
  apiSpecUrl?:    string
  roles:          RoleConfig[]
  flows?:         FlowHint[]
  /** App-specific setup steps a page needs before its elements can be verified — see TD-013 */
  pagePrerequisites?: PagePrerequisiteHint[]
  budgets?: {
    maxPages: number
    maxDepth: number
    aiCalls:  number
  }
  denyList?: string[]
  crawlMode?: 'auto' | 'bfs' | 'spa' | 'hybrid'
}

export interface RoleConfig {
  id:                 string
  displayName:        string
  authFlow:           'form-login' | 'oauth' | 'api-key' | 'none'
  credentialsEnvKey?: string
  loginUrl?:          string
  selectors?: {
    username?: string
    password?: string
    submit?:   string
  }
  successUrl?:        string
}

export interface FlowHint {
  id:          string
  hint:        string
  startPageId: string
  roleId:      string
}

export interface PagePrerequisiteStepHint {
  action:     string
  pageId?:    string
  elementId?: string
  value?:     string
}

export interface PagePrerequisiteHint {
  /** Must match a PageDefinition.id */
  pageId:  string
  /** Omit to apply regardless of which role's verification context runs the page */
  roleId?: string
  steps:   PagePrerequisiteStepHint[]
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
  remaining:   number
  consume:     (n: number) => boolean
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
  /** 0-based position among structurally-identical siblings of this element's nearest repeated ancestor (card/row/list-item), or null if no such ancestor was found */
  containerIndex: number | null
  /** First short text node found inside that same container instance — used to disambiguate repeated elements with a meaningful suffix instead of a bare index */
  containerHint:  string | null
}

export interface Strategy {
  type:       'data-test' | 'id' | 'role' | 'text' | 'css' | 'api-path'
  value:      string
  confidence: number
}

export type ElementKind =
  | 'input' | 'button' | 'link' | 'select'
  | 'checkbox' | 'radio' | 'textarea' | 'other'
  | 'path-param' | 'query-param' | 'request-field' | 'response-field'

export interface ElementDefinition {
  id:               string
  name:             string
  kind:             ElementKind
  label:            string
  critical:         boolean
  aiNamed:          boolean
  strategies:       Strategy[]
  tier3Assertions:  any[]
  /** Original name before deduplicateNames() renamed it to resolve a same-page collision — see TD-018 */
  disambiguatedFrom?: string
}

export interface PageDefinition {
  id:                string
  displayName:       string
  urlPattern:        string
  urlPatternType:    'exact' | 'prefix' | 'regex'
  fingerprint:       string
  fingerprintBasis:  'url-only' | 'url+dom-hash'
  appType:           AppTypeName
  accessibleByRoles: string[]
  isAuthPage:        boolean
  elements:          ElementDefinition[]
  /** Steps that must run before this page's elements can be verified — see TD-013 */
  prerequisites?:    PagePrerequisite[]
}

export interface PagePrerequisite {
  /** Omit to apply regardless of which role authenticated for this page */
  roleId?: string
  steps:   FlowStep[]
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
    appType:          AppTypeName
    crawlConfigHash:  string
    crawledAt:        string
    crawledBy:        'human' | 'agent'
    crawlDurationMs:  number
    pagesBudget:      number
    pagesDiscovered:  number
    pagesSkipped:     number
    modelVersion:     string
    spaConfig:        null
    aiBudgetStatus:   'within-budget' | 'degraded'
  }
  roles:     RoleDefinition[]
  pages:     PageDefinition[] | null
  flows:     FlowDefinition[] | null
  endpoints: EndpointDefinition[] | null
  api:       null
  diff:      null | {
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
