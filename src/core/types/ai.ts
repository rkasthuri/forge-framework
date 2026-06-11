export type AiOperation =
  | 'triage'
  | 'vision-heal'
  | 'test-gen'
  | 'rca'
  | 'crawl-classify'
  | 'flow-detect'
  | 'trend-narrative'
  | 'flaky-score'
  | 'release-notes'
  | 'knowledge-qa'
  | 'perf-analysis'
  | 'visual-diff'
  | 'impact-analysis'
  | 'fix-suggestion'
  | 'gap-analysis'
  | 'dashboard-qa';

export interface AiUsageRecord {
  runId?:           string;
  appName:          string;
  operation:        AiOperation;
  model:            string;
  inputTokens:      number;
  outputTokens:     number;
  totalTokens:      number;
  estimatedCostUsd: number;
  durationMs:       number;
  triggeredBy:      string;
  success:          boolean;
  recordedAt:       string;
}

export interface AiResponse {
  content:      string;
  inputTokens:  number;
  outputTokens: number;
  model:        string;
  durationMs:   number;
}

export interface AiCallParams {
  operation:  AiOperation;
  messages:   { role: 'user' | 'assistant'; content: string | any[] }[];
  system?:    string;
  maxTokens?: number;
  runId?:     string;
  appName:    string;
}
