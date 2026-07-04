# TD-063 Taxonomy Eval (isolated experiment)

An **isolated** experiment to test whether a stricter triage prompt + a code-enforced
evidence invariant fixes TD-063 — production triage confidently mislabeling failures
as "Bug" when they are not real application defects.

This is **not production code**. It does **not** import or modify
`src/pipeline/ai-triage.ts` or any production triage logic. It reuses
`src/core/ai/AiClient.aiCall` only as the API transport (clean to import; carries the
TD-061 native-fetch fix + retry). Calling it records `ai_usage` telemetry rows
(append-only) — the only side effect.

## What it does

- **`taxonomy-prompt.ts`** — `classifyFailure(testId, errorMessage)` classifies a failure
  into exactly five categories: `app-bug`, `test-defect`, `infra-defect`, `flaky`,
  `insufficient-evidence`. The prompt requires **positive evidence** for `app-bug`.
  A **code invariant** (not the prompt) then downgrades any `app-bug` verdict with
  empty/generic evidence to `insufficient-evidence` and logs the override — the AI
  supplies judgment, the code enforces the evidence requirement.
- **`eval.ts`** — extracts the 39 failures from `reports/eval-39-failures.json` (keyed by
  spec title), loads `ground-truth.csv` (`test_id,FINAL_label`), classifies each, and
  prints a scorecard.

## Run

From the repo root:

```
npx tsx experiments/td-063-taxonomy/eval.ts
```

Requires `ANTHROPIC_API_KEY` in the environment (makes one Claude API call per failure).
`ground-truth.csv` must be present in this folder (`test_id,FINAL_label`); if missing the
harness stops.

## Pass criteria

The experiment **PASSES** when:

- **false-app-bug < 5%** — predicted `app-bug` where truth ≠ `app-bug` (the TD-063 failure mode), AND
- **correct > 80%** — predicted category equals ground truth.

The scorecard also prints the confusion summary (truth → predicted), predicted totals,
the count of code-invariant overrides, and a per-failure `truth | predicted | ✓/✗ | evidence` list.
