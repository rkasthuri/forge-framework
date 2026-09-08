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

import * as fs from 'node:fs'
import * as path from 'node:path'
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { canonicalJson, canonicalJsonSha256 } from './JsonAppModelMigrationPlanner'

// Bind the frozen Chunk 0 schemas directly, without a second permissive DTO schema.
const schemas = {
  repair_proposals: ['transition-proposal', 'proposalHash'],
  repair_decisions: ['transition-decision', 'decisionHash'],
  app_model_transition_supersessions: ['transition-supersession-authority', 'authorityHash'],
  repair_revision_origins: ['repair-revision-link', 'lineageHash'],
  repair_rerun_links: ['repair-rerun-link', 'rerunLinkHash'],
} as const
export type RepairAuthorityTable = keyof typeof schemas
type Authority = Record<string, any>
let validators: Map<string, ValidateFunction> | undefined

function validator(table: RepairAuthorityTable): ValidateFunction {
  if (!validators) {
    const root = path.resolve(__dirname, '../../../fixtures/m5-contract/schema')
    const load = (name: string) => JSON.parse(fs.readFileSync(path.join(root, `${name}.schema.json`), 'utf8'))
    const ajv = new Ajv2020({ strict: true, allErrors: true, removeAdditional: false, useDefaults: false, coerceTypes: false })
    addFormats(ajv)
    ajv.addSchema(load('common'))
    validators = new Map(Object.entries(schemas).map(([key, [name]]) => [key, ajv.compile(load(name))]))
  }
  return validators.get(table)!
}

export function validateRepairAuthority(table: RepairAuthorityTable, value: unknown): asserts value is Authority {
  if (!validator(table)(value)) throw new Error('M5 authority schema invalid (fixed keys; unknown fields refuse).')
  // JSON must not silently lose undefined, symbol, non-enumerable or custom object properties.
  function jsonValue(v: any): void {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return
    if (typeof v === 'number' && Number.isFinite(v)) return
    if (typeof v !== 'object') throw new Error('M5 authority schema requires lossless JSON.')
    if (Array.isArray(v)) {
      if (Reflect.ownKeys(v).length !== v.length + 1) throw new Error('M5 authority schema requires exact array keys.')
      for (let i = 0; i < v.length; i++) { if (!Object.hasOwn(v, i)) throw new Error('M5 authority schema requires dense arrays.'); jsonValue(v[i]) }
    } else {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error('M5 authority schema requires plain objects.')
      for (const key of Reflect.ownKeys(v)) {
        const descriptor = Object.getOwnPropertyDescriptor(v, key)!
        if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new Error('M5 authority schema requires exact data keys.')
        jsonValue(descriptor.value)
      }
    }
  }
  jsonValue(value)
}

export function repairAuthorityHash(table: RepairAuthorityTable, value: unknown): string {
  validateRepairAuthority(table, value)
  const { [schemas[table][1]]: _hash, ...body } = value
  return canonicalJsonSha256(body)
}

export function parseRepairAuthority(table: RepairAuthorityTable, input: unknown): Authority {
  const value: unknown = typeof input === 'string' ? JSON.parse(input) : input
  const hash = repairAuthorityHash(table, value)
  const authority = value as Authority
  if (authority[schemas[table][1]] !== hash) throw new Error('M5 authority integrity hash mismatch.')
  return authority
}

