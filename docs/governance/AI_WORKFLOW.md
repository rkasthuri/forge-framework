# AI_WORKFLOW.md
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> This document defines the collaboration process, responsibilities, review flow,
> and approval gates for every agent working on FORGE.
> Read AI_CONSTITUTION.md first. This document assumes you have.

---

## 1. The Agent Roster

| Agent | Type | Role | Active |
|---|---|---|---|
| **Raj Kasthuri** | Human — Founder | Final decision-maker, approver, Rule 9 authority | Always |
| **Aiden** | Claude (primary chat) | Architecture, design, ADRs, planning, diff review, documentation | Always |
| **Nova** | ChatGPT | Independent architectural review — challenges assumptions, surfaces risks | At every design fork; selectively for major changes |
| **Implementation Agent** | CC (Claude Code) **or** Codex | Implementation, refactoring, investigations, test writing | One at a time — never both simultaneously |
| **Finn** | External AI | UX and product critique | Whenever UI changes occur |

> **CC vs. Codex:** Only one implementation agent is active at any time.
> When CC is active, Codex is not used. When Codex is active, CC is not used.
> The workflow below applies identically to whichever is current.

---

## 2. The Standard Workflow

Every piece of work on FORGE follows this sequence. No step may be skipped.

```
┌─────────────────────────────────────────────────────────────┐
│  1. RAJ                                                      │
│     Identifies work — feature, bug, TD, improvement         │
│     States the goal to Aiden in the build chat              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. AIDEN                                                    │
│     Architecture, design, ADRs, planning                    │
│     — Proposes approach, identifies risks, scopes the work  │
│     — Writes ADR if a structural decision is made           │
│     — Produces a CC/Codex implementation brief              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. NOVA                                                     │
│     Independent architectural review                        │
│     — Challenges assumptions                                │
│     — Surfaces risks Aiden may have missed                  │
│     — Delivers: Assessment / Risks / Recommendation         │
│     — Always consulted at design forks                      │
│     — Not optional "because the answer seems obvious"       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. RAJ                                                      │
│     Reviews Aiden's design + Nova's assessment              │
│     Makes the final call — proceed, revise, or abandon      │
│     Explicitly approves before implementation begins        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. IMPLEMENTATION AGENT (CC or Codex)                       │
│     Receives the Aiden-written brief                        │
│     — Implements exactly what the brief specifies           │
│     — Stops at every checkpoint                             │
│     — Reports back with evidence (terminal output, diffs)   │
│     — Never continues past a checkpoint without instruction  │
│     — Never self-approves scope expansions                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. AIDEN                                                    │
│     Diff review and architecture compliance check           │
│     — Reads the actual diff (never a summary)               │
│     — Verifies scope: only what was agreed                  │
│     — Checks copyright headers, hardcoded paths,            │
│       engine boundary, business logic in routes             │
│     — Approves, requests changes, or blocks                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    ┌─────┴──────┐
                    │ Major      │ Routine
                    │ arch change│ fix/feature
                    ▼            ▼
┌───────────────────────┐   ┌───────────────────────────────┐
│  7a. NOVA (if needed) │   │  7b. Skip to Raj              │
│  Independent review   │   │  No Nova needed for routine   │
│  for major structural │   │  implementation work          │
│  changes only         │   └───────────────┬───────────────┘
└──────────┬────────────┘                   │
           └──────────────┬─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  8. RAJ — RULE 9                                             │
│     Final approval and push authorisation                   │
│     — Reviews Aiden's diff approval                         │
│     — States "Go" explicitly in the build chat              │
│     — Without Rule 9, nothing is pushed — ever              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  9. COMMIT / PUSH                                            │
│     Implementation agent executes the push                  │
│     — git stash / pull --rebase / stash pop / push          │
│     — Reports new hash and CI run number                    │
│     — Waits for CI to conclude before reporting green       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  10. FINN (when UI changes occurred)                         │
│      UX review of any forge-ui changes                      │
│      — Runs after CI green                                  │
│      — Feedback logged as TD-UI-* items if actionable       │
│      — Does not block the push (post-merge review)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Agent Responsibilities in Detail

### 3.1 Raj — Founder and Final Authority

**Responsibilities:**
- States the goal or problem to Aiden
- Reviews Aiden's design and Nova's assessment before approving implementation
- Issues Rule 9 (explicit push authorisation)
- Makes all product, architecture, and process decisions

**Does not:**
- Write implementation briefs (Aiden's job)
- Review diffs for architecture compliance (Aiden's job)
- Implement code directly

**Raj's inputs into the workflow:**
- Goal statement → Aiden
- Design approval → Implementation Agent (via Aiden's brief)
- Rule 9 "Go" → Push

---

### 3.2 Aiden — Architecture Partner and Review Authority

**Responsibilities:**
- Translates Raj's goals into architecture proposals
- Writes all ADRs for structural decisions
- Writes all implementation briefs for CC/Codex
- Reviews every diff before commit — reads the actual diff, never a summary
- Verifies compliance with AI_CONSTITUTION.md on every commit
- Maintains documentation and project memory
- Relays design questions to Nova with full context
- Issues diff approval before Raj's Rule 9

**Does not:**
- Implement code
- Push to the repository
- Make product decisions unilaterally

**Brief format for implementation agents:**

Every Aiden-written brief must contain:
```
CONTEXT      — What exists today and why this work is needed
SCOPE        — Exactly what to build/change (file-level where possible)
OUT OF SCOPE — Explicit list of what not to touch
STEPS        — Numbered, sequential, checkpointed
VERIFY       — How to confirm each step worked
COMMIT MSG   — Exact commit message to use
STOP         — Where to stop and report back
```

---

### 3.3 Nova — Independent Architectural Reviewer

**Responsibilities:**
- Reviews Aiden's design proposals independently
- Challenges assumptions — not to obstruct, but to surface blind spots
- Delivers structured responses: **Assessment / Risks / Recommendation / Decision**
- Consulted at every design fork, regardless of how obvious the answer appears

**When Nova is consulted:**
- Every architectural decision (always)
- Every new module, interface, or data contract (always)
- Major refactors that touch multiple subsystems (always)
- Routine implementation work (never — Nova reviews design, not code)

**Nova is not optional** because an answer seems obvious. The standing rule is:
*"Always consult Nova regardless of how obvious a decision seems."*
The value is independence, not uncertainty.

**Nova's output format:**
```
Assessment   — What Aiden's proposal does and what it assumes
Risks        — What could go wrong, what was not considered
Recommendation — What Nova would do and why
Decision     — Deferred to Raj (Nova recommends, never decides)
```

---

### 3.4 Implementation Agent (CC or Codex)

**Only one is active at a time.** The workflow is identical for both.

**Responsibilities:**
- Reads and confirms the Aiden brief before starting
- Acknowledges AI_CONSTITUTION.md at the start of each session
- Implements exactly what the brief specifies — no more, no less
- Stops at every checkpoint and reports back with evidence
- Never self-approves scope expansions
- Never commits without Aiden diff review
- Never pushes without Rule 9

**Session start protocol:**

Every new implementation session must open with:
```
1. Confirm repo state: git status + git log --oneline -5
2. Confirm test baseline: npm run check + npm run test:unit
3. Confirm understanding of the brief
4. State the first step and ask for go-ahead
```

**Checkpoint protocol:**

At every checkpoint the agent must report:
```
✅ DONE    — What was completed
📋 OUTPUT  — Terminal output or diff (actual, not summarised)
🔍 FINDING — Anything unexpected or diverging from the brief
⏭ NEXT    — What the next step is
⛔ STOP    — Awaiting instruction before proceeding
```

**What triggers an unscheduled stop:**
- Something unexpected discovered in the codebase
- The brief and reality diverge
- A file or function does not exist as expected
- Tests fail unexpectedly
- Any doubt about whether the next action is in scope

---

### 3.5 Finn — UX Reviewer

**Responsibilities:**
- Reviews forge-ui changes after CI green
- Provides UX and product critique from an end-user perspective
- Feedback is logged as TD-UI-* items if actionable

**Does not:**
- Block pushes
- Make implementation decisions
- Review engine (src/) code

---

## 4. The Brief → Implementation → Review Loop

For any non-trivial piece of work the loop looks like this:

```
Aiden writes brief
       ↓
