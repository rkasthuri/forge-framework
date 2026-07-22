# DECISION_LOG.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> Chronological record of significant architectural decisions made during FORGE's
> development. Each entry summarises the context, the decision, and the reasoning.
> ADRs are dated history — they describe what was decided, not necessarily what is
> currently implemented. Where implementation post-dates the decision, that is noted.
>
> ⚠️ ADR numbers and dates are from project memory. Verify exact numbers and
> filenames against `docs/ADRs/` in the repo before citing externally.

---

## How to Read This Log

Each entry follows this structure:

```
### ADR-XXX — Title
Status:   ACTIVE | SUPERSEDED | RETIRED
Decided:  Approximate session reference
Summary:  What was decided and why
Impact:   What this changed or constrained
```

Statuses:
- **ACTIVE** — decision stands and is enforced in the codebase
- **SUPERSEDED** — replaced by a later ADR (noted below the entry)
- **RETIRED** — the capability or concern it addressed no longer applies

---

## The Decisions

---

### ADR-011 — Never Invent Specificity

**Status:** ACTIVE
**Decided:** Early pipeline sessions

**Summary:**
The test generator must not assert things it cannot verify from the app model.
If an element's value, label, or state was not directly observed during crawl
and verification, the generator must not produce an assertion about it.

**Reasoning:**
Invented assertions create false confidence. A test that asserts a specific price,
label, or count that was assumed — not observed — will pass when the assumption
happens to be correct and fail when it changes, with no indication that the
assertion was never grounded in the first place. This is the worst kind of test
defect: one that looks like a passing test.

**Impact:**
- Generator scoped to produce only what the verified app model contains
- "I don't know" is a valid, correct, and sometimes the only honest generator output
- Downstream: triage `insufficient-evidence` category exists for the same reason

---

### ADR-015 — Provenance Follows Evidence

**Status:** ACTIVE
**Decided:** Mid-pipeline sessions

**Summary:**
A document, record, or model field may only assert provenance directly supported
by the evidence it contains. Provenance follows evidence — never the reverse.
Outcome fields must never default to success. Zero evidence produces "unknown",
not "passed".

**Reasoning:**
The pattern of assuming success in the absence of failure is deeply embedded in
traditional test automation. A test suite that never ran is indistinguishable
from a test suite that passed — unless the framework explicitly tracks the
difference. FORGE treats "no evidence of failure" and "evidence of success" as
categorically different states.

**Impact:**
- All outcome fields typed to prevent hardcoded success defaults
- Run records carry explicit "no evidence" states, not assumed passes
- Healing events carry provenance — observed vs. inferred — on every field
- "Make lies unrepresentable" principle: type errors, not just defensive checks

---

### ADR-017 — Honest Write / Honest Read

**Status:** ACTIVE
**Decided:** Storage and reporting sessions

**Summary:**
Four archetypes of documentation/storage failure were identified and named:
1. **Declared channel, no producer** — a field exists but nothing writes to it
2. **Lossy DB projection** — data is written but the read query loses information
3. **Console-as-only-home** — output exists in terminal logs but is never persisted
4. **Winners-only persistence** — only successful outcomes are stored; failures are
   silently dropped

An honest write with a blind read is a distinct failure class. Both ends of the
data pipeline must be verified.

**Reasoning:**
A system that writes honest data but reads it incorrectly produces dishonest
output. The failure is invisible at the write end — the data is there — but the
consumer never sees it. This is harder to catch than a missing write because the
write side appears correct.

**Impact:**
- Every new field or data flow must be verified read-end, not just write-end
- TD-UI-* items frequently trace to archetype violations (stub tabs with no data)
- Standing rule: "An honest observation nobody can read has not finished shipping"

---

### ADR-018 — Aggregate to the Weakest Truth

**Status:** ACTIVE
**Decided:** Confidence scoring sessions

**Summary:**
When aggregating outcomes across multiple checks or stages, the aggregate must
reflect the weakest (most uncertain) individual result, not the strongest or
the average.

Specifically:
- Uncertain outcomes never read as "failed"
- No-run outcomes never read as "passed"
- An aggregate with any `insufficient-evidence` result must surface that uncertainty

**Reasoning:**
Averaging or majority-voting across confidence tiers suppresses minority signals.
A pipeline stage that has one `insufficient-evidence` result among ten `app-bug`
results should surface the uncertainty — not hide it in an aggregate "app-bug"
classification. The weakest signal is often the most important one.

**Impact:**
- Confidence aggregation always propagates uncertainty upward, never suppresses it
- Dashboard and reporting components must not hide `insufficient-evidence` in totals
- Triage summary reports carry explicit counts per category, not just a dominant label

---

### ADR-019 — Vocabulary Competence Boundary

**Status:** ACTIVE
**Decided:** Detector and triage design sessions

