# Audit Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: EOD sweep — honesty audit + abandoned code sweep -->
<!-- Rule: Find-only at night. Decide by day. Never delete unattended. -->

---

## FORGE EOD Audit

**Date:** [YYYY-MM-DD]
**Auditor:** [CC / Aiden]
**Session reference:** [which build session this follows]

---

## Part 1 — Honesty Sweep

*Find LIES — places where the codebase claims more than it can demonstrate.*

### 1.1 — Outcome Fields

```
□ Are there any outcome fields that default to success without evidence?
□ Are there any fields that can never be set to "unknown" or "insufficient-evidence"?
□ Are there any hardcoded pass/success/green values?
```

Findings:
- [ ] None found
- [ ] Found: [file:line — description]

---

### 1.2 — Confidence Scores

```
□ Are any confidence scores hardcoded rather than derived from evidence?
□ Does any confidence score exceed the evidence tier of its inputs?
□ Are there any places where assertion confidence > prerequisite confidence?
```

Findings:
- [ ] None found
- [ ] Found: [file:line — description]

---

### 1.3 — Triage Classification

```
□ Does any triage path produce a definitive classification without evidence?
□ Is insufficient-evidence reachable from all code paths?
□ Are there any silent fallbacks to a default category?
```

Findings:
- [ ] None found
- [ ] Found: [file:line — description]

---

### 1.4 — ADR-017 Archetypes (Honest Write / Honest Read)

```
□ Declared channel, no producer:
  Any field that is declared in the schema but never written to?

□ Lossy DB projection:
  Any read query that loses information present in the write?

□ Console-as-only-home:
  Any output that exists only in terminal logs and is never persisted?

□ Winners-only persistence:
  Any code path where only successes are written and failures are silently dropped?
```

Findings:
- [ ] None found
- [ ] Found: [archetype — file:line — description]

---

### 1.5 — Documentation Claims

```
□ Does any doc claim a capability is built that is not yet built?
□ Does any doc claim a capability is unbuilt that is actually shipped?
□ Are any TD numbers cited from the stale project-file copy (not on-disk)?
□ Are any metrics cited without a source?
```

Findings:
- [ ] None found
- [ ] Found: [doc — claim — actual state]

---

## Part 2 — Abandoned Code Sweep

*Find the ABANDONED — superseded, unwired, duplicated, dead.*

### 2.1 — Superseded Code

```
□ Is src/platform/ still present? (deprecated — should not grow)
□ Are there any files that implement functionality now handled elsewhere?
□ Are there any import paths that reference deprecated modules?
```

Findings:
- [ ] None found
- [ ] Found: [file — description of what superseded it]

---

### 2.2 — Unwired Code

```
□ Are there any functions that are defined but never called?
□ Are there any pipeline scripts with no npm run entry point?
□ Are there any components imported nowhere?
```

Findings:
- [ ] None found
- [ ] Found: [file:function — description]

---

### 2.3 — Duplicated Logic

```
□ Is the same transformation or query written in more than one place?
□ Are there multiple functions that do the same thing under different names?
□ Is the same validation logic duplicated across files?
```

Findings:
- [ ] None found
- [ ] Found: [files — description of duplication]

---

### 2.4 — Dead Code

```
□ Are there commented-out code blocks that have been there for more than one session?
□ Are there TODO comments with no corresponding TD logged?
□ Are there feature flags or condition branches that can never be reached?
```

Findings:
- [ ] None found
- [ ] Found: [file:line — description]

---

### 2.5 — Deletion Candidates

Apply the deletion heuristic (Nova, adopted): delete only when ALL THREE are true:
1. No production consumers
2. Capability fully subsumed elsewhere
3. Keeping it creates a competing architectural story

```
□ Any files that meet all three criteria?
```

Candidates:
- [ ] None
- [ ] Candidate: [file — evidence for each of the three criteria]

---

## Part 3 — Audit Summary

```
HONESTY SWEEP
  Outcome fields:       [Clean / X findings]
  Confidence scores:    [Clean / X findings]
  Triage paths:         [Clean / X findings]
  ADR-017 archetypes:   [Clean / X findings]
  Documentation claims: [Clean / X findings]

ABANDONED CODE SWEEP
  Superseded:           [Clean / X findings]
  Unwired:              [Clean / X findings]
  Duplicated:           [Clean / X findings]
  Dead:                 [Clean / X findings]
  Deletion candidates:  [None / X candidates]

TOTAL FINDINGS: [N]
```

---

## Part 4 — Findings Log

*For each finding, log it here. Do NOT fix tonight. Decide by day.*

| # | Type | File | Description | Recommended action |
|---|---|---|---|---|
| 1 | [Lie/Abandoned/Duplicate/Dead] | [file:line] | [description] | [Log TD / Fix / Delete / Defer] |

---

## Part 5 — New TDs to Open

*For each finding that warrants a TD, draft the entry here for Aiden review tomorrow.*

```
TD-XXX | [Description] | Priority: [H/M/L] | Notes: [root cause if known]
```

---

*Audit complete. No changes made. Findings surface for day-session decisions.*
