# ADR-006: Truth-Telling and Earned Evidence

Date: 2026-06-29
Status: Accepted as principle; implementation in progress

## Context

AI systems frequently overstate confidence.

Enterprise users require evidence-based conclusions.

## Decision

FORGE shall never claim success without evidence.

All verification, triage, and reporting outputs must expose:

- confidence
- supporting evidence
- uncertainty

Unknown states shall be surfaced explicitly.

## Current State and Known Gaps

This principle is adopted as FORGE's direction but is NOT yet fully realized in code. The evidence
layer that implements it is designed (ARCHITECTURE_TARGET_EVIDENCE_LAYER.md) and partially built.
Known gaps, tracked as tech debt, are the measured distance to this principle:
- TD-063: triage taxonomy mislabels failures (e.g. generated-spec failures reported as "Bug").
- TD-064: generated specs assert little yet are presented as trustworthy.
- TD-065: self-healing records resolvability, not correctness.
- TD-066: some confidence scores are hardcoded literals, not derived.
- TD-067: no input-freshness / pipeline-health self-check.
This ADR records the committed direction; the gaps above are open work, not achieved behavior.

## Consequences

Positive:

- Increased trust.
- Better debugging.
- Improved enterprise adoption.

Negative:

- More verbose reporting.

## Related Documents
ARCHITECTURE_NORTH_STAR.md (the truth-telling thesis), ARCHITECTURE_TARGET_EVIDENCE_LAYER.md (mechanism).