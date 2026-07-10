<!-- FORGE — Autonomous Quality Engineering
     Copyright (c) 2026 AnvilQ Technologies LLC
     Author: Raj Kasthuri -->

# ADR-013: Credential Resolution Policy — ExecutionContext as Credential Provider

## Status
Accepted

## Date
2026-07-10

## Context
The TD-UI-002 live smoke ran a SauceDemo form-login crawl **unauthenticated** and
discovered **0 pages** (root-cause audit, commit `13643aa`). Causes:
- No env→config bridge: nothing established the credentials the engine needs.
- The crawl fell back to the **repo tree** (`WorkspaceResolver` cwd fallback,
  `C:\forge-framework\.forge\config.json`) — a credential-less config.
- `ConfigAdapter.ts:96–99` logs `UNAUTHENTICATED` as a **non-fatal warning**, so a
  misconfigured crawl silently produces empty results.
- The engine re-persists `config.json` on every bootstrap (`CrawlRunner.ts:296`,
  gated by `:94` `!config || options.force`) via the engine `AppConfig` shape,
  which **strips** any forge-ui fields written into `config.json` (Phase 0 finding).

## Decision

### Sidecar, not config.json
Credential **references** live in a forge-ui-owned **sidecar**:
`~/.forge-projects/<app>/.forge/credentials.json` → `{ schemaVersion: 1, usernameEnv, passwordEnv }`.
The **engine never reads or writes** this file, so the bootstrap `saveConfig`
rewrite (`CrawlRunner.ts:296`) can never strip it.

We do **NOT** write credential fields into `config.json`, and we do **NOT**
maintain a forge-ui "legacy envKey" on disk. The only `credentials.envKey` that
ever appears on disk is the one the **engine's own Bootstrap** writes
(`Bootstrap.ts:462`) during a bootstrap — that is engine behavior we do not touch.

### Reference vs Material seam
- `CredentialReference { usernameEnv, passwordEnv }` — env-var **names**, the only
  persisted shape (sidecar).
- `CredentialMaterial { username, password }` — the **values**, created only
  in-memory by the resolver / ExecutionContext, never written to disk.
- The engine sees neither type. ExecutionContext translates material down to the
  engine's **existing** credential input (two-path injection below).

### CredentialResolver hierarchy
- `CredentialResolver` (abstract): `resolve(appName): CredentialMaterial` +
  `assertPresent(authType, reference)`.
- `EnvCredentialResolver` (Phase 1 concrete): reads the sidecar reference (default
  `<APP>_USERNAME` / `<APP>_PASSWORD`), materializes from `process.env`, and
  hard-fails when `authType !== 'none'` and the pair is unresolved.
- Future resolvers (OS keychain — TD-UI-009; cloud secrets — Phase 2) implement the
  same abstract contract without touching callers.

### Two-path injection (engine untouched)
ExecutionContext orchestrates; the engine's own machinery is reused per path:

- **Path A — bootstrap (force / fresh / Onboard `force:true`):** pass the material
  as `options.username` / `options.password`. The engine's `Bootstrap` writes its
  own `credentials.envKey` block (`Bootstrap.ts:462`, e.g. `USER_CREDENTIALS`),
  persists it (`saveConfig:296`), and `CrawlRunner.ts:129` injects
  `process.env[thatEnvKey] = user:pass`. AuthManager reads it. ExecutionContext
  only supplies options — the engine does the rest.
- **Path B — non-bootstrap re-crawl (existing config, no force):** the engine does
  not touch credentials. ExecutionContext reads the **existing**
  `config.credentials.envKey` from `config.json` (written by a prior bootstrap),
  materializes from the sidecar, and sets `process.env[thatEnvKey] = user:pass`
  **itself**. `options.username/password` are **not** passed, so `CrawlRunner:129`
  stays **inert** — a single materializer, no double-inject.

`CrawlRunner:129`'s value is always the operator's real `user:pass`, so neither
path can inject a wrong/placeholder value (Phase 0 (b)).

### Hard-fail is pre-flight
Missing credentials for an auth-required `authType` → a typed `CredentialError`
thrown by the resolver **before** the engine runs. JobRunner catches it → appends
the message to the Mission Timeline (`logBuffer`) + sets `status: 'failed'` /
`error`. Not the engine's silent `console.warn`.

### Workspace provisioned before any config write
`~/.forge-projects/<app>` is created (with its sidecar) **before** the bootstrap
config write — never the repo tree. `WorkspaceResolver` provisions the per-app dir
instead of falling back to cwd.

### Engine invariant
`src/` gets **zero** edits. Every consumer above is forge-ui. If any future phase
forces a `src/` change, stop and escalate.

## Open edge (flagged, Phase 3+)
Path B needs `config.credentials.envKey` on disk, which only a prior bootstrap
writes. An app onboarded **without** credentials (then given env vars later) has no
such key → a non-force re-crawl cannot inject. Resolution (deferred): when
`authType` requires auth, the sidecar+env resolve, but `config.credentials.envKey`
is absent, ExecutionContext re-triggers a bootstrap (Path A) to establish it.

## Consequences
- No engine edits; forge-ui-only new files + edits.
- Credential references survive engine `config.json` rewrites (sidecar isolation).
- Migration: fixtures + Onboard write sidecars with default-derived names; existing
  `config.json` files stay intact.
- Onboard: default-derived pointer names now; custom override later (TD-UI-001).

## Alternatives rejected
- **Write pointers into `config.json`** — stripped by `saveConfig:296` on every
  bootstrap/Onboard (Phase 0 (a)).
- **Maintain a forge-ui legacy `envKey` on disk** — redundant with the engine's own
  Bootstrap-written key; two writers of the same field invite drift.
- **Engine-side role synthesis** (edit `ConfigAdapter`/`CrawlRunner`) — violates the
  zero-engine-edit invariant.

## References
ADR-012 (Engine Job Architecture); root-cause audit (`13643aa`); Phase 0
verification; TD-UI-009 (OS keychain); TD-UI-001 (Onboard tab).
