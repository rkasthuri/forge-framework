# FORGE Repository Memory

This document captures historical discoveries, architectural decisions, known pitfalls, and lessons learned from previous sessions.

Purpose:
- Prevent rediscovering known issues.
- Capture non-obvious implementation details.
- Record architectural decisions and rationale.
- Preserve debugging knowledge across sessions.

Only include information that remains valuable across multiple sessions.

---

# Session Log

## Session 1

### Discovery
Initial crawler architecture required BFS/SPA/Hybrid strategies.

### Decision
Implemented Strategy Pattern rather than conditional branching.

### Rationale
Maintain app-agnostic extensibility.

---

# Tooling gotchas

## Git staging — multi-path `git add` can silently skip brand-new untracked files (seen twice)

A multi-path `git add A B C && git commit` can silently skip BRAND-NEW untracked files (stages only
already-tracked paths), producing a commit missing the new file. ALWAYS verify staging before
committing: `git diff --cached --name-only` must show the full intended set. Prefer: stage new files
in their own `git add` call, or `git add <dir>`, then verify. Recovered both times by amending the
local (unpushed) commit.