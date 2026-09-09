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

import { sql, type Kysely } from 'kysely'
import type { Database } from './types'
import { canonicalJson } from './JsonAppModelMigrationPlanner'
import { parseCanonicalTestSetV3 } from '../test-design/TestDefinitionContract'
import { historicalDefinitionContentHash } from '../execution/HistoricalDefinitionAuthorityResolver'
import { validateRepairAuthority, parseRepairAuthority, validateRepairComponent } from './RepairAuthorityValidation'

type Row = Record<string, any>
export class RepairSourceAuthorityError extends Error {
  readonly code: 'integrity_mismatch' | 'historical_authority_mismatch'
  constructor(readonly stage: 'A' | 'B', code: 'integrity_mismatch' | 'historical_authority_mismatch' = stage === 'A' ? 'integrity_mismatch' : 'historical_authority_mismatch') {
    super('Repair source integrity mismatch: Stage ' + stage + (stage === 'B' ? ' historical authority / execution-item witness disagreement or absence.' : ' internal authority.'))
    this.code = code
  }
}
const fail = (stage: 'A' | 'B', code?: 'integrity_mismatch' | 'historical_authority_mismatch'): never => { throw new RepairSourceAuthorityError(stage, code) }
const same = (a: unknown,b: unknown): boolean => canonicalJson(a) === canonicalJson(b)

/** Internal SQL expressions only; repository payloads are bound parameters.
 * Include all witnesses purporting to identify the same row or project/revision,
 * including contradictory ones. Never select newest or infer a failed execution.
 */
export function sourceProductRowsSql(payload: string): string {
  const f = (p:string) => `json_extract(${payload},'$.${p}')`
  const rowId=f('sourceDefinitionAuthority.testSetRowId'), setId=f('sourceDefinitionAuthority.testSetId')
  const revision=f('sourceDefinitionAuthority.testSetRevision'), project=f('projectId')
  const columns=['id','project_id','test_set_id','revision','schema_version','model_row_id','model_version','source_observation_id',
    'observation_run_id','support_seal_hash','characterization_policy_id','characterization_policy_version','generation_id',
    'generated_at','outcome','definition_count','payload_json','content_hash']
  return `json_object('source',(SELECT json_group_array(json_object(${columns.map(c=>`'${c}',${c}`).join(',')})) FROM test_set_revisions WHERE id=${rowId}),
    'proposal',(SELECT canonical_payload FROM repair_proposals WHERE proposal_id=${f('proposalAuthority.proposalId')}),
    'witnesses',(SELECT json_group_array(json_object(
      'project_id',e.project_id,'execution_id',a.execution_id,'item_ordinal',a.item_ordinal,
      'item_definition_id',i.definition_id,'test_set_row_id',a.test_set_row_id,'test_set_id',a.test_set_id,
      'test_set_revision',a.test_set_revision,'test_set_content_hash',a.test_set_content_hash,
      'definition_schema_version',a.definition_schema_version,'definition_id',a.definition_id))
      FROM execution_item_authorities a LEFT JOIN executions e ON e.execution_id=a.execution_id
      LEFT JOIN execution_items i ON i.execution_id=a.execution_id AND i.item_ordinal=a.item_ordinal
      WHERE a.test_set_row_id=${rowId} OR (e.project_id=${project} AND a.test_set_id=${setId} AND a.test_set_revision=${revision})))`
}

export function assertSourceProductAuthority(input: unknown, snapshot: { source:Row[]; proposal:string|null; witnesses:Row[] }): void {
  validateRepairAuthority('repair_revision_origins',input)
  const origin=input
  let proposal: Record<string,any>
  try {
    proposal=parseRepairAuthority('repair_proposals',snapshot.proposal)
    if(proposal.projectId!==origin.projectId || proposal.proposalId!==origin.proposalAuthority.proposalId
      || proposal.proposalHash!==origin.proposalAuthority.proposalHash) fail('A')
  } catch { fail('A') }
  assertSourceEndpointAuthority(origin.projectId,origin.sourceDefinitionAuthority,proposal!.source,snapshot)
}

/** Source-only entry point for proposal eligibility. It reuses exactly the
 * origin validator's Product byte, Definition, endpoint and witness checks.
 * It does not construct an origin or require a proposal to exist already. */
