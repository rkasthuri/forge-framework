<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-021: Semantic Claim Alignment

## Status
Proposed

## Date
2026-07-21

## Principle
> "Every detector output must describe the same property its observations measure. A
> detector may only claim properties directly supported by its observation domain." — Nova

## The distinction — this is the point of the ADR
This is a NEW failure class, not an amendment to ADR-019. Folding it into axis 2 would
lose exactly the distinction that matters:

- **ADR-019 axis 2 — discriminative competence.** The observation is **under-determined**:
  multiple materially different real-world causes produce the *same* value, so the detector
  cannot isolate which one. The evidence is about the right property but **cannot separate
  the competing causes**. *Example: `page.url()` after navigation cannot separate an app
  having moved from an SSO redirect — both yield a different origin.*

- **ADR-021 — semantic claim alignment (this ADR).** The observation is **accurate,
  unambiguous, fully determined, and repeatable** — and the output field claims a property
  in a **DIFFERENT DOMAIN** than the one measured. Not *"the evidence cannot separate
  competing causes"* but *"the evidence is about something else."*

Axis 2 is a limit of the evidence's **resolving power**. This ADR is a mismatch between the
**property measured** and the **property claimed**. A value can be perfectly determined and
still describe the wrong thing.

## Worked example — the whole ADR
`detectAppType`'s marker set `'#root, #app, [ng-version], [data-reactroot]'` observes
**framework mount-point presence**. Its output field claimed **navigation architecture**
(`'spa'`).

Direct evidence (Playwright, 2026-07-21):
- SauceDemo genuinely contains `<div id="root">`. The selector resolved and returned its
  `outerHTML` (the real login page: `Swag Labs`, the login form inside `#root`). Both
  `page.locator().count()` and `page.evaluate(querySelectorAll).length` agree it is **1**.
- Main frame, correct URL (`https://www.saucedemo.com/`), present at `domcontentloaded`, no
  JS wait needed — **no timing artifact, no frame confusion**.
- SauceDemo is **React-rendered AND full-page-reloads on login** — a document request to
  `inventory.html`, confirmed by human inspection of the network panel.

**The count was right. The claim was wrong.** `#root` truthfully reports that a client
framework mounts here; it says nothing about how the app navigates. **Client-side RENDERING
does not imply client-side ROUTING.** The detector measured rendering and claimed routing.

This is not a counting failure (the count is accurate) and not an axis-2 failure (the
observation is unambiguous — `#root` is present, full stop). It is a claim about a property
the observation does not measure.

## Risk — keep this class NARROWLY defined
Standing guidance (Nova): this class is precisely *"a detector emitted a claim about a
property different from the one its observations measure."* It **must not** become a
catch-all bucket for *"the detector did something we dislike."* If the observation genuinely
measures the claimed property but cannot resolve competing causes, that is **ADR-019**, not
this. If the observation lacks provenance, that is **ADR-015**. If the grade exceeds the
evidence, that is **ADR-020**. This ADR applies only when the measured domain and the claimed
domain are **different domains**.

## Second rule (same ADR) — evidence presentation
> "Evidence must make its measurement identity obvious, not merely visible. Metrics from
> different measurement domains must not be presented as though they are comparable
> measurements. A metric name must carry its measurement definition." — Nova

**Worked example, recorded honestly as OUR error.** ADR-020's provenance `reason` strings
printed, for the same page, `appType.links=376` and `crawlStrategy.realLinks=0`. As adjacent
bare integers they read as a contradiction, produced a confidently-wrong diagnosis (a single
shared "counting-failure" class), reclassified two TDs, and drove an investigation — until
direct Playwright evidence falsified it. **Both numbers were correct and were never measuring
the same property:** `links` is a *raw anchor count* (376 `a[href]`); `realLinks` is a
*same-origin navigable-link count* (375 of the 376 anchors are cross-origin language editions,
1 is a hash link → 0). Two different measurements, presented as if comparable.

The lesson is **not** "print less" — the provenance strings are what made these findings
possible at all (ADR-020 §6 stands). The lesson is **make incompatible measurements visibly
incompatible.** A metric label must state its definition:

