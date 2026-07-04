# evals/vision/

**Status: Phase 2 — Not yet implemented.**

Vision eval harness for the VisionHealer capability. Deferred to TD-085
Phase 2 alongside cost/latency/regression dimensions.

When implemented, this harness will:
- Input: broken selector + page screenshot
- Expected: correct healed selector + high model confidence (>= 0.8)
- Actual: VisionHealer output (selector, confidence, model reasoning)
- Metric: Detection accuracy (fraction of heals that produce a selector
  passing post-heal assertion re-run — i.e. HealConfidence = observed/partial)
- Requires: Claude Vision API key (ANTHROPIC_API_KEY in env)

Run (when implemented): npm run eval:vision
