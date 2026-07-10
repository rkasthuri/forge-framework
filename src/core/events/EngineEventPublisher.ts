import * as crypto from 'crypto'

/**
 * EngineEventPublisher — the typed event vocabulary for long-running engine
 * operations (ADR-012).
 *
 * PHASE 1: this is a STUB. It compiles and is unit-testable, but it is NOT wired
 * into the engine — no CrawlRunner/Crawler/strategy/PageVisitor call site emits
 * through it yet. Phase 1 surfaces live progress via the console-hijack +
 * LogBuffer "Mission Timeline" (TD-UI-011), and structured pages come from
 * app-model.json after completion.
 *
 * PHASE 2: threaded through the engine (Crawler + 3 strategies + PageVisitor) so
 * per-page discovery streams as typed events instead of parsed log lines. The
 * class contract below is the frozen interface both phases share.
 */
export type EngineEventType =
  | 'crawl.started'
  | 'page.discovered'
  | 'strategy.selected'
  | 'crawl.completed'
  | 'crawl.failed'
  | 'warning'

export interface EngineEvent {
  /** Unique per event — crypto.randomUUID(). */
  id: string
  /** ISO 8601 emit time. */
  timestamp: string
  type: EngineEventType
  payload: Record<string, unknown>
}

export class EngineEventPublisher {
  private handlers: Array<(e: EngineEvent) => void> = []

  /** Subscribe to every emitted event (e.g. JobRunner captures them). */
  on(handler: (e: EngineEvent) => void): void {
    this.handlers.push(handler)
  }

  /** Stamp id + timestamp and fan out to all handlers. */
  emit(type: EngineEventType, payload: Record<string, unknown>): void {
    const event: EngineEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      payload,
    }
    this.handlers.forEach(h => h(event))
  }
}
