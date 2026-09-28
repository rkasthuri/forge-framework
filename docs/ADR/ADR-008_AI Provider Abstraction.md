<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-008: AI Provider Abstraction

Date: 2026-06-29
Status: Accepted

## Implementation note — 2026-09-25 (Hugging Face hosted open-model router)

The gateway now has a distinct `hosted-open` provider identity backed by the
Hugging Face Inference Providers OpenAI-compatible chat-completions router.
Selection remains explicit and provider-neutral:
`FORGE_AI_PRIMARY_PROVIDER=hosted-open` uses `HF_TOKEN`; the router base URL,
model, and timeout are configurable through `FORGE_AI_HOSTED_OPEN_BASE_URL`,
`FORGE_AI_HOSTED_OPEN_MODEL`, and `FORGE_AI_HOSTED_OPEN_TIMEOUT_MS`. Defaults
are `https://router.huggingface.co/v1`,
`openai/gpt-oss-120b:cheapest`, and 90 seconds.

The adapter sends the existing capability-owned prompts and JSON schema to the
router as a non-streaming structured-output request. It accepts only HTTPS
router endpoints and refuses HTTP redirects so bearer credentials and Product
evidence cannot be retransmitted to a redirect target. Authentication, credit,
quota, rate-limit, timeout, unavailable-provider, malformed transport, malformed
structured output, and schema failures map into the existing provider-neutral
taxonomy without raw provider detail or token leakage.

Provenance distinguishes the FORGE provider (`hosted-open`) from the router
runtime (`hugging-face-router`) and records the configured policy-bearing model,
provider-reported response model, routed downstream provider when supplied,
request identity, actual token usage, and response-supplied actual or estimated
cost. Missing route, model, usage, or cost metadata remains explicitly absent;
FORGE does not infer it. Both enabled capabilities remain advisory, and their
requests continue to forbid FORGE gateway fallback. The default `:cheapest`
suffix explicitly delegates downstream provider selection, including any
router-managed failover, to Hugging Face. That upstream routing is distinct
from gateway fallback: it may not be observable when the router omits route
identity, so evaluation classifies the route as unproven rather than claiming
end-to-end no-fallback. No automatic FORGE fallback, authority change,
persistence, migration, generation, repair, or test materialization is added.

The opt-in hosted evaluator imports the exact bounded RCA and Test-Gap cases
used by the local Ollama evaluator, reports schema adherence, grounding,
semantic results, latency, supplied usage/cost, and capability readiness, and
writes no Product state. `HOSTED_OPEN_CAPABLE` requires both a provider-reported
response model and routed-provider identity; missing route proof or any semantic
mismatch yields `HOSTED_OPEN_NEEDS_MORE_EVAL` and a nonzero evaluator exit.

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

## Implementation note — 2026-09-27 (Adaptive Fixes capability migration)

Adaptive Fixes now requests the provider-neutral `suggest-test-fix` capability
through `AiGateway`. Its output is schema-validated as exactly
`fixCategory`, `risk`, `explanation`, `currentCode`, and `suggestedCode`.
Non-bug candidates must bind `currentCode` verbatim to the supplied test snippet;
missing source can produce only a review-only bug-report candidate. Provider and
runtime identity, configured and response models, request and schema identity,
attempts, fallback state, timing, provider request ID, and provider-supplied
usage are retained with the advisory record.

The caller has no direct provider SDK or legacy `AiClient` dependency and does
not require `ANTHROPIC_API_KEY`. CI continues to select hosted-open through the
Hugging Face router; local evaluation selects the Ollama-backed local adapter.
OpenAI and Anthropic remain supported configuration choices. Adaptive Fixes
forbids fallback on every request, and gateway/provider/schema failures remain
explicit provider-neutral blocked advisories.

This migration also removes the former source-changing authority. A candidate
may still be classified `Safe`, but `autoApplied` is always false, test source
is never written, and no executed repair is persisted. The JSON and Markdown
suggestion reports remain human-review artifacts. Governed Repair, Trend
Analysis migration, and Release Notes migration are outside this note.
The hosted-open and local opt-in evaluators share a bounded Adaptive Fixes case
and continue to write no Product state.

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
