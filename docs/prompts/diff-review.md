# Diff Review Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: Aiden runs this checklist on every diff before approving a commit -->
<!-- Rule: No commit without Aiden diff review. Aiden reads the actual diff — never a summary. -->

---

## FORGE Diff Review

**Commit:** [hash or "pending"]
**Agent:** [CC / Codex]
**Task:** [TD-XXX or brief description]
**Date:** [YYYY-MM-DD]

---

### Step 1 — Read the Actual Diff

```bash
git diff HEAD~1 HEAD    # if committed
# or
git diff                # if staged/unstaged
```

Do not accept a summary. Do not approve from a description.
Read the diff. Every changed line.

---

### Step 2 — Scope Check

```
□ Does the diff contain only what was agreed in the brief?
□ Are there any files changed that were NOT in the brief's "Files to Modify" list?
□ Are there any files in the brief's "Files NOT to Modify" list that were changed?
□ Does the commit message accurately describe the change?
```

**If scope is violated:** Do not approve. Request the agent revert out-of-scope
changes and re-commit.

---

### Step 3 — Copyright Headers

```
□ Every new .ts file has the AnvilQ copyright header
□ Every new .tsx file has the AnvilQ copyright header
□ No existing headers were removed or modified
```

Required header:
```typescript
/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */
```

---

### Step 4 — Engine Boundary

```
□ No import from forge-ui/ appears in any src/ file
□ No import from src/ appears in any forge-ui/ file that bypasses ExecutionContext
□ All forge-ui server routes call ExecutionContext or service methods only
```

---

### Step 5 — Hardcoded Paths

```
□ No absolute filesystem paths anywhere in the diff
□ All paths use __dirname, process.cwd(), path.resolve(), or path.join()
□ Mental model: would this break if cloned into a different directory?
```

---

### Step 6 — Business Logic in Routes

```
□ forge-ui/server/routes/ files contain no conditional logic
□ Routes receive → call service/ExecutionContext → return
□ No direct database access in route handlers
```

---

### Step 7 — Technical Correctness

```
□ The change does what the brief intended
□ No obvious logic errors in the diff
□ No commented-out code left behind
□ No debug console.log statements left in
□ No TODO comments added without a corresponding TD logged
```

---

### Step 8 — Test Coverage

```
□ If new functionality was added, is there a test for it?
□ If a bug was fixed, is there a regression test?
□ No test was deleted without a documented reason
□ New AI capability has an evaluation harness (if applicable)
```

---

### Step 9 — TD Reconciliation

```
□ If this commit resolves a TD, is TECH_DEBT.md updated?
□ Is the TD row updated with the real commit hash (not "this commit")?
□ Is the TD moved to the Resolved table?
□ No TDs left with placeholder hashes
```

---

### Step 10 — Final Decision

**Approved:**
```
DIFF APPROVED — [hash]

Scope:        ✅ Clean
Headers:      ✅ Present on all new files
Boundary:     ✅ No violations
Paths:        ✅ No hardcoded paths
Routes:       ✅ Transport only
Correctness:  ✅ [one sentence on what was reviewed]
Tests:        ✅ [one sentence]
TDs:          ✅ [updated / N/A]

Ready for Rule 9.
```

**Rejected:**
```
DIFF REJECTED — [hash]

Issues found:
1. [Specific issue — file + line if possible]
2. [Specific issue]

Required changes before re-review:
1. [What must change]
2. [What must change]

Do not proceed to Rule 9.
```
