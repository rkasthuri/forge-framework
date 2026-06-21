# Implementation Brief — TD-016 / TD-017 / TD-019 (bundled) + Role Strategy Contract Fix

> **PARTIALLY SUPERSEDED — this brief's closing instructions are stale, do not follow
> them as written.**
> Only TD-019's wrong-button/wrong-authPage half of Part 1 was resolved, in commit
> `d6f7550` ("Fix TD-019 wrong-button half (Part 1 of TD-016/017/019 brief)"). TD-016
> and TD-017 remain **open** — see `TECH_DEBT.md`'s Open table — not resolved,
> despite this brief's "General reminders" section below instructing that all three
> (TD-016, TD-017, TD-019) be moved to Resolved together once Part 1 landed.
>
> TD-016 stays open because removing the wrong login-step derivation only freed
> `mergeConfigSeeded()` to eventually parse a `FlowHint`'s real business-step content
> — the free-text-parsing work itself, which is TD-016's actual ask, was never built.
> TD-017 stays open because eliminating the auth-derived flow candidate only stopped
> it from masking the pre-existing navigation-edge candidate meant to replace it —
> that candidate is itself non-functional, blocked on TD-026 (`Crawler.ts` hardcoding
> every `StateEdge.trigger` to the literal string `'navigation'`). See
> `TECH_DEBT.md`'s TD-016/TD-017 entries (Session 13 update) for the full detail.
>
> Part 2 below — the role-strategy compound-value defect, originally stacked inside
> the combined TD-019 entry — is now tracked as its own ID, **TD-029**, split out once
> the wrong-button half resolved. Part 2's scope, decision, and plan below are still
> accurate and still the plan for TD-029 — it is this brief's closing instructions
> (the "General reminders" section's resolution claim), not its design, that are
> stale.
>
> `TECH_DEBT.md` is authoritative over this brief's "General reminders" section.

**Status:** Design signed off by Raj + Aiden. Ready for Claude Code implementation.
**Scope note:** This brief formally bundles TD-016, TD-017, and TD-019 — investigation
showed they are not three independent bugs but three symptoms of the same wrong
assumption in `FlowDetector` (that compiled flows need to re-derive login). It also
covers a second, unrelated defect (role-strategy value format) found during the same
investigation, kept as a clearly separated section below. Both fixes follow the
project's "fix root cause, even if it takes longer" preference — explicitly stated by
Raj — over a quicker per-symptom patch.

Per standing rules: this is the design. Implement exactly this scope. If you find
something else that needs fixing, log it as a new TD item; do not fix it inline.

---

## Part 1 — FlowDetector: stop re-deriving login (resolves TD-016, TD-017, TD-019)

### Root cause (confirmed by investigation, not hypothesis)
- `FlowDetector.mergeConfigSeeded()` (line 219) and `identifyCandidates()` (line 138)
  both do `this.pages.find(p => p.isAuthPage)` to locate a login page and compile
  explicit fill/click login steps into the flow.
- The real login page (e.g. OrangeHRM's `/auth/login`) is **structurally never in
  `this.pages`** — `AuthManager.authenticate()` handles login entirely outside the
  crawl (navigates, fills, clicks, returns the post-auth `startUrl`).
  `PageVisitor.visit()` is never called against the login URL.
- `isAuthPage` is a DOM heuristic (`PageVisitor.ts:89-91`: "does this page have a
  password input?") — not a reference to the actual login route. On OrangeHRM, this
  heuristic matches unrelated password-gated pages (e.g. the Maintenance module's
  re-auth prompt) before ever finding a real login form, because no real login form
  is present in the array to find.
- Confirmed deterministic across 5 independent real crawls, pre- and post-TD-014 —
  not related to TD-014's old non-determinism.
- This produces three symptoms from one cause:
  - **TD-019**: wrong page resolved → wrong button clicked → malformed role-selector
    embeds and breaks generated TypeScript.
  - **TD-017**: on SauceDemo, login happens to coincidentally work (its login page is
    the base URL the crawl naturally visits) — but the compiled flow's explicit login
    steps then collide with the fixture's own already-performed login → double login.
  - **TD-016**: `mergeConfigSeeded()`'s attention is consumed by deriving login
    steps from a `FlowHint`, so the rest of the hint's described business flow
    (add-to-cart, checkout, etc.) never gets compiled.

### Decision
Stop compiling login steps into flows at all. Flows assume the role's fixture has
already authenticated (it has — that's what the generated fixture / `AuthManager`
equivalent does at runtime, before the test body or flow ever runs). Compiled flows
should contain only the post-login business steps described by the `FlowHint` (or
inferred from page-to-page navigation, for the inferred-flow path).

### Scope

1. **Remove login-step derivation from `mergeConfigSeeded()`**
   - Delete the `this.pages.find(p => p.isAuthPage)` lookup and the
     `usernameEl`/`passwordEl`/`submitEl` fill/click step construction that follows
     it.
   - The function's job becomes: parse the `FlowHint`'s full text into the actual
     business steps it describes (this is the TD-016 fix — give it the rest of the
     hint to work with now that login-derivation isn't consuming its scope). If
     structured parsing of free-text hints is itself a separate, harder problem,
     scope this brief to at minimum stop emitting *wrong* login steps and compiling
     whatever structured step data is already available — flag back if free-text
     parsing turns out to need its own design conversation rather than fitting in
     this fix.

2. **Remove the identical lookup from `identifyCandidates()` (line 138)**
   - Same fix, same reasoning, even though it's not currently exercised for
     OrangeHRM (per investigation Q5, OrangeHRM's `detectFlows()` skips the
     inferred-flow path). Fix it anyway since it's the same defect and would misfire
     identically for any app/role whose login flow goes through inference.

3. **Verify the fixture/`AuthManager` contract this design now depends on**
   - This fix assumes every flow-consuming role already gets authenticated by its
     fixture before the flow's compiled steps run. Confirm this is actually true for
     every current role across all three apps (`standardUser`, `lockedUser`,
     `adminUser`, Restful Booker's equivalent if any) before relying on it — if any
     role's fixture does NOT pre-authenticate, that role needs explicit handling
     (flag back, don't assume).

### Out of scope (flag, don't fix)
- Structured/non-free-text `FlowHint` authoring format — if TD-016's fix reveals that
  free-text parsing genuinely needs replacing with a structured step list (as
  originally speculated in TD-016's own notes), that's a new design conversation, not
  something to build unprompted here.
- `SpecGenerator` prerequisite-awareness (TD-023) — unrelated, do not touch.

### Evidence required before this is marked resolved
- Re-run OrangeHRM `onboard:generate`. `admin-login`'s compiled flow must no longer
  reference `viewMaintenanceModule:confirm` — show the actual compiled flow steps.
- Re-generate SauceDemo's `generated/` directory. The double-login symptom (TD-017)
  must be gone — show all previously-failing inferred-flow specs now passing, or
  failing for a clearly different, unrelated reason.
- Show `checkout-happy-path`'s compiled flow now includes real add-to-cart/checkout
  steps (TD-016's symptom), not just login + assert-navigation.
- Confirm `npm run check` passes with zero errors after regeneration on both apps.
- Real run output for all of the above — no summarized claims.

---

## Part 2 — Role strategy value format (latent on SauceDemo, live-breaking on OrangeHRM)

### Root cause (confirmed by investigation)
- `ElementClassifier.buildRoleSelector()` constructs a single compound string:
  `${role}[name='${accessibleName}']` (e.g. `button[name='Confirm']`).
- Three consumers disagree on what this string should be:
  - `VerificationRunner.ts:665`, `SpecGenerator.ts:272` both assume `.value` is a bare
    ARIA token and wrap it themselves: `` [role="${strategy.value}"] ``.
  - `EmitHelper.ts:54` assumes `.value` is already a complete, ready-to-use locator
    string and returns it as-is.
- Even the "correct" consumer's assumption is built on an invalid foundation —
  `[role="button[name='Confirm']"]` is not valid CSS regardless of escaping;
  bracket-attribute selectors can't be nested like that. The actual correct
  Playwright construct for "role with an accessible name" is
  `page.getByRole(role, { name: accessibleName })` — two arguments, not one string.
- Confirmed at scale: 507/1023 OrangeHRM role-type strategies are compound-valued and
  every one of those 507 is the primary strategy (OrangeHRM's DOM mostly lacks
  data-test/id, so role strategies aren't deprioritized). SauceDemo has the identical
  defect in 46/56 role strategies, currently masked because data-test priority wins
  there — this is a framework-level bug, not OrangeHRM-specific.
- No consumer (`SpecGenerator.bestSelector()`, `VerificationRunner.strategyToSelector()`)
  validates strategy value shape against its declared type at all.

### Decision
Split the role strategy into two real fields instead of one concatenated string.
Each consumer builds its own correct Playwright construct from clean, unambiguous
data — no consumer parses or guesses a string's internal format again.

### Scope

1. **Add `accessibleName` as a distinct field on the role-type strategy** (alongside
   the existing `value`, which becomes the bare role token only — e.g. `button`, not
   `button[name='Confirm']`).
   - Update `ElementClassifier.buildRoleSelector()` (or its equivalent call site) to
     populate both fields instead of concatenating.

2. **Update all three consumers to build the correct Playwright role locator from
   the two fields:**
   - `VerificationRunner.strategyToSelector()` (`:661-670`)
   - `SpecGenerator.bestSelector()` (`:266-277`)
   - `EmitHelper.ts:54`'s `case 'role'`
   - Target output: `page.getByRole(value, { name: accessibleName })` when
     `accessibleName` is present, `page.getByRole(value)` when it isn't — not a CSS
     string in either case. Confirm this is consistent with however SmartLocator
     currently resolves non-CSS locator strategies (if SmartLocator's resolution
     path assumes everything is a CSS-compatible string today, that's a dependency
     to check and handle, not assume away).

3. **Add a type/shape validation guard** in `bestSelector()` and
   `strategyToSelector()` — if a strategy's value doesn't match what its declared
   type requires, fail loudly (throw or skip with a clear log) rather than silently
   emitting broken output. This is defense-in-depth independent of the role-specific
   fix — protects against the next type/value mismatch nobody's found yet.

### Out of scope (flag, don't fix)
- Any other strategy type's value format (`text`, `data-test`, `id`, etc.) — only
  `role` is confirmed broken. Don't go auditing every type speculatively unless you
  find evidence of a similar issue; if you do, log it as a new TD, don't fix inline.

### Evidence required before this is marked resolved
- Re-run OrangeHRM generation. The `confirm` element (and a sample of other
  role-primary elements) must produce valid, compiling TypeScript using
  `getByRole(...)`, not a CSS string.
- Confirm SauceDemo's previously-latent 46 compound role strategies are also fixed
  (even though masked today, they'd surface the moment OrangeHRM-style sparse-DOM
  apps get onboarded, or if SauceDemo's own DOM ever loses a data-test attribute) —
  show before/after for at least one.
- Trigger the new validation guard deliberately (e.g. a hand-crafted bad strategy)
  and confirm it fails loudly rather than emitting broken output silently — same
  evidence standard as TD-014/TD-013's degraded-budget repro.
- `npm run check` passes with zero errors after regeneration on both apps.

---

## General reminders
- Real run output required for every evidence item above — no summarized or inferred
  claims of success.
- Commit Part 1 and Part 2 as separate, clearly-scoped commits — they're independent
  root causes that happen to be diagnosed together, not one change.
- Update `TECH_DEBT.md`: move TD-016, TD-017, TD-019 to Resolved (Part 1) and TD-019's
  role-format half... — note TD-019 itself was two stacked defects; make sure the
  resolution note is clear about which commit fixed which half. Add a note if any new
  TD surfaces from item 3 (validation guard) revealing other latent issues.
- If anything in this brief doesn't match what you find in the actual code once
  inside it — stop and report back rather than improvising, same as TD-013/TD-014.
- This is the slower, root-cause path per Raj's explicit preference over a quicker
  per-symptom patch — don't shortcut back to a narrower fix mid-implementation
  without checking back first.
