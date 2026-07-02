export type SelectorStrategyName = 'data-test' | 'id' | 'role' | 'text' | 'css';

export interface SelectorStrategy {
  name: SelectorStrategyName;
  selector: string;
  /** For role-type strategies only — the accessible name to match alongside the bare ARIA role token in `selector`. See TD-029. */
  accessibleName?: string;
}

export interface SmartLocatorDef {
  key: string;
  description: string;
  strategies: SelectorStrategy[];
}

export interface HealEvent {
  key: string;
  timestamp: string;
  originalStrategy: SelectorStrategyName;
  healedStrategy: SelectorStrategyName;
  healedSelector: string;
  source: 'strategy-chain' | 'vision';
  confidence?: number;
}

export interface HealStoreEntry {
  healedSelector: string;
  strategy: SelectorStrategyName;
  firstHealed: string;
  lastUsed: string;
  consecutiveSuccesses: number;
  source: 'strategy-chain' | 'vision';
  /** TD-066 — real heal confidence when one exists (vision heals carry the
   *  VisionHealer's returned confidence); undefined for strategy-chain heals,
   *  which have NO correctness signal (see TD-065). Was previously dropped here,
   *  which is why the DB write hardcoded a fabricated 1.0. */
  confidence?: number;
}

export interface HealStore {
  [key: string]: HealStoreEntry;
}

export interface HealReport {
  runId: string;
  timestamp: string;
  healsAttempted: number;
  healsSucceeded: number;
  healsFailed: number;
  visionCallsUsed: number;
  visionBudget: number;
  events: HealEvent[];
  pomUpdateCandidates: string[];
}
