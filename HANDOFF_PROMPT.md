# FORGE Framework — Continuation Prompt

Paste this into a new Cowork chat to resume work with full context.

---

I'm continuing work on **FORGE** (formerly "RYQ"), an AI-augmented E2E testing framework located at `C:\e2e-ai-testing-framework`. Please read this whole prompt before doing anything.

## Critical operational rules (must follow exactly, every time)

1. `.env` contains real credentials — never log, commit, or expose them.
2. **File writes to this repo from the Linux shell sandbox MUST use Python `open(path, 'wb')` in binary mode.** The Edit/Write tools, `cp`, and Python text mode have repeatedly and silently truncated files on this NTFS-mounted path this project. After any such write, re-read the file via `wc -c` and `tail -c 200` from the **same shell** you wrote it from to confirm the byte count and ending look right — don't trust a clean write message alone.
3. There is a **real desync between the Windows-side file view (Read/Edit tools) and the Linux sandbox's mounted view (bash)**. The Read tool can show a file as complete and correct while `bash`/`tsc`/node scripts see a truncated or stale version of the same file, and vice versa. When something compiles clean via one path but fails via the other, don't assume either view is automatically right — verify with `wc -c` / `tail -c` / `python3 -c "json.load(...)"` from bash, since that's the view actual build/test commands use.
4. Git commits must always be run from **Windows PowerShell** — the Linux sandbox cannot write to the git index for this repo.
5. NTFS file deletion attempted from Linux returns `EPERM` — use PowerShell `Remove-Item` instead.
6. If `.git\index.lock` exists, run `Remove-Item C:\e2e-ai-testing-framework\.git\index.lock -Force` before committing.
7. After any `git add`/`git commit` from Windows, always run `git pull --rebase` before `git push` (CI may auto-commit in between).
8. When given a big multi-step task with a write-then-verify script, don't let an assertion failure later in the same script silently discard an earlier successful write — write/verify incrementally where it matters.

## Project shape

- TypeScript, Node 24, CommonJS, ES2022, Playwright `@playwright/test`.
- Onboarding pipeline (`src/core/onboarding/`): crawls/models an app into `models/<app>/app-model.json` (schema in `types.ts`: `AppModel`, `FlowDefinition`, `FlowStep`, `PageDefinition`, `ElementDefinition`, `EndpointDefinition`), then generators (`src/core/onboarding/generators/`) emit page objects, fixtures, and Playwright specs into `src/apps/desktop/.../generated/`.
- Three onboarded apps so far: `saucedemo` (web-ui/mpa), `orangehrm` (web-ui), `restful-booker` (rest-api).
- Two Playwright config files exist — root `playwright.config.ts` (authoritative for the CLI) and `src/playwright.config.ts` — both must be kept in sync when adding projects.
- `src/platform/` is a Node HTTP server (`platform-server.ts`) + static `platform.html`/`platform.js` dashboard with tabs for onboarding, running tests, and (new) a **REVIEW tab** that lets you execute/save/promote/reject individually generated tests before they're merged into the main suite. Execute runs the test in an isolated `forge-temp/` dir with a `copyDep` helper that recursively copies relative-imported dependency files (fixtures, page objects) with corrected relative imports.
- Branding: everything renamed from "RYQ" → "FORGE" across the codebase (DB file `forge-framework.db`, HTML titles, console banners, etc.) except the `@@RYQ@@` platform-reporter protocol prefix, which is a functional marker left as-is.

## What's been done recently (most recent first)

1. **Rewrote `src/core/onboarding/generators/SpecGenerator.ts`** to generate self-contained flow tests instead of fragmented single-assertion tests. New design:
   - `generateSpec(flow)` builds imports + calls `generateFlowTests`, wraps in `test.describe`.
   - `buildImports(flow)` — unchanged logic, imports fixtures + page classes used by the flow.
   - `generateFlowTests(flow)` — for flows with no steps, emits a smoke test; for flows with steps, emits ONE "full flow" test that runs every `fill`/`click`/`navigate`/`select`/`assert-navigation`/`assert-element-visible` step in order (so assertions always have their prerequisite actions already executed), plus one structural test per `assert-navigation` step that replays the steps up to that point and then checks up to 3 critical elements are visible on the target page.
   - `emitStep(step, role)` / `resolveElement(step)` / `bestSelector(el)` — shared helpers; `bestSelector` mirrors `VerificationRunner.strategyToSelector`.
   - `resolveValueExpr(value, fieldHint?)` — turns a `{{ENV_KEY}}` placeholder into runtime code (`process.env.KEY ?? ''`), with special-casing for `_USERNAME`/`_PASSWORD` suffixed keys (`?.split(':')[0|1]`) **and** a new fix: when a step's value is a bare `*_CREDENTIALS` placeholder shared by both the username and password fill steps (the actual convention `FlowDetector.ts` uses), it now uses `fieldHintFor(el)` — which inspects the element's name — to decide whether to take `split(':')[0]` or `[1]`, so the username and password fields no longer both get the raw `"user:pass"` string.
   - Verified: `npm run check` clean, `npm run onboard:generate -- --app=saucedemo` regenerated 5 spec files correctly, confirmed via the generated `inferred-flow-standardUser-...spec.ts` that fill/click/navigate happen before assertions and credentials split correctly.
2. Along the way, discovered and repaired **two more instances of NTFS file corruption**: `SpecGenerator.ts` itself (truncated after an Edit-tool call — fixed by switching to full Python-binary rewrites for that file going forward) and `models/saucedemo/app-model.json` (genuinely truncated mid-JSON on disk, unrelated to my edits — reconstructed from the last-known-good Read-tool view and rewritten via Python binary mode, re-validated with `json.loads`).
3. Before that: built the full **Phase 5.6 REVIEW tab** (3-file change across `platform.html`, `platform.js`, `platform-server.ts`) implementing review/execute/save/promote/reject for generated tests, then iteratively debugged the Execute pipeline through 5+ rounds (missing `sourcePath`, wrong `--project` flag, `testIgnore` blocking, relative-vs-absolute import paths, finally a `forge-temp/` + `copyDep` dependency-copying design) until it worked end-to-end.
4. Before that: full RYQ→FORGE rename across ~14 files plus DB rename, FORGE logo/branding pass on the platform UI, added a `generated` Playwright project to both config files for reviewing generated specs without affecting the main suite, and verified `VerificationRunner.ts` correctly skips browser launch/flow checks for API-type apps (TD-011).

## Suggested next steps (pick one, or tell me what's next)

- Run `npm run onboard:verify -- --app=saucedemo` to confirm the newly regenerated self-contained specs actually pass against the live SauceDemo site (not just compile).
- Regenerate and spot-check specs for `orangehrm` and `restful-booker` too, in case other flows hit the same shared-credential-placeholder issue just fixed.
- Re-test the REVIEW tab's Execute button against one of the newly regenerated self-contained tests to confirm it now passes (previously it failed only because the old generated test was a fragment, not because of infra — that root cause should now be gone).
- Commit the pending changes from **Windows PowerShell**: `git add src/core/onboarding/generators/SpecGenerator.ts models/saucedemo/app-model.json src/apps/desktop/ui/saucedemo/generated/`, commit, `git pull --rebase`, `git push`.

Let me know which of these (or something else) you want to do first.
