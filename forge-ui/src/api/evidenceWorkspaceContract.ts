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

export const EVIDENCE_WORKSPACE_SCHEMA = 'forge.evidence-workspace/v1' as const

export type EvidenceWorkspaceContext =
  | { kind: 'project' }
  | { kind: 'result'; executionId: string; runId: string; itemOrdinal: number; resultId: string }
  | { kind: 'repair'; entryId: string }

export type EvidenceWorkspaceBlockKind =
  | 'project_identity' | 'readiness_decision' | 'observation' | 'app_model'
  | 'evidence_inventory' | 'test_set' | 'test_definition' | 'execution'
  | 'run' | 'result' | 'diagnostic' | 'repair_lifecycle' | 'bounded_state'

export type EvidenceAvailability =
  | 'available' | 'no_evidence' | 'partial' | 'unavailable' | 'refused'
  | 'blocked' | 'stale' | 'unknown' | 'not_evaluated'
export type EvidenceIntegrity = 'verified' | 'warning' | 'invalid' | 'not_evaluated'
export type EvidenceClaimClassification = 'DIRECT_CANONICAL' | 'CANONICAL_PROJECTION' | 'COMPOSITION_ONLY'

export interface EvidenceClaim {
  claimId: string
  label: string
  value: string | number | boolean | null
  owner: string
  classification: EvidenceClaimClassification
}

export type CanonicalEvidenceReference =
  | { kind: 'project'; projectId: string }
  | { kind: 'test_set'; projectId: string; testSetId: string; revision: number; rowId: number; contentHash: string }
  | { kind: 'test_definition'; projectId: string; testSetId: string; revision: number; rowId: number; definitionId: string }
  | { kind: 'suite'; projectId: string; suiteId: string; revision: number; contentHash: string }
  | { kind: 'execution'; projectId: string; executionId: string }
  | { kind: 'run'; projectId: string; executionId: string; runId: string }
  | { kind: 'result'; projectId: string; executionId: string; runId: string; itemOrdinal: number; resultId: string }
  | { kind: 'diagnostic'; projectId: string; executionId: string; runId: string; itemOrdinal: number; resultId: string; evidenceSchemaVersion: string; evidenceHash: string; classifierVersion: string }
  | { kind: 'observation'; projectId: string; observationId: string }
  | { kind: 'app_model'; projectId: string; rowId: number; version: string; fingerprint?: string }
  | { kind: 'evidence_item'; projectId: string; evidenceId: string; sourceKind: 'observation' | 'app_model'; sourceId: string }
  | { kind: 'repair'; projectId: string; entryId: string }
  | { kind: 'proposal'; projectId: string; entryId: string; proposalId: string; proposalHash: string }
  | { kind: 'decision'; projectId: string; entryId: string; proposalId: string; decisionId: string; decisionHash: string }
  | { kind: 'supersession'; projectId: string; entryId: string; proposalId: string; authorityId: string; authorityHash: string }
  | { kind: 'repair_revision'; projectId: string; entryId: string; testSetId: string; revision: number; rowId: number; definitionId: string }
  | { kind: 'effectiveness'; projectId: string; entryId: string; comparisonId: string; evidenceHash: string }
  | { kind: 'disposition'; projectId: string; entryId: string; dispositionId: string; comparisonId: string }

export interface CanonicalReferenceLink {
  reference: CanonicalEvidenceReference
  resolution: 'resolved' | 'unresolved'
  href?: string
  reason?: string
}

export interface EvidenceWorkspaceAction {
  actionId: string
  label: string
  kind: 'inspect' | 'governed'
  owner: string
  href: string
}

export interface EvidenceWorkspaceBlock {
  blockId: string
  kind: EvidenceWorkspaceBlockKind
  role: 'root' | 'primary' | 'supporting' | 'contextual'
  tier: 1 | 2 | 3 | 4 | 5 | 6
  scope: { projectId: string; semanticIdentity: string }
  title: string
  availability: EvidenceAvailability
  integrity: EvidenceIntegrity
  claims: EvidenceClaim[]
  references: CanonicalReferenceLink[]
  unknowns: string[]
  blockers: string[]
  limitations: string[]
  actions: EvidenceWorkspaceAction[]
}

export interface EvidenceWorkspaceSourceFailure {
  source: string
  code: string
  message: string
  required: boolean
}

export interface CanonicalEvidenceWorkspace {
  schemaVersion: typeof EVIDENCE_WORKSPACE_SCHEMA
  project: { projectId: string; name: string }
  context: EvidenceWorkspaceContext
  assembledAt: string
  blocks: EvidenceWorkspaceBlock[]
  sourceFailures: EvidenceWorkspaceSourceFailure[]
}

export class EvidenceWorkspaceContractError extends Error {
  constructor(message = 'Canonical Evidence Workspace payload is malformed.') {
    super(message)
    this.name = 'EvidenceWorkspaceContractError'
  }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/
const BLOCK_KINDS: readonly EvidenceWorkspaceBlockKind[] = ['project_identity', 'readiness_decision', 'observation', 'app_model', 'evidence_inventory', 'test_set', 'test_definition', 'execution', 'run', 'result', 'diagnostic', 'repair_lifecycle', 'bounded_state']
const AVAILABILITY: readonly EvidenceAvailability[] = ['available', 'no_evidence', 'partial', 'unavailable', 'refused', 'blocked', 'stale', 'unknown', 'not_evaluated']
const INTEGRITY: readonly EvidenceIntegrity[] = ['verified', 'warning', 'invalid', 'not_evaluated']
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EvidenceWorkspaceContractError()
  return value as Record<string, unknown>
}
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).sort().join('|') === [...keys].sort().join('|')
const id = (value: unknown): value is string => typeof value === 'string' && ID.test(value)
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0
function validateReference(reference: Record<string, unknown>): void {
  const common = id(reference.projectId)
  if (!common || typeof reference.kind !== 'string') throw new EvidenceWorkspaceContractError()
  const shape = (keys: string[]) => exactKeys(reference, ['kind', 'projectId', ...keys])
  switch (reference.kind) {
    case 'project': if (!shape([])) throw new EvidenceWorkspaceContractError(); return
    case 'test_set': if (!shape(['testSetId','revision','rowId','contentHash']) || !id(reference.testSetId) || !positive(reference.revision) || !positive(reference.rowId) || !hash(reference.contentHash)) throw new EvidenceWorkspaceContractError(); return
    case 'test_definition': if (!shape(['testSetId','revision','rowId','definitionId']) || !id(reference.testSetId) || !positive(reference.revision) || !positive(reference.rowId) || !id(reference.definitionId)) throw new EvidenceWorkspaceContractError(); return
    case 'suite': if (!shape(['suiteId','revision','contentHash']) || !id(reference.suiteId) || !positive(reference.revision) || !hash(reference.contentHash)) throw new EvidenceWorkspaceContractError(); return
    case 'execution': if (!shape(['executionId']) || !id(reference.executionId)) throw new EvidenceWorkspaceContractError(); return
    case 'run': if (!shape(['executionId','runId']) || !id(reference.executionId) || !id(reference.runId)) throw new EvidenceWorkspaceContractError(); return
    case 'result': if (!shape(['executionId','runId','itemOrdinal','resultId']) || !id(reference.executionId) || !id(reference.runId) || !positive(reference.itemOrdinal) || !id(reference.resultId)) throw new EvidenceWorkspaceContractError(); return
    case 'diagnostic': if (!shape(['executionId','runId','itemOrdinal','resultId','evidenceSchemaVersion','evidenceHash','classifierVersion']) || !id(reference.executionId) || !id(reference.runId) || !positive(reference.itemOrdinal) || !id(reference.resultId) || typeof reference.evidenceSchemaVersion !== 'string' || !reference.evidenceSchemaVersion || !hash(reference.evidenceHash) || typeof reference.classifierVersion !== 'string' || !reference.classifierVersion) throw new EvidenceWorkspaceContractError(); return
    case 'observation': if (!shape(['observationId']) || !id(reference.observationId)) throw new EvidenceWorkspaceContractError(); return
    case 'app_model': if (!(shape(['rowId','version']) || shape(['rowId','version','fingerprint'])) || !positive(reference.rowId) || !id(reference.version) || reference.fingerprint !== undefined && !hash(reference.fingerprint)) throw new EvidenceWorkspaceContractError(); return
    case 'evidence_item': if (!shape(['evidenceId','sourceKind','sourceId']) || !id(reference.evidenceId) || !['observation','app_model'].includes(String(reference.sourceKind)) || !id(reference.sourceId)) throw new EvidenceWorkspaceContractError(); return
    case 'repair': if (!shape(['entryId']) || !id(reference.entryId)) throw new EvidenceWorkspaceContractError(); return
    case 'proposal': if (!shape(['entryId','proposalId','proposalHash']) || !id(reference.entryId) || !id(reference.proposalId) || !hash(reference.proposalHash)) throw new EvidenceWorkspaceContractError(); return
    case 'decision': if (!shape(['entryId','proposalId','decisionId','decisionHash']) || !id(reference.entryId) || !id(reference.proposalId) || !id(reference.decisionId) || !hash(reference.decisionHash)) throw new EvidenceWorkspaceContractError(); return
    case 'supersession': if (!shape(['entryId','proposalId','authorityId','authorityHash']) || !id(reference.entryId) || !id(reference.proposalId) || !id(reference.authorityId) || !hash(reference.authorityHash)) throw new EvidenceWorkspaceContractError(); return
    case 'repair_revision': if (!shape(['entryId','testSetId','revision','rowId','definitionId']) || !id(reference.entryId) || !id(reference.testSetId) || !positive(reference.revision) || !positive(reference.rowId) || !id(reference.definitionId)) throw new EvidenceWorkspaceContractError(); return
    case 'effectiveness': if (!shape(['entryId','comparisonId','evidenceHash']) || !id(reference.entryId) || !id(reference.comparisonId) || !hash(reference.evidenceHash)) throw new EvidenceWorkspaceContractError(); return
    case 'disposition': if (!shape(['entryId','dispositionId','comparisonId']) || !id(reference.entryId) || !id(reference.dispositionId) || !id(reference.comparisonId)) throw new EvidenceWorkspaceContractError(); return
    default: throw new EvidenceWorkspaceContractError()
  }
}

