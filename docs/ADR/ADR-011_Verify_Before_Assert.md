# ADR-011: Verify Before Assert (Generated Tests Assert Only Earned Evidence)

Date: 2026-06-30
Status: Accepted

## Context

FORGE's spec generator emitted assertions derived from the App Model's static
structure without verifying they held against the actual application. This produced
a large class of broken generated tests (TD-064): non-unique-selector strict-mode
violations, unverified navigation expectations, and visibility assertions on
state-gated elements. The root cause is asserting from inference rather than from
earned evidence — the same failure mode FORGE's truth-telling thesis forbids
elsewhere (triage, healing, confidence).

## Decision

Generated tests shall assert or act only on behavior FORGE has directly observed,
verified, or can prove from the App Model with high confidence.

When evidence is insufficient, FORGE shall omit the assertion/action, downgrade it
to a weaker assertion it can prove, or flag the artifact for review.

FORGE shall never silently invent specificity, certainty, or reachability.

When FORGE cannot prove visibility, it shall assert the strongest state it can prove and surface the
limitation to human reviewers (e.g. an inline annotation downgrading toBeVisible to toBeAttached).

## Scope

This principle applies beyond the generator — to selectors, navigation
expectations, healing, flow inference, triage, and future coverage analysis.
Wherever FORGE does not know which thing it means, it must not pretend that it does.
TD-064 (the generator) is the first concrete application.

## Consequences

Positive:
- Generated tests are trustworthy: they assert what FORGE can prove.
- "insufficient-evidence" remains a legitimate, honest outcome, not a defect to hide.
- Consistent with source-of-truth discipline (the App Model carries earned evidence;
  consumers decide behavior from it).

Negative:
- The generator must carry/consume more evidence (cardinality, observed URLs,
  visibility state) rather than guessing — more plumbing.
- Some assertions become weaker (e.g. attached vs visible) or are omitted when
  unprovable — fewer but honest assertions.

## Related Documents
docs/td-064/ (Failure Class Catalogue, Generator Architecture), TECH_DEBT.md (TD-064),
ARCHITECTURE_NORTH_STAR.md (truth-telling thesis).

---
### Corollary (FC-004a): Assertion confidence cannot exceed prerequisite confidence

Generated assertions shall not exceed the confidence of the prerequisites on
which they depend. When a step depends on a prerequisite whose grounding is
uncertain, the dependent assertion must be weakened or omitted to match — never
asserted at full strength.

Applied consistently across the TD-064 failure classes, this yields one
three-valued decision (full / downgraded / omit), driven by dependency
confidence:

- Unverified navigation (prior step inferred; page not proven reached)
  -> OMIT dependent page/element assertions + annotate. Element presence is
     unprovable if arrival is unproven; toBeAttached would be an equal overclaim.
- Single inferred hop (path to page intact, only final hop uncertain)
  -> DOWNGRADE: toBeVisible -> toBeAttached (presence honestly holdable,
     visibility not).
- Hidden element observed at crawl (FC-003)
  -> DOWNGRADE visibility -> toBeAttached.
- Non-unique selector observed at crawl (FC-001)
  -> emit robust repeated-case form (.first() + not.toHaveCount(0)).
- Fully observed / verified prerequisite
  -> FULL assertion (toBeVisible / toHaveURL).

The per-element assertion FORM (FC-001 cardinality, FC-003 observedState) is
orthogonal to and nested beneath this per-dependency capability decision.
---

### Layer boundary (FC-004a): Generation emits evidence; Triage emits classifications

The generator's job is to emit only what the observed evidence supports — assert,
downgrade, omit, annotate — and to record WHY (evidence, limitations, rationale).
It must never assign a TD-063 triage category (app-bug / test-defect /
infra-defect / flaky / insufficient-evidence). Those are runtime OUTCOME
classifications answering "what happened when the test ran?" and belong solely to
the triage layer.

If the generator stamped classifications, the same taxonomy would live in two
layers (generation + triage) and drift — the two-sources-of-truth failure FORGE
has deliberately eliminated elsewhere. Therefore:
- Generation: emit / omit / downgrade / annotate (+ machine-readable
  omissionReason tokens where an interaction is omitted).
- Triage: assign TD-063 categories at runtime, consuming the generator's evidence
  and reasons.

