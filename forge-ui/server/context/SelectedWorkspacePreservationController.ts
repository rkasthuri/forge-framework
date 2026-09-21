/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or modification
 * of this software is strictly prohibited.
 */

import * as path from 'node:path'
import { isValidAppName } from './appName'
import { executionContext } from './ExecutionContext'
import { workspaceResolver, type WorkspaceResolver } from './WorkspaceResolver'
import { projectRegistry, type ProjectEntry, type ProjectRegistry } from '../registry/ProjectRegistry'

const OPERATION_ID = /^[a-z0-9][a-z0-9-]{0,79}$/

interface PreservationExecutionPort {
  captureSelectedWorkspacePreservation(appName: string, input: Record<string, unknown>): Promise<unknown>
}

interface RegistryReader {
  find(appName: string): ProjectEntry | undefined
}

interface ResolverReader {
  resolve(appName: string): { root: string; forgeDir: string; [key: string]: unknown }
  canonicalProjectsRoot(): string
  identity(): { identity: string; version: string }
}

export interface SelectedWorkspacePreservationRequest {
  appName: unknown
  productSourceSha: string
  productSourceSnapshotSha256: string
  createArtifacts: boolean
  operationId?: string
}

/**
 * Server-side selection composition only. The caller supplies no filesystem
 * path: the canonical source comes from WorkspaceResolver and the disposable
 * destination comes from the server-configured allowlist plus a safe opaque id.
 */
export class SelectedWorkspacePreservationController {
  constructor(
    private readonly allowlistedParent: string,
    private readonly registry: RegistryReader = projectRegistry as Pick<ProjectRegistry, 'find'>,
    private readonly resolver: ResolverReader = workspaceResolver as Pick<WorkspaceResolver, 'resolve' | 'canonicalProjectsRoot' | 'identity'>,
    private readonly execution: PreservationExecutionPort = executionContext,
  ) {}

  async capture(request: SelectedWorkspacePreservationRequest): Promise<unknown> {
    const appName = typeof request.appName === 'string' ? request.appName : ''
    const valid = isValidAppName(appName)
    const entry = valid ? this.registry.find(appName) ?? null : null
    const workspace = valid ? this.resolver.resolve(appName) : null
    let disposableRoot: string | undefined
    if (request.createArtifacts) {
      if (!request.operationId || !OPERATION_ID.test(request.operationId)) {
        disposableRoot = path.join(this.allowlistedParent, '..', 'unsafe-operation-id')
      } else {
        disposableRoot = path.join(this.allowlistedParent, request.operationId)
      }
    }
    return this.execution.captureSelectedWorkspacePreservation(appName, {
      productSourceSha: request.productSourceSha,
      productSourceSnapshotSha256: request.productSourceSnapshotSha256,
      registryEntry: entry,
      canonicalProjectsRoot: this.resolver.canonicalProjectsRoot(),
      workspaceResolver: this.resolver.identity(),
      resolvedWorkspaceRoot: workspace?.root ?? null,
      backend: 'native-sqlite',
      sourceBoundary: 'selected-live-readonly',
      createArtifacts: request.createArtifacts,
      allowlistedParent: request.createArtifacts ? this.allowlistedParent : undefined,
      disposableRoot,
    })
  }
}
