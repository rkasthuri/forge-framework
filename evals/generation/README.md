# evals/generation/

Generation eval — the **behavioral pass rate** of the generator.

## What it measures

For every generated SauceDemo spec, run it through Playwright against the live app
and score one `EvalRecord` per spec file: `pass` = the spec's Playwright run exited 0.
The capability's canonical metric (evals/contract.ts) is **Behavioral pass rate** —
the fraction of generated specs that actually pass when executed. Unlike the triage
eval, there is **no ground-truth CSV**: the success criterion is intrinsic — a spec
the generator emits must pass on the app it was generated from.

## Run

```
npm run eval:generation
# or: npx tsx evals/generation/harness.ts
```

Emits the shared scorecard (`printSummary`/`printFailures`) and writes
`evals/generation/report.json` (gitignored — a per-run artifact for regression
comparison).

## Cost & isolation

- **Zero Claude API cost** — pure Playwright execution of already-generated specs.
  The harness sets `HEALING_DISABLED=true`, closing SmartLocator's Vision-heal
  escalation (the only latent AI path), so the run is deterministic and free.
- Each spec runs **by file path**, not `-g <id>`: the `TC-GEN` id namespace restarts
  per app (orangehrm and saucedemo both emit `TC-GEN-001`), so a bare grep would
  collide across apps.
- **On-demand only** — needs a live browser + https://www.saucedemo.com. NOT part of
  the fast CI unit gate.

## FC representatives

These specs exercise the FC-004a honesty-downgrade classes proved live during the FC
fixes (annotated in each record's `notes`):

| Spec | FC class |
|------|----------|
| `browse-and-cart` | FC-004a Stage 1 — browse + add-to-cart landing |
| `complete-purchase-flow` | FC-004a Stage 2+3 — full checkout flow |
| `inferred-flow-standardUser` | FC-004a Stage 2 — inferred builder path (TD-081) |
| `direct-checkout` | FC-004a Stage 1 — direct checkout entry |
