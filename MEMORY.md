# FORGE Repository Memory

This document captures historical discoveries, architectural decisions, known pitfalls, and lessons learned from previous sessions.

Purpose:
- Prevent rediscovering known issues.
- Capture non-obvious implementation details.
- Record architectural decisions and rationale.
- Preserve debugging knowledge across sessions.

Only include information that remains valuable across multiple sessions.

---

# Session Log

## Session 1

### Discovery
Initial crawler architecture required BFS/SPA/Hybrid strategies.

### Decision
Implemented Strategy Pattern rather than conditional branching.

### Rationale
Maintain app-agnostic extensibility.

---

# Tooling gotchas

## Git staging — multi-path `git add` can silently skip brand-new untracked files (seen twice)

A multi-path `git add A B C && git commit` can silently skip BRAND-NEW untracked files (stages only
already-tracked paths), producing a commit missing the new file. ALWAYS verify staging before
committing: `git diff --cached --name-only` must show the full intended set. Prefer: stage new files
in their own `git add` call, or `git add <dir>`, then verify. Recovered both times by amending the
local (unpushed) commit.

---

# FORGE lessons (TD-064)

## Evidence propagation across dependency boundaries

- **PRINCIPLE (Nova, FC-004a):** "Assertion confidence cannot exceed prerequisite confidence." A
  generator cannot honestly say "I don't know if we reached page X" and then assert "element on X is
  visible." Downstream assertion strength is capped by the confidence of the navigation/prerequisite
  it depends on. Realized as a per-dependency full/downgraded/omit decision.
- **MECHANISM (Aiden):** Generator failures frequently originate from confidence/evidence not
  propagating across DEPENDENCY BOUNDARIES — truth known at one step (cardinality / nav grounding /
  visibility state / prerequisite reachability) is not carried to the dependent step. Confirmed 5x:
  FC-001 cardinality, FC-002 nav grounding, FC-003 visibility state, FC-004a prerequisite confidence,
  FC-004b auth outcome (observed at crawl, then discarded at the auth-failed skip). This is the same
  root defect in five locations, which points to a MISSING LAYER (unified
  evidence/confidence propagation — the TD-082 determineAssertionCapability helper) rather than four
  independent bugs.
- **Grounding is now a TRI-STATE:** observed | inferred | unknown. `null` must never silently behave
  as observed; `null` -> unknown -> downgrade/omit.
- **FC-004a PRINCIPLE 2 (Nova, layer boundary):** "Generation emits evidence and constraints; Triage
  emits classifications." The generator emits/omits/downgrades/annotates + records omissionReason; it
  never assigns TD-063 categories (app-bug / test-defect / infra-defect / flaky / insufficient-evidence).
  Prevents the taxonomy living in two layers and drifting. (Principle 1 = "assertion confidence cannot
  exceed prerequisite confidence" above.)
- **FC-004b PRINCIPLE (Nova):** "Authentication failure is itself evidence." A role whose auth fails at
  crawl is an OBSERVED negative outcome, not merely an absence. Today the crawler skips the role; the
  honest move is to PERSIST the outcome (RoleDefinition.authOutcome) rather than let downstream code
  re-infer it from side-effects (e.g. empty reachablePageIds — the rejected proxy).
- **FC-004b PRINCIPLE (Nova, general):** "If FORGE observed something important, it should persist it."
  Evidence observed at crawl must not be discarded before the consumer needs it — the dominant TD-064
  theme across FC-001/002/003/004a/004b (truth observed at crawl, discarded before generation).
  Persisting observed evidence is consistent with "generator consumes evidence"; NOT persisting it is
  the architectural inconsistency.
- **Negative-path modeling (deferred, NOT TD-064):** representing "login expected to be blocked" and
  asserting the lockout UX is a real future capability, gated on the lockout actually being OBSERVED
  (TD-013 / agentic crawl). Deferred.

## Measurement/evaluation identity

- **PRINCIPLE (Nova, TD-080):** "Evaluation artifacts must use the same identity model as production
  artifacts." Measurement must be at least as disciplined as the thing it measures. The eval harness
  keyed on title-only while production keyed on file::title::browser; a shared makeResultKey
  (src/core/identity) now serves both so the measurement layer cannot silently diverge from — or
  mis-attribute against — production identity.