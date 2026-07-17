# Implementation Brief — TD-013 ONLY

> **SUPERSEDED — DO NOT IMPLEMENT AS WRITTEN.**
> This brief was drafted without knowledge that TD-013 had already been resolved
> two days earlier, in commit `9a0ec90` ("Fix TD-013: run page prerequisite steps
> before verification", 2026-06-18) — *before* TD-014 was resolved (2026-06-20),
> not after, despite this file's "HOLD until TD-014 clears" status line below.
>
> The shipped fix uses a different design than this brief specifies: a manual,
> per-app `OnboardingConfig.pagePrerequisites` config-hint mechanism (compiled
> onto `PageDefinition.prerequisites` by `Crawler.applyPagePrerequisites()`, run
> by `VerificationRunner` via the existing `executeStep()`), not the
> auto-detected stateful/stateless tagging — sourced from `MUTATING_TEXT_PATTERNS`
> and `FlowDetector`'s flow data, with a REVIEW-tab editable override — described
> in the Scope section below.
>
> The shipped fix is verified live and working, not a defect: see `TECH_DEBT.md`'s
> TD-013 Resolved entry (`reports/verify/saucedemo-verify-report.json`:
> `setupFailures: []`, 103/103 elements incl. all 22 `cart-html` criticals, HIGH
> confidence). The scalability gap this brief's auto-detection design would have
> addressed is now tracked as **TD-024**. This brief's item 4 (the SpecGenerator
> follow-on) is tracked as **TD-023**.
>
> Retained below for historical record only — do not hand this off for
> implementation.

**Status:** Design signed off by Raj + Aiden. HOLD — do not release to Claude Code
until TD-014 evidence has been reviewed and confirmed resolved. This file exists ready
to hand off the moment that checkpoint clears.

**Scope boundary:** This brief covers TD-013 only.

Per standing rules: this is the design. Implement exactly this scope — no silent
bundling, no fixing adjacent things found along the way. If you find something else
that needs fixing, log it as a new TD item in `TECH_DEBT.md` with the next available
ID and a one-line description; do not fix it inline.

---

## TD-013 — VerificationRunner Prerequisite State

### Problem
`VerificationRunner` navigates directly to a page's URL with no prerequisite state
setup. Breaks verification of stateful pages — e.g. `cart.html` on SauceDemo fails
every cart-item element check because the cart is empty on direct navigation, not
because elements/selectors are wrong.

### Decision
Option C — classify pages as stateless/stateful, build prerequisites only for the
stateful subset, sourced from existing data rather than a new model.

### Scope

1. **Statefulness tagging during crawl, not a separate classification pass**
   - Reuse the `MUTATING_TEXT_PATTERNS` signal already added in the Session 7 fix
     (`SPAStrategy.discoverViaButtonText`). If a page was only reached because a
     mutating action was taken (e.g. "Add to cart" → cart page now has items), tag that
     page `stateful` in the App Model, recording the triggering action.
   - All other pages default `stateless`.
   - This must be additive to the App Model schema (a new field per page), not a
     parallel/duplicate tracking structure.
   - Note: this depends on TD-014's discovery changes being in place and verified —
     do not start this work until that checkpoint has cleared, since the App Model
     shape this reads from is what TD-014 touches.

2. **Human-editable override in REVIEW tab**
   - Surface the `stateless`/`stateful` tag per page in the existing REVIEW tab UI as
     an editable field — not a new tab, not a new review surface.
   - This is the safety valve for heuristic misclassification; it must be visibly
     editable, not just present in underlying data.

3. **Prerequisites sourced from `FlowDetector`, not reinvented**
   - For pages tagged `stateful`, `VerificationRunner` must pull the prerequisite
     action(s) from the flow data `FlowDetector` already produces for that page — do
     not build a second, independent prerequisite-step store.
   - `VerificationRunner` runs the prerequisite flow step(s) before verifying a
     `stateful` page's elements.

4. **`SpecGenerator` is explicitly out of scope here**
   - Whether generated standalone-page specs need the same prerequisite-awareness is a
     separate question. Do not touch `SpecGenerator` as part of this TD.
   - **Action:** log a new TD in `TECH_DEBT.md` referencing TD-013, scoped to
     "`SpecGenerator`-generated standalone page specs may have the same
     missing-prerequisite issue TD-013 fixed for `VerificationRunner`" — for a future
     design conversation, not bundled now.

### Out of scope (flag, don't fix)
- `SpecGenerator` changes — see item 4, log a new TD instead.
- Any new prerequisite-step storage mechanism independent of `FlowDetector`'s existing
  flow data — explicitly rejected in design.

### Evidence required before this is marked resolved
- Re-run SauceDemo verification. `cart.html` (the originally identified failing case)
  must pass element verification with prerequisite state correctly set up first.
- Confirm at least one `stateless` page (e.g. login page) still verifies via direct
  navigation with no behavior change — no regression on the existing-working path.
- Show the stateful/stateless tag surfaced and editable in the REVIEW tab for at least
  one app, with real screenshot/output evidence — not just a code-level claim.
- New TD entry for the SpecGenerator follow-on is actually present in `TECH_DEBT.md`
  after this work, with the next available ID.

### Reminders
- No code without this design — this brief **is** the sign-off; proceed directly to
  implementation once released.
- Evidence-gated: real test counts, real run output, real screenshots — no optimistic
  claims of success without it.
- Commit message scoped to TD-013 only, accurately described.
- Update `TECH_DEBT.md`: move TD-013 from Open to Resolved with the commit hash once
  evidence is captured, plus add the new SpecGenerator follow-on TD to Open.
