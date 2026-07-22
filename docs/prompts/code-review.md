# Code Review Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: Aiden reviews code quality beyond the diff-review checklist -->
<!-- Note: diff-review.md covers scope/headers/boundary/paths. -->
<!--       This prompt covers logic, patterns, and architectural fit. -->

---

## FORGE Code Review

**File(s):** [paths]
**Commit / PR:** [hash or reference]
**Reviewer:** Aiden
**Date:** [YYYY-MM-DD]

---

## 1. Architectural Fit

```
□ Does this code belong in this module?
  (Does it respect the module's stated responsibility in CODEBASE_MAP.md?)

□ Does it introduce a new dependency that was not in the brief?
  If yes: is that dependency acceptable?

□ Does it create a new inter-module dependency that should be in an ADR?

□ Does it touch more than one module? If yes, is that scope intentional?
```

---

## 2. Evidence Integrity

```
□ Does any new function produce a confidence score?
  If yes: is it derived from evidence, or hardcoded / assumed?

□ Does any new function produce an outcome field (pass/fail/green/unknown)?
  If yes: can it return "unknown" or "insufficient-evidence" when evidence is absent?

□ Does any new function assert something about the application?
  If yes: is that assertion grounded in observed data?

□ Does any new function carry provenance (observed vs inferred)?
  If yes: is provenance set correctly?
```

---

## 3. Error Handling

```
□ Are errors caught and handled — or silently swallowed?
□ Are error cases logged with enough context to diagnose?
□ Does failure in this code produce an honest output (error state)
  rather than a false success?
□ Are there any code paths that could return undefined silently?
```

---

## 4. AI Call Hygiene (if applicable)

```
□ Is the AI call batched appropriately? (ElementClassifier: ≤20 per call)
□ Is maxTokens set explicitly?
□ Is budget consumption tracked via AiBudgetTracker?
□ Is the AI call logged with enough context to audit later?
□ Does the function handle AI refusal or malformed response gracefully?
```

---

## 5. Storage Hygiene (if applicable)

```
□ Is data written AND read in this change?
  (If write-only: flag as potential ADR-017 archetype — "declared channel, no producer")
□ Does the read path reconstruct the full data that was written?
  (No lossy projection)
□ Is run data persisted to SQLite — not only logged to console?
  (No "console-as-only-home")
□ Are both success and failure outcomes persisted?
  (No "winners-only persistence")
```

---

## 6. Naming and Clarity

```
□ Are function and variable names clear without context?
□ Are boolean parameters avoided? (prefer named option objects)
□ Are any magic numbers or strings present that should be constants?
□ Would a new agent reading this code understand what it does without the brief?
```

---

## 7. Review Decision

**Approved:**
```
CODE REVIEW APPROVED — [file(s)]

Architectural fit:    ✅
Evidence integrity:   ✅
Error handling:       ✅
AI hygiene:           ✅ / N/A
Storage hygiene:      ✅ / N/A
Naming:               ✅

Notes: [any minor observations that don't block approval]
```

**Changes requested:**
```
CODE REVIEW — CHANGES REQUESTED — [file(s)]

Issues:
1. [Specific issue — file:function — description]
2. [Specific issue]

Required before approval:
1. [What must change]
2. [What must change]
```
