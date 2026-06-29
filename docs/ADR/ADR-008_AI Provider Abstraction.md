# ADR-008: AI Provider Abstraction

Date: 2026-06-29
Status: Accepted

## Context

FORGE currently relies primarily on Claude.

Enterprise customers may require:

- OpenAI
- Gemini
- Local models
- Air-gapped deployments

## Decision

FORGE shall abstract AI providers behind a common interface.

Provider implementations shall be pluggable.

## Interface

interface AIProvider {
    classify()
    generate()
    explain()
    summarize()
}

Note: the abstraction realized in code routes around a per-stage `aiCall` dispatch rather than the
classify()/generate()/explain()/summarize() interface sketched above; that interface remains an
aspirational shape, not the current implementation.

## Implementation

Implemented (2026-06). AiClient routes AI calls per-stage between Claude API and a local
Ollama provider (OpenAI-compatible endpoint). Includes a shared retry loop, zero-cost recording
for local calls, a local token cap (OLLAMA_MAX_TOKENS, default 1024), a longer local timeout
(OLLAMA_TIMEOUT_MS, default 300s for CPU-bound inference), and a reachability preflight: if the
local provider is unreachable, interactive runs stop with an explicit error and CI/non-interactive
runs fall back to Claude (logged). Routing is per-stage; release-notes routes local, all other
stages route to Claude. Proven locally and in CI.

## Consequences

Positive:

- Reduced vendor lock-in.
- Greater enterprise flexibility.

Negative:

- Increased abstraction complexity.