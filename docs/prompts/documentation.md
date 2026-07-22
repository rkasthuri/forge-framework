# Documentation Prompt
<!-- FORGE prompt template — version 1.0 -->
<!-- Use: When writing or updating any FORGE documentation -->
<!-- Rule: Under-claiming is as much a violation as over-claiming -->

---

## FORGE Documentation Task

**Document:** [filename]
**Audience:** [AI agents / Human engineers / Raj / Public / All]
**Purpose:** [What this document enables its reader to do]
**Prepared by:** Aiden
**Date:** [YYYY-MM-DD]

---

## Before Writing

```
□ Audience confirmed — who is reading this and why?
□ Purpose confirmed — what should the reader be able to do after reading?
□ Sources confirmed — what grounded facts am I drawing from?
   □ Session memory
   □ CC repo verification (specify which commands were run)
   □ On-disk TECH_DEBT.md
   □ ADRs
   □ FORGE-Handover.md
□ Uncertain items identified — what will I flag rather than invent?
```

---

## Honesty Checklist (Apply to Every Claim)

Before including any statement in a FORGE document, ask:

```
□ Is this grounded in something I was given?
  (Session memory, CC output, uploaded docs)
  If not: flag it or remove it

□ Am I inferring where I should be stating?
  If yes: say "inferred from X" or ask CC to verify

□ Am I over-claiming a capability?
  (Describing something as shipped that is only planned)
  If yes: use the correct status label

□ Am I under-claiming a capability?
  (Describing something as planned that is actually shipped)
  If yes: correct it — under-claiming is equally a violation

□ Am I citing a TD number or status from the stale project-file copy?
  If yes: verify against on-disk TECH_DEBT.md first

□ Am I citing a metric (test counts, accuracy figures) from memory?
  If yes: flag with "verify with CC" or cite the source
```

---

## Status Labels (Use Consistently)

| Label | Meaning |
|---|---|
| ✅ Shipped | Built, CI green, honesty signals in place |
| 🔄 In Progress | Actively being built — partially done |
| 🗓️ Planned | Committed future work — not yet started |
| 💡 Exploratory | Possible future direction — not committed |
| 🔵 Stub | Placeholder exists — no real implementation |
| ⚠️ | Warning — verify this before acting on it |
| ❌ | Not implemented / not applicable |

---

## Document Structure

**For reference docs** (GLOSSARY, CODEBASE_MAP, ARCHITECTURE_OVERVIEW):
- Lead with what the document covers
- Organise by subject, not by session history
- Every term / component gets one entry — no duplication

**For process docs** (AI_CONSTITUTION, AI_WORKFLOW, prompts):
- Lead with the rule or process
- Every rule earns its place — no padding
- Format for scanning: tables, numbered lists, code blocks

**For state docs** (PROJECT_STATE, CURRENT_MILESTONE):
- Date-stamp the source of every fact
- Stale faster than other docs — flag verification requirements prominently

**For onboarding docs** (AI_ONBOARDING_CHECKLIST, CODEX_ONBOARDING):
- Structure as a sequence the reader follows, not prose they read passively
- Confirmation templates required — vague acknowledgements are not enough

---

## After Writing

```
□ Every claim is grounded in a source
□ Uncertain items are flagged inline with ⚠️ or "verify with CC"
□ Status labels are applied consistently
□ No TD numbers cited from stale project-file copy
□ No metrics cited without source
□ Audience can do what the Purpose statement says they should be able to do
□ No invented file paths, API signatures, or command flags
□ README.md updated if this is a new document
□ Version comment at top of file updated
```