/** Client boundary decoder. The server presenter performs deeper referential
 * validation; this decoder refuses structural drift before React renders it. */
export function decodeCanonicalEvidenceWorkspace(raw: unknown): CanonicalEvidenceWorkspace {
  const value = object(raw)
  if (value.schemaVersion !== EVIDENCE_WORKSPACE_SCHEMA || !Array.isArray(value.blocks) || !Array.isArray(value.sourceFailures)) throw new EvidenceWorkspaceContractError()
  const project = object(value.project)
  if (typeof project.projectId !== 'string' || !ID.test(project.projectId) || typeof project.name !== 'string') throw new EvidenceWorkspaceContractError()
  const context = object(value.context)
  if (!['project', 'result', 'repair'].includes(String(context.kind))) throw new EvidenceWorkspaceContractError()
  if (context.kind === 'result' && !exactKeys(context, ['kind','executionId','runId','itemOrdinal','resultId'])) throw new EvidenceWorkspaceContractError()
  if (context.kind === 'result' && (!(typeof context.executionId === 'string' && ID.test(context.executionId))
    || !(typeof context.runId === 'string' && ID.test(context.runId)) || !(typeof context.resultId === 'string' && ID.test(context.resultId))
    || !Number.isSafeInteger(context.itemOrdinal) || Number(context.itemOrdinal) < 1)) throw new EvidenceWorkspaceContractError()
  if (context.kind === 'repair' && (!exactKeys(context, ['kind','entryId']) || !(typeof context.entryId === 'string' && ID.test(context.entryId)))) throw new EvidenceWorkspaceContractError()
  if (context.kind === 'project' && Object.keys(context).length !== 1) throw new EvidenceWorkspaceContractError()
  if (typeof value.assembledAt !== 'string' || Number.isNaN(Date.parse(value.assembledAt))) throw new EvidenceWorkspaceContractError()
  for (const rawBlock of value.blocks) {
    const block = object(rawBlock)
    if (typeof block.blockId !== 'string' || !ID.test(block.blockId)
      || typeof block.title !== 'string' || !Array.isArray(block.claims)
      || !Array.isArray(block.references) || !Array.isArray(block.unknowns)
      || !Array.isArray(block.blockers) || !Array.isArray(block.limitations)
      || !Array.isArray(block.actions)) throw new EvidenceWorkspaceContractError()
    if (!BLOCK_KINDS.includes(block.kind as EvidenceWorkspaceBlockKind)
      || !['root', 'primary', 'supporting', 'contextual'].includes(String(block.role))
      || !Number.isSafeInteger(block.tier) || Number(block.tier) < 1 || Number(block.tier) > 6
      || !AVAILABILITY.includes(block.availability as EvidenceAvailability)
      || !INTEGRITY.includes(block.integrity as EvidenceIntegrity)) throw new EvidenceWorkspaceContractError()
    const scope = object(block.scope)
    if (scope.projectId !== project.projectId || typeof scope.semanticIdentity !== 'string' || !scope.semanticIdentity) throw new EvidenceWorkspaceContractError()
    for (const rawClaim of block.claims) {
      const item = object(rawClaim)
      if (typeof item.claimId !== 'string' || !ID.test(item.claimId) || typeof item.label !== 'string' || typeof item.owner !== 'string' || !item.owner
        || !['DIRECT_CANONICAL', 'CANONICAL_PROJECTION', 'COMPOSITION_ONLY'].includes(String(item.classification))
        || !(item.value === null || ['string', 'number', 'boolean'].includes(typeof item.value))) throw new EvidenceWorkspaceContractError()
    }
    for (const rawLink of block.references) {
      const link = object(rawLink); const reference = object(link.reference)
      validateReference(reference)
      if (reference.projectId !== project.projectId
        || !['resolved', 'unresolved'].includes(String(link.resolution))
        || link.resolution === 'resolved' && typeof link.href !== 'string'
        || link.resolution === 'unresolved' && typeof link.reason !== 'string') throw new EvidenceWorkspaceContractError()
    }
    for (const key of ['unknowns', 'blockers', 'limitations'] as const) if ((block[key] as unknown[]).some(item => typeof item !== 'string')) throw new EvidenceWorkspaceContractError()
    for (const rawAction of block.actions) {
      const action = object(rawAction)
      if (typeof action.actionId !== 'string' || !ID.test(action.actionId) || typeof action.label !== 'string'
        || !['inspect', 'governed'].includes(String(action.kind)) || typeof action.owner !== 'string' || !action.owner
        || typeof action.href !== 'string') throw new EvidenceWorkspaceContractError()
    }
  }
  for (const rawFailure of value.sourceFailures) {
    const failure = object(rawFailure)
    if (typeof failure.source !== 'string' || !failure.source || typeof failure.code !== 'string' || !failure.code
      || typeof failure.message !== 'string' || typeof failure.required !== 'boolean') throw new EvidenceWorkspaceContractError()
  }
  return raw as CanonicalEvidenceWorkspace
}
