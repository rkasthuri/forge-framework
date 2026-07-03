import * as fs from 'fs';
import * as path from 'path';
import { HealStore, HealStoreEntry, HealEvent } from './types';
import { HealRepository } from '../storage/repositories/HealRepository'

// HEAL_STORE_PATH overrides the default store location — used by tests to avoid
// clobbering the real reports/heal-store.json (mirrors DB_PATH in db.ts).
const STORE_PATH = process.env.HEAL_STORE_PATH
  ? path.resolve(process.env.HEAL_STORE_PATH)
  : path.resolve(process.cwd(), 'reports/heal-store.json');
const POM_UPDATE_THRESHOLD = 3;

// TD-066 — sentinel written to heal_events.confidence when NO real confidence
// exists (strategy-chain heals have no correctness signal — see TD-065). The
// column is `real NOT NULL DEFAULT 0`, so a SQL NULL isn't allowed without a
// schema migration; -1 is out of the valid [0,1] confidence range, so it can
// never be mistaken for an earned value. Replaces the previously fabricated 1.0.
// (If we later make the column nullable, this becomes NULL — see Aiden report.)
const UNVERIFIED_HEAL_CONFIDENCE = -1;

export class HealStoreManager {
  private store: HealStore = {};
  private dirty = false;

  constructor() {
    this.load();
  }

  // ── Read ──────────────────────────────────────────────────────

  getHealedSelector(key: string): string | undefined {
    return this.store[key]?.healedSelector;
  }

  getEntry(key: string): HealStoreEntry | undefined {
    return this.store[key];
  }

  getAll(): HealStore {
    return { ...this.store };
  }

  // ── Write ─────────────────────────────────────────────────────

  recordHeal(event: HealEvent): void {
    const existing = this.store[event.key];

    this.store[event.key] = {
      healedSelector:       event.healedSelector,
      strategy:             event.healedStrategy,
      firstHealed:          existing?.firstHealed ?? event.timestamp,
      lastUsed:             event.timestamp,
      consecutiveSuccesses: (existing?.consecutiveSuccesses ?? 0) + 1,
      source:               event.source,
      // TD-066: carry the real heal confidence forward (vision heals only;
      // undefined for strategy-chain). Previously dropped -> forced the 1.0 lie.
      confidence:           event.confidence,
      // TD-065: carry the correctness signal + derived confidence tier forward.
      correctnessSignal:    event.correctnessSignal,
      healConfidence:       event.healConfidence,
    };

    this.dirty = true;
  }

  retireHeal(key: string): void {
    if (this.store[key]) {
      delete this.store[key];
      this.dirty = true;
      console.log(`[HealStore] Retired heal for "${key}" -- primary selector restored`);
    }
  }

  getPomUpdateCandidates(threshold = POM_UPDATE_THRESHOLD): string[] {
    return Object.entries(this.store)
      .filter(([, entry]) => entry.consecutiveSuccesses >= threshold)
      .map(([key]) => key);
  }

  // ── Persistence ───────────────────────────────────────────────

  load(): void {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        this.store = JSON.parse(raw);
        console.log(`[HealStore] Loaded ${Object.keys(this.store).length} entries`);
      } else {
        this.store = {};
        console.log('[HealStore] No existing store -- starting fresh');
      }
    } catch (error) {
      console.warn('[HealStore] Failed to load store, starting fresh:', error);
      this.store = {};
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify(this.store, null, 2),
        'utf-8'
      );

      // DB write — additive, does not block runtime healing
      const healRepo = new HealRepository()
      const runId    = process.env.CURRENT_RUN_ID || 'unknown'
      for (const [key, entry] of Object.entries(this.store)) {
        const [page, element] = key.split('::')
        try {
          await healRepo.insert({
            run_id:            runId,
            page:              page    || 'unknown',
            element:           element || key,
            original_strategy: entry.strategy         || '',
            healed_strategy:   entry.healedSelector   || '',
            heal_type:         entry.source           || 'smart-locator',
            // TD-066: real vision confidence where it exists; explicit
            // 'unverified' sentinel (not a fabricated 1.0) for strategy-chain
            // heals that have no correctness signal (TD-065 owns that).
            confidence:        entry.confidence ?? UNVERIFIED_HEAL_CONFIDENCE,
            // TD-065: correctness signal + derived tier (nullable — NULL when a
            // heal carried no correctness data, e.g. no assertionContext threaded).
            correctness_signal: entry.correctnessSignal ?? null,
            heal_confidence:    entry.healConfidence    ?? null,
            consecutive_count: entry.consecutiveSuccesses ?? 0,
            promoted:          0,
            healed_at:         entry.lastUsed || new Date().toISOString(),
          })
        } catch { /* ignore duplicate inserts */ }
      }

      console.log(`[HealStore] Saved ${Object.keys(this.store).length} entries`);
      this.dirty = false;
    } catch (error) {
      console.error('[HealStore] Failed to save store:', error);
    }
  }

  // ── Summary ───────────────────────────────────────────────────

  getSummary(): string {
    const total      = Object.keys(this.store).length;
    const candidates = this.getPomUpdateCandidates();

    if (total === 0) return '[HealStore] Empty -- no heals recorded yet';

    return [
      `[HealStore] ${total} active heal(s)`,
      candidates.length > 0
        ? `  POM update candidates (${candidates.length}): ${candidates.join(', ')}`
        : '  No POM update candidates yet',
    ].join('\n');
  }
}

// Singleton -- one store instance per process
export const healStore = new HealStoreManager();
