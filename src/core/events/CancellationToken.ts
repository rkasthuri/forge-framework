/**
 * CancellationToken — cooperative cancellation for long-running engine
 * operations (ADR-012).
 *
 * PHASE 1: a STUB. Constructed and passable, but never triggered — there is no
 * Stop button wired yet, so `cancelled` stays false for a job's whole life.
 *
 * PHASE 2: the UI Stop button → JobRunner.cancel() → token.cancel(); engine
 * methods poll `throwIfCancelled()` at safe checkpoints and unwind cooperatively
 * (close the browser/context in finally) rather than a hard process kill.
 *
 * The contract below is what engine methods will accept as an optional param;
 * passing nothing (CLI, tests, Phase 1) means "never cancelled".
 */
export class CancellationToken {
  private _cancelled = false

  /** True once cancel() has been called. Engine checkpoints read this. */
  get cancelled(): boolean {
    return this._cancelled
  }

  /** Phase 2: JobRunner calls this on Stop. Phase 1: never called. */
  cancel(): void {
    this._cancelled = true
  }

  /** Convenience for engine checkpoints — bail out cooperatively if cancelled. */
  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new CancellationError()
    }
  }
}

export class CancellationError extends Error {
  constructor() {
    super('Operation cancelled')
    this.name = 'CancellationError'
  }
}

/** A token that is never cancelled — the Phase 1 / no-op default. */
export const NO_CANCELLATION = new CancellationToken()
