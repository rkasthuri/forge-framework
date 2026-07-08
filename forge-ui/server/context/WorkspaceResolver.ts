import { createRequire } from 'module'

/**
 * WorkspaceResolver — resolves the correct workspace for a given appName.
 * Phase 1: local workspace under process.cwd()/.forge/.
 * Phase 2: resolve from the tenant's cloud storage. Nova-approved stub.
 *
 * Uses createRequire so the engine is loaded at runtime (under tsx) without
 * forge-ui's tsc pulling the engine into the UI compile — the one-directional
 * boundary holds (forge-ui → src, never the reverse).
 */
const require = createRequire(import.meta.url)

/** Structural slice of the engine Workspace — avoids importing the engine type. */
export interface ResolvedWorkspace {
  root: string
  forgeDir: string
  [key: string]: unknown
}

export class WorkspaceResolver {
  resolve(_appName: string): ResolvedWorkspace {
    // Phase 1: single local workspace (appName-scoping arrives with cloud storage).
    const enginePath = '../../../src/core/workspace/WorkspaceManager'
    const { createWorkspace } = require(enginePath)
    return createWorkspace(process.cwd()) as ResolvedWorkspace
  }
}

export const workspaceResolver = new WorkspaceResolver()