**Summary:**
Detectors must declare three contract properties before issuing a definitive
conclusion:

1. **Observation vocabulary** — what the detector can observe
2. **Representational competence (Axis 1)** — can the detector represent this value?
3. **Discriminative competence (Axis 2)** — do observations uniquely support
   the assertion? (i.e. have competing causes been ruled out?)

A definitive conclusion requires BOTH axes satisfied. A deficiency in either
requires reduced confidence or `insufficient-evidence`.

**Reasoning:**
Discriminative competence gaps are particularly dangerous because they are
invisible to the people closest to them. A detector can observe a value
accurately (Axis 1 satisfied) but still be unable to distinguish between
two competing causes of that value (Axis 2 unsatisfied). The defect passes
implementation, diff review, acceptance, and CI — and is only caught by audit.
When a defect class is invisible to everyone closest to it, on-contact detection
is not a real control.

**Impact:**
- Triage classifier declares its vocabulary and competence boundaries
- `insufficient-evidence` is the correct output when Axis 2 cannot be satisfied
- Identity-divergence detection retired (see TD-148) because Axis 2 could never
  be satisfied for that detector in its execution context

---

### TD-148 — Identity Divergence Detector Retired

**Status:** RETIRED (not an ADR, but a significant architectural decision)
**Decided:** Honesty floor sessions

**Summary:**
The identity-divergence detection capability was retired entirely and renamed
"login-surface observer." The detector fired after auth failure on a pre-auth
login page — but every conclusion it drew was about the application behind the
login wall, which it had never observed.

No pre-auth fence could produce evidence about post-auth state. The comparison
the detector was making never belonged in that execution context.

The replacement login-surface observer produces observations with three explicit
fields per observation:
- Observed value
- Mechanism (including blind spot)
- Non-implications (competing causes that were not ruled out)

**Reasoning:**
"Narrower, not weaker." The original capability was never evidence-supported.
Retiring it is not a regression — it is the honest move. A narrower honest
claim is stronger than a broader dishonest one.

**Impact:**
- Identity-divergence classification removed from triage output
- Login-surface observer produces honest, scoped observations
- Standing principle established: retiring an evidence-unsupported capability
  is always the correct call

---

### Design Decision — Crawl Strategy Auto-Detection

**Status:** ACTIVE
**Decided:** Crawler architecture sessions
*(No ADR number confirmed — verify against docs/ADRs/)*

**Summary:**
Crawl strategy selection (BFS, SPA, or Hybrid) is handled automatically by
`StrategyDetector` based on live page characteristics. Operators do not manually
configure the crawl strategy.

**Reasoning:**
Manual strategy selection requires the operator to correctly characterise the
target application before crawling it — which is precisely the knowledge FORGE
is designed to discover. Forcing manual selection creates a catch-22 for new
applications. Auto-detection eliminates this by letting the live page speak for
itself.

**Impact:**
- No `crawlMode` setting in the default onboarding config
- Override available (`crawlMode` in config) for edge cases where auto-detection
  is incorrect
- `StrategyDetector` is the single source of truth for strategy selection

---

### Design Decision — Selector Fallback Hierarchy

**Status:** ACTIVE
**Decided:** Verification and healing sessions
*(No ADR number confirmed — verify against docs/ADRs/)*

**Summary:**
FORGE uses a fixed confidence-ordered selector fallback hierarchy:

```
1. data-test attribute    (highest confidence)
2. id attribute
3. aria-label
4. role + text combination
5. text content           (lowest confidence — uniqueness check required)
```

A `text`-type heal may never displace a `data-test` or `id` primary strategy.
Healing always moves up the hierarchy, never down.

**Reasoning:**
`data-test` attributes are set explicitly for testing and are stable across
visual redesigns. `id` attributes are stable but sometimes reused incorrectly.
`text` content is volatile — it changes with copy updates, localisation, and
A/B tests. Promoting a `text` match over a `data-test` match would corrupt the
model by replacing a stable selector with an unstable one.

**Impact:**
- `SelfCorrectionEngine` works through the hierarchy in order
- `SmartLocator` enforces the "never downgrade" constraint on healing
- Healing events log both the old and new selector tiers for audit

---

### Design Decision — Batch AI Calls in ElementClassifier

**Status:** ACTIVE
**Decided:** Session resolving silent truncation on large pages
*(No ADR number confirmed — verify against docs/ADRs/)*

**Summary:**
`ElementClassifier` sends elements to the Claude API in batches of 20 per call
with `maxTokens: 1024`. It does not send all elements on a page in a single call.

**Reasoning:**
OrangeHRM's `viewEmployeeList` page has 77 elements. Sending all 77 in one call
at `maxTokens: 500` returned truncated/malformed JSON that silently fell back to
generic names. The failure was invisible — no error, just worse output. Batching
eliminates the truncation and adds per-batch logging so failures are visible.

