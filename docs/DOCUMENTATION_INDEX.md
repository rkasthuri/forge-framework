# FORGE Documentation
<!-- version: 1.0 | status: ACTIVE | owner: Raj Kasthuri (AnvilQ Technologies LLC) -->

> Master index and required reading guide for all FORGE documentation.
> Start here. Every other document in this directory is linked below
> with its purpose, audience, and where it fits in the reading order.
>
> **If you are a new AI agent:** Read the Required Reading Order in
> Section 2 before touching anything else.
>
> **If you are looking for something specific:** Use Section 3 (Document
> Directory) to find it directly.

---

## 1. What This Documentation Covers

FORGE™ is an AI-augmented, app-agnostic end-to-end test automation platform
built by Raj Kasthuri under AnvilQ Technologies LLC.

This documentation set covers:
- The rules every AI agent must follow (constitution, workflow, onboarding)
- The system architecture and design decisions
- The current project state, milestone, and priorities
- How to set up, run, and contribute to FORGE
- The product roadmap, limitations, and testing strategy
- Reference material (glossary, decision log, codebase map)

---

## 2. Required Reading Order

### For New AI Agents — Read in This Exact Order

```
1. AI_CONSTITUTION.md       ← Rules. Non-negotiable. Read first.
2. AI_WORKFLOW.md           ← How the collaboration works.
3. ARCHITECTURE_OVERVIEW.md ← What FORGE is and how it is built.
4. GLOSSARY.md              ← Terms FORGE uses and what they mean.
5. KNOWN_LIMITATIONS.md     ← What FORGE cannot do today.
6. TESTING_STRATEGY.md      ← How FORGE is tested and validated.
7. DECISION_LOG.md          ← Why things are the way they are.
8. ROADMAP.md               ← Where FORGE is going.
9. AI_ONBOARDING_CHECKLIST.md ← Complete this before any work.
```

After completing the checklist, implementation agents read:
```
10. FORGE-Handover.md        ← Master project orientation (upload pending)
11. PROJECT_STATE.md         ← Current snapshot — branch, WIP, blockers
12. CURRENT_MILESTONE.md     ← Active milestone scope and criteria
13. CODEX_ONBOARDING.md      ← Implementation agent specific guide
```

**Do not skip steps. Do not reorder. The sequence is intentional.**

---

### For Humans Onboarding to the Project

```
1. FORGE-Handover.md         ← Start here for the full picture
2. ARCHITECTURE_OVERVIEW.md  ← System architecture
3. BUILD_AND_RUN.md          ← Get it running locally
4. ROADMAP.md                ← Where things stand and where they're going
5. TECH_DEBT_SUMMARY.md      ← What is open and why
```

---

### For Architectural Reviewers (Nova)

```
1. AI_CONSTITUTION.md        ← Rules that apply to all agents
2. AI_WORKFLOW.md            ← Your role and review format
3. ARCHITECTURE_OVERVIEW.md  ← Current system architecture
4. DECISION_LOG.md           ← Decisions already made — do not re-litigate
5. ROADMAP.md                ← Sequencing constraints
```

---

## 3. Document Directory

### Foundation — Read Before Anything Else

| Document | Purpose | Status |
|---|---|---|
| [AI_CONSTITUTION.md](AI_CONSTITUTION.md) | Immutable rules every AI must follow. Non-negotiable. | ✅ Complete |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | Collaboration process, roles, approval gates, Rule 9. | ✅ Complete |
| [AI_ONBOARDING_CHECKLIST.md](AI_ONBOARDING_CHECKLIST.md) | Step-by-step checklist every new AI must complete before contributing. | ✅ Complete |
| [CODEX_ONBOARDING.md](CODEX_ONBOARDING.md) | Implementation agent specific onboarding guide. | ⏳ Pending CC |

---

### Architecture and Design

