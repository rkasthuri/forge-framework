export type RiskCategory   = 'critical' | 'high' | 'medium' | 'low' | 'stable';
export type FlakyTrend     = 'improving' | 'degrading' | 'stable';
export type Recommendation = 'quarantine' | 'monitor' | 'fix-selector' |
                              'fix-timing' | 'stable';

export interface FlakySignals {
  timing:      number;
  selector:    number;
  data:        number;
  env:         number;
  concurrency: number;
  network:     number;
}

export interface PredictorResult {
  testId:         string;
  title:          string;
  flakyScore:     number;
  riskCategory:   RiskCategory;
  signals:        FlakySignals;
  recommendation: Recommendation;
  trend:          FlakyTrend;
  sampleSize:     number;
}