Implementation Agent reads brief, confirms understanding
       ↓
Implementation Agent completes Step 1, stops, reports
       ↓
Raj or Aiden reviews, gives go-ahead for Step 2
       ↓
... (repeat per step) ...
       ↓
Implementation Agent reports completion + diff
       ↓
Aiden reads diff, approves or requests changes
       ↓
If changes: Implementation Agent revises, reports again
       ↓
Aiden confirms approval
       ↓
Raj issues Rule 9
       ↓
Implementation Agent pushes, reports hash + CI run
       ↓
CI concludes — agent reports pass/fail with counts
```

---

## 5. When Nova Is and Is Not Consulted

| Situation | Nova consulted? |
|---|---|
| New pipeline stage | ✅ Always |
| New module or package | ✅ Always |
| Change to inter-module contracts | ✅ Always |
| New database schema or migration | ✅ Always |
| ADR being written | ✅ Always |
| Major refactor (multiple subsystems) | ✅ Always |
| Bug fix scoped to one function | ❌ Not needed |
| UI tab implementation (no engine change) | ❌ Not needed |
| Adding a new npm script | ❌ Not needed |
| Routine test writing | ❌ Not needed |
| Decision that "seems obvious" | ✅ Always — no exceptions |

---

## 6. Commit and Push Discipline

### Commit batching
Commits are batched by logical milestone. Never commit:
- Docs-only changes in isolation from related code changes
- Single-file changes that belong to a larger logical unit
- Anything that has not passed `npm run check`

### Commit message format
```
<type>(<scope>): <short description>