- `rawDomAnchorCount`, not `links`
- `sameOriginNavigableLinkCount`, not `realLinks`

A reader (or a future detector) comparing `rawDomAnchorCount` against
`sameOriginNavigableLinkCount` cannot mistake them for the same measurement. Names carry the
definition so the incompatibility is legible without opening the code.

## Relationship to its siblings — a new decision, not an amendment
Four laws now govern a claim; each is a different question, and they are siblings:
- **ADR-015 — provenance.** Does the claim have evidence at all?
- **ADR-019 — sufficiency.** Can the evidence express and *uniquely support* the claim?
- **ADR-020 — grade.** How *strongly* may the claim be held?
- **ADR-021 — alignment (this ADR).** Is the claim about the property that was actually
  **measured**?

A value can satisfy 015 (has evidence), 019 (unambiguous), and 020 (honestly graded) and
still violate 021 — a perfectly-determined, well-graded measurement of the *wrong property*.
`spaDom=1 → 'spa'` is exactly that: evidenced, unambiguous, and it was even graded honestly
at `medium`/`evidence-matched` — and it claimed routing from a rendering observation.

## Provenance of this ADR — recorded honestly
Found 2026-07-21 by Raj's manual DOM inspection during ground-truth-fixture authoring, then
established by direct Playwright resolution of the selectors (the counts reproduced exactly,
and were both accurate). **Aiden's initial diagnosis — that TD-162 and TD-163 were one shared
counting-failure class — was WRONG, and was falsified by the investigation** it prompted: the
`#root` count is correct (SauceDemo really has it) and the `realLinks=0` count is correct
(the portal's links are cross-origin). Recording the wrong turn is the point: the confident
mis-diagnosis was itself produced by the presentation defect this ADR's second rule addresses.

## Consequences
- `detectAppType` claims navigation architecture from a rendering observation (TD-163). Under
  this ADR that is a semantic-alignment defect, remediated separately (scoped refactor: emit
  what is observed — framework-rendered vs static-html — not what is inferred).
- The `signals?` metric key set (documented as a fixture-facing contract in the previous
  commit) will rename to definition-carrying names; cheap now because no fixture is filled yet.
- TD-162 is CLOSED, works-as-designed: `realLinks` is *defined* as same-origin different-path;
  0 on a cross-origin portal is accurate. This establishes FORGE's crawler as a **same-origin
  application crawler**, not a general web crawler — cross-origin portal crawling is a future
  capability decision, not a detector correction.

## Implementation note — 2026-07-21 (TD-163 remediation, Commit 2 of 3)
`detectAppType` → `detectRenderingModel`: it emits the OBSERVED rendering
(`framework-rendered` / `static-rendered`), never a navigation claim. The `appType` field
collapses to `'web-ui'` — the PLATFORM discriminator only — and `spa`/`mpa` are removed from
the schema enum. A new optional `renderingModel` field carries the rendering observation.

**Migrator legacy-vocab map — Raj's ruling (2026-07-21): `spa → unknown`, `mpa → unknown`.**
A stored `appType` value has two possible origins — detector-produced (a marker was observed)
or hand-authored config (a human's navigation claim). The migrator cannot distinguish them.
Mapping `'spa'` to a rendering value (`framework-rendered`) would MANUFACTURE an observation
from an unattributable claim — **ADR-021 applied in reverse**. Both legs therefore map to
`renderingModel: 'unknown'`; a fresh crawl observes rendering directly. The value was never
load-bearing. (`ModelMigrator.mapLegacyAppType`.)

The `FlowDetector.ts` `isSpa` heuristic (platform value + page count → navigation architecture)
is the SAME overclaim one layer down; it is left UNCHANGED under a marker comment pending its
own design conversation — **TD-170**.

## Related
ADR-015 (provenance — sibling), ADR-019 (sufficiency — sibling), ADR-020 (grade — sibling).
TD-163 (the detectAppType rendering-vs-routing overclaim this governs), TD-162 (closed WAD —
the same-origin `realLinks` definition), the ground-truth-fixture work that surfaced both.
