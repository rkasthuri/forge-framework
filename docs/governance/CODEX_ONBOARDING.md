# CODEX_ONBOARDING.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> Codex-specific onboarding guide for OpenAI Codex as an implementation agent
> on FORGE. This document is distinct from AI_ONBOARDING_CHECKLIST.md, which
> is universal and mandatory for every AI agent. Read that first.
>
> This document explains how Codex should consume context, receive work,
> execute tasks, and interact with the FORGE team — specifically optimised
> for how Codex works best.

---

## 1. Before You Read This

You must have already completed `AI_ONBOARDING_CHECKLIST.md` in full.
If you have not, stop and do that first. This document assumes that checklist
is complete and confirmed.

The universal rules in `AI_CONSTITUTION.md` apply to Codex without exception.
This document does not relax any of those rules — it explains how to apply
them in the context of how Codex receives and executes work.

---

## 2. How Codex Is Different From Claude Code

Codex and CC (Claude Code) fill the same role in the FORGE workflow —
implementation agent. The workflow, approval gates, and constitutional rules
are identical for both. What differs is how each agent best receives context
and instructions.

| Dimension | Claude Code (CC) | Codex |
|---|---|---|
| Context delivery | Conversational — can reference prior chat history | Document-first — works best from explicit files and scoped inputs |
| Project history | Can reference prior conversation turns | Should not be expected to reconstruct months of history from conversation |
| Brief format | Conversational brief in chat, checkpointed | Structured document with explicit file list, constraints, and definition of done |
| Best at | Iterative back-and-forth, exploratory investigation | Focused, well-scoped implementation tasks |

**The practical implication:** When Codex receives a task, it must be given
everything it needs in that task package. It should not need to ask "what
does TD-013 mean?" or "what is the engine boundary?" — those answers must
be in the task package or in the documents it is told to read.

---

## 3. What Codex Needs For Every Task

Every task given to Codex must include:

```
1. Relevant project documents (links or content)
   → The specific docs that apply to this task
   → Not all docs — only the ones that matter

2. The specific files to modify
   → Explicit file paths
   → Not "somewhere in src/core/healing/" — exact paths

3. A clearly scoped objective
   → One thing to accomplish
   → Not "improve the crawler" — one specific, verifiable change

4. Constraints
   → What must not change
   → What boundaries must be respected
   → What patterns must be followed

5. Definition of done
   → How Codex and Raj know the task is complete
   → Specific, verifiable criteria
```

This is different from how Claude Code has operated — CC can reference
prior conversation context. Codex cannot and should not be expected to.
The task package is the complete context.

---

## 4. The Task Package Format

Every task Codex receives must follow this structure. Aiden prepares this
package. Codex does not begin work until the full package is provided.

```markdown
## FORGE Implementation Task

### Objective
[One sentence. What will be true when this task is complete that is not
true now.]

### Background
[Why this work is needed. What problem it solves. Reference the relevant
TD number if this resolves a logged defect.]

### Relevant ADRs
[List only the ADRs that constrain or inform this task.
Include the decision, not just the number.]

### Relevant TDs
[List open TDs this task resolves or must not disturb.
Include a one-line description of each.]

### Files to Modify
[Explicit file paths — relative to repo root.
One path per line.]

### Files NOT to Modify
[Explicit file paths that must not change.
Include why, e.g. "engine boundary — src/ never imports from forge-ui/".]

### Constraints
[Numbered list of rules that apply to this specific task:
- Path resolution rules
- Copyright header requirement
- Engine boundary
- No business logic in routes
- Any task-specific constraints]

### Acceptance Criteria
[Numbered, verifiable list. Each item must be checkable with evidence.
e.g. "npm run check passes" not "code looks correct".]

### Definition of Done
[What Codex must produce before reporting completion:
- List of files modified
- Terminal output confirming each acceptance criterion
- Diff summary (actual diff, not description)
- Any questions or divergences found]

### Validation Required
[Which tests to run. Expected pass counts.
e.g. "npm run test:unit — expect 531/0"
     "npm run check — must pass clean"]

### Rollback Considerations
[What a revert of this change would affect.
If the change is low-risk and easily reverted, state that.
If it touches schema or persistent state, state what rollback would require.]

### Checkpoint Schedule
[Where Codex must stop and report before continuing.
e.g. "Stop after Step 2 and report before implementing Step 3."]
```

---

## 5. Session Start Protocol

At the start of every Codex session, before touching any file:

```
1. Confirm repo state:
   git status
   git log --oneline -5

2. Confirm test baseline:
   npm run check
   npm run test:unit

3. Confirm task understanding:
   - Restate the objective in one sentence
   - List the files you will modify
   - List the files you will not modify
   - State the first step you will take

4. Wait for go-ahead before proceeding
```

Report all four outputs to Raj. Do not begin implementation until Raj
confirms go-ahead.

