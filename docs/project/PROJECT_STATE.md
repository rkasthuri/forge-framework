# PROJECT_STATE.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->
<!-- Last updated: 2026-07-22 — sourced from CC repo verification + on-disk ledger + git state -->

> Current snapshot of the FORGE project. This document goes stale quickly.
> Always verify against the live repo before acting on anything here.
> Source of truth hierarchy: git log > on-disk TECH_DEBT.md > this document.

---

## 1. Repository State

| Item | Value |
|---|---|
| **Repo** | github.com/rkasthuri/forge-framework |
| **Local path** | C:\forge-framework |
| **Active branch** | main |
| **Remote sync** | 6 commits ahead of origin/main (origin at `845e513`; the TD-163 arc is already pushed) |
| **Working tree** | 7 modified tracked files (generated artifacts — app-models, heal-store, verify reports, PNG) |
| **Untracked** | docs/PRODUCT_VISION.md, notes/, ~17 reports/2026-07-* dirs, label sheets, q.cjs, forge-ui/type |

---

## 2. Last Known Commits

| Hash | Description |
|---|---|
| `de5da48` | Documentation-governance DR — **HEAD** (6 ahead of origin) |
| `845e513` | TD-163 arc tip — appType leaves the evidence model + human-attested fixtures (on origin) |
| `6d52a47` | Ground-truth harness (rebased from b6adb5b) — pushed |
| `b421a2d` | TD-158 / ADR-020 — evidence-derived confidence arc (shipped) |

> ⚠️ HEAD (`de5da48`) is 6 commits ahead of origin/main (`845e513`). Run `git status`
> before assuming the local docs commits are on origin.

---

## 3. Test Baseline (Verified 2026-07-21)

| Gate | Result |
|---|---|
| `npm run check` | ✅ Passes clean (check:core + evals tsc) |
| `npm run test:unit` | ✅ 531 / 0 — 531 passing, 0 failing, 14.5s |
| Playwright suite (`--list`) | ✅ 320 tests in 54 files |
| forge-ui typecheck | ⚠️ Local only — not in CI (TD-UI-052) |

> ⚠️ These counts are from the 2026-07-21 verification and were **not re-run** in
> this docs-sync commit. Run `npm run check` · `npm run test:unit` to re-confirm
> before citing.
>
> Note: forge-ui tsc is not part of the CI gate. It must be run locally
> before any forge-ui commit. See CI_PIPELINE.md.

---

## 4. Live Open Tech Debt — Highest Priority

Full TD ledger: 234 unique TD/ADR IDs across all sections. Source of truth:
on-disk `TECH_DEBT.md` (verify current size with `wc -l TECH_DEBT.md`).
See `TECH_DEBT_SUMMARY.md` for the full categorised list.

**Critical / High — active investigation or blocking:**

| TD | Priority | Description | Status |
|---|---|---|---|
| TD-064 | Critical | Generate has no behavioural validity self-check. FC-004a remaining. | Open — partially resolved |
| TD-140 | High | Vacuous-green generated specs — a fully-omitted test still passes | Open |
| TD-162 | High | StrategyDetector realLinks=0 on Wikipedia's 376-link page | ✅ Resolved 2026-07-21 — **works as designed**; realLinks=0 is accurate (375/376 anchors cross-origin; realLinks = same-origin navigable). NOT a counting failure. |
| TD-163 | Medium | appType claimed routing (`'spa'`) from a rendering-only marker (`spaDom=1`) | ✅ Resolved 2026-07-22 — refactor landed (0c81b4d/845e513); ADR-021, appType leaves the evidence model. |
| TD-173 | High | detectRenderingModel can never emit `'unknown'` — floors to `'static-rendered'` with no framework marker; a framework app sampled at `domcontentloaded` pre-hydration is mis-measured as static | Open — measurement defect (escalated High 2026-07-21). Blocks Onboard GREEN. |
| TD-166 | High | authType.value is non-deterministic — same app onboarded twice can persist different configs | Open — logged 2026-07-21 |
| TD-167 | Medium | loginUrl can contradict authType in one persisted config | Open — logged 2026-07-21 |
| TD-168 | High | Bootstrap.detect() logs nothing — detection decisions invisible in logs. Likely an ADR needed. | Open — logged 2026-07-21 |
| TD-UI-030 | High | Reporter reports a zero-spec run as PASSED | Open |
| TD-UI-062 | High | Insights tab — InsightsPage.tsx = "Coming soon", insights.ts = 501 stub. Honest DB-backed view unbuilt. | Open |

> ⚠️ TD-166/167/168 remain flagged **investigation before fix** — do not patch on
> contact; diagnose root cause first. TD-173 is the live measurement defect keeping
> the Onboard tab RED. (TD-162/163 are resolved — retained above for milestone
> traceability.)

---

## 5. Current Work in Progress

| Area | Status | Notes |
|---|---|---|
| Ground-truth harness | ✅ Complete | 6d52a47 pushed (rebased from b6adb5b); fixtures human-attested (845e513) |
| Bootstrap detection signals | 🔄 Active | TD-162 closed (WAD), TD-163 refactor landed; TD-166/167/168 + TD-173 open — investigation continues |
| TD-064 FC-004a | 🔄 Partially resolved | FC-001/002/003 fixed — FC-004a remaining |
| forge-ui Tests tab (TD-UI-003) | 🔄 In progress | Design approved — build in progress |

---

## 6. Known Untracked / Unpersisted Items

| Item | Issue |
|---|---|
| `docs/PRODUCT_VISION.md` | Untracked — CLAUDE.md routing table names it as a source of truth for product/branding/roadmap, but it is not in git |
| `notes/` directory | Untracked |
| `reports/2026-07-*/` (~17 dirs) | Untracked — run reports not committed |
| `q.cjs`, `forge-ui/type` | Untracked — unclear purpose, verify with Raj |

---

## 7. Live Test Targets

| App | Type | Model status |
|---|---|---|
| SauceDemo | Multi-page UI | ✅ Model exists (`models/saucedemo/`) |
| OrangeHRM | SPA | ✅ Model exists (`models/orangehrm/`) |
| Restful Booker | REST API | ✅ Model exists (`models/restful-booker/`) |
| UltimateQA | Unknown | ✅ Model exists (`models/ultimateqa/`) — verify type and status with Raj |

> UltimateQA is a 4th test target not previously documented. Verify its
> onboarding status and whether it is actively maintained.

---

## 8. Standing Rules Active

| Rule | Source |
|---|---|
| No commit without Aiden diff review | AI_CONSTITUTION.md 3.5 |
| No push without Rule 9 | AI_CONSTITUTION.md 3.6 |
| Design before code | AI_CONSTITUTION.md 3.2 |
| Audit before fix | AI_CONSTITUTION.md 3.3 |
| TD-166/167/168 — investigation before fix | TECH_DEBT.md standing note |
| GREEN requires both HONEST and CORRECT | TECH_DEBT.md standing rule (2026-07-20) |

> **Standing rule added 2026-07-20 (Raj):** No current GREEN status has been
> verified for correctness — all prior scoring was on honesty alone.
> GREEN requires both dimensions. This applies retroactively.

---

## 9. What to Do First in a New Session

```
1. Run: git status
   → Confirm working tree state and what is unpushed

2. Run: git log --oneline -5
   → Confirm last commits

3. Run: npm run check
   → Confirm type check still passes

4. Run: npm run test:unit
   → Confirm 531/0 baseline

5. Check TECH_DEBT.md for any new TDs logged since last session

6. Confirm with Raj: what is the active task?
```

Do not assume the repo is in the same state as the last session.
Always confirm before touching anything.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
