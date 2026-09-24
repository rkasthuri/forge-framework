<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-008: AI Provider Abstraction

Date: 2026-06-29
Status: Accepted

## Implementation note — 2026-09-24 (local Ollama/Qwen3 runtime)

The gateway `local` adapter now supports the installed Ollama runtime through
its native `/api/generate` structured-output contract. Local execution is
configuration-owned and explicit: `FORGE_AI_PRIMARY_PROVIDER=local` together
with `FORGE_AI_LOCAL_RUNTIME=ollama` selects it; the base URL, model, and timeout
are configurable through `FORGE_AI_LOCAL_BASE_URL`, `FORGE_AI_LOCAL_MODEL`, and
`FORGE_AI_LOCAL_TIMEOUT_MS`. `FORGE_AI_LOCAL_THINKING=true` is refused by this
non-thinking checkpoint rather than silently changing modes. The bounded defaults are
`http://127.0.0.1:11434`, `qwen3:8b`, and 300 seconds.

The adapter sends capability-owned system/user prompts and the existing
capability JSON schema, disables streaming and thinking, and uses deterministic
temperature zero. Only the final structured response enters Product handling;
model reasoning is neither requested nor retained. Gateway provenance records
the provider as `local`, runtime as `ollama`, configured and response model
identity, actual token counts when supplied, attempts, timing, and fallback
state. Connection, missing-model, timeout, malformed transport, and malformed
or schema-breaking responses remain explicit failures.
The adapter refuses non-loopback endpoints and HTTP redirects, so the `local`
identity cannot be used to route Product evidence to an external host. Each
request uses the tighter of its capability timeout and the provider-configured
ceiling. The two enabled Product callers allow up to 300 seconds for CPU-bound
local inference; remote adapters retain their shorter configuration-owned caps.

This implementation enables only the already registered `analyze-failure` and
`analyze-test-gaps` capabilities. It does not add automatic fallback, provider
secrets, persistence, migrations, Product authority, Product-Gap analysis,
repair, or test materialization. The opt-in evaluator uses bounded synthetic
evidence and writes no Product state; deterministic tests inject transport and
do not require Ollama to be installed or running.

## Implementation note — 2026-09-24 (Test-Gap capability migration)

The existing Test-Gap Analysis caller now requests the provider-neutral
`analyze-test-gaps` capability through `AiGateway`. Provider-independent
reasoning instructions and the structured-output schema live in the capability
layer. The Product caller no longer imports a vendor SDK, reads provider
credentials, selects a vendor model, parses a vendor response, or classifies
raw provider errors.

The capability accepts only a bounded supplied test inventory and validates
all returned evidence references against that request. Results are advisory:
they do not create Test Sets, modify Definitions, change Product verdicts, or
cross into the separately owned test-materialization workflow. A successful
zero-candidate result remains distinct from `BLOCKED_AI`; missing evidence is
`INSUFFICIENT_EVIDENCE`, and provider or schema failure never becomes a
fabricated "no gaps" conclusion. Test-Gap fallback is forbidden, and ordinary
gateway provenance records the configured provider/model, response model when
reported, attempts, timing, structured-output schema, and actual usage when
supplied.

Legacy JSON/HTML and `coverage_gaps` persistence remain compatibility outputs;
this migration adds no persistence or migration authority. Model-generated
coverage percentages are no longer presented as Product evidence. RCA remains
independently registered as `analyze-failure`; Product-Gap, test generation,
and repair capabilities are outside this implementation note.

## Implementation note — 2026-09-24 (AI Gateway foundation)

The provider-neutral foundation now exposes a capability-oriented `AiGateway`
under `src/core/ai/gateway/`. AI triage/RCA requests the FORGE
`analyze-failure` capability and receives a schema-validated, discriminated
result with provider, configured-model, provider-reported response-model, and
policy provenance. Configured aliases are never presented as the model that
answered when a provider omits response-model identity. The Product caller no longer
imports a vendor SDK, reads a provider secret, or parses provider prose.

OpenAI is implemented behind a Responses API adapter and is preferred when it
is configured. Anthropic remains supported behind its own adapter. A local
provider seam exists without a local inference runtime. Provider selection is
deterministic; fallback is forbidden unless the capability request explicitly
allows it, and every fallback attempt remains visible in provenance.

This foundation does not make AI authoritative. Provider unavailability,
authentication/credit/rate failures, timeouts, and invalid/schema-breaking
responses remain explicit advisory failures. For triage they produce
`insufficient-evidence` plus `BLOCKED_AI`; they do not fabricate a verdict or
change independently established Product Result truth. Existing non-migrated
AI callers remain on the legacy `AiClient` or direct SDK paths and are future
migration work, not an implied system-wide conversion.

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
