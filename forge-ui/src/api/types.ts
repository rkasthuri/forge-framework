// API request/response types — mirror the engine + API.md contract.

export interface DetectionField {
  value: string
  confidence: string
  source: string
}

export interface Detection {
  appType:       DetectionField
  authType:      DetectionField
  crawlStrategy: DetectionField
  appName:       DetectionField
}

export interface Project {
  appName:       string
  url:           string
  appType:       string
  crawlStrategy: string
  authType:      string
  createdAt:     string
  lastOpenedAt:  string
  workspacePath: string   // '' for fixture fallbacks (not yet crawled)
}

export interface OnboardRequest {
  url:       string
  appName:   string
  username?: string
  password?: string
  dryRun?:   boolean
  jobId?:    string            // TD-UI-011 — client-generated, keys the log buffer
  detectionResult?: Detection  // Step 4 — save-after-dry-run fast path
}

export interface OnboardResponse {
  project:   Project
  detection: Detection
  dryRun:    boolean
}

/** Server envelope: { data, error, timestamp }. */
export interface Envelope<T> {
  data:      T
  error:     string | null
  timestamp: string
}