| Document | Purpose | Status |
|---|---|---|
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | System architecture, pipeline stages, components, data flow, boundaries. | ✅ Complete |
| [CODEBASE_MAP.md](CODEBASE_MAP.md) | Module-by-module map of the repo, ownership, and dependencies. | ⏳ Pending CC |
| [REPOSITORY_STRUCTURE.md](REPOSITORY_STRUCTURE.md) | Directory-by-directory explanation of the repo layout. | ⏳ Pending CC |
| [DECISION_LOG.md](DECISION_LOG.md) | Chronological record of architectural decisions and ADRs. | ✅ Complete |

---

### Project State

| Document | Purpose | Status |
|---|---|---|
| [FORGE-Handover.md](FORGE-Handover.md) | Master orientation document — complete project handover. | ⏳ Pending upload |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Current branch, WIP, open TDs, blockers, next priorities. | ⏳ Pending CC |
| [CURRENT_MILESTONE.md](CURRENT_MILESTONE.md) | Active milestone objectives, scope, and completion criteria. | ⏳ Pending CC |
| [TECH_DEBT_SUMMARY.md](TECH_DEBT_SUMMARY.md) | Summary of all open TDs, priorities, and status. | ⏳ Pending CC |

---

### Strategy and Roadmap

| Document | Purpose | Status |
|---|---|---|
| [ROADMAP.md](ROADMAP.md) | Planned work, phases, and long-term product direction. | ✅ Complete |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Testing philosophy, eval harnesses, execution strategy, validation. | ✅ Complete |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | Current limitations, assumptions, and deferred capabilities. | ✅ Complete |

---

### Operations

| Document | Purpose | Status |
|---|---|---|
| [BUILD_AND_RUN.md](BUILD_AND_RUN.md) | Setup, build, run, and debug FORGE locally. | ⏳ Pending CC |
| [CI_PIPELINE.md](CI_PIPELINE.md) | CI/CD workflow, quality gates, release validation. | ⏳ Pending CC |
| [RELEASE_PROCESS.md](RELEASE_PROCESS.md) | Versioning, release workflow, deployment. | ⏳ Pending CC |

---

### Reference

| Document | Purpose | Status |
|---|---|---|
| [GLOSSARY.md](GLOSSARY.md) | Definitions of FORGE terminology, concepts, and abbreviations. | ✅ Complete |
| [/prompts/](prompts/) | Standardised prompts for architecture review, implementation, audits, ADRs, code review, CI review. | ⏳ Pending |

---

## 4. Document Status Key

| Symbol | Meaning |
|---|---|
| ✅ Complete | Written, reviewed, accurate as of this version |
| ⏳ Pending CC | Requires repo verification from Claude Code before writing |
| ⏳ Pending upload | Raj to upload source material |
| ⏳ Pending | Requires scoping conversation before writing |

---

## 5. The One Rule That Governs All of This

Every document in this directory, and every agent who reads it, operates
under the same constraint that governs FORGE itself:

> **Confidence must be earned from observed evidence.**
> **It can never be assumed, inferred, or fabricated.**

Documentation that overstates capability is a defect.
Documentation that understates built capability is equally a defect.
Uncertainty is flagged inline — never papered over.

If you find a document that violates this — raise it with Aiden.

---

## 6. Keeping This Documentation Current

| When | What to update |
|---|---|
| New architectural decision | Add entry to `DECISION_LOG.md`, write ADR |
| TD opened or resolved | Update `TECH_DEBT_SUMMARY.md` and on-disk `TECH_DEBT.md` |
| Milestone completed | Update `PROJECT_STATE.md`, `CURRENT_MILESTONE.md`, `ROADMAP.md` |
| New limitation discovered | Add entry to `KNOWN_LIMITATIONS.md` |
| New capability shipped | Update `ROADMAP.md` status, update `ARCHITECTURE_OVERVIEW.md` |
| New agent joins | Complete `AI_ONBOARDING_CHECKLIST.md` |
| New term introduced | Add to `GLOSSARY.md` |

Documentation that drifts from the codebase is as much a lie as code
that claims more than it does. Keep them in sync.

---

*FORGE™ — AI-Augmented Quality Engineering Platform*
*AnvilQ Technologies LLC — Copyright © 2026 Raj Kasthuri*
