# CI Review Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: After every CI run concludes — Job 1 + Job 2 results -->

---

## FORGE CI Review

**CI Run:** [run number / URL]
**Commit:** [hash]
**Date:** [YYYY-MM-DD]
**Triggered by:** [push / manual / scheduled]

---

## Job 1 — test

### Gate Results

| Gate | Result | Notes |
|---|---|---|
| `npm run check` (tsc) | [✅ PASS / ❌ FAIL] | |
| `npm run test:unit` | [✅ NNN/NNN / ❌ NNN/NNN] | |
| Playwright stable suite | [✅ NNN/NNN / ❌ NNN failed] | continue-on-error |
| Reports uploaded | [✅ / ❌] | |

### Regression Check

```
□ Did test:unit count change from baseline (531)?
  Previous: 531    Current: [N]
  Change: [+N / -N / same]
  If changed: [explain why — new tests added / tests removed / unexpected]

□ Did Playwright count change from baseline (320)?
  Previous: 320    Current: [N]
  Change: [+N / -N / same]
  If changed: [explain why]

□ Any new failures compared to last green run?
  [List any tests that were passing before and are now failing]

□ Any previously failing tests now passing?
  [List — confirm this is expected]
```

---

## Job 2 — ai-pipeline

### Step Results

| Step | Result | Notes |
|---|---|---|
| triage | [✅ / ❌ / ⚠️] | |
| results-store | [✅ / ❌ / ⚠️] | |
| adaptive-fixes | [✅ / ❌ / ⚠️] | |
| trend-analysis | [✅ / ❌ / ⚠️] | continue-on-error (TD-051) |
| release-notes | [✅ / ❌ / ⚠️] | continue-on-error (TD-051) |
| notifier | [✅ / ❌ / ⚠️] | |
| run-history.json committed | [✅ / ❌] | |
| PR comment posted | [✅ / ❌] | |
| Bug gate | [✅ / ⚠️ informational] | non-blocking (ADR-010) |

### Triage Summary

```
app-bug:               [N]
test-defect:           [N]
infra-defect:          [N]
flaky:                 [N]
insufficient-evidence: [N]
```

---

## Overall CI Status

```
□ Is this CI run GREEN for milestone purposes?

GREEN requires ALL of:
  □ npm run check passes
  □ test:unit 531/0
  □ Playwright 320/0 (or expected count if suite changed)
  □ Job 2 completes without crash
  □ No new regressions introduced

Status: [GREEN / RED / YELLOW — explain]
```

---

## Action Required

```
□ No action — CI is green, milestone is clear to proceed
□ Investigation needed — [describe]
□ Fix required before next push — [describe]
□ TD to log — [draft TD entry]
□ Rule 9 withheld — [reason]
```

---

## Notes

[Any observations about the CI run that are not captured above.
Patterns in triage output. Unexpected job behaviour. Known TD confirmation.]