---

## 6. Checkpoint Reporting Format

At every checkpoint, Codex reports in this format:

```
✅ COMPLETED
   [What was done — specific, not vague]

📋 EVIDENCE
   [Terminal output or diff — actual, not summarised]

🔍 FINDINGS
   [Anything unexpected, any divergence from the task package,
   any file that does not match the brief's description.
   If nothing unexpected: "None."]

⏭ NEXT STEP
   [What comes next, if there is a next step]

⛔ STOP — AWAITING INSTRUCTION
   [Always end with this. Codex does not continue without explicit
   instruction from Raj.]
```

---

## 7. When to Stop Unscheduled

Codex must stop immediately — outside of scheduled checkpoints — when:

- A file listed in "Files to Modify" does not exist at the expected path
- A file listed in "Files NOT to Modify" would need to change to complete the task
- Tests fail unexpectedly
- The repo state at session start does not match what the task package describes
- Any constraint in the task package cannot be satisfied as written
- Any doubt arises about whether the next action is in scope

When stopping unscheduled:
```
⚠️ UNSCHEDULED STOP

Reason: [specific — what was found, what diverged, what is missing]
Evidence: [actual output]
Question: [what Codex needs to proceed]
```

Do not attempt to resolve the divergence autonomously. Report and wait.

---

## 8. What Codex Must Never Do

These are the same as `AI_CONSTITUTION.md` Section 8, restated here
in the context of how Codex operates:

- **Never begin a task without a complete task package.** If the package
  is missing files, constraints, or definition of done — ask before starting.
- **Never expand scope beyond the task package.** If fixing a bug reveals
  a related bug, log it as a new TD — do not fix it in the same commit.
- **Never commit without Aiden diff review.** Complete the task, produce
  the evidence, stop — then Aiden reviews before any commit is made.
- **Never push without Rule 9.** After Aiden approves, Raj issues "Go."
  No push happens without it.
- **Never invent a file path, flag, or API signature.** If the task package
  references something that does not exist in the repo — stop and report.
- **Never summarise a diff.** Aiden reads the actual diff. Produce it.
- **Never mark a TD resolved.** Codex implements and reports. Aiden and Raj
  confirm resolution. Codex does not update TECH_DEBT.md without instruction.

---

## 9. Receiving Documentation Context

For any task that touches engine architecture, Codex should be provided
with the relevant subset of this documentation — not all of it. Aiden
will specify which docs apply in the task package.

**Minimum docs for any implementation task:**
- `AI_CONSTITUTION.md` — always
- `ARCHITECTURE_OVERVIEW.md` Section 2 (the two boundaries) — always
- The relevant section of `CODEBASE_MAP.md` for the module being touched

**Additional docs by task type:**

| Task type | Additional docs |
|---|---|
| Crawl / Bootstrap work | KNOWN_LIMITATIONS.md L-001, L-002, L-003 |
| forge-ui tab work | ARCHITECTURE_OVERVIEW.md Section 6 (forge-ui) |
| Triage / eval work | TESTING_STRATEGY.md Section 6 (eval harnesses) |
| Healing work | GLOSSARY.md (SmartLocator, HealStore, confidence hierarchy) |
| Storage / migration | CODEBASE_MAP.md Section 2.7 |
| Any TD resolution | TECH_DEBT_SUMMARY.md entry for that TD |

---

## 10. First Task Recommendation

Before taking on a complex task, Codex should complete one small,
well-scoped task first to validate that:
- The repo setup is correct
- The task package format works
- The checkpoint protocol is working
- The diff review process is understood

A good first task: add a missing copyright header to one file, confirm
with `git diff`, stop for Aiden review. Simple, verifiable, zero risk.

---

## 11. Onboarding Confirmation

Before beginning any work on FORGE, Codex must deliver this confirmation
to Raj:

```
CODEX ONBOARDING COMPLETE

I have read:
  ✅ AI_CONSTITUTION.md
  ✅ AI_WORKFLOW.md
  ✅ AI_ONBOARDING_CHECKLIST.md (all parts complete)
  ✅ CODEX_ONBOARDING.md
  ✅ ARCHITECTURE_OVERVIEW.md
  ✅ GLOSSARY.md

My role:        Implementation Agent (Codex)
Authority:      Implementation only — no design decisions, no self-approval

I understand:
  - I work from task packages, not conversational history
  - I stop at every checkpoint and report with evidence
  - I do not commit without Aiden diff review
  - I do not push without Rule 9
  - I do not expand scope beyond the task package
  - I do not resolve divergences autonomously

First task:     [state the task as given]
First step:     [state what I will do first]
Questions:      [any questions before I start, or 'None']

Repo state at session start:
  git status:     [output]
  git log -5:     [output]
  npm run check:  [PASS / FAIL]
  test:unit:      [X/X]
```

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
