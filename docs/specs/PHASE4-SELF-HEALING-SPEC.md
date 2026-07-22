# Phase 4 — Self-Healing Engine Specification

**RYQ AI Testing Framework**
**Status:** SIGNED OFF — ready to build
**Author:** Aiden
**Date:** June 2026

---

## 1. Vision

When a locator fails, the framework heals itself — without human intervention,
without a separate server, without external tools. Healing knowledge persists
across runs so the framework gets smarter over time.

This is the capability that makes the framework *truly* AI-augmented rather
than just AI-assisted.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Test calls POM method                    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — SmartLocator (selector strategy chain)            │
│  data-test → id → role → text → CSS                          │
│  Try each strategy in order until one resolves               │
└──────────────────────────┬──────────────────────────────────┘
                  fails?   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2 — Claude Vision Recovery                            │
│  Screenshot → Claude identifies element → returns selector   │
└──────────────────────────┬──────────────────────────────────┘
                  heals?   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Selector Store (heal memory)                      │
│  reports/heal-store.json — healed selectors win next run     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4 — Heal Report (CI visibility)                       │
│  What healed, how, confidence — per run, in pipeline          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 5 — POM Auto-Update Proposals (advanced, later)       │
│  3+ consecutive successful heals → propose POM change        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

```
src/
├── healing/
│   ├── SmartLocator.ts        ← Layer 1: strategy chain wrapper
│   ├── VisionHealer.ts        ← Layer 2: Claude Vision recovery
│   ├── HealStore.ts           ← Layer 3: persistent heal memory
│   ├── HealReporter.ts        ← Layer 4: per-run heal report
│   └── types.ts               ← shared healing types
│
├── pages/
│   └── BasePage.ts            ← MODIFIED: healing-aware helpers
│
reports/
├── heal-store.json            ← persistent healed selector memory
└── heal-report-{run}.json     ← per-run heal audit
```

---

## 4. Layer Specifications

### Layer 1 — SmartLocator

The core abstraction. Wraps element resolution in a strategy chain.

```typescript
interface SelectorStrategy {
  name: 'data-test' | 'id' | 'role' | 'text' | 'css';
  selector: string;
}

interface SmartLocatorDef {
  key: string;                    // unique id, e.g. "login.loginButton"
  strategies: SelectorStrategy[]; // ordered, primary first
  description: string;            // human description for Vision healing
}
```

Behavior:
1. Check HealStore — if a healed selector exists for this key, try it FIRST
2. Try each strategy in order with a short per-strategy timeout (2s)
3. First strategy that resolves a visible element wins
4. If a non-primary strategy wins → record a heal event
5. If ALL strategies fail → escalate to Layer 2 (Vision)
6. If Vision fails → throw with full heal-attempt audit in the error

Design rules:
- Healing is OPT-IN per locator via `SmartLocatorDef` — critical locators only
  (buttons, fields, nav). List-item locators stay plain Playwright.
- Total healing overhead budget: max +10s per element, only on failure path.
  Happy path (primary selector works) adds ZERO overhead.
- `HEALING_DISABLED=true` env var turns the whole engine off (CI emergency
  lever and for measuring baseline behavior).

### Layer 2 — VisionHealer

Only invoked when every selector strategy fails.

1. Capture viewport screenshot + simplified DOM snapshot (tag/id/data-test/
   text of interactive elements only)
2. Send both to Claude (claude-sonnet-4-5) with the element `description`
3. Claude returns: best-guess selector + confidence (0–1) + reasoning
4. Confidence ≥ 0.8 → try the selector; if it resolves → heal event recorded
5. Confidence < 0.8 → do not attempt; fail with audit

Constraints:
- Max 1 Vision call per element per test (no retry loops burning tokens)
- Max 5 Vision calls per full suite run (budget cap, configurable)
- Vision disabled when `ANTHROPIC_API_KEY` missing — degrade gracefully to
  Layer 1 only

