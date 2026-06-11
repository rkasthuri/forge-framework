export type RunStatus   = 'passed' | 'failed' | 'partial' | 'unknown';
export type TriggeredBy = 'ci' | 'manual' | 'platform' | 'agent';
export type Environment = 'local' | 'ci' | 'staging' | 'production';

export interface RunRecord {
  runId:           string;
  appName:         string;
  branch:          string;
  commitSha:       string;
  environment:     Environment;
  baseUrl:         string;
  triggeredBy:     TriggeredBy;
  reporterVersion: string;
  status:          RunStatus;
  total:           number;
  passed:          number;
  failed:          number;
  skipped:         number;
  duration:        number;
  startTime:       string;
  endTime:         string;
  metadata?:       Record<string, unknown>;
}

export interface RunHistory {
  created: string;
  runs:    RunRecord[];
}

export interface RunStats {
  total:    number;
  passed:   number;
  failed:   number;
  skipped:  number;
  duration: number;
  passRate: number;
}

export interface RunFailure {
  testId:  string;
  title:   string;
  suite:   string;
  error:   string;
  browser: string;
}
