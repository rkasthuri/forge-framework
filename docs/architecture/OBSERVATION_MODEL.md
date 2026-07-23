<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# The Observation Model — Design (for review)

## Status
**CONFIRMED DESIGN — still DESIGN ONLY, NOT authorized to build.** The design is settled and
confirmed; this is **not** authorization to implement it. **Confirmation of a design ≠ approval of a
build.** **Two gates remain before any implementation, both of which must clear first:**
1. **TD-064 first** — Nova's sequencing, adopted.
2. **TD-173 gates this design** — if the observation producer cannot honestly emit `'unknown'`,
   every downstream characterization inherits contaminated evidence (Nova, 2026-07-21).
Review state — **COMPLETE**: **Aiden reviewed 2026-07-21** (multiple revisions); **Nova reviewed
2026-07-21** (five rulings incorporated); **Raj CONFIRMED 2026-07-21.**

## Proposed location
`docs/architecture/OBSERVATION_MODEL.md` (this file) — it defines an architectural evolution
(observers-produce-evidence), so it belongs beside `ARCHITECTURE_NORTH_STAR` and
`ARCHITECTURAL_PRINCIPLES`, not in `project/` (not status) or `td/` (not a defect).

---

## 0. The reframing (the premise everything below serves)

FORGE should never ask *"what kind of application is this?"* It should ask *"what navigation
behaviours have I actually observed?"*

- **Observation discovers facts. Characterization summarises accumulated observations.**
- **Persist observations. Derive characterizations.** The persisted artifact is never
  `appType = 'spa'`. It is a set of *things that happened*, from which a characterization is
  derived **on demand** and **strengthens as evidence accumulates**. "SPA" is a human-friendly
  summary, never a stored truth.

This is TD-159's positive pattern (Heal verifies directly; Triage preserves uncertainty with
`insufficient-evidence` first-class) applied to onboarding and crawling: **detectors that
produce conclusions → observers that produce evidence.**

**Rejected (do not design toward):** the passive-listener that monkey-patches
`history.pushState` and promotes to `'spa'` on the first call. Two defects — one `pushState`
becoming an architectural label is the inference engine Nova warns against; and patching the
page's runtime is **mutation** (§7). Its de-escalation / TD-064-first instinct was right and
is already adopted.

---

## 1. Observation types

Every observation is a *thing that HAPPENED*, in a stated context, recorded as a side effect
of an operation FORGE performed anyway (§7). Each carries a name that states **what was
measured, not what might be inferred** (ADR-021). None of these is "the app is X."

### 1a. Navigation observations (the highest-value class; NATURAL evidence)
| observation (a fact that happened) | what is recorded | mechanism | consumer(s) → §3 |
|---|---|---|---|
| `full-document-load-on-transition` | a URL transition occurred AND a document was fetched (unload + `load`) | CDP `Page.frameNavigated` + `Page.loadEventFired` — a document request accompanied the URL change; during a **natural** transition (login, an approved crawl hop) | crawl-strategy, generator |
| `same-origin-transition-without-document-unload` | the URL changed, same origin, with **no** document request / no `load` | CDP `Page.navigatedWithinDocument` correlated with **no accompanying document request** (per the §1a constraint — never `framenavigated` alone, which fires for BOTH types); during a natural transition | crawl-strategy, generator, TD-014 |
| `cross-origin-redirect-on-transition` | a transition left the configured origin (SSO/IdP/proxy) | landing origin ≠ configured origin across a natural navigation | diagnostics, authType/identity surfaces |

The distinction that matters — *full reload* vs *same-document transition* — is verified on real
apps. **SauceDemo login is a same-document transition**: the URL becomes `/inventory.html` with
**no document request** (Raj, 2026-07-21, Network panel, clean single-action incognito run), so it
illustrates the `same-origin-transition-without-document-unload` row above — NOT the full-reload
row. SauceDemo is framework-rendered AND client-routed; it is not a full-reload app (TD-175
corrected an earlier claim that it was). A **verified** full-document-load-on-transition example is
the spike's Case C — `example.com → iana.org`, a link click that fetches a new document
(`docs/architecture/spikes/spike-q1-pushstate-vs-navigation.txt`). Do not substitute an unverified
app for either side.

