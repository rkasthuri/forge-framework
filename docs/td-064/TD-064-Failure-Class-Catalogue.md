# TD-064 — Failure Class Catalogue

Audit of the generated-spec (`TC-GEN-*`) failures, reframed from individual broken
tests into **failure classes** rooted in generator defects.

Source data: `reports/eval-39-failures.json` (original 39) + `reports/fc001-after.json`
(post-FC-001 regeneration). Generator: `src/core/onboarding/generators/SpecGenerator.ts`.

Status: **LIVING DOCUMENT.** FC-001 fixed & proven. Three-way maintained (Raj + Aiden + Nova).

---

## Living-document principle (Nova, checkpoint-2 finding)

**Generator defects can mask other generator defects.** An early audit sees only
*surface* failures; fixing a high-leverage class can *unmask* defects hidden
underneath. Frequencies are **iterative, not absolute**:

> Fix highest-leverage class -> re-run audit -> recalculate frequencies -> repeat.

Each class tracks two numbers:
- **Surface Frequency** — count at initial audit (what the error reported).
- **True Frequency** — count after higher-priority masking defects are cleared.

The catalogue is the *current* understanding and evolves as masking is removed.
Never assume the first audit reveals the complete truth.

---

## Central thesis (ADR-011)

**The generator asserts from the model without verifying reality.** ADR-011 (Accepted):

> Generated tests shall assert or act only on behavior FORGE has directly observed,
> verified, or can prove from the App Model with high confidence. When evidence is
> insufficient: omit, downgrade, or flag for review. FORGE shall never silently
> invent specificity, certainty, or reachability.

---

## Summary (current understanding)

| Class | Name | Surface | True | Preventable | Status |
|---|---|---|---|---|---|
| FC-001 | Non-unique selector (strict-mode) | 24 | 24 | YES | FIXED (proven live) |
| FC-002 | Wrong navigation expectation | 8 | 8 | YES | open — NEXT |
| FC-003 | Visibility without prerequisite state | 4 | 4 | YES | FIXED (proven live) |
| FC-004a | Unreachable interaction target | ~2 | ~2 | YES | open |
| FC-004b | Ambiguous timeout / insufficient-evidence | ~1 | ~1 | NO | preserve (not a defect) |

**Frequency-estimate correction (living document in action):** FC-003 was briefly
estimated at true-freq 8 (4 original + 4 unmasked-from-FC-001). On fixing FC-003,
only 4 cleared — the other 4 (cart-html batch) were never truly FC-003; their
`toBeVisible` symptom was downstream of an FC-002 navigation failure that fires
first (the flow never reaches /cart.html, so the page's element checks fail). So
those 4 are FC-002, not FC-003. FC-003 true frequency resolved to **4**; FC-002
holds at **8**. Lesson: even a "true frequency" is a surface estimate until the
masking class is fixed and the count is observed.

**Live results:**
- After FC-001: 39 -> 15 (+24 passing), 0 regressions, 0 strict-mode remain.
- After FC-003: 15 -> 11 (+4 passing), 0 regressions, FC-001 still clear.
- Cumulative: **39 -> 15 -> 11.** Two classes fixed and proven on live SauceDemo.

---

## Three generator capabilities (Nova's framing)

Not missing features — an **evidence-propagation** problem. FORGE gathers the
evidence at crawl and discards it before generation.

1. Selector Cardinality Awareness -> FC-001  [DONE, proven]
2. State Prerequisite Awareness -> FC-003  [DONE, proven]
3. Assertion Verification Awareness -> FC-002 (next) + the thesis

---

## FC-001 — Non-Unique Selector (Strict-Mode) — FIXED

- **Surface / True:** 24 / 24
- **Status:** Fixed and proven live (39->15, 0 strict-mode remain, TC-GEN-026 passes,
  0 regressions). Commits: dabecf9 (model), d75b648 (classifier), d2706c9 (generator),
  e1ef3ee (regenerated model+specs).
- **Root cause:** containerIndex/containerHint existed on RawElement but were
  discarded after naming; generator emitted bare .locator(selector).toBeVisible()
  on multi-match selectors.
- **Fix (B1, shipped):** carry cardinality onto ElementDefinition
  (cardinality: { kind: 'single' | 'repeated'; index?; hint? }), populated in
  classifyElement; generator emits robust Case 2 for repeated elements:
  expect(loc.first()).toBeVisible() + expect(loc).not.toHaveCount(0)
  ("at least one renders"). Single elements unchanged.
- **Model now carries:** 156 cardinality fields (75 repeated) after re-crawl.

## FC-003 — Visibility Without Prerequisite State — FIXED

- **Surface: 4 -> True: 4** (proven). NOTE: briefly mis-estimated at 8 — see
  frequency-correction note above; 4 of the suspected 8 were FC-002, not FC-003.
- **Status:** Fixed and proven live (15->11, all 4 state-gated cases cleared,
  TC-GEN-025 passes, 0 regressions, FC-001 still clear). Commits: 9128d8e (crawler
  capture), 3907035 (types), 6d1493d (classifier), 442429a (generator), fbc9bbe
  (ADR-011 addendum), e50e53b (regenerated model+specs).
- **Model now carries:** observedState on every element — 24 attached (hidden) /
  132 visible after re-crawl.
- **Representative:** TC-GEN-025 (the hidden burger-menu inventory-sidebar-link).

## FC-002 — Wrong Navigation Expectation

- **Surface / True:** 8 / 8 (unchanged so far)
- **Representative:** TC-GEN-024
- **Root cause:** SpecGenerator (~line 360) emits toHaveURL(/inferred/) from
  flow-model data, not verified against the observed landing URL.
- **Fix posture:** assert the observed landing URL (flow executed during
  crawl/verify), or omit when unverified. Likely needs scoped observed-URL capture.
- **Watch (Nova):** may later split into wrong-destination vs missing-prerequisite.
  Don't split yet.

## FC-004a — Unreachable Interaction Target

- **Surface / True:** ~2 / ~2
- **Fix posture:** "verify before act" — a generated .click() is an assertion that the
  target is reachable; only emit if reachability is evidenced, else omit/flag.

## FC-004b — Ambiguous Timeout / Insufficient-Evidence — PRESERVE

- **Frequency:** ~1 (e.g. TC-GEN-001)
- **Preventable:** NO — legitimate honest uncertainty. Do NOT force-fix; preserve as
  insufficient-evidence.

---

## Build order (by leverage)

1. [DONE] FC-001 (cardinality) — proven (24 cleared).
2. [DONE] FC-003 (state-prerequisite) — proven (4 cleared).
3. FC-002 (observed landing URL, 8 — largest remaining) — NEXT. Needs evidence wiring.
4. FC-004a (reachability for actions, ~2).
5. Preserve FC-004b (~1).

Cumulative: 39 -> 15 -> 11. Next target FC-002.

After each class: regenerate, prove the representative passes live, RE-RUN THE AUDIT
and recalculate frequencies (masking may unmask more), before the next.

## Representative regression seeds

- FC-001 -> TC-GEN-026  [passing]
- FC-003 -> TC-GEN-025
- FC-002 -> TC-GEN-024
- FC-004a -> TC-GEN-001 (or another generator-side timeout)

## Known latent issues (logged, not in current scope)

- Generated flow specs use TIME-BASED IDs in filenames
  (inferred-flow-...-<timestamp>). Regeneration risks orphaned stale specs (git saw
  a rename this time, but divergent content could orphan). -> TD: stable
  deterministic flow IDs, or clean the generated dir before regen.
- tier3Assertions: any[] on ElementDefinition is dead (always [], never read).
  -> TD: remove or implement.
