# Investigation Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: Before fixing any defect. Audit before fix — always. -->
<!-- Rule: Never patch on contact. Diagnose root cause before writing code. -->

---

## FORGE Defect Investigation

**TD:** [TD-XXX]
**Investigator:** [CC / Codex / Aiden]
**Date:** [YYYY-MM-DD]
**Priority:** [Critical / High / Medium / Low]

---

### The Symptom

[What was observed. Exact terminal output, error message, or behaviour.
Not a paraphrase — the actual output if possible.
If the symptom was described in the TD, quote it here.]

---

### Reproduction

[How to reproduce the symptom. Exact commands. Exact sequence.
If it cannot be reliably reproduced, state that and explain why.]

```bash
# Steps to reproduce:
[commands]
```

**Result:**
```
[actual output]
```

**Expected:**
```
[what should have happened]
```

---

### Investigation Steps

Document each step of the investigation in order. For each step:
- State what you looked at
- State what you found
- State what it rules in or rules out

**Step 1 — [What you investigated]**
```bash
[command run]
```
```
[output]
```
Finding: [what this tells us]

**Step 2 — [What you investigated]**
[repeat]

---

### Root Cause

[What is actually causing the symptom.
Not the symptom — the underlying cause.
Reference specific file, function, and line if known.
If root cause cannot be determined, state that clearly and explain
what additional information is needed.]

**Root cause:** [one sentence]
**Location:** [file:line or "unknown — needs X to determine"]
**Why it happens:** [explanation]

---

### What This Affects

[What else might be affected by the same root cause.
Are there related TDs that share this cause?
Are there other components that use the same faulty logic?]

---

### What It Does NOT Affect

[Explicitly rule out things that might seem related but are not.
This prevents scope creep in the fix.]

---

### Proposed Fix

[Only complete this section after root cause is confirmed.
What change would address the root cause — not just the symptom.
Be specific about file, function, and approach.
Do not write code here — that goes in the implementation task.]

---

### Fix Scope

[What files would a fix touch?
What would it not touch?
What is the risk level of the fix?]

---

### Recommendation

[Should this be fixed now, or deferred?
If now: proceed to implementation-task.md
If deferred: document why and update TECH_DEBT.md with findings]

---

### Open Questions for Aiden

[Any questions that must be answered before implementation can begin.
If none: state "None — ready for implementation task."]
