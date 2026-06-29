# ADR-010: Bug-Gate Informational Until Triage Precision Is Earned

Date: 2026-06-29
Status: Accepted

## Context

The CI pipeline can fail the build when AI triage returns "Bug" verdicts. However, triage currently
mislabels failures (TD-063): in observed runs, generated-spec failures were confidently reported as
"Bug" when they were not real application bugs. A blocking gate built on an unreliable signal cries
wolf and erodes trust in CI.

## Decision

The CI bug-gate is INFORMATIONAL, not blocking. It reports bug and flaky counts every run but does not
fail the build on bug verdicts. Blocking will only be re-enabled once triage precision is demonstrated
above 95% over a meaningful number of runs, with a confirmed-verdict feedback loop — a deliberate future
decision, gated on the TD-063 taxonomy rewrite.

## Alternatives Considered

### Keep the blocking gate
Rejected. Blocking on a known-false signal produces false build failures and trains people to ignore the gate.

### Remove bug reporting entirely
Rejected. The counts are useful signal; the problem is blocking on them, not surfacing them.

## Consequences

Positive:
- CI stops failing on a known-unreliable signal; real failures (e.g. test errors) remain the red signal.
- Honest: reports what triage said without overclaiming it as ground truth.

Negative:
- Real application bugs detected by triage will not block a merge until precision is earned. Mitigated by
  still reporting them visibly.

## Related Documents
TECH_DEBT.md (TD-063 taxonomy, TD-078 bug-gate), ARCHITECTURE_TARGET_EVIDENCE_LAYER.md (§4 bug-gate decision).