// Each entry is a relational column and its exact frozen payload path. JSON
// subobjects keep their complete canonical bytes rather than projecting keys.
export const REPAIR_AUTHORITY_COLUMNS: Record<RepairAuthorityTable, Record<string, string>> = {
  repair_proposals: {
    proposal_id:'proposalId', project_id:'projectId', schema_version:'schemaVersion', repair_kind:'repairKind',
    proposal_hash:'proposalHash', source_endpoint_identity:'json:source', candidate_endpoint_identity:'json:candidate',
    enumerator_version:'enumeratorVersion', candidate_set_hash:'candidateSetHash', derived_successor_count:'derivedSuccessorCount',
  },
  repair_decisions: {
    decision_id:'decisionId', proposal_id:'proposalAuthority.proposalId', project_id:'projectId',
    proposal_hash:'proposalAuthority.proposalHash', decision:'decision', actor_kind:'decidedBy.kind', actor_id:'decidedBy.actorId',
    mechanism_id:'const:local_product', decided_at:'decidedAt', decision_hash:'decisionHash',
  },
  app_model_transition_supersessions: {
    authority_id:'authorityId', authority_hash:'authorityHash', project_id:'projectId',
    source_endpoint_identity:'json:source', candidate_endpoint_identity:'json:candidate',
    proposal_id:'proposalAuthority.proposalId', proposal_hash:'proposalAuthority.proposalHash',
    decision_id:'decisionAuthority.decisionId', decision_hash:'decisionAuthority.decisionHash', decision_kind:'decisionAuthority.decision',
    actor_kind:'approvedBy.kind', actor_id:'approvedBy.actorId', mechanism_id:'const:local_product', promoted_at:'promotedAt',
  },
  repair_revision_origins: {
    repair_origin_id:'repairOriginId', test_set_row_id:'testSetRowId', project_id:'projectId',
    source_definition_authority_json:'json:sourceDefinitionAuthority', result_definition_authority_json:'json:resultingDefinitionAuthority',
    supersession_authority_id:'supersessionAuthorityId', supersession_authority_hash:'supersessionAuthorityHash',
    proposal_id:'proposalAuthority.proposalId', proposal_hash:'proposalAuthority.proposalHash',
    decision_id:'decisionAuthority.decisionId', decision_hash:'decisionAuthority.decisionHash',
    materializer_version:'materializerVersion', transform_hash:'transformHash', created_at:'createdAt',
  },
  repair_rerun_links: {
    rerun_link_id:'rerunLinkId', rerun_link_hash:'rerunLinkHash', repair_origin_id:'repairOriginId', repair_lineage_hash:'repairLineageHash',
    project_id:'projectId', resulting_test_set_row_id:'resultingDefinitionAuthority.testSetRowId',
    resulting_test_set_id:'resultingDefinitionAuthority.testSetId', resulting_test_set_revision:'resultingDefinitionAuthority.testSetRevision',
    resulting_test_set_content_hash:'resultingDefinitionAuthority.testSetContentHash', resulting_definition_schema_version:'number:3',
    resulting_definition_id:'resultingDefinitionAuthority.definitionId', resulting_definition_content_hash:'resultingDefinitionAuthority.definitionContentHash',
    model_row_id:'resultingDefinitionAuthority.modelRowId', model_version:'resultingDefinitionAuthority.modelVersion', support_seal_hash:'resultingDefinitionAuthority.supportSealHash',
    execution_id:'executionAuthority.executionId', item_ordinal:'executionAuthority.itemOrdinal', plan_hash:'executionAuthority.planHash',
    run_id:'executionAuthority.runId', attempt_ordinal:'executionAuthority.attemptOrdinal', result_id:'executionAuthority.resultId',
    suite_project_id:'suiteAuthority.projectId', suite_id:'suiteAuthority.suiteId', suite_revision:'suiteAuthority.revision',
    suite_content_hash:'suiteAuthority.contentHash', suite_item_ordinal:'suiteAuthority.itemOrdinal', recorded_at:'recordedAt',
  },
}

export function repairAuthorityRow(table: RepairAuthorityTable, input: unknown): Record<string, any> {
  const value = parseRepairAuthority(table, input)
  return { canonical_payload: canonicalJson(value), ...Object.fromEntries(Object.entries(REPAIR_AUTHORITY_COLUMNS[table]).map(([column, field]) => {
    if (field.startsWith('const:')) return [column, field.slice(6)]
    if (field.startsWith('number:')) return [column, Number(field.slice(7))]
    const json = field.startsWith('json:')
    const result = (json ? field.slice(5) : field).split('.').reduce((v, key) => v?.[key], value)
    return [column, json ? canonicalJson(result) : result ?? null]
  })) }
}

export function isExactRepairAuthorityRow(table: unknown, payload: unknown, columns: unknown): number {
  try {
    if (typeof table !== 'string' || !Object.hasOwn(schemas, table) || typeof payload !== 'string' || typeof columns !== 'string') return 0
    const expected = repairAuthorityRow(table as RepairAuthorityTable, payload)
    return canonicalJson(expected) === canonicalJson({ canonical_payload: payload, ...JSON.parse(columns) }) ? 1 : 0
  } catch { return 0 }
}

export function assertApprovedCorrespondence(proposalInput: unknown, decisionInput: unknown, supersessionInput?: unknown): void {
  const p = parseRepairAuthority('repair_proposals', proposalInput)
  const d = parseRepairAuthority('repair_decisions', decisionInput)
  const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b)
  if (d.projectId !== p.projectId || d.proposalAuthority.proposalId !== p.proposalId || d.proposalAuthority.proposalHash !== p.proposalHash
    || !same(d.source, p.source) || !same(d.candidate, p.candidate)) throw new Error('M5 approved endpoint correspondence mismatch.')
  if (supersessionInput !== undefined) {
    const a = parseRepairAuthority('app_model_transition_supersessions', supersessionInput)
    if (d.decision !== 'approve' || a.projectId !== p.projectId || !same(a.source, p.source) || !same(a.candidate, p.candidate)
      || !same(a.proposalAuthority, d.proposalAuthority) || !same(a.approvedBy, d.decidedBy)
      || a.decisionAuthority.decisionId !== d.decisionId || a.decisionAuthority.decisionHash !== d.decisionHash) {
      throw new Error('M5 approved endpoint correspondence mismatch.')
    }
  }
}

export function isApprovedCorrespondence(proposal: unknown, decision: unknown, supersession: unknown): number {
  try { assertApprovedCorrespondence(proposal, decision, supersession === null ? undefined : supersession); return 1 } catch { return 0 }
}