**Impact:**
- All AI element classification calls are batched at ≤20 elements
- `maxTokens` set to 1024 per batch call
- Per-batch logging replaces single silent failure

---

### Design Decision — Evidence-First Architecture for Triage

**Status:** ACTIVE
**Decided:** Triage taxonomy design sessions

**Summary:**
The AI triage classifier uses five evidence-gated categories.
`insufficient-evidence` is a first-class outcome, not a fallback.
The classifier declares its competence boundaries before issuing any conclusion.

**Reasoning:**
Traditional triage in test automation assumes every failure can be classified
definitively. In practice, many failures are genuinely ambiguous — the evidence
does not uniquely support one category over another. Forcing a definitive
classification in ambiguous cases produces a confident wrong answer, which is
worse than an honest "I don't know."

**Impact:**
- 0% false app-bug rate on evaluation harness (evidence gate prevents guessing)
- 97.4% accuracy on evaluation harness *(verify current figure with CC)*
- `insufficient-evidence` appears in reports and dashboards as a first-class metric

---

### Design Decision — Green Requires Honest AND Correct

**Status:** ACTIVE
**Decided:** Honesty floor sessions

**Summary:**
A capability is only GREEN when two independent dimensions are both satisfied:
1. **Honest** — reports truthfully, surfaces errors, does not fabricate output
2. **Correct** — the underlying behaviour is what it claims to be

**Reasoning:**
A feature that reports honestly but measures wrong gives users accurate reports
of incorrect results — they trust the output but the output is wrong. A feature
that measures correctly but hides errors gives users incorrect reports of correct
results — the underlying behaviour is right but they cannot see it. Neither is
acceptable. Both dimensions must be verified independently.

**Impact:**
- Evaluation harnesses provide the CORRECT dimension
- Honesty signals (confidence tiers, `insufficient-evidence`) provide the HONEST
  dimension
- Documentation must not blur the two — calling something GREEN on one dimension
  alone is a documentation defect

---

### Design Decision — Agentic Loops Must Not Precede the Honesty Floor

**Status:** ACTIVE
**Decided:** Agentic architecture planning sessions

**Summary:**
Agentic crawl expansion and autonomous mode were deliberately deferred until the
pipeline's honesty floor was solid.

**Reasoning:**
Agentic loops amplify whatever evidence layer sits beneath them. Building an
agent on an untrustworthy evidence layer multiplies the lie — the agent acts
confidently on bad data, makes decisions at scale, and produces large volumes of
confidently wrong output. The honesty floor must be established before agentic
expansion is complete.

**Impact:**
- Agentic crawl is in progress only after core triage and healing honesty
  signals were stabilised
- Supervised mode is the default for all agentic capabilities
- Autonomous mode requires an explicit flag and Raj's approval

---

### Design Decision — forge-ui as Separate Package, Engine Boundary Enforced

**Status:** ACTIVE
**Decided:** Platform UI architecture sessions

**Summary:**
The platform UI (`forge-ui/`) is a separate package with its own `package.json`,
build pipeline, and dependency graph. It communicates with the engine (`src/`)
exclusively through `ExecutionContext` and the defined REST API surface.
`src/` has no knowledge of `forge-ui/`.

**Reasoning:**
FORGE must be runnable as a headless CLI tool independently of any UI. If the
engine imports from the UI, that independence is lost — the engine becomes
dependent on UI package versions, build outputs, and rendering concerns that
have nothing to do with test automation. The boundary keeps the two concerns
genuinely separate.

**Impact:**
- `src/` never imports from `forge-ui/` — enforced in every diff review
- `ExecutionContext` is the single defined bridge
- forge-ui can be replaced, rewritten, or removed without touching the engine

---

### Design Decision — No Static Engine Import in forge-ui

**Status:** ACTIVE
**Decided:** forge-ui architecture sessions

**Summary:**
`forge-ui/` must not use static imports of engine modules from `src/`.
All engine interaction is through `ExecutionContext` and the REST API.

**Reasoning:**
Static imports create a hard build-time dependency between the UI and the engine.
This means the UI build fails if engine types change, and the engine cannot be
updated independently of the UI. Dynamic, runtime communication through a defined
API surface keeps the two packages genuinely independent.

**Impact:**
- All `forge-ui/server/` routes call `ExecutionContext` methods, not engine functions
- No business logic in routes — transport only

---

### Documentation Governance — Single Source of Truth for Onboarding Governance

**Status:** ACTIVE — DECIDED; execution DEFERRED (governance-sensitive; Nova consulted before any content moves)
**Decided:** 2026-07-22 (Raj)

