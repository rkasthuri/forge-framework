# Performance Review Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: When reviewing AI cost, crawl speed, or pipeline runtime -->

---

## FORGE Performance Review

**Scope:** [AI cost / Crawl speed / Pipeline runtime / All]
**Date:** [YYYY-MM-DD]
**Reviewer:** [Aiden / CC]

---

## 1. AI Cost Review

### Token Usage

```bash
npm run db:status     # Check ai_usage table row count
```

From `ai_usage` table:

| Run | Stage | Tokens used | Model | Cost estimate |
|---|---|---|---|---|
| [run ID] | [stage] | [N] | [model] | [$N] |

### Budget Observations

```
□ Any stage consistently consuming more tokens than expected?
□ Any AI call returning truncated output? (check ElementClassifier batch size)
□ AiBudgetTracker .remaining field behaving correctly?
□ Any stage without budget tracking? (should log if found)
```

### Cost Optimisation Candidates

```
□ Any AI calls that could be batched further?
□ Any AI calls where a smaller model would produce acceptable results?
   (Note: multi-model routing gate — TD-080 must be fixed first)
□ Any AI calls that are redundant across pipeline stages?
```

---

## 2. Crawl Performance

### Timing

```bash
# Run a crawl with timing:
time npm run onboard -- --app=saucedemo
```

| App | Pages discovered | Time | Notes |
|---|---|---|---|
| SauceDemo | [N] | [Ns] | |
| OrangeHRM | [N] | [Ns] | |

### Observations

```
□ Any page visits taking disproportionately long?
□ Any auth flows retrying unnecessarily?
□ SPAStrategy single-hop limitation affecting coverage? (TD-014)
□ Any StrategyDetector mis-detection causing wrong strategy? (TD-162/163)
```

---

## 3. Pipeline Runtime

```bash
# CI Job 1 runtime: [from CI run]
# CI Job 2 runtime: [from CI run]
# Local test:all runtime: [measured locally]
```

### Observations

```
□ Any pipeline stage consistently slow?
□ Any test with unexpectedly long runtime? (@slow candidates)
□ Any DB query that should be indexed but isn't?
```

---

## 4. Recommendations

| Area | Finding | Recommendation | TD to log? |
|---|---|---|---|
| [Area] | [Finding] | [Recommendation] | [Y/N — TD-XXX] |

---

## 5. Multi-Model Routing Status

```
Gate check — multi-model routing is blocked on TD-080:
□ TD-080 status: [Open / Resolved]
□ If Open: do not proceed with multi-model A/B testing
□ If Resolved: multi-model routing design can be initiated
```
