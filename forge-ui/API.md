# FORGE Platform UI — API Contract (`/api/v1`)

**Nova ruling: contract first.** Frontend and backend are built against this
document. All routes are thin — no business logic; every engine call goes
through `ExecutionContext` (server-side). All paths runtime-resolved (TD-097).

## Conventions

**Success envelope** — every 2xx response:
```json
{ "data": <T>, "error": null, "timestamp": "<ISO-8601>" }
```

**Error envelope** — every non-2xx response:
```json
{ "error": "<human message>", "code": "<MACHINE_CODE>", "timestamp": "<ISO-8601>" }
```
Status codes: **400** bad request · **404** not found · **500** engine error ·
**501** not implemented (foundation stubs).

Versioning: all routes under `/api/v1`. Auth/tenant are pass-through stubs in
Phase 1 (`req.user = owner/local`, `req.tenantId = 'local'`); the contract does
not change when real auth lands (Phase 2).

---

## Projects

```
GET    /api/v1/projects
       → data: { projects: Project[] }

GET    /api/v1/projects/:appName
       → data: { project: Project }            404 if unknown appName

POST   /api/v1/projects
       body: { url: string, appName?: string, username?: string, password?: string }
       → data: { project: Project }            201; runs Bootstrap via ExecutionContext
```

## Crawl

```
POST   /api/v1/crawl
       body: { appName: string, force?: boolean, dryRun?: boolean, aiBudget?: number }
       → data: { runId: string }               202 accepted (async job)

GET    /api/v1/crawl/:appName/status
       → data: { status: string, pagesDiscovered: number, strategy: string }
```

## Tests

```
GET    /api/v1/tests/:appName
       → data: { modules: Module[], tests: Test[] }

GET    /api/v1/tests/:appName/:testId
       → data: { test: Test, content: string }  content = spec file text (Monaco)

PUT    /api/v1/tests/:appName/:testId
       body: { content: string }
       → data: { test: Test }                   persists edited spec (tests/manual|generated)

POST   /api/v1/tests/:appName
       body: { title: string, module: string, content: string, source: 'manual' }
       → data: { test: Test }                   201

POST   /api/v1/tests/:appName/generate
       → data: { generated: number }            runs GeneratorRunner via ExecutionContext
```
> Note: `GeneratorRunner.generate()` returns `void` today (Step-0 S4). `generated`
> is a placeholder count until the engine surfaces one (TD-UI-003).

## Runs

```
POST   /api/v1/runs
       body: { appName: string, testIds?: string[] }
       → data: { runId: string }               202; omitting testIds runs all

GET    /api/v1/runs/:appName
       → data: { runs: Run[] }                  newest first

GET    /api/v1/runs/:appName/:runId
       → data: { run: Run, results: TestResult[] }

GET    /api/v1/runs/:runId/stream
       → text/event-stream (SSE)
```

### SSE events (`/runs/:runId/stream`)

Event names are **defined here** and consumed by the Run tab. Their *source* is
implemented in **TD-UI-004** (the reporter/`test_results` streaming of TD-126
writes to the DB; the stream route surfaces those as SSE — polling the DB by
`run_id` in Phase 1). They are NOT emitted by `ForgeStreamingReporter` today.

```
event: run:started
data: { runId, totalTests, appName }

event: test:completed
data: { testId, title, status, duration, browser }

event: run:completed
data: { runId, status, summary: { passed, failed, skipped, flaky } }

event: run:interrupted
data: { runId, completedTests, totalTests }
```

## Results

```
GET    /api/v1/results/:appName/:runId
       → data: { triage: TriageResult[], heals: HealRecord[] }
```

## Insights

```
GET    /api/v1/insights/:appName
       → data: { trends: TrendData, flaky: FlakyAnalysis[], passRate: PassRateTrend[] }
```
> `passRate` ← `TrendRepository.getPassRateTrend()` (confirmed, Step-0 #9).
> `flaky` includes insufficient-evidence rows — the UI renders those purple
> (`--signal-unknown`), never as "0 flaky" (TD-120 honesty).

## Settings

```
GET    /api/v1/settings/:appName
       → data: { config: AppConfig }

PUT    /api/v1/settings/:appName
       body: Partial<AppConfig>
       → data: { config: AppConfig }            validates against AppConfig schemaVersion
```

---

## Type references

`Project`, `Module`, `Test`, `Run`, `TestResult`, `TriageResult`, `HealRecord`,
`TrendData`, `FlakyAnalysis`, `PassRateTrend`, `AppConfig` are declared in
`src/api/types.ts` (frontend) and mirror the engine's storage/config types.
`Run.lifecycle` ∈ `created|running|completed|failed|interrupted` (TD-126);
`Run.status` (outcome) ∈ `passed|failed|partial|unknown` — orthogonal, never
mixed (TD-126 S2). `TestResult.status` ∈ `passed|failed|flaky|skipped`.

## Foundation status

Every route returns **501 Not Implemented** in this foundation commit; each is
filled by its tab brief (TD-UI-001…007). This contract is frozen first so
frontend and backend proceed in parallel.