**Design constraint — a same-document observation requires BOTH signals, never
`Page.navigatedWithinDocument` alone.** Record `same-origin-transition-without-document-unload`
only when the URL changed via `navigatedWithinDocument` **AND no document request accompanied it**.
The event alone is ambiguous: a static host's SPA-fallback (a cold load of a deep URL →
`404 → /deep-path → 200`) produces document requests that a naive reader attributes to the click
that preceded them — which is exactly how this same event was misread in BOTH directions on
2026-07-21, the disambiguator each time being whether a document request accompanied it. So:
**same-document = `navigatedWithinDocument` AND no accompanying document request** — correlate the
CDP `Network` / `page.on('load')` document-request stream against the URL change; never read the
URL change in isolation.

> **RESOLVED 2026-07-21 (Q1; TD-175).** *Question:* can Playwright/CDP distinguish a History-API
> `pushState` transition from a full navigation **without** `page.evaluate()`-patching the page's
> `history`? **Answer: YES — but only via CDP, not Playwright's Frame API.** The Q1 spike
> (`docs/architecture/spikes/spike-q1-pushstate-vs-navigation.txt`) dumped `mainFrame()`'s public
> methods to test the Frame API directly: there is **NO same-document indicator on it**, and
> `page.on('framenavigated')` fires for **BOTH** transition types (so it cannot distinguish them).
> The distinction is available only at the **CDP** level — `Page.navigatedWithinDocument`
> (same-document) vs `Page.frameNavigated` (full load) — correlated with the document-request
> stream per the design constraint above (`navigatedWithinDocument` AND no accompanying document
> request). **Corroborated by direct human observation** (Raj's clean-run Network-panel check that
> SauceDemo login fetches no document), so the distinction rests on human evidence, not tooling
> alone — and the correlation requirement is what kept the same event from being misread in both
> directions on 2026-07-21.

