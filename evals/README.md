# /evals — FORGE Evaluation Framework

One harness per AI capability. Every capability must be evaluated.
No exceptions. (Nova, TD-085)

## Structure
```
evals/
  contract.ts      — shared EvalRecord type + CapabilityMetrics + CANONICAL_METRICS
  runner.ts        — computeCapabilityMetrics, runEval, generateRunId
  reporter.ts      — printSummary, printFailures, saveReport
  triage/          — triage accuracy eval (migrated from experiments/td-063-taxonomy)
  generation/      — behavioral pass rate eval (new, TD-085)
  healing/         — correct heal rate eval (migrated from experiments/td-065-healing)
  vision/          — detection accuracy eval (Phase 2, placeholder)
```

## Run commands
- `npm run eval:triage` — triage accuracy on the 39-failure corpus
- `npm run eval:generation` — behavioral pass rate on SauceDemo generated suite
- (`eval:healing` is the `evals/healing/` harness — on-demand, needs live
  SauceDemo browser: `npx tsx --test evals/healing/harness.ts`)
- (`eval:vision` — not yet implemented)

## Current baselines (as of TD-085 Phase 1)
| Capability  | Metric                | Baseline |
|-------------|-----------------------|----------|
| Triage      | Accuracy              | 97.4%    |
| Generation  | Behavioral pass rate  | 100%     |
| Healing     | Correct heal rate     | 100% (5 scenarios, on-demand) |
| Vision      | Detection accuracy    | TBD (Phase 2) |

## Adding a new eval
1. Create `evals/<capability>/harness.ts`
2. Produce `EvalRecord[]` using the contract (`evals/contract.ts`)
3. Call `runEval(records)` + `printSummary(summary)` + `saveReport(summary, path)`
4. Add `npm run eval:<capability>` to package.json