Types: feat | fix | refactor | docs | test | chore
Scope: ui | engine | triage | healing | crawl | generate | ci | deps

Examples:
  feat(ui): Tests tab — generation review surface (TD-UI-003)
  fix(engine): VerificationRunner prerequisite state setup (TD-013)
  docs: AI_CONSTITUTION.md + AI_WORKFLOW.md
```

### Push sequence
```bash
git stash           # park any uncommitted work
git pull --rebase   # sync with remote
git stash pop       # restore parked work
git push            # push
```

After push — agent must report:
1. New hash (post-rebase, may differ from pre-push hash)
2. CI run number
3. CI result when concluded — with exact counts

---

## 7. Rule 9 — Authorisation Protocol

Rule 9 is Raj's explicit push authorisation. It is:
- A verbal "Go" from Raj in the build chat
- Required before every push, no exceptions
- Not transferable — Aiden cannot issue Rule 9
- Not implied — silence is not authorisation

**Before Raj issues Rule 9, Aiden must confirm:**
- Diff has been reviewed and approved
- All checkpoints have been reported
- `npm run check` passes
- Unit tests pass
- No regressions introduced

**After Rule 9 is issued:**
- Implementation agent executes the push sequence
- Reports hash and CI run number immediately
- Does not begin new work until CI concludes

---

## 8. Handling Divergence

If at any point the work diverges from the brief — the codebase is not as expected,
a dependency is missing, a function behaves differently — the implementation agent
must:

1. **Stop immediately**
2. **Report the divergence with evidence** (actual output, not description)
3. **Do not attempt to resolve it autonomously**
4. **Wait for Aiden to assess and update the brief**

Autonomous resolution of divergence is one of the most common sources of
architectural drift. The brief exists precisely because Raj and Aiden have
thought through the approach. An agent improvising around a divergence bypasses
that thinking.

---

## 9. Documentation Ownership

| Document | Owner | Updated when |
|---|---|---|
| `AI_CONSTITUTION.md` | Raj (Aiden assists) | Rule changes only |
| `AI_WORKFLOW.md` | Aiden | Process changes |
| `TECH_DEBT.md` | Implementation Agent (with Aiden review) | Every TD open/resolve |
| ADRs | Aiden | Every structural decision |
| `PROJECT_STATE.md` | Aiden | Every session end |
| All other docs in `/docs` | Aiden | As work progresses |

Implementation agents update `TECH_DEBT.md` as part of the commit that resolves
or opens a TD. They do not update ADRs, workflow docs, or architecture docs —
those belong to Aiden.

---

## 10. New Agent Onboarding

Any new AI agent joining FORGE must, before touching the repository:

1. Read `AI_CONSTITUTION.md` in full
2. Read `AI_WORKFLOW.md` in full
3. Read `AI_ONBOARDING_CHECKLIST.md` and complete every item
4. Confirm to Raj in writing:
   - Role understood
   - Constitution acknowledged
   - Three rules most critical to their role
   - Any questions about process

An agent that begins work without completing onboarding has violated the
constitution before writing a single line.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