export function assertSourceEndpointAuthority(projectId:string, claimed:Row, endpoint:Row,
  snapshot: { source:Row[]; witnesses:Row[] }): void {
  const origin={projectId}
  // Stage A must finish before any witness is interpreted.
  let parsed: ReturnType<typeof parseCanonicalTestSetV3>, definition: any
  try {
    validateRepairComponent('definitionAuthority',claimed)
    validateRepairComponent('endpoint',endpoint)
    if(snapshot.source.length!==1) fail('A')
    const row=snapshot.source[0]
    parsed=parseCanonicalTestSetV3(row.payload_json)
    const set=parsed.value, support=set.canonicalSupport
    const expected={ testSetRowId:row.id,testSetId:row.test_set_id,testSetRevision:row.revision,testSetContentHash:parsed.fingerprint,
      definitionId:claimed.definitionId,definitionContentHash:claimed.definitionContentHash,
      modelRowId:row.model_row_id,modelVersion:row.model_version,supportSealHash:row.support_seal_hash }
    if(set.projectId!==row.project_id
      || row.content_hash!==parsed.fingerprint || row.schema_version!==3 || set.schemaVersion!==row.schema_version
      || set.testSetId!==row.test_set_id || set.revision!==row.revision || set.generationId!==row.generation_id
      || set.generatedAt!==row.generated_at || set.outcome!==row.outcome || set.definitions.length!==row.definition_count
      || row.source_observation_id!==null || support.modelRowId!==row.model_row_id || support.modelVersion!==row.model_version
      || support.observationRunId!==row.observation_run_id || support.supportSealHash!==row.support_seal_hash
      || support.characterizationPolicy.id!==row.characterization_policy_id || support.characterizationPolicy.version!==row.characterization_policy_version) fail('A')
    const members=set.definitions.filter(d=>d.id===claimed.definitionId)
    if(members.length!==1) fail('A')
    definition=members[0]
    if(historicalDefinitionContentHash(definition)!==claimed.definitionContentHash) fail('A')
    // A valid row can disagree with the caller's historical nomination.
    // Keep the source-boundary stage label distinct from the refusal class.
    if(!same(expected,claimed) || row.project_id!==origin.projectId) fail('A','historical_authority_mismatch')
    const intent=definition.normalizedIntent
    if(endpoint.modelRowId!==row.model_row_id
      || endpoint.modelVersion!==row.model_version || endpoint.observationRunId!==row.observation_run_id
      || endpoint.supportSealHash!==row.support_seal_hash || !same(endpoint.characterizationPolicy,support.characterizationPolicy)
      || !same(endpoint.supportingObservationIds,support.supportingObservationIds)
      || intent.grounding.sourceFlowId!==endpoint.flowId || !same(intent.grounding.selectedFlowStepIndexes,[endpoint.stepIndex])
      || endpoint.action!=='click' || endpoint.grounding!=='observed' || endpoint.selector.kind!=='data_test'
      || intent.steps.filter((s:any)=>s.kind==='click_observed_data_test' && s.subjectId===endpoint.sourceSubjectId
        && s.elementId===endpoint.elementId && s.targetSubjectId===endpoint.targetSubjectId && s.dataTestValue===endpoint.selector.value).length!==1) fail('A','historical_authority_mismatch')
  } catch (error) { if(error instanceof RepairSourceAuthorityError) throw error; fail('A') }
  // Stage B authenticates the entire Test Set, transitively including Definition
  // bytes. A second separately persisted Definition hash is neither used nor needed.
  let qualifying=0
  for(const witness of snapshot.witnesses) {
    if(witness.project_id!==origin.projectId || witness.test_set_row_id!==claimed.testSetRowId
      || witness.test_set_id!==claimed.testSetId || witness.test_set_revision!==claimed.testSetRevision
      || witness.test_set_content_hash!==parsed!.fingerprint || witness.definition_schema_version!==3
      || witness.item_definition_id!==witness.definition_id
      || parsed!.value.definitions.filter(d=>d.id===witness.definition_id).length!==1) fail('B')
    if(witness.definition_id===claimed.definitionId) qualifying++
  }
  if(qualifying===0) fail('B')
}

export function isSourceProductAuthority(payload: unknown, snapshot: unknown): number {
  try {
    if(typeof payload!=='string' || typeof snapshot!=='string') return 0
    assertSourceProductAuthority(JSON.parse(payload),JSON.parse(snapshot)); return 1
  } catch { return 0 }
}

export async function verifySourceProductAuthority(db: Kysely<Database>, input: unknown): Promise<void> {
  validateRepairAuthority('repair_revision_origins',input)
  const result=await sql<{ authority:string }>`WITH source_input(payload) AS (SELECT ${canonicalJson(input)})
    SELECT ${sql.raw(sourceProductRowsSql('(SELECT payload FROM source_input)'))} AS authority`.execute(db)
  assertSourceProductAuthority(input,JSON.parse(result.rows[0].authority))
}
