# Bug Fix Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: After investigation.md confirms root cause. Before implementation begins. -->
<!-- Rule: investigation.md must be complete before this prompt is used. -->

---

## FORGE Bug Fix Task

**Agent:** [CC / Codex]
**Prepared by:** Aiden
**Date:** [YYYY-MM-DD]
**TD:** [TD-XXX — must reference a logged TD]
**Investigation:** [Reference to completed investigation.md output]

---

### Root Cause (Confirmed)

[Copy from investigation.md — the confirmed root cause, not the symptom.
This must be confirmed before implementation begins.
If root cause is still uncertain, do not proceed — complete investigation first.]

**Root cause:** [one sentence]
**Location:** [file:function:line]

---

### Fix Approach

[Exactly what will change. One approach only — the one approved by Aiden.
Not options — the chosen approach after investigation and design.]

---

### Files to Modify

```
[explicit file paths — verified to exist in the repo]
```

### Files NOT to Modify

```
[explicit file paths + reason]
```

---

### Constraints

1. Fix addresses root cause — not just the symptom
2. No scope expansion — if a related issue is found, log a new TD
3. No hardcoded paths
4. Copyright header on any new files
5. Engine boundary maintained
6. [Task-specific constraints]

---

### Step-by-Step

**Step 1 — [What to change]**
[Specific change at specific file:function.
Include the before/after if helpful.]
→ Run `npm run check` after this step.
→ Stop and report before Step 2.

**Step 2 — [What to change, if needed]**
[Next change.]
→ Run `npm run check`.
→ Stop and report.

---

### Regression Test

[If one does not exist: create a test that would have caught this bug.
If one exists: confirm it now fails before the fix, passes after.]

```bash
# Test that should fail before fix (demonstrate the bug):
[command]

# Expected output before fix:
[failing output]

# Expected output after fix:
[passing output]
```

---

### Validation

```bash
npm run check          # Must pass
npm run test:unit      # Expect [N]/[N]
[regression test]      # Must pass
```

---

### Acceptance Criteria

```
□ Root cause addressed — not just the symptom
□ npm run check passes
□ npm run test:unit passes ([N]/[N])
□ Regression test passes
□ No new test failures introduced
□ TECH_DEBT.md TD row updated with real commit hash after push
```

---

### Commit Message

```
fix([scope]): [description of what was fixed] (TD-[ID])
```

---

### Post-Fix

After CI green:
```
□ TD-[ID] moved to Resolved table in TECH_DEBT.md
□ Commit hash recorded (real hash — not "this commit")
□ CI run number recorded
□ TECH_DEBT_SUMMARY.md updated if TD was Critical or High
```