**Summary:**
Onboarding governance — reading order, session-start checks, task-package rules,
checkpoints, and approval gates — is currently authored IN FULL in three separate
documents (`DOCUMENTATION_INDEX.md`, `AI_ONBOARDING_CHECKLIST.md`, `CODEX_ONBOARDING.md`),
with a circular prerequisite (INDEX step 9 points to the checklist, whose Part 1
re-mandates INDEX steps 1-8). Two independent disk-verified audits (CC and Codex,
2026-07-22) confirmed the triplication and the loop.

The governance content is consolidated to a single authoritative source:
- `AI_ONBOARDING_CHECKLIST.md` OWNS the governance content (it is checklist-shaped).
- `DOCUMENTATION_INDEX.md` becomes a pure MAP — what exists and where — and LINKS to
  the checklist rather than restating it.
- `CODEX_ONBOARDING.md` becomes Codex-specific DELTAS only ("all checklist rules apply;
  here is what differs for Codex"), linking rather than restating.
- The circular prerequisite is removed: the sequence starts in exactly one place.

**Reasoning:**
Triplicated governance is three sources of one truth and will drift — the ADR-017
"no single producer" failure expressed in prose. This is the documentation analogue
of removing a second producer of a single fact (cf. the `appType` ownership correction,
TD-163): one authoritative producer, everything else a map or a link.

**Impact:**
- `AI_ONBOARDING_CHECKLIST.md` = the single authoritative source of onboarding governance.
- `DOCUMENTATION_INDEX.md` and `CODEX_ONBOARDING.md` link to it; they do not restate it.
- The step-9-contains-steps-1-8 circularity is eliminated.
- **This is NOT tech debt** and is deliberately not recorded in `TECH_DEBT.md` — it is an
  intentional architectural decision about documentation structure.
- **Execution is a separate, deliberate task.** Because these docs control CC and Codex
  behaviour, consolidation is NOT folded into the reference-integrity cleanup batch;
  Nova is consulted on the target structure BEFORE any content moves.

---

### Documentation Governance — Documentation Moves Forward With Code

**Status:** ACTIVE — DIRECTION SET; execution DEFERRED and unscheduled. Belongs to the Governance
stage (ORANGE / not-started on the completion map). Its own design session with Nova before any
mechanism is built. Explicitly NOT to be wedged into the current onboarding cleanup or ahead of TD-064.
**Decided:** 2026-07-22 (Raj)

**Summary:**
Documentation must move forward with the code it describes, under the same evidence discipline the
code is held to. Three tiers, cheapest first:
1. **DETECT** — automated reference-integrity + status-consistency checks in CI, so a broken link
   or a stale status claim fails the build the day it is introduced (today's manual audit,
   `notes/docs-refcheck-2026-07-22.md`, is the manual v0).
2. **DERIVE** — status/summary docs GENERATED from the source of truth rather than hand-maintained,
   so they cannot drift (cf. CLI-glossary-from-command-surface, build-status-from-signal).
3. **GATE** — code changes carry their doc updates in the same logical unit; doc-out-of-date is a
   shippability failure, not a later cleanup.

**Reasoning:**
Documentation drift — a doc asserting a status, capability, or fact the current code no longer
supports — is the ADR-015 honesty-floor violation ("a document may only assert what its evidence
supports") at the documentation layer, and the same defect class as a detector claiming an
unmeasured property (ADR-019/021) or an outcome field defaulting to success. The root cause is that
the doc and the fact it describes have no enforced link.

**Reasoning (plain language) — the Escape Room principle:**
Onboarding documentation is the rules card on the wall of an escape room; CC and Codex are the
players who read it before they start. If the room gains a feature and nobody updates the card, the
player acts on a rule that no longer holds — walks to a door the card promised would open and finds
it locked. The player isn't wrong; the card lied. FORGE has live instances: a rule pointing at a
room never built (the onboarding sequence cites `ARCHITECTURE_OVERVIEW.md`, which exists nowhere); a
card claiming a solved puzzle (`CURRENT_MILESTONE` marking Onboard GREEN while TD-173 makes rendering
wrong-in-fact); three copies of the rules on three walls edited unevenly (the triplicated governance
docs — addressed separately by the Single Source of Truth DR). (Examples as of 2026-07-22; the
specific instances have since been remediated — ARCHITECTURE_OVERVIEW redirected in 6602d10,
Onboard→RED in 8dce520. The drift they illustrate is real; the instances are now fixed.) Root cause
in every case: the card
and the room have no enforced link. The fix is that discipline one layer up — the card is checked
against the room (CI), the card is printed from the room (generated status), and you cannot open the
room without updating the card (docs ride with the code that changes them).

**Impact:**
- Governance-stage work. Sets the direction for documentation tooling; commits nothing to a
  mechanism yet.
- Relates to the Single Source of Truth DR (a sibling documentation-governance decision) and to the
  reference-integrity cleanup now in progress, which is the manual precursor to tier (1) DETECT.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
