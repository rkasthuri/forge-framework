# TD-064 — FC-002 Design: Assertion Verification Awareness (Navigation)

Fix the largest remaining class: wrong navigation expectations (toHaveURL on
navigations FORGE never observed). For Nova review before code.

Status: DRAFT for Nova. True frequency: 8 (largest open class).
Generator: SpecGenerator.ts (~line 354). Flow source: FlowDetector.ts.

---

## The audit finding (Nova's question, answered by the code)

Nova asked: "What navigation has FORGE actually observed vs merely inferred?"
The code already tracks this — and then flattens it before the generator sees it.

**FlowDetector emits `assert-navigation` steps from two semantically-different sources:**

1. **Bootstrap (FlowDetector ~339):** single-page flow asserts you are on the page
   the flow starts on (targetPageId === pageId). FORGE crawled this page — the
   assertion is **grounded/observed**. Legitimate.

2. **Ungrounded fallback (FlowDetector ~365-373):** when NO real crawled edge exists
   for a proposed nav (fromPid -> toPid), FORGE logs a groundingWarning AND emits an
   `assert-navigation` step anyway, asserting the inferred urlPattern. This navigation
   was **never observed.** This is the FC-002 defect.

Real edges produce a `click` step (a real interaction), NOT an assert-navigation.
So every *fallback* assert-navigation is, by construction, an unobserved navigation.

**The problem:** to the generator, the bootstrap (grounded) and the fallback
(ungrounded) `assert-navigation` steps look IDENTICAL — same action, same shape.
The generator emits `toHaveURL(/inferred-pattern/)` for both. The 8 failures are the
ungrounded ones asserting a URL the flow never reaches.

**Evidence-propagation problem (third time):** FlowDetector KNOWS which steps are
grounded (it computes the groundingWarning right there), but records it only at
FLOW level (groundingWarnings: string[]), not on the STEP. The generator can't tell
which step is ungrounded.

---

## The fix (Option A — tag the step; smallest correct fix)

### 1. FlowStep gains a grounding signal
Add to FlowStep (types.ts:202):  `grounded?: boolean`

### 2. FlowDetector sets it at the assert-navigation sites
- Bootstrap (~339): `grounded: true`  (you are on a crawled page — observed)
- Ungrounded fallback (~371): `grounded: false`  (no real edge — never observed)
- `click` steps (real edges): not needed / default true.

### 3. Generator branches (SpecGenerator ~354)
- `grounded !== false`  -> `await expect(role).toHaveURL(/pattern/)`  (legitimate — unchanged)
- `grounded === false`  -> DOWNGRADE + ANNOTATE:
    // FORGE: navigation not observed during crawl (no real edge); asserting
    //        non-error landing instead of a specific URL.
    await expect(role).not.toHaveURL(/error|404/)
  (line ~391 already uses this not.toHaveURL(/error|404/) pattern elsewhere.)

This is ADR-011 applied to navigation: assert the specific URL ONLY when FORGE
observed the navigation; otherwise assert the strongest honest thing (we did not
land on an error page) and annotate the limitation. Same downgrade+annotate shape
as FC-003's hidden elements.

---

## The decision for Nova: omit vs downgrade-annotate

For an ungrounded navigation step, two honest options:

- **Omit** the assert-navigation entirely (no assertion emitted).
  Clean, but the test silently loses the checkpoint.
- **Downgrade + annotate** to `not.toHaveURL(/error|404/)` + comment.
  Keeps a sanity check ("we navigated somewhere non-broken") and surfaces the
  limitation to a human reader.

**Aiden's lean: downgrade + annotate** — consistent with FC-003, and "we did not
land on an error page" is the strongest truthful claim FORGE can make about an
unobserved navigation. Pure omit discards even that.

Counter-consideration: if the ungrounded flow is SO unreliable that even reaching a
non-error page isn't assured (the prerequisite click itself may not fire — see
overlap with FC-004a), then `not.toHaveURL(/error|404/)` could itself fail. In that
case omit may be safer. **Question for Nova:** downgrade-annotate, omit, or
downgrade-with-fallback-to-omit if the step's own prerequisite is also ungrounded?

---

## Scope guard (learning from FC-003)

Nova warned against "building TD-013 inside FC-003." The parallel risk here:
**do NOT rebuild flow-grounding inside FC-002.** TD-031 already computes groundedness;
we are only PROPAGATING that bit to the step. We are NOT:
- re-crawling to find new edges,
- inferring prerequisite navigations,
- synthesizing missing clicks.
Those would be a separate, larger effort. FC-002 = carry the grounded bit + branch.

---

## Overlap note: FC-002 vs FC-004a

Some of the 8 may be less "wrong URL asserted" and more "the flow's prerequisite
never executes" (a broken click upstream). Per the living-document principle, after
the FC-002 fix we RE-AUDIT: any remaining nav-ish failures that are really broken
prerequisites belong to FC-004a (reachability), not FC-002. Expect the count to
resolve — possibly fewer than 8 are pure FC-002.

---

## Build plan (after Nova approves)

0. Confirm assert-navigation emit sites (done: FlowDetector ~339 bootstrap, ~371 fallback;
   generator ~354). No third source.
1. FlowStep: add grounded?: boolean. (commit)
2. FlowDetector: set grounded at both sites. (commit)
3. SpecGenerator: branch grounded steps -> toHaveURL; ungrounded -> downgrade+annotate. (commit)
4. Re-crawl (default budget) -> regenerate -> test --project=generated.
5. Prove TC-GEN-024 (rep) passes; confirm FC-002 cases resolve; FC-001 + FC-003 still clear; 0 regressions.
6. RE-AUDIT + recalculate (some may resolve to FC-004a). Living document.

## Questions for Nova
1. Ungrounded nav: downgrade-annotate (lean) / omit / downgrade-with-omit-fallback?
2. Is "tag the step with grounded" the right shape, or prefer carrying the observed
   URL itself (FlowDetector has access) for grounded steps — i.e. assert the OBSERVED
   url rather than the page's urlPattern? (Could be a follow-on; urlPattern is
   probably fine for grounded steps since they ARE real edges.)
3. Agree FC-002 count may resolve below 8 (some are FC-004a)?
