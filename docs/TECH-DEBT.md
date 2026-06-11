## Phase 4.8 — Storage Foundation

**TD-005: SQLite lock directory artifact**
- **File:** `ryq-framework.db`
- **Issue:** A `.lock` directory is created by the SQLite POSIX lock mechanism. This is normal behavior but may appear as an unexpected artifact in the working directory.
- **Impact:** Cosmetic — no functional impact. `npm run db:migrate` must always run as a single process (which it does by design).
- **Resolution:** Add `ryq-framework.db-lock` to `.gitignore`. No code change needed.
- **Priority:** Low

**TD-006: `app_name` hardcoded to `'saucedemo'` in migrated files**
- **Files:** `trend-analysis.ts`, `flaky-predictor.ts`, `release-notes.ts`, `notifier.ts`, `ai-triage.ts`, `adaptive-fixes.ts`, `gap-to-test.ts`, `knowledge-query.ts`, `dashboard-server.ts`, `platform-server.ts`, `query-server.ts`
- **Issue:** All repository calls pass `app_name: 'saucedemo'` as a hardcoded string. Multi-app support (Phase 5+) requires this to be dynamic — resolved from context, config, or a CLI argument.
- **Impact:** No impact in Phase 4.8/5 with single app target. Becomes a blocker in Phase 5 when multiple App Models exist.
- **Resolution:** Introduce `APP_NAME` env var with `'saucedemo'` as default. Replace all hardcoded strings at Phase 5.1 start.
- **Priority:** Medium — fix before Phase 5.2

**TD-007: Dual-write pattern in `coverage-gap.ts` and `performance-baseline.ts`**
- **Files:** `src/coverage-gap.ts`, `src/performance-baseline.ts`
- **Issue:** Both files write to DB and JSON simultaneously as a transition measure from Wave 1. The JSON writes are now redundant.
- **Impact:** Minor — extra disk writes on every run. No correctness issue.
- **Resolution:** Remove JSON writes from both files once dashboard-server and query-server JSON reads are confirmed fully migrated (verify at Phase 5.1 start).
- **Priority:** Low

**TD-008: Raw `fs` imports remain in migrated files**
- **Files:** Multiple files across Wave 1 and Wave 2
- **Issue:** Several files still import `fs` for report artifact writes (triage-report.json, release-notes.json etc). These are intentional export artifacts but the imports should be audited to confirm no system-of-record JSON writes remain.
- **Resolution:** Audit at Phase 5.1 start. Remove any remaining system-of-record JSON writes.
- **Priority:** Low
