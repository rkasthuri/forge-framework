# FORGE — Architecture North Star

> Standing architectural reference. Records the two load-bearing decisions made
> in Session 27 so future sessions start from a written reference, not memory.
> This is the *why* and the *spine*; the 10-phase workflow diagram is the *what*
> and the *skeleton*. When in doubt about direction, this document governs.

---

## Core thesis (decided Session 27)

FORGE's purpose is to **tell the truth about test-suite health** when other tools
can't. Not "automate test creation/maintenance" — that is commoditized. The spine
is **trust and honesty**.

Differentiator: FORGE distinguishes a **real app bug** from a **broken test** from
its **own infrastructure failing**, and says honestly which it is — **including
when it does not know.**

### Organizing principle: earned evidence

Every pipeline stage must produce **evidence, not just output**:

- Confidence must be **earned from real signal and be traceable** — never a
  hardcoded literal or a default presented as real.
- **"Verified" must mean verified** — distinguish "present" from "exercised."
- A capability is **described honestly relative to what it has demonstrably
  done**, not relative to what it was designed to do.

### What this commits the architecture to (derived, not yet built)

- **Taxonomy** must include: *test/spec defect*, *infrastructure/CI defect*, and
  a deliberate *"uncertain — needs human"* defer. (TD-063)
- **Generated artifacts** must carry a validity / earned-confidence signal — not
  be presented as trustworthy by default. (TD-064)
- **Self-healing** must signal **correctness**, not mere resolvability, and must
  represent its **validation state** honestly. (TD-065)
- **Confidence / scores** must be **derived from evidence** (grounding ratio,
  strategy tier, verification depth) — never hardcoded. (TD-066)
- **FORGE must detect and honestly report its own** degraded / stale /
  infrastructure-failure state. (TD-067)

The five audit gaps **TD-063..TD-067 are not a patch list** — together they are
the **spec for the missing "evidence / honesty layer"** that must run beneath all
phases.

### Relationship to existing assets

The FORGE workflow diagram (the 10-phase `Crawl → … → Heal + Learn` flow) remains
the accurate **capability / flow map** — the **skeleton**. It is *not* the
architecture reference: it has no concept of evidence or earned confidence (the
**nervous system**). The target architecture is **the diagram's phases plus the
evidence layer**.

---

## Data source-of-truth (decided Session 27, TD-060)

The **database** (`RunsTable` etc.) is the **single authoritative source of truth**
for run history and trends — chosen for queryability, observability, scalability,
and the commercial product direction.

`run-history.json` is **demoted to an append-only event log** whose sole role is to
**seed / reconstitute the DB** (Option 2). It is **not** a parallel store that
readers consult.

This decision governs the fix shapes of the open data-layer TDs:

- **TD-057** — decouple the DB insert from the JSON dedup early-return.
- **TD-058** — CI rebuilds its ephemeral DB by **seeding `RunsTable` from the
  committed `run-history.json`** each run.
- **Dedup** should move toward the **DB layer** (UNIQUE constraint) rather than the
  JSON-file check — to be confirmed during TD-058 design.

---

## Next session opener

Draft the full **target-architecture document**: the evidence / honesty model
beneath all phases, with the workflow diagram as the phase skeleton and
**TD-063..TD-067 as the spec** for what each stage must honestly track and surface.