### 1b. Rendering observations (PASSIVE; reveal rendering, NOT navigation)
These are the honest successors to the retired `appType='spa'` marker (TD-163).
| observation | recorded | mechanism |
|---|---|---|
| `framework-mount-observed` | a framework mount point (`#root`/`#app`/`[ng-version]`/`[data-reactroot]`) was present at count time | DOM count (today's `frameworkMountPointCount`) |
| `framework-script-observed` | a framework `<script>` was present | DOM count (`frameworkScriptCount`) |
| `dom-mutation-after-domcontentloaded` | the DOM changed after `domcontentloaded` (hydration signal) | CDP `DOM` domain events (`childNodeInserted` / `childNodeRemoved` / `attributeModified`) after load — no page-runtime patch (Q2, resolved below) |

Rendering ≠ navigation. `framework-mount-observed` says a client framework *mounts*; it says
nothing about *routing* — the entire ADR-021 lesson, now structural (rendering and navigation
are different observation classes that cannot be confused).

> **REQUIRES VERIFICATION (do not assume):** `dom-mutation-after-domcontentloaded` names no CDP
> domain above because `MutationObserver` is a *page-runtime* API — reaching for it via
> `page.evaluate()` would cross the mutation boundary (§7) inside a section that claims to
> respect it. Verify whether post-`domcontentloaded` DOM mutation is observable at the CDP level
> (e.g. `DOM`/`Page` domain events) **without any page-runtime patch**. If it is not, this
> observation type is **REMOVED**, not obtained by patching.
>
> **RESOLVED 2026-07-21 (Q2).** *Answer: YES* — the CDP **`DOM` domain** observes
> post-`domcontentloaded` mutation with no page-runtime patch. The Q2 spike
> (`docs/architecture/spikes/spike-q2-cdp-dom-mutation.txt`) recorded `DOM.childNodeInserted`,
> `DOM.childNodeRemoved`, and `DOM.attributeModified` firing after load — real playwright.dev
> hydration produced **73** `childNodeInserted` (plus 5 removed, 7 attributeModified) with no
> `evaluate()` / `MutationObserver` injection. So this observation type **STAYS** (not removed),
> and its mechanism is the CDP `DOM` domain — not a "MutationObserver-equivalent".

### 1c. Load-lifecycle observations (PASSIVE)
| observation | recorded | mechanism |
|---|---|---|
| `post-load-network-activity` | XHR/fetch occurred after the `load` event | CDP `Network` events, at load |
| `time-to-first-interactive-signal` | elapsed time until a settling condition was met | the settling-policy clock |

### 1d. What CANNOT be observed within FORGE's execution boundary — state it plainly
- **The application's routing *configuration*.** FORGE observes individual transitions, never
  "this app uses a client router" as a fact. A characterization is the closest it gets.
- **Behaviour on states FORGE never reaches** — unreached routes; post-auth flows when auth
  fails; anything beyond the crawl frontier.
- **Server-side vs client-side rendering conclusively** — hydration timing is a proxy, not proof.
- **The existence of a transition type never exercised** — absence of an observation is *not*
  an observation of absence (the low-vs-unknown distinction, §4).

---

## 2. Provenance (apply the existing laws; invent no new machinery)

Every observation carries — using the same shape the TD-148 login-surface surface already
ships (`LoginSurfaceSignal`: value + `mechanism` + `observationBoundary`):

- **value** — the fact, stated factually (ADR-015: a claim requires evidence).
- **mechanism** — how it was obtained, *including the method's blind spot* (ADR-020 §6).
- **observationBoundary** — what it does NOT indicate; the competing causes (ADR-021 / the
  login-surface `notImplied`→`observationBoundary` rename). e.g. `full-document-load` does not
  indicate the app has *no* client routes elsewhere.
- **source / evidence-class** — `passive` | `natural` (§7); never `exploratory`.
- **context — STRUCTURAL, not left to a reader:**
  ```
  context: { phase: 'pre-auth' | 'during-auth' | 'authenticated' | 'mid-crawl',
             role, url, runId, observedAt }
  ```
  An observation from a **pre-auth login surface is not equivalent** to one from an
  authenticated session — the TD-148 door-vs-room lesson. `phase` makes that a field a
  consumer branches on, not prose a reader must infer. A characterization (§6) may weight or
  exclude by phase (e.g. navigation seen only pre-auth is weaker evidence about the app).

This is the **same provenance discipline** already shipped for login-surface observations —
extended, not reinvented.

---

## 3. Consumers (Nova's 4th criterion: every observation has a real downstream consumer, or drop it — ADR-017)

| observation | consumer | what it does with it |
|---|---|---|
| `full-document-load-on-transition` | **crawl-strategy selection** | full reloads → link-following (BFS) is viable |
| `same-origin-transition-without-document-unload` | **crawl-strategy selection** | client transitions → traversal must **click**, not just follow `href`s → directly informs **TD-014** (SPA crawl discovers only one hop because link-following can't see client routes) |
| `same-origin-transition-without-document-unload` | **generator** | generated tests navigate via the *observed* mechanism (click vs URL) instead of assuming URL navigation |
| `cross-origin-redirect-on-transition` | **diagnostics / identity surfaces** | honest SSO/redirect record (successor to the retired identity-divergence signal). **The consumer MUST branch on `context.phase`, not merely read the value:** a cross-origin redirect observed **pre-auth** carries NO information about the application behind the door — treating it as if it did is precisely the TD-148 door-vs-room failure. Only an observation whose `phase` is `authenticated`/`mid-crawl` may inform an identity claim; a pre-auth one is recorded and explicitly excluded. |
| `framework-mount-observed` / `dom-mutation-after-domcontentloaded` | **settling-policy selection** | framework rendering → SPA-aware settling for auth/element detection (the honest job `appType='spa'` was *misused* for) |
| all | **reports / forge-ui diagnostics** | human-facing evidence (the CrawlDiagnostics panel, TD-UI-064) |

Any proposed observation without a consumer here is **dropped** — telemetry without
architectural value is an ADR-017 empty channel. (Under this rule, e.g. a bare
`framework-script-observed` earns its place only via settling + diagnostics; if neither
consumes it, it goes.)

---

## 4. Persistence model

**Where — a sibling `observations[]`, NOT `crawlDiagnostics[]` (RULED, Nova 2026-07-21).** The App
Model is the source of truth (ADR-001). Observations live in a **new sibling array**
`app.crawlMetadata.observations[]` — deliberately **not** folded into `crawlDiagnostics[]`:
diagnostics explain FORGE's **execution** (what the crawl did, why it degraded); observations
describe the **application's reality** (what the app actually did). Different lifecycles, different
consumers, different semantics — they must not share a store. No second source of truth otherwise
(Standing Rule 5); characterizations are **never persisted** (they are derived, §6), which keeps
this from becoming a parallel representation of "app type."

**Shape (illustrative — NOT a schema edit).** Each observation stays CONTEXTUALIZED — never a bare
value (see the observation-identity constraint, §6):
```
observations: [
  { type: 'same-origin-transition-without-document-unload',
    context: { phase: 'mid-crawl', role: 'standardUser', url: '…', runId: '…', observedAt: '…',
               appVersion: '…' /* optional, where available — see the gap note below */ },
    source: 'natural', mechanism: '…(+blind spot)', observationBoundary: '…' },
  …
]
```
> **`appVersion` (application version/build) is a NEW field, and FORGE has NO source for it today.**
> No build/version identifier is emitted anywhere in the pipeline. It is specified here as
> **optional-where-available** so the record can carry it *if* a source is ever added (a build
> stamp, an ETag, a deployed-commit header) — until then it is absent, and the read-time fold must
> not assume it. This is a stated gap, not a capability we have.

**Accumulation across runs — RULED (B) read-time fold (Nova, 2026-07-21).** This **overrules** the
design's earlier (A) carry-forward recommendation and Aiden's relay. The App Model is a per-crawl
snapshot (`Crawler` builds a fresh model each run); each snapshot persists ONLY its own run's
`observations[]`. Accumulation is a **read-time fold over historical `app_models` rows** — never a
carry-forward of prior observations into the current model, and **never** a carried-forward derived
characterization (characterizations are recomputed, never stored — §6).

**Contextualization is a constraint on the observation record, not an option (Nova's answer to the
false-contemporaneity risk).** History is NOT one undifferentiated set. Every observation stays
contextualized by its **run, application version/build (where available), timestamp, and
observation context** (the `context{}` block above). The false-contemporaneity hazard — a
`full-document-load` observed 30 runs ago and a `same-origin-transition` observed today reading as
*concurrent* evidence about one app that was rewritten in between — is answered NOT by weighting a
merged set, but by keeping every observation attributed so that **the read-time fold defines its
own inclusion policy** (which runs / versions / time-window count as evidence for *this*
characterization) over records that never lost their context.

**Validity / staleness.** An observation from a prior run **remains valid** but ages — it carries
`observedAt`/`runId` (and `appVersion` where available). Observations do not expire; the read-time
**fold's inclusion policy** decides which of them count as evidence for a given characterization
(e.g. same build, or within a time window) — an evidence-based INCLUSION decision, never a
statistical weighting of a merged set (§6 constraint (b)). A `full-reload-on-login` seen 30 runs
ago is still a valid record; whether it informs today's characterization is the fold's call, made
on its context, not on its value.

**"not yet observed" vs "observed and found nothing" — the ADR-020 low-vs-unknown distinction,
one layer up, and the crux of the whole model.** The observation set contains **positive
observations only.** Therefore:
- **Absence** of a `same-origin-transition-without-document-unload` observation = **UNKNOWN**
  (the transition type was never exercised) — NEVER "the app is not client-routed."
- A **positive** `full-document-load-on-transition` observation IS evidence (a full reload
  happened) — but of *that transition*, not of the whole app.
This structurally forbids the ADR-020 §2 asymmetry that has bitten authType and rendering
detection repeatedly: **you cannot conclude "static" from the absence of a client-transition
observation**, because the model has no field for "no client routing" — only for transitions
that *happened*. Empty set → `unknown`, full stop.

**This rule's absence-floor precondition now HOLDS in the shipped code (TD-173 RESOLVED
2026-07-23, `7e2783f`).** `detectRenderingModel` now returns `'unknown'` at the floor when no
framework marker is found (after a delayed sample) — never `'static-rendered'`, which was retired
from the schema enum. The exact asymmetry this rule forbids is gone; a freshly-crawled model is no
longer *less* honest than a migrated one. (The broader observation model remains the target, not
the current state — only this §4 absence-floor precondition is now met in shipped code.)

---

## 6. The characterization layer

A characterization (e.g. `navigation-model: client-routed | server-routed | unknown`) is a
**derived, on-demand** summary, **never persisted**, subject to Nova's criteria:

- **Every characterization identifies the observations it depends on — no hidden derivations.**
  It returns not just a label but the evidence list: *"client-routed, from 2×
  same-origin-transition-without-document-unload (mid-crawl, standardUser)."*
- **Removing one observation weakens it PREDICTABLY, and the design makes that checkable.**
  The derivation is a **pure function of its inputs** — `characterize(observations, asOf)`.
  **Time is a parameter, not an ambient read:** `asOf` (the reference instant recency is
  measured against) is *supplied by the caller*, never read from the environment/clock inside
  `characterize`. That is precisely what keeps the function pure despite recency weighting
  (§4) — and purity is what makes the next property checkable. So a test can hold `asOf` fixed,
  delete one observation, and assert the output weakened (e.g. confidence 2→1, or
  `client-routed`→`unknown` when the last transition observation is removed). *If deleting an
  observation changes nothing, the observation was unnecessary (drop it, §3) or the
  characterization was over-asserted (fix the derivation).*
- **`navigation-characteristics-unknown` is first-class**, and the crawl proceeds unharmed when
  navigation is never observed — the strategy falls back to a safe default, honestly graded
  low (ADR-020), exactly as today.
- **Graceful degradation** — every consumer (§3) must handle an empty/`unknown` characterization
  (crawl-strategy: safe default; generator: URL-nav assumption with a stated blind spot;
  reports: "unknown"). No consumer breaks on an empty observation set.
- **CONTINUOUS, never an onboarding phase (RULED, Nova 2026-07-21).** Characterization is not a
  step that runs once and freezes a verdict; it is the **current interpretation of accumulated
  evidence**, recomputed whenever asked. Consumers ask *"what do we currently know about this app's
  navigation?"* — **never** *"what did Bootstrap decide at onboarding?"* Rationale (Nova): this
  eliminates a whole class of stale-decision defects — a conclusion frozen at onboarding cannot be
  wrong-because-old, because there is no frozen conclusion, only the latest fold over the evidence.
- **Cacheable but never authoritative (INVARIANT, Nova 2026-07-21):** *"Characterizations are
  cacheable but never authoritative. The authoritative truth is always the observation set. If a
  cache and a recomputation disagree, recomputation wins."* Rationale (Nova): it prevents future
  pressure to persist derived conclusions for convenience — a cache is an optimization, never a
  source of truth; the moment it diverges from a fresh fold, it is discarded.

**Design constraints on the read-time fold (Nova's three risks, 2026-07-21):**
- **(a) DETERMINISTIC.** The fold is a pure function — the same observation set + the same `asOf`
  MUST always yield the same characterization. This is the purity §6 already requires, now a
  protected invariant: no ambient reads, no clock inside the fold, no ordering nondeterminism.
- **(b) NO historical averaging.** The characterization stays **evidence-based, not statistical** —
  it reasons about which observations happened in which contexts; it never averages values across a
  merged history — UNLESS a statistic is *itself* the intended observation (an explicitly-observed
  rate, recorded as its own observation type).
- **(c) OBSERVATION IDENTITY.** Two observations are distinct because they were made in **DIFFERENT
  CONTEXTS**, not because they produced different values. **Concrete consequence for the record
  shape:** an observation's identity is its `context{}` (run, version-where-available, timestamp,
  phase/role/url), never its value — so two identical values from two runs are **two** observations
  (both retained, both attributed), and two different values are never merged or de-duplicated into
  one. The record keys on context; the fold never collapses records by value.

The characterization is the ONLY place "SPA" (as a word) may appear — as a human-friendly
rendering of `client-routed`, in a report or the UI, with its evidence attached. It is never
stored, never a field a downstream branch keys off as a fact.

---

## 7. The mutation boundary (design against it structurally, not by convention)

Three evidence classes (Nova's, adopted):
- **PASSIVE OBSERVATION** — document lifecycle, hydration timing, network/mutation activity
  during load. Reveals *rendering*, not navigation.
- **NATURAL TRANSITIONS** — transitions the workflow already performs: authentication, expected
  redirects, crawler-approved traversals. The **highest-quality** navigation evidence, requiring
  no mutation beyond the workflow's own purpose.
- **EXPLORATORY INTERACTION** — clicks performed *solely to classify*. **THESE MUST NOT EXIST.**

**Structural enforcement (not a policy the reviewer must remember):**
1. **The observer cannot navigate or click.** It is a **read-only listener** on Playwright's
   browser-level events, attached to operations the crawl performs for its *own* operational
   reasons (page discovery, auth). It has no `click`/`goto` capability. Therefore it *cannot*
   perform an exploratory interaction — the capability is absent, not merely forbidden. Every
   observation is a side effect of a navigation that had an operational reason; there is **no
   "observation pass"** that traverses to gather evidence.
2. **Browser-level, never page-runtime.** Observation uses `page.on(...)` / CDP domains
   (`Page`, `Network`) — Playwright *instrumenting the browser*. It **never** `page.evaluate()`s
   a patch onto the app's `history.pushState` or any page function. **Mutation includes altering
   the application's RUNTIME, not only its data** — the rejected reviewer's `pushState` patch is
   mutation and is out of bounds. (Precedent: crawl exploration once clicked "Add to cart"-style
   buttons and silently mutated application *state*; the same discipline now covers runtime.)
3. **Consumer-gated (ADR-017, §3).** An observation with no operational consumer is dropped —
   removing the incentive to "collect more evidence" for its own sake, which is the root of
   exploratory interaction.

> **REQUIRES VERIFICATION:** that the navigation distinctions in §1a are fully obtainable at the
> browser/CDP level (rule 2) without any page-runtime patch. This is the single feasibility
> question the whole model rests on; verify before implementation, and if it fails, §1a
> degrades to `unknown` for client transitions rather than reaching over the boundary.

---

## How the model explains (or fails to explain) the open items

| item | how the observation model addresses it |
|---|---|
| **TD-163** — the SPA marker does not discriminate (retired, not solved) | **Structurally dissolved.** The marker becomes a *rendering* observation (`framework-mount-observed`); navigation is a *separate* observation class. A rendering observation can no longer masquerade as a navigation claim — the two live in different parts of the model and no characterization derives navigation from rendering. |
| **TD-170** — FlowDetector infers navigation from a platform value + page count | **Constrained by Nova's ruling (2026-07-21), not closed.** FlowDetector consumes the navigation characterization **only where navigation knowledge is genuinely required**, and **retains `deriveFlowConfidence` as its confidence model**: the navigation characterization SUPPLIES evidence; flow grounding stays FlowDetector's own responsibility. TD-170 remains its **own design conversation** — this ruling constrains it, it does not decide it. |
| **TD-014** — SPA crawl discovers only one hop | **Directly informed.** A `same-origin-transition-without-document-unload` observation tells crawl-strategy the app is client-routed → traversal must click, not follow `href`s → which is exactly the fix TD-014 needs. The model produces the signal; the crawl-strategy change is the downstream work. |
| **SPA-hydration blind spot** (authType + rendering) | **Converted from a false conclusion to an honest `unknown`.** A rendering observation at `domcontentloaded` that finds no framework marker records "not-yet-observed", not "static" — and a later observation (post-hydration, mid-crawl) can add a positive observation that strengthens the characterization. The §4 low-vs-unknown rule keeps the characterization at `unknown` until a positive observation arrives, instead of concluding "static" from an unhydrated read. |
| **TD-173** — the rendering absence-floor | **RESOLVED 2026-07-23 (`7e2783f`) — the §4 precondition now HOLDS.** `detectRenderingModel` now returns `'unknown'` at the floor (no framework marker after a delayed sample), never a false `'static-rendered'` (retired from the schema enum; the migrator normalizes stored values to `'unknown'`). The low-vs-unknown crux (§4) this model rests on is now satisfied in shipped code — a freshly-crawled model is no longer *less* honest than a migrated one. (Row kept as the record of a dependency that was VIOLATED and is now met — no longer a blocker.) |

The first four are addressed BY the model: TD-163 dissolved, TD-170 enabled-not-decided, TD-014
directly informed, the hydration blind spot converted to honest-unknown. **TD-173 was different in
kind** — a §4 precondition that shipped code contradicted — but it is now RESOLVED (2026-07-23,
`7e2783f`): the floor emits `'unknown'`, so the precondition holds and the dependency is met.

---

## What changes for the ground-truth fixture work

If **observations** rather than **labels** are persisted, a fixture asserts against
**observations (facts a human can verify)**, and optionally the derived characterization:

- **Primary (facts):** for SauceDemo — `same-origin-transition-without-document-unload`
  **present** (login: the URL becomes `/inventory.html` with no document request; Raj, 2026-07-21,
  Network panel), and `full-document-load-on-transition` **not-observed** on that transition. For
  a verified full-document-load, use the spike's Case C — `example.com → iana.org`, a link click
  that fetches a new document (`docs/architecture/spikes/spike-q1-pushstate-vs-navigation.txt`).
  These are exactly what a human verifies in the network panel (Raj's method). **"not-observed"
  here is NOT a negative claim** — it records that this transition type was not exercised by the
  observed action, never that it cannot occur; asserting it as `absent` would convert an absence
  into an observation of absence, the exact §4 error this document exists to forbid (empty →
  `unknown`, never a "does not do X" claim). The existing assertion types apply to what WAS
  observed: `present` for a transition that occurred; count facts use `atLeast`/`equals` (and
  `absent`/`equals 0` where a count is genuinely zero, e.g. SauceDemo's `rawDomAnchorCount`) — but
  a transition type that was simply not exercised is OMITTED, never asserted `absent`.
- **Derived (optional):** `characterize(observations, asOf) → navigation-model equals
  client-routed`, with its evidence list — a fixture may assert the derivation too (pinning
  `asOf` for determinism), but the ground truth it rests on is the observation assertions.
- The retired `appType notEquals 'spa'` starter is replaced by observation assertions +
  (optionally) a characterization assertion. This **aligns the fixture harness with the
  observation model**: assert what happened, then optionally what it derives to — never a
  stored label.

---

## Constraints honored / open decisions for review

- **No code, no schema edits, no listeners, no new files except this document.** Illustrative
  shapes above are design, not schema.
- **Verification status, collected** (questions preserved; answers recorded — an unclaimed
  verification is the same honesty-floor violation as an unverified claim):
  - **(1) RESOLVED 2026-07-21 (TD-175).** *Does Playwright/CDP distinguish pushState vs full-load
    at the browser/CDP level without page-runtime patching?* **YES** — CDP `Page.navigatedWithinDocument`
    vs `Page.frameNavigated`, correlated with the document-request stream; the Playwright Frame API
    has no same-document indicator. Corroborated by Raj's direct Network-panel observation. Spike:
    `docs/architecture/spikes/spike-q1-pushstate-vs-navigation.txt` (§1a, §7 — the load-bearing question).
  - **(2) OPEN.** Cross-run observation accumulation via `app_models` versioning without
    double-counting (§4) — genuinely unresolved; for Nova.
  - **(3) RESOLVED 2026-07-21.** *Is post-`domcontentloaded` DOM mutation observable at CDP level
    without a page-runtime patch?* **YES** — CDP `DOM` domain (`childNodeInserted` /
    `childNodeRemoved` / `attributeModified`); playwright.dev hydration produced 73 insertions, so
    `dom-mutation-after-domcontentloaded` STAYS. Spike:
    `docs/architecture/spikes/spike-q2-cdp-dom-mutation.txt` (§1b).
- **Decisions RULED by Nova (2026-07-21):** persistence = **(B) read-time fold** (§4); shape =
  **sibling `observations[]`, not `crawlDiagnostics[]`** (§4); FlowDetector consumes the navigation
  characterization only where navigation is genuinely required and keeps `deriveFlowConfidence`
  (TD-170 — constrained, not closed). Plus the cadence (continuous), the cacheable-not-authoritative
  invariant, and the three fold constraints (§6). Genuinely still open: the cross-run fold mechanics
  — item (2) above — and the `appVersion` source gap (§4).

Design **CONFIRMED 2026-07-21** — Aiden reviewed (multiple revisions), Nova reviewed (five rulings
incorporated), Raj confirmed. Implementation remains **gated on TD-064 and TD-173** (see the Status
block): a confirmed design is not an approved build.
