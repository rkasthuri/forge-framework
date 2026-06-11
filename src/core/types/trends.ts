export interface TrendEntry {
  runId:     string;
  timestamp: string;
  total:     number;
  passed:    number;
  failed:    number;
  skipped:   number;
  duration:  number;
  passRate:  number;
  branch:    string;
}

export interface TrendStore {
  lastUpdated: string;
  totalRuns:   number;
  tests:       Record<string, TrendEntry>;
}

export interface AnalysisSummary {
  trend:          'improving' | 'degrading' | 'stable';
  passRateDelta:  number;
  flakyTestCount: number;
  topFailures:    string[];
  recommendation: string;
}

export interface RunStats {
  total:    number;
  passed:   number;
  failed:   number;
  duration: number;
  passRate: number;
}
