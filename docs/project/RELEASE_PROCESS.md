# RELEASE_PROCESS.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-21 -->

> Versioning, release workflow, and deployment process for FORGE.
>
> ⚠️ Honest status note: FORGE does not currently have a formal versioning
> scheme or published release process. This document describes:
> (a) what the release process actually is today — the push/commit discipline
>     and CI gate that governs every change to main
> (b) what a formal release process would look like when FORGE reaches that
>     milestone, flagged clearly as not-yet-implemented
>
> Do not treat the "future" sections as current practice.

---

## 1. Current Reality — How Changes Reach main

FORGE does not have numbered releases today. Every push to `main` is the
current version of the framework. The release process is the push discipline.

### The Current Release Sequence

```
1. Raj identifies work → states goal to Aiden

2. Aiden designs → Nova reviews (if structural) → Raj approves

3. Implementation Agent (CC or Codex) implements from Aiden brief
   → stops at every checkpoint
   → reports with evidence

4. Aiden reviews diff
   → reads actual diff (not summary)
   → verifies scope, copyright headers, paths, boundaries
   → approves or requests changes

5. Raj issues Rule 9 ("Go")
   → explicit push authorisation
   → required before every push without exception

6. Implementation Agent pushes
   → git stash / pull --rebase / stash pop / push
   → reports new hash and CI run number

7. CI runs (e2e-pipeline.yml — 3 jobs)
   → Job 1: tsc + unit (531) + Playwright (320)
   → Job 2: triage + store + fixes + trends + notes + notify
   → Job 3: failure notification

8. CI green confirmed
   → milestone marked complete
   → TECH_DEBT.md updated with resolved TDs and real commit hashes
```

### What "Released" Means Today

A capability is released when:
```
□ Commit hash exists on main
□ CI is green against that commit
□ TECH_DEBT.md updated with resolved TDs
□ GREEN verified for both HONEST and CORRECT (standing rule 2026-07-20)
```

---

## 2. Commit Discipline

### Batching Rule

Commits are batched by logical milestone. Never push:
- Docs-only commits in isolation from related code changes
- Single-file changes that belong to a larger logical unit
- Anything that has not passed `npm run check` locally
- Anything with a failing unit or Playwright test

**Why:** Each CI run in Job 2 costs real Claude API calls.
One CI run per logical milestone.

### Commit Message Format

```
<type>(<scope>): <short description>

Types:   feat | fix | refactor | docs | test | chore
Scopes:  ui | engine | triage | healing | crawl | generate | ci | deps

Examples:
  feat(ui): Tests tab — generation review surface (TD-UI-003)
  fix(engine): VerificationRunner prerequisite state setup (TD-013)
  fix(crawl): StrategyDetector signal counting fault (TD-162)
  docs: AI_CONSTITUTION.md + AI_WORKFLOW.md
  chore(deps): bump @playwright/test to 1.58.0
```

### Push Sequence

```bash
git stash           # Park uncommitted work
git pull --rebase   # Sync with remote
git stash pop       # Restore parked work
git push
```

After push:
1. Report new hash (post-rebase — may differ from pre-push hash)
2. Report CI run number
3. Report CI result when concluded with exact counts

---

## 3. Quality Gates Before Any Push

All must pass locally before Rule 9 is requested:

```bash
npm run check           # tsc --noEmit — root + must pass
cd forge-ui && npm run check  # forge-ui tsc — local only (TD-UI-052)
npm run test:unit       # 531/0 — must pass
cd forge-ui && npm run build  # Vite production build — must exit 0
```

Playwright suite (`npm run test:all`) should be run locally for any change
that touches test files, the crawler, or the generator.

---

## 4. TECH_DEBT.md Update at Release

Every push that resolves a TD must update `TECH_DEBT.md` in the same commit
or a same-milestone docs commit:

```
□ Move resolved TD row to the Resolved table
□ Add the real commit hash — not "this commit", not a placeholder
□ Add CI confirmation note
□ Do not mark resolved without hash + CI evidence
```

This is a release requirement, not optional housekeeping.

---

## 5. What Does Not Exist Yet (Honest)

The following are not currently implemented. They are listed here so anyone
reading this document understands the gap between current practice and a
full release process:

| Capability | Status | Notes |
|---|---|---|
| Semantic versioning (v1.0.0, etc.) | ❌ Not implemented | No `npm version` discipline or git tags |
| Published npm package | ❌ Not implemented | FORGE is not published to npm registry |
| Changelog (CHANGELOG.md) | ❌ Not implemented | Release notes are run-level, not version-level |
| Git release tags | ❌ Not implemented | No `git tag v1.0.0` convention |
| GitHub Releases | ❌ Not implemented | No drafted releases on GitHub |
| Deployment pipeline | ❌ Not applicable | FORGE is a local/CI framework, not a deployed service |
| Staging environment | ❌ Not applicable | Tests run against live public demo apps |
| Rollback procedure | 🔄 Partial | `git revert` is available; no formal rollback runbook |

---

## 6. When Formal Versioning Would Be Added

If FORGE moves toward:
- Public release as an npm package
- Distribution to other teams or organisations
- A published plugin or extension model

Then the following would be needed:

```
1. Semantic versioning — major.minor.patch
   - Major: breaking pipeline or API changes
   - Minor: new capabilities shipped, backward-compatible
   - Patch: bug fixes, TD resolutions

2. CHANGELOG.md — maintained alongside TECH_DEBT.md
   One entry per version with: added / changed / fixed / removed

3. Git release tags — git tag -a v1.0.0 -m "Initial release"

4. GitHub Release — drafted with release notes from npm run release:notes

5. npm publish — if distributing as a package
```

This section is forward-looking — none of it is current practice.

---

## 7. Rollback

If a push introduces a regression:

```bash
# Option A — Revert the commit
git revert <commit-hash>
git push
# → CI runs against the revert
# → Aiden reviews the revert diff before push
# → Rule 9 required

# Option B — Fix forward
# → Preferred when the regression is well-understood
# → Fix in a new commit following the full workflow
# → Do not bypass diff review or Rule 9 under urgency
```

**There is no "emergency" exception to Rule 9 or Aiden diff review.**
Urgency is not grounds for bypassing the approval gates.

---

## 8. Communication After Push

After CI green, the following happen automatically via Job 2:

- Run summary committed to `run-history.json` on main
- PR comment posted with run summary
- Notifier sends Slack / email summary (if configured)
- Release notes generated (`npm run release:notes`)

No manual communication step is required for routine pushes.
Raj is notified via CI Job 3 on main branch failures.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
