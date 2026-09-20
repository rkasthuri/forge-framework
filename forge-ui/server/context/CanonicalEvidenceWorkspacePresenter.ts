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

import {
  EVIDENCE_WORKSPACE_SCHEMA,
  EvidenceWorkspaceContractError,
  type CanonicalEvidenceWorkspace,
  type EvidenceWorkspaceBlock,
  type EvidenceWorkspaceContext,
  type EvidenceWorkspaceSourceFailure,
} from '../../src/api/evidenceWorkspaceContract'

const KIND_ORDER = [
  'project_identity', 'readiness_decision', 'execution', 'run', 'result',
  'diagnostic', 'repair_lifecycle', 'suite', 'test_set', 'test_definition', 'app_model',
  'observation', 'evidence_inventory', 'bounded_state',
] as const

function canonicalReferenceIdentity(value: EvidenceWorkspaceBlock['references'][number]['reference']): string {
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
  return entries.map(([key, item]) => `${key}=${String(item)}`).join('|')
}

export interface EvidenceWorkspaceCompositionInput {
  project: { projectId: string; name: string }
  context: EvidenceWorkspaceContext
  assembledAt: string
  blocks: EvidenceWorkspaceBlock[]
  sourceFailures?: EvidenceWorkspaceSourceFailure[]
}

/** Pure composition validation. All claims and action eligibility are supplied
 * by their domain owners; this presenter only validates identity and ordering. */
export function composeCanonicalEvidenceWorkspace(input: EvidenceWorkspaceCompositionInput): CanonicalEvidenceWorkspace {
  if (Number.isNaN(Date.parse(input.assembledAt))) throw new EvidenceWorkspaceContractError('assembledAt is invalid.')
  const blockIds = new Set<string>()
  const semanticIdentities = new Set<string>()
  const referenceIdentities = new Set<string>()
  const semanticClaims = new Map<string, string>()
  let projectAnchorCount = 0
  for (const block of input.blocks) {
    if (block.scope.projectId !== input.project.projectId) throw new EvidenceWorkspaceContractError('Cross-project block refused.')
    if (blockIds.has(block.blockId) || semanticIdentities.has(`${block.kind}:${block.scope.semanticIdentity}`)) throw new EvidenceWorkspaceContractError('Duplicate semantic block refused.')
    blockIds.add(block.blockId)
    semanticIdentities.add(`${block.kind}:${block.scope.semanticIdentity}`)
    if (block.kind === 'project_identity') projectAnchorCount += 1
    const claimIds = new Set<string>()
    for (const item of block.claims) {
      if (!item.owner || claimIds.has(item.claimId)) throw new EvidenceWorkspaceContractError('Duplicate or unowned claim refused.')
      claimIds.add(item.claimId)
      const identity = `${block.scope.semanticIdentity}:${item.claimId}`
      const binding = JSON.stringify([item.label, item.value, item.owner, item.classification])
      const existing = semanticClaims.get(identity)
      if (existing !== undefined) throw new EvidenceWorkspaceContractError(existing === binding ? 'Duplicate semantic claim refused.' : 'Conflicting semantic claim refused.')
      semanticClaims.set(identity, binding)
    }
    for (const link of block.references) {
      if (link.reference.projectId !== input.project.projectId) throw new EvidenceWorkspaceContractError('Cross-project reference refused.')
      if (link.resolution === 'resolved' ? !link.href : !link.reason) throw new EvidenceWorkspaceContractError('Reference resolution is incomplete.')
      const identity = canonicalReferenceIdentity(link.reference)
      if (referenceIdentities.has(identity)) throw new EvidenceWorkspaceContractError('Duplicate canonical reference refused.')
      referenceIdentities.add(identity)
    }
    if (block.actions.some(action => action.kind === 'governed' && !action.owner)) throw new EvidenceWorkspaceContractError('Unowned governed action refused.')
  }
  if (projectAnchorCount !== 1) throw new EvidenceWorkspaceContractError('Exactly one project anchor is required.')
  const blocks = input.blocks.map(block => ({
    ...block,
    scope: { ...block.scope },
    claims: [...block.claims].sort((left, right) => left.claimId.localeCompare(right.claimId)),
    references: [...block.references].sort((left, right) => canonicalReferenceIdentity(left.reference).localeCompare(canonicalReferenceIdentity(right.reference))),
    actions: [...block.actions].sort((left, right) => left.actionId.localeCompare(right.actionId)),
    unknowns: [...block.unknowns].sort(),
    blockers: [...block.blockers].sort(),
    limitations: [...block.limitations].sort(),
  })).sort((left, right) => left.tier - right.tier
    || KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind)
    || left.scope.semanticIdentity.localeCompare(right.scope.semanticIdentity))
  const sourceFailures = [...(input.sourceFailures ?? [])].sort((left, right) => left.source.localeCompare(right.source) || left.code.localeCompare(right.code))
  return { schemaVersion: EVIDENCE_WORKSPACE_SCHEMA, project: { ...input.project }, context: input.context, assembledAt: input.assembledAt, blocks, sourceFailures }
}
