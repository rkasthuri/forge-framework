# TD Log Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: When logging a new technical debt item -->
<!-- Rule: Check on-disk TECH_DEBT.md first — confirm it is not already logged -->

---

## Before Logging

```
□ Checked on-disk TECH_DEBT.md — this issue is NOT already logged
□ Got the next available TD ID from: npm run coverage:next-id
  (or manually from the highest ID in TECH_DEBT.md + 1)
□ This is a real defect / limitation / deferred decision —
  not a "would be nice" that belongs in ROADMAP.md
```

---

## New TD Entry

Copy this into the Open table in `TECH_DEBT.md`:

```markdown
| TD-[ID] | [One sentence describing the problem — what is wrong, not what the fix is] | [High / Medium / Low] | [Root cause if known, or "Untriaged". Related TDs if any. Investigation notes.] |
```

---

## TD Entry Checklist

```
□ ID is the next available (not a duplicate, not a gap)
□ Description describes the PROBLEM, not the fix
  ✅ "StrategyDetector counts zero realLinks on 376-link MPA page"
  ❌ "Fix StrategyDetector link counting"
□ Priority reflects actual impact:
  Critical — blocks pipeline correctness or produces dishonest output
  High     — significant defect, active investigation needed
  Medium   — real issue, can be deferred one milestone
  Low      — cosmetic, known, safe to leave
□ Notes include:
  - Root cause if known ("counting fault in signal aggregation")
  - "Untriaged" if root cause is unknown
  - Related TDs if this is part of a cluster
  - Any standing rules ("investigation before fix")
```

---

## Priority Guide

| Priority | Use when |
|---|---|
| Critical | Produces dishonest output. Blocks GREEN. Fails CI. |
| High | Significant defect. Needs investigation or fix this milestone. |
| Medium | Real limitation. Documented. Can defer one milestone. |
| Low | Cosmetic, rare, or low-impact. Known and safe to leave. |

---

## After Logging

```
□ TD added to on-disk TECH_DEBT.md Open table
□ TECH_DEBT_SUMMARY.md updated if Critical or High
□ TD referenced in session notes or PR comment
□ Investigation scheduled if flagged "investigation before fix"
```

---

## Resolving a TD

When a TD is resolved, move it to the Resolved table with:

```markdown
| TD-[ID] | [Original description] | [commit hash] | [CI run confirmation note] |
```

**Resolution requires ALL THREE:**
1. Commit hash exists
2. CI has passed against that commit
3. TECH_DEBT.md updated with the real hash (not "this commit")

Do not mark resolved without all three.
