# TD-064 — Checkpoint 2: Generator Architecture

How to fix the generator so it stops emitting the preventable failure classes
(FC-001/002/003/004a). Builds on the approved Failure Class Catalogue.

Status: DRAFT for Nova review (checkpoint 2 of 3).
Generator: `src/core/onboarding/generators/SpecGenerator.ts`
Element source: `ElementClassifier.classifyElement()` → `ElementDefinition`
Raw crawl data: `RawElement` (`src/core/onboarding/types.ts`)

---

## The key finding (changes everything)

**FORGE already gathers the cardinality evidence — then discards it before generation.**

`RawElement` (the crawler's per-element output) already carries:

- `containerIndex: number | null` — "this element is the Nth of a set of
  structurally-identical siblings" (e.g. the 6 inventory cards → index 0–5).
- `containerHint: string | null` — disambiguating text from that container
  instance (e.g. the product name inside each card).

So when the crawler sees 6 inventory items, **it knows there are 6 and which is
which.** But this evidence is used only to build unique *names*
(`inventoryItemBackpack`, etc.) in `ElementClassifier`, and is **not carried onto
the `ElementDefinition`.** The generator, reading the static model, never learns
the selector is non-unique — so it emits `locator('[data-test="inventory-item"]')`
and asserts a single-element `.toBeVisible()`.

**Implication for "never invent specificity":** we are NOT inventing specificity.
FORGE already crawled the real specificity and threw it away. The fix is to stop
discarding it — carry the evidence forward and assert honestly from it. This is
recovery of earned evidence, not guessing.

---

## The three capabilities, mapped to concrete data

| Capability | Fixes | Evidence source (already exists?) |
|---|---|---|
| Selector Cardinality Awareness | FC-001 | YES — `RawElement.containerIndex/containerHint`, discarded at classify-time |
| Assertion Verification Awareness | FC-002 | PARTIAL — flows were executed during crawl/verify; observed landing URL not consistently captured for the generator |
| State Prerequisite Awareness | FC-003 | PARTIAL — `VerificationRunner` does `waitFor({state:'visible'})`; generator doesn't know which elements are state-gated |

The good news: FC-001 (62%) needs **no new evidence gathering** — only stop
discarding what exists. FC-002/003 may need a small amount of observed-behavior
capture (the "Generation Evidence Layer" Nova flagged) — scoped, not a big build.

---

## FC-001 — Selector Cardinality Awareness (62%, highest priority)

**Root cause:** `containerIndex`/`containerHint` exist on `RawElement` but are not
carried to `ElementDefinition`; generator emits a bare shared selector.

**Two design options (the core checkpoint-2 question for Nova):**

### Option B1 — Carry cardinality onto ElementDefinition, generator decides
- Add a cardinality signal to `ElementDefinition` (e.g.
  `cardinality?: { index: number | null; hint: string | null; isRepeated: boolean }`),
  populated in `classifyElement()` from the `RawElement`.
- Generator reads it and applies Nova's Case 1/2/3:
  - repeated + hint available → emit a **unique** scoped locator (Case 1, best)
  - repeated, multiplicity intentional → honest count assertion `toHaveCount(n)`
    or explicit `.nth(i)` with intent (Case 2)
  - undeterminable → flag needs-review (Case 3)
- **Pro:** model carries the truth; every consumer (generator, verifier, healer)
  benefits. Single source of truth — consistent with FORGE's standing discipline.
- **Con:** touches the model shape + classifier + generator.

### Option B2 — Emit a disambiguated selector at classify-time
- When the classifier detects a repeated element, build a **unique selector**
  immediately (container-scoped via `containerHint`, or an intentful `.nth(index)`),
  store that as the element's selector.
- Generator stays naive — it just emits whatever selector the element carries,
  now guaranteed unique.
- **Pro:** smallest generator change; fixes the selector at the source.
- **Con:** bakes a positional/text selector into the model that could be brittle
  if the page reorders; the generator loses the *option* to assert intentional
  multiplicity (Case 2) because the selector is pre-narrowed to one.

### Aiden's lean: **B1.**
B1 keeps the *evidence* (this element is 1-of-6) in the model and lets the
generator choose the honest assertion per Nova's hierarchy — including Case 2
(assert `toHaveCount(6)`), which B2 forecloses. B2 narrows to one element too
early and loses the ability to test multiplicity honestly. B1 is more work but is
the structurally-correct "model carries earned evidence, consumers decide" shape.

**Open question for Nova:** B1, B2, or a hybrid (carry cardinality in the model
*and* let the classifier pre-compute a unique selector as one of the strategies)?

---

## FC-002 — Assertion Verification Awareness: navigation (21%)

**Root cause:** generator emits `toHaveURL(/inferred/)` from flow-model data,
never verified against where the flow actually lands.

**Design:** the flow was executed during crawl/verification — capture the
**observed landing URL** for each navigation step and assert *that*, not the
inferred one. If no observed URL is available for a step, **omit** the URL
assertion rather than guessing (per the central thesis).

**Evidence question for Nova/checkpoint:** does `VerificationRunner` (which
executes flows) already record observed post-navigation URLs anywhere the
generator could read? If yes → wire it in. If no → small capture addition. This
is the most likely place a minimal "Generation Evidence Layer" appears.

---

## FC-003 — State Prerequisite Awareness (10%)

**Root cause:** generator asserts `toBeVisible()` on elements that are present but
hidden until an interaction (e.g. sidebar needs the menu opened).

**Design:** distinguish *attached* from *visible*. For elements that are
state-gated (hidden at crawl time, or only visible after an interaction):
- if the prerequisite interaction is known → emit it before the assertion;
- if unknown → assert `toBeAttached()` / presence rather than visibility, or flag
  needs-review. Never assert a visibility the test cannot reach.

Overlaps with **TD-013** (prerequisite state for verification) — coordinate so the
two don't create divergent prerequisite logic.

---

## FC-004a — Reachability for actions (~5%)

**Root cause:** generator emits an interaction (`.click()`) against a target not
reachable in the generated flow context.

**Design:** apply "verify before act" — only emit an interaction step the flow
evidence shows is reachable; otherwise omit/flag. Same thesis as assertions,
applied to actions.

**FC-004b (ambiguous):** explicitly NOT addressed — preserved as
`insufficient-evidence`. Do not force-fix.

---

## Cross-cutting principle (ADR-011, proposed)

> *Generated tests shall assert or act only on behavior FORGE has directly
> observed, verified, or can prove from the App Model with high confidence.
> Otherwise: omit, downgrade, or flag for review. The generator must never
> silently invent specificity.*

All four fixes are applications of this one principle.

---

## Proposed build order (after checkpoint-2 approval)

1. **FC-001 first** (62%, evidence already exists) — carry cardinality (B1),
   generator applies Case 1/2/3. Regenerate TC-GEN-026 → must pass.
2. **FC-003** (state-gated visibility) — attached-vs-visible.
3. **FC-002** (observed landing URL) — needs the verification-evidence wiring.
4. **FC-004a** (reachability for actions).
5. Each step: regenerate its representative seed, prove it passes against the real
   app, before moving on. Full regen only after all representatives pass.

---

## Questions for Nova (checkpoint 2)

1. **FC-001: B1 vs B2 vs hybrid?** (Aiden leans B1 — model carries cardinality,
   generator decides; preserves the option to assert intentional multiplicity.)
2. Is a small **observed-behavior capture** (landing URLs for FC-002, visibility
   state for FC-003) acceptable as a scoped addition, or do you want the
   "Generation Evidence Layer" designed as a first-class subsystem now?
3. Build order: FC-001 first by leverage — agree?
4. Anything in the "verify before assert/act" framing that should be sharper
   before it becomes ADR-011?
