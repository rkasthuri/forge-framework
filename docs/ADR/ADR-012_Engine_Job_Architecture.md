# ADR-012: Engine Job Architecture

## Status
Accepted

## Date
2026-07-09

## Context
The FORGE Platform UI introduces long-running engine operations (Crawl,
Generate, Execute, Heal, Analyze, Agent). Each operation needs consistent: job
lifecycle management, progress reporting, cancellation support, and UI
consumption patterns.

The core challenge: the engine executes synchronously and emits no structured
events — only `console.log` output. Phase 1 must deliver a good user experience
within these constraints.

## Decision
All long-running engine operations follow this pipeline:

```
  User Action (UI)
        ↓
  REST API (thin route — 202 immediately)
        ↓
  JobRunner.submit(job)
        ↓
  FORGE Engine (console hijack → LogBuffer)
        ↓
  GET /:jobId/status (1s polling)
        ↓
  UI: Mission Timeline (live) +
      Structured data (post-completion)
```

## Components

### JobRunner (`forge-ui/server/jobs/`)
Owns job lifecycle, status, events, logs.
- Phase 1: synchronous (same Express process).
- Phase 2: `worker_threads` (true background).
- Phase 3: cloud workers.

The UI and API contract never changes across phases.

### EngineEventPublisher (`src/core/events/`)
Typed event vocabulary (stub in Phase 1, wired into engine in Phase 2):

```
  crawl.started
  page.discovered   { url, depth, elements, role, discoveryMethod }
  strategy.selected { strategy }
  crawl.completed   { pagesFound, duration }
  crawl.failed      { error }
  warning           { message }
```

### CancellationToken (`src/core/events/`)
Passed to every long-running engine method.
- Phase 1: stub (never triggered).
- Phase 2: Stop button → `JobRunner.cancel()` → `CancellationToken.cancelled`
  → engine exits cooperatively (not a process kill).

## Phase 1 Honest Limitations
- Node.js single thread: the crawl blocks the event loop. `GET /status` only
  responds *after* completion.
- Mission Timeline (console hijack → LogBuffer) provides real-time text feedback
  during the crawl.
- The structured page table populates post-completion from `app-model.json` (all
  pages are already there).
- EngineEventPublisher is **not** wired into the engine yet — threading it
  through 5 files (Crawler, 3 strategies, PageVisitor) produces no user-visible
  benefit until Phase 2 (`worker_threads`) enables true streaming.

## Phase 2 Upgrade Path
- Move JobRunner to `worker_threads`.
- Wire EngineEventPublisher through the engine.
- Per-page streaming becomes possible.
- Stop button triggers CancellationToken.
- UI and API unchanged.

## Strategy Display (Q4 — Nova ruling)
Engine vocabulary → user-friendly labels:

| Engine | Label |
|---|---|
| `bfs` | Link Following |
| `spa` | Click Discovery |
| `hybrid` | Hybrid Exploration |
| `auto` | Auto-detected |

Engine vocabulary stays internal. A hover tooltip reveals the engine term.

## Consequences
- Every future operation reuses JobRunner.
- The UI never parses log lines for structured data.
- Engine vocabulary stays internal to the engine.
- The Phase 2 upgrade is surgical (JobRunner only).
- CancellationToken is designed in from day 1.

## References
- Nova relay: TD-UI-002 Crawl Tab (2026-07-09)
- ADR-011: Verify Before Assert
- TD-UI-011: LogBuffer + console hijack (proven)