Example (FC-004a): a click on an observed-but-prerequisite-unverified element is
OMITTED with omissionReason=prerequisite-unverified; whether the resulting
downstream uncertainty is "insufficient-evidence" is triage's call, not the
generator's.
---

### Persist observed evidence (FC-004b)

If FORGE observes something important at any phase, it must PERSIST that
observation rather than discard it and let a later phase re-infer it from
side-effects. Re-inference downstream is the proxy trap: it reconstructs a fact
FORGE already knew, from a correlated signal that only approximates it.

Example (FC-004b): the crawler observes a role's authentication outcome directly
(the `authenticated` flag). Persisting RoleDefinition.authOutcome
(succeeded|failed|unknown) lets the generator omit auth-failed roles from the
REAL observed outcome. The rejected alternative — inferring "auth failed" from
empty reachablePageIds — is inference, not observation: a role can reach zero
pages for reasons other than auth failure, and "authentication failure is itself
evidence" that deserves to be recorded, not reconstructed.

This is the persistence corollary to "Verify Before Assert" and to the
generation/triage layer boundary: the generator can only consume evidence that
earlier phases took care to persist.

---

### Verdict quality cannot exceed input quality (TD-067)

A triage verdict is only as trustworthy as the input it was derived from.
When the input is stale, partial, unverifiable, or invalid, the verdict must
be marked accordingly — not presented as current truth.

Applied in TD-067: InputHealth (healthy|stale|degraded|invalid|unknown) is
assessed before classification. When input_health !== 'healthy', all
classifications in that run have confidenceSource forced to 'fallback',
and the triage markdown header carries an explicit health banner instead of
a fabricated timestamp.

This is the same principle as:
- "Assertion confidence cannot exceed prerequisite confidence" (FC-004a, TD-064)
- "Assertion confidence cannot exceed input health" (TD-066)
applied at the triage-input layer. The pattern now spans TD-064, TD-066,
and TD-067 and is foundational to FORGE's honesty architecture.

---

### Recovery success cannot exceed verification success (TD-065)

A healed locator is not correct because it resolves to a visible element.
A healed locator is correct because the original intent still holds —
the assertion or action that was failing now passes on the healed element.

Applied in TD-065: after healing to a new selector, FORGE re-runs the
original assertion (toBeVisible, toHaveText, etc.) or dry-runs the action
(click trial:true) against the healed locator before recording success.
HealConfidence (observed|partial|unknown|failed) and CorrectnessSignal
(assertion-verified|resolvability-only|unverified) are derived from this
verification, not from resolvability alone.

This is the healing corollary to:
- "Assertion confidence cannot exceed prerequisite confidence" (FC-004a)
- "Verdict quality cannot exceed input quality" (TD-067)
The pattern: never claim certainty that exceeds your evidence.

---

### Assertion decisions are independent axes (TD-082)

TD-064's failure classes exposed three genuinely independent decision axes,
not one unified framework:
- Step capability: "Can this action/assertion honestly execute?"
  (determineStepCapability — priorBroken/thisInferred from nav grounding)
- Click capability: "Can this click be performed?"
  (determineClickCapability — priorBroken/ownUnknown from grounding)
- Element form: "How should this element be asserted?"
  (determineElementForm — FC-001 multiplicity + FC-003 hidden + step downgrade)

FC-001 (multiplicity) is orthogonal to strength — it applies regardless of
full|downgraded. Forcing it into the full|downgraded|omit enum would obscure,
not clarify. Two helpers > one overloaded abstraction when the axes are
genuinely independent.
---

### Agent evidence cannot exceed observation quality (TD-013)

A goal marked ACHIEVED must have a direct_observation evidence chain —
not an inference or assumption. A goal marked UNREACHABLE must be earned
by exhaustive exploration (all action sequences tried, no new evidence
in N steps, prerequisites confirmed ACHIEVED) — not assumed from a single
failure. BLOCKED and UNREACHABLE are distinct: BLOCKED means a different
plan may succeed; UNREACHABLE means no plan can.

This is the agentic corollary to:
- "Assertion confidence cannot exceed prerequisite confidence" (FC-004a)
- "Verdict quality cannot exceed input quality" (TD-067)
- "Recovery success cannot exceed verification success" (TD-065)

The pattern: never claim certainty the evidence doesn't support.
---
