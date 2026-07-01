# TD-064 — Failure Class Catalogue

Audit of the generated-spec (`TC-GEN-*`) failures, reframed from individual broken
tests into **failure classes** rooted in generator defects.

Source data: `reports/eval-39-failures.json` (original 39) + `reports/fc001-after.json`
(post-FC-001 regeneration). Generator: `src/core/onboarding/generators/SpecGenerator.ts`.

Status: **LIVING DOCUMENT.** FC-001, FC-003, FC-002 fixed & proven (3 preventable classes closed, 0 regressions). Three-way maintained (Raj + Aiden + Nova).

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
| FC-002 | Wrong navigation expectation | 8 | 8 | YES | FIXED (proven live) |
| FC-003 | Visibility without prerequisite state | 4 | 4 | YES | FIXED (proven live) |
| FC-004a | Unreachable interaction target | ~2 | 5 | YES | FIXED (proven live) |
| FC-004b | Ambiguous timeout / insufficient-evidence | ~1 | 1 | NO | preserve — NEXT (only remaining) |

**Frequency-estimate correction (living document in action):** FC-003 was briefly
estimated at true-freq 8 (4 original + 4 unmasked-from-FC-001). On fixing FC-003,
only 4 cleared — the other 4 (cart-html batch) were never truly FC-003; their
`toBeVisible` symptom was downstream of an FC-002 navigation failure that fires
first (the flow never reaches /cart.html, so the page's element checks fail). So
those 4 are FC-002, not FC-003. FC-003 true frequency resolved to **4**; FC-002
holds at **8**. Lesson: even a "true frequency" is a surface estimate until the
masking class is fixed and the count is observed.

**FC-002 reclassification (re-audit after fix):** removing the false `toHaveURL` gate
unmasked the real failure beneath the 8 FC-002 tests. 8/8 wrong-URL assertions resolved;
4 of those tests now pass outright, and the rest reclassify to **FC-004a (reachability)**
— the flows never truly reach cart/checkout (inferred nav), so once the false URL
assertion is gone the downstream element/interaction fails. The predicted "wrong
assertion was masking a real reachability gap" outcome.

**Live results:**
- After FC-001: 39 -> 15 (+24 passing), 0 regressions, 0 strict-mode remain.
- After FC-003: 15 -> 11 (+4 passing), 0 regressions, FC-001 still clear.
- After FC-002: 11 -> 6 (+5 passing), 0 regressions, FC-001 + FC-003 still clear; 8/8 wrong-URL resolved.
- Cumulative: **39 -> 15 -> 11 -> 6.** Three preventable classes fixed and proven on live SauceDemo, 0 regressions.

---

## Three generator capabilities (Nova's framing)

Not missing features — an **evidence-propagation** problem. FORGE gathers the
evidence at crawl and discards it before generation.

1. Selector Cardinality Awareness -> FC-001  [DONE, proven]
2. State Prerequisite Awareness -> FC-003  [DONE, proven]
3. Assertion Verification Awareness -> FC-002  [DONE, proven]

**Headline lesson (Nova):** *The generator is an evidence consumer, not an inference
engine. The more evidence the App Model carries, the thinner and more trustworthy the
generator becomes.*

**Through-line — "FORGE knows more than the generator":** FC-001, FC-003, and FC-002
were all evidence FORGE *observed at crawl then discarded* before generation —
cardinality, visibility, and navigation-grounding respectively. Each fix is the same
move: carry the observed evidence onto the App Model and let the generator consume it.

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

## FC-002 — Wrong Navigation Expectation — FIXED

- **Surface / True:** 8 / 8
- **Status:** Fixed and proven live (11->6, 8/8 wrong-URL assertions resolved,
  TC-GEN-024 passes, 0 regressions, FC-001 + FC-003 still clear). Commits: af14f2e
  (model), ffbb2bc (flowdetector), 844221d (generator), cd10fe6 (regenerated model+specs).
- **Representative:** TC-GEN-024 (passing).
- **Root cause:** SpecGenerator emitted toHaveURL(/inferred/) from flow-model data,
  not verified against an observed navigation. FlowDetector already distinguished real
  (observed) edges from inferred fallbacks but discarded that signal before the step.
- **Fix (shipped):** grounding ('observed' | 'inferred') on FlowStep, tagged by
  FlowDetector (real edge / bootstrap = observed; no-real-edge fallback = inferred).
  Generator asserts toHaveURL(/pattern/) only for observed nav; downgrades inferred to
  `not.toHaveURL(/404|error/i)` with annotation; omits the assertion entirely (comment
  only) when a prior step in the same flow is also inferred (broken prerequisite chain).
- **Model now carries:** grounding on flow steps — 7 inferred / 6 observed after re-crawl.
- **Re-audit (Nova's split confirmed):** the unmasked failures are observed-but-unreachable
  downstream effects (FC-004a), not wrong-destination. See reclassification below.

## FC-004a — Unreachable Interaction Target — RESOLVED

- **Surface / True:** ~2 / 5 (grew after the FC-002 re-audit).
- **Status:** RESOLVED — proven live, by-id (aggregate untrustworthy per TD-080). All
  preventable members now pass via honest omission. Commits: `8c780a9` (Stage 1 —
  critical-elements batch omit on unverified nav), `72aafb4` (Stage 2+3 — grounding-aware
  click gate, precedence-ordered).
- **Disposition of the 6 post-FC-002 failures:**
  - **TC-GEN-034 / TC-GEN-013** — RESOLVED: critical-elements batch OMITTED on unverified
    nav (a prior step is inferred → page not proven reached). Stage 1, `8c780a9`.
  - **TC-GEN-002** — RESOLVED: click OMITTED (`omissionReason=interaction-never-observed`)
    — ungrounded inferred-flow builder path (grounding undefined, TD-081). Stage 2, `72aafb4`.
  - **TC-GEN-003** — RESOLVED: click OMITTED (`omissionReason=prerequisite-unverified`) —
    observed click but the prerequisite chain to reach it is unverified. Stage 2+3 merged, `72aafb4`.
  - **TC-GEN-001** — EJECTED: OrangeHRM cross-app contamination (the `generated` project
    globs all apps' specs; per-app TC-GEN ids collide), NOT a SauceDemo defect → tracked as **TD-080**.
  - **TC-GEN-045** — DEFERRED to **FC-004b**: locked-user; preserve as insufficient-evidence
    (likely fix = the test's expectation — assert an error message, not navigation).
- **HONESTY NOTE (load-bearing):** all 4 resolutions pass by truthfully **OMITTING**
  unbackable assertions/interactions — NOT by testing those flows. Cart positive-
  verification and deep-checkout coverage remain **OUT OF SCOPE** (they require the missing
  evidence — TD-013 / agentic crawl). **"FC-004a resolved" = "the generator stopped
  overclaiming," NOT "cart/checkout is now covered."**
- **Surface vs True frequency (living document):** the FC-002 fix unmasked FC-004a;
  FC-004a's resolution now leaves **FC-004b (TC-GEN-045)** as the next surfaced class.
  Re-audit after FC-004b.

## FC-004b — Ambiguous Timeout / Insufficient-Evidence — PRESERVE

- **Frequency:** 1 — **TC-GEN-045 (Locked User Login)**.
- **Why preserve:** the locked user *correctly* cannot navigate; the test's `waitForURL`
  expectation is the defect, not the app. Expectation should be insufficient-evidence /
  assert an error message, NOT navigation.
- **Preventable:** NO — legitimate honest outcome. Do NOT force-fix; preserve/relabel.

---

## Build order (by leverage)

1. [DONE] FC-001 (cardinality) — proven (24 cleared).
2. [DONE] FC-003 (state-prerequisite) — proven (4 cleared).
3. [DONE] FC-002 (nav grounding) — proven (8/8 resolved).
4. [DONE] FC-004a (reachability for actions, 5) — proven (034/013 batch-omit; 002 omit-ungrounded;
   003 omit-prerequisite; 001 ejected to TD-080). Honest omission, not new coverage.
5. Preserve FC-004b (1 — TC-GEN-045) — NEXT / only remaining.

Cumulative: 39 -> 15 -> 11 -> 6. FC-004a resolved by omission (no test-count delta — the 4 stopped
failing by no longer overclaiming). Next target FC-004b, then re-audit.

After each class: regenerate, prove the representative passes live, RE-RUN THE AUDIT
and recalculate frequencies (masking may unmask more), before the next.

## Representative regression seeds

- FC-001 -> TC-GEN-026  [passing]
- FC-003 -> TC-GEN-025  [passing]
- FC-002 -> TC-GEN-024  [passing]
- FC-004a -> TC-GEN-034 (cart nav never lands) / TC-GEN-001 (click timeout)
- FC-004b -> TC-GEN-045 (locked user — preserve)

## Known latent issues (logged, not in current scope)

- Generated flow specs use TIME-BASED IDs in filenames
  (inferred-flow-...-<timestamp>). Regeneration risks orphaned stale specs (git saw
  a rename this time, but divergent content could orphan). -> TD: stable
  deterministic flow IDs, or clean the generated dir before regen.
- tier3Assertions: any[] on ElementDefinition is dead (always [], never read).
  -> TD: remove or implement.
