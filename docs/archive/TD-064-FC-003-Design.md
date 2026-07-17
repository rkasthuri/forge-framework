# TD-064 — FC-003 Design: State Prerequisite Awareness

Fix the second class: visibility assertions on state-gated (hidden) elements.
Builds on the FC-001 pattern. For Nova review before code.

Status: DRAFT for Nova (design fork + one tradeoff to rule on).
True frequency: 8 (surface was 4; FC-001 unmasked 4 more). Now largest open class.

---

## The audit finding (decisive)

**Visibility is NOT captured at crawl time.** `ElementClassifier.harvestElements()`
grabs elements from the DOM via `page.evaluate()` but records **no visibility
state**. So the model harvests the sidebar "All Items" link (it IS in the DOM,
hidden inside the closed burger menu) and has no idea it's hidden — the generator
then confidently asserts `toBeVisible()`, which fails.

Unlike FC-001 (evidence existed, was discarded), **FC-003's evidence does not
exist yet — it must be captured.** This is the scoped evidence-capture Nova
anticipated.

**Good news:** `harvestElements` already runs inside a live-browser
`page.evaluate()`, so a per-element visibility check is cheap (pure DOM, no
Playwright round-trip, no extra crawl pass).

---

## Two approaches

### Approach A — Capture observed visibility, generator downgrades (RECOMMENDED)
- In `harvestElements`'s evaluate, compute per element:
  `isVisible = offsetParent !== null || (rect.width > 0 && rect.height > 0)`
  (catches display:none and collapsed-menu hidden elements).
- Carry it: `RawElement.observedVisible: boolean` -> `ElementDefinition`
  (e.g. `observedVisible?: boolean`), populated in `classifyElement`.
- Generator applies Nova's state ladder at the two emit sites:
  - `observedVisible === true`  -> `expect(loc).toBeVisible()`   (we saw it visible)
  - `observedVisible === false` -> `expect(loc).toBeAttached()`  (in DOM, not provably visible)
  - combine with FC-001 cardinality: repeated + visible -> `.first()).toBeVisible()` + count>0;
    repeated + hidden -> `.first()).toBeAttached()` + count>0.
- **Pro:** evidence-based, honest, ADR-011-aligned, matches FC-001 pattern, cheap
  (few lines in an existing evaluate). Every consumer benefits from observedVisible.
- **Con:** assertion is weaker for hidden elements (attached < visible). See tradeoff.

### Approach B — Detect prerequisite + emit the unlocking step (NOT now)
- Infer that the sidebar needs the menu opened; emit the menu-open click before
  asserting visible.
- **Pro:** stronger test (asserts real visibility after the real prerequisite).
- **Con:** requires inferring "what interaction makes X visible" — a capability
  FORGE does not have; high risk of *inventing* the prerequisite (the exact
  "never invent" trap ADR-011 forbids). This is the FC-003<->TD-013 overlap and a
  much larger build. Defer.

**Aiden's lean: Approach A.** Honest, evidence-based, cheap, consistent. B is better
*testing* but a big, risky capability that can invent specificity. A truthful
weaker assertion beats a false stronger one (ADR-011).

---

## The one tradeoff for Nova to rule on

Approach A downgrades hidden elements from `toBeVisible()` to `toBeAttached()`.

- `toBeAttached()` asserts "element exists in the DOM" — a **weaker** guarantee than
  visible. For a "critical elements visible" check, is attached meaningful enough?
- **Argument for (ADR-011):** it is the strongest state FORGE can *prove*. Asserting
  visible on a hidden element is a lie; asserting attached is honest. An honest
  weaker assertion is correct.
- **Argument against:** a critical element that's *never* visible to a user might
  deserve a flag, not a quietly-downgraded pass. Should observedVisible === false
  on a *critical* element be: (a) downgrade to attached silently, (b) downgrade +
  annotate the test with a comment, or (c) flag for review (Case 3)?

**Question for Nova:** for a hidden critical element — downgrade-silent,
downgrade-annotated, or flag-for-review?
Aiden's lean: **downgrade-annotated** — assert `toBeAttached()` but emit a comment
(`// FORGE: observed hidden at crawl; asserting attached, not visible`) so the
honest limitation is visible to a human reading the test. Keeps the suite green on
a true assertion while surfacing the gap. Pure flag-for-review would re-fail the 8
(no worse than today, but no better either).

---

## Build plan (after Nova approves)

0. Confirm the two emit sites (same as FC-001: ~364, ~439) handle the visible/attached branch.
1. harvestElements: capture observedVisible in the evaluate. (commit)
2. RawElement + ElementDefinition: carry observedVisible. (commit)
3. classifyElement: populate it. (commit)
4. SpecGenerator: state-ladder branch at both emit sites, combined with cardinality. (commit)
5. Re-crawl (default budget) -> regenerate -> test --project=generated.
6. Prove TC-GEN-025 passes; confirm all 8 FC-003 resolve; 0 regressions.
7. RE-AUDIT + recalculate frequencies (FC-003 fix may unmask more — living document).

## Questions for Nova
1. Approach A vs B? (Aiden: A — honest, cheap, no invented prerequisites.)
2. Hidden critical element: downgrade-silent / downgrade-annotated / flag-for-review?
   (Aiden: downgrade-annotated.)
3. Visibility metric: `offsetParent !== null || rect>0` enough, or stricter
   (e.g. computed-style visibility/opacity)? Keep it simple first?
