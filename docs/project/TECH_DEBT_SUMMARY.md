# TECH_DEBT_SUMMARY.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-22 — sourced from CC read of on-disk TECH_DEBT.md -->

> Summary of active technical debt items, priorities, and status.
> **This document is a summary — not the source of truth.**
> The authoritative record is the on-disk `TECH_DEBT.md` (234 unique TD/ADR IDs; verify current size with `wc -l`).
> Never cite TD status from the project-file copy in Claude's context — it is
> months stale. Always verify against the live repo file.
>
> TDs are organised by area and priority. Within each area, Critical and High
> items are listed first.

---

## Standing Rule (Added 2026-07-20 by Raj)

> No current GREEN status has been verified for correctness — all prior scoring
> was on honesty alone. GREEN requires BOTH honest AND correct.
> This applies retroactively to all previously-GREEN capabilities.

---

## Summary Counts

| Section | Open TDs (approx) | Notes |
|---|---|---|
| Core engine | ~60 | TD-107 → TD-169 plus earlier |
| Platform UI (TD-UI-*) | ~40 | forge-ui tab work |
| Resolved | ~130 | History only — do not re-open |
| **Total** | **234 unique IDs** | On-disk TECH_DEBT.md (`wc -l` for size) |

> Exact counts: verify with `wc -l TECH_DEBT.md` and count table rows.

---

## Critical Priority

| TD | Area | Description |
|---|---|---|
| TD-064 | Generate | No behavioural validity self-check. FC-001/002/003 resolved. FC-004a remaining. Vacuous-green specs still possible. |

---

## High Priority — Active Investigation (Do Not Patch on Contact)

| TD | Area | Description | Status |
|---|---|---|---|
| TD-166 | Bootstrap | authType.value is non-deterministic — same app onboarded twice can persist different configs depending on whether the agent phase ran | Investigation required before fix |
| TD-168 | Bootstrap | Bootstrap.detect() logs nothing — detection decisions are invisible in logs. ADR likely needed. | Investigation required; design first |

---

## High Priority — Open

| TD | Area | Description |
|---|---|---|
| TD-140 | Generate | Vacuous-green generated specs — a fully-omitted test still passes |
| TD-173 | Crawl / Bootstrap | detectRenderingModel can never emit `'unknown'` — floors to `'static-rendered'` with no framework marker; a framework app sampled at `domcontentloaded` pre-hydration is mis-measured as static. Measurement defect (escalated High 2026-07-21). Blocks Onboard GREEN. |
| TD-UI-030 | Platform UI | Reporter reports a zero-spec run as PASSED |
| TD-UI-062 | Platform UI | Insights tab — InsightsPage.tsx = "Coming soon", insights.ts = 501 stub. Honest DB-backed Insights view unbuilt. |

---

## Medium Priority — Active Investigation

| TD | Area | Description | Status |
|---|---|---|---|
| TD-167 | Bootstrap | loginUrl can contradict authType in one persisted config | Investigate after TD-166 |

---

## Medium Priority — Open (Selected)

| TD | Area | Description |
|---|---|---|
| TD-014 | Crawl | SPAStrategy single-hop only — does not recurse into second-hop pages. OrangeHRM misses `recruitment/viewCandidates` etc. |
| TD-013 | Verify | VerificationRunner navigates directly to page URL — no prerequisite state setup. Cart page fails element checks because cart is empty. |
| TD-UI-003 | Platform UI | Tests tab — design approved, build in progress |
| TD-UI-052 | Platform UI | forge-ui tsc not in CI — local-only gate |

---

## Low Priority — Open (Selected)

| TD | Area | Description |
|---|---|---|
| TD-015 | Crawl | lockedUser role auth occasionally fails on SauceDemo — untriaged |
| TD-LOW-001 | Repo | Repository rename from e2e-ai-testing-framework to forge-framework — local path still may reference old name |
| TD-LOW-002 | CI | Firefox not configured as execution target |
| TD-003 | CI | CI trend dashboard always shows 1 run — Docker path mismatch |
| TD-001 | Platform | Live stats not updating in Platform UI during run — likely stdout buffering |
| TD-002 | Platform | Platform UI runs headed locally — may be intentional |

---

## CI / Pipeline TDs (Selected Open)

| TD | Description |
|---|---|
| TD-070 | CI mints its own canonical run ID — local runs use a different scheme |
| TD-078 | Bug gate in CI is informational / non-blocking |
| TD-051 | Schema mismatch — trend-analysis and release-notes carry continue-on-error in CI |
| TD-055 | steps.suite.outputs.label referenced in Job 2 (line 395) where it cannot resolve |
| TD-UI-052 | forge-ui tsc gate is local-only — not in CI |

---

## Recently Resolved (Selected)

| TD | Description | Resolved in |
|---|---|---|
| TD-162 | CLOSED works-as-designed — realLinks=0 is accurate (375/376 Wikipedia anchors cross-origin; realLinks = same-origin navigable). NOT a counting failure; the original "376 vs 0" framing compared two different metrics (ADR-021). | WAD 2026-07-21 — no code change |
| TD-163 | appType claimed navigation architecture (`'spa'`) from a rendering-only marker — refactor emits observed rendering (framework-rendered vs static-html); appType leaves the evidence model (ADR-021). | 0c38a31 / 0c81b4d / 845e513 |
| TD-158 | Evidence-derived confidence arc | b421a2d |
| ADR-020 | Evidence-derived confidence — shipped after TD-156/157 Nova rulings | b421a2d |
| FC-001/002/003 | Generator validity defects | Various — see on-disk ledger |
| TD-148 | Identity divergence detection retired → login-surface observer | Previous sessions |

> Full resolved history: see on-disk `TECH_DEBT.md` resolved sections (~60 rows).

---

## Design Decisions Captured (Not Bugs)

These are sequencing or architecture calls — not defects. Violating them is
an architectural breach.

| Topic | Decision |
|---|---|
| Dashboard build order | Do not build dashboard while core TD-013/TD-014 (verification/crawl correctness) remain unresolved |
| Dashboard data architecture | Dashboard must be a view layer on existing data — not a standalone reporting pipeline |
| Agentic loops | Do not expand agentic loops until honesty floor is solid |
| Multi-model routing | Gate: TD-080 fixed first so eval harness measurement is trustworthy |

---

## How to Use This Document

**Opening a new TD:**
1. Check on-disk `TECH_DEBT.md` — confirm it is not already logged
2. Use the next available ID
3. Include: description, priority, notes (root cause if known, or "Untriaged")
4. Do not fix inline — log first, design conversation before code

**Resolving a TD:**
1. Fix must have a commit hash
2. CI must have passed against that commit
3. Update on-disk `TECH_DEBT.md` with the hash
4. All three required — no exceptions

**Updating this summary:**
Update this file when a High or Critical TD is opened or resolved.
For Low/Medium TDs, update on-disk `TECH_DEBT.md` only — this summary
is a curated view, not a mirror.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