### Layer 3 — HealStore

`reports/heal-store.json`:

```json
{
  "login.loginButton": {
    "healedSelector": "#login-button",
    "strategy": "id",
    "firstHealed": "2026-06-09T...",
    "lastUsed": "2026-06-09T...",
    "consecutiveSuccesses": 4,
    "source": "strategy-chain | vision"
  }
}
```

Rules:
- Healed selector is tried FIRST on subsequent runs (before primary)
- If the ORIGINAL primary selector starts working again → heal entry retired
- `consecutiveSuccesses` ≥ 3 → flagged in heal report as POM-update candidate
- Store is committed back to repo by CI (same mechanism as run-history.json)

### Layer 4 — HealReporter

Per-run output `reports/heal-report-{runId}.json` + markdown summary:

- Elements healed this run (key, strategy used, confidence)
- Vision calls made / budget remaining
- POM update candidates (3+ consecutive successful heals)
- Heal failures (everything attempted, nothing worked)

CI integration: heal summary appended to the existing PR comment block.

### Layer 5 — POM Auto-Update (deferred)

Not built in Phase 4.0. Spec'd for later:
- Reads POM-update candidates from heal report
- Generates a diff against the relevant Page Object
- Opens a PR with the proposed selector change (never auto-merges)

---

## 5. BasePage Integration

Minimal, surgical change — no rewrite of existing pages:

```typescript
// BasePage gains one protected helper
protected smart(def: SmartLocatorDef): SmartLocator {
  return new SmartLocator(this.page, def);
}
```

Page Objects opt in selectively:

```typescript
// LoginPage example — only critical elements
readonly loginButton = this.smart({
  key: 'login.loginButton',
  description: 'The main login submit button on the login form',
  strategies: [
    { name: 'data-test', selector: '[data-test="login-button"]' },
    { name: 'id',        selector: '#login-button' },
    { name: 'css',       selector: 'input[type="submit"]' },
  ],
});
```

`SmartLocator` exposes `click()`, `fill()`, `isVisible()`, `textContent()`,
`waitFor()` — the same surface tests already use, so test code does not change.

Existing `smartLogin()` in LoginPage is RETIRED once SmartLocator lands —
superseded by the general mechanism (EC011 gets rewritten against the new
engine).

---

## 6. Build Order

```
4.1  types.ts + SmartLocator (Layer 1) + unit-style verification spec
4.2  HealStore (Layer 3) — yes, before Vision; strategy-chain heals must
     persist before we spend API tokens
4.3  HealReporter (Layer 4) + CI wiring
4.4  VisionHealer (Layer 2) + budget controls
4.5  Migrate critical locators in all 8 Page Objects to SmartLocator
4.6  Retire smartLogin(), rewrite EC011 as a true healing test
     (sabotage a selector, verify the chain heals it)
4.7  Full suite validation: chromium + webkit + CI green
```

Each step gets validated before the next begins. No step starts until the
previous one passes the stable suite.

---

## 7. Success Criteria

1. Sabotage test: rename a primary selector in a test copy of the POM →
   suite still passes, heal report shows the heal
2. Zero overhead on happy path (suite duration within 5% of baseline)
3. Vision budget respected (≤5 calls/run, graceful no-key degradation)
4. Heal store survives CI runs and is honored on subsequent runs
5. 118-test baseline stays green throughout (53 stable chromium + webkit + API)

---

## 8. Decisions — SIGNED OFF

1. **SmartLocator migration scope:** Critical-path first (login, add-to-cart,
   checkout buttons). Expand to remaining locators after Phase 4 is proven.
2. **Heal store persistence:** Committed to repo as `reports/heal-store.json`.
   Same mechanism as `run-history.json` — visible history, survives CI runs.
3. **Vision budget:** Configurable via `VISION_HEAL_BUDGET` env var, defaulting
   to 5 calls per run. Set in `.env` locally and as a GitHub Secret in CI.
