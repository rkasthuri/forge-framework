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
import type { Kysely } from 'kysely'
import type { Database } from './types'
import { canonicalJson, canonicalJsonSha256 } from './JsonAppModelMigrationPlanner'
import { parseRepairAuthority, repairAuthorityHash, assertApprovedCorrespondence, isExactRepairAuthorityRow, projectRepairAuthorityColumns, validateRepairJson } from './RepairAuthorityValidation'
import { GovernedRepairProposalService } from '../healing/GovernedRepairProposalService'
import { validateRepairRequestEnvelope, enumeratePhysicalEndpointSlots, physicalCandidateIdentity, modelForGovernedPhysicalCandidate, type RepairProposalRequest, type RepairEligibilityResult } from '../healing/GovernedRepairEligibility'
import { AppModelRepository } from './repositories/AppModelRepository'
import { TestDefinitionAuthorityProjectionService } from '../test-design/TestDefinitionAuthorityProjectionService'
import { CanonicalRouteEvidenceProjection } from '../test-design/CanonicalRouteEvidenceProjection'
import { AuthenticationExpectationProjectionService } from '../test-design/AuthenticationExpectationProjection'
import { normalizeDiscoveredIntentV1 } from '../test-design/NormalizedTestIntentContract'
import { generateCanonicalFlowTestSetV3, parseCanonicalTestSetV3, materializeCanonicalTestSet, type CanonicalTestSetV3, type CanonicalV3FlowGenerationInput } from '../test-design/TestDefinitionContract'
import { historicalDefinitionContentHash } from '../execution/HistoricalDefinitionAuthorityResolver'

type Row = Record<string, any>
export const REPAIR_MATERIALIZER_VERSION = 'forge.m5.selector-repair-materializer/v1'
export type RepairMaterializationRefusal = Extract<RepairEligibilityResult, { kind:'refused' }>
export class RepairMaterializationError extends Error {
  readonly counts:RepairMaterializationRefusal['counts']
  constructor(readonly code:RepairMaterializationRefusal['code'],counts:RepairMaterializationRefusal['counts']={a:0,b:0,c:0}) {
    super('Repair materialization refused: '+code); this.name='RepairMaterializationError';this.counts={...counts}
  }
}
export function materializationFail(code:RepairMaterializationRefusal['code'] = 'integrity_mismatch'):never { throw new RepairMaterializationError(code) }
export const repairSame = (a:unknown,b:unknown):boolean => canonicalJson(a)===canonicalJson(b)
export interface RepairMaterializationInput {
  request:RepairProposalRequest
  supersession:unknown
  generationId:string
  repairOriginId:string
  generatedAt:string
}
export interface RepairMaterializationSuccess {
  kind:'materialized'
  rowId:number
  testSet:CanonicalTestSetV3
  contentHash:string
  origin:Row
  replay:boolean
}
export type RepairMaterializationResult = RepairMaterializationSuccess | RepairMaterializationRefusal
export function freezeRepairMaterialization(input:RepairMaterializationInput):RepairMaterializationInput {
  try {
    validateRepairJson(input)
    if(Object.keys(input).sort().join('|')!=='generatedAt|generationId|repairOriginId|request|supersession')materializationFail()
    validateRepairRequestEnvelope(input.request)
    parseRepairAuthority('app_model_transition_supersessions',input.supersession)
    for(const id of [input.generationId,input.repairOriginId])if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(id))materializationFail()
    if(typeof input.generatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input.generatedAt)||!Number.isFinite(Date.parse(input.generatedAt)))materializationFail()
    return JSON.parse(canonicalJson(input))
  } catch { return materializationFail() }
}
/** Exact frozen Chunk 0 semantic projection. Every unmasked byte of canonical
 * meaning remains compared, including membership, routes, action kinds and oracle. */
export function repairSemanticProjection(input:CanonicalTestSetV3):unknown {
  const set:Row=JSON.parse(JSON.stringify(input)),d=set.definitions[0]
  if(set.definitions.length!==1||d.actions.length!==2||d.normalizedIntent.steps.length!==2||d.normalizedIntent.expectedOutcomes.length!==1)materializationFail()
  set.revision='<derived>';set.generationId='<derived>';set.generatedAt='<audit>';set.canonicalSupport='<exact-support-authority>'
  d.id='<derived>';d.provenance.modelRowId='<support>';d.provenance.modelVersion='<support>';d.provenance.supportSealHash='<support>';d.provenance.subjectSupport='<support>';d.provenance.intentId='<derived>';d.provenance.intentContentHash='<derived>'
  d.normalizedIntent.intentId='<derived>';d.normalizedIntent.grounding.modelRowId='<support>';d.normalizedIntent.grounding.modelVersion='<support>';d.normalizedIntent.grounding.observationRunId='<support>';d.normalizedIntent.grounding.supportSealHash='<support>';d.normalizedIntent.grounding.subjectSupport='<support>'
  d.normalizedIntent.steps[0].stepId='<derived>';d.normalizedIntent.steps[1].stepId='<derived>';d.normalizedIntent.steps[1].dataTestValue='<nominated-selector>';d.normalizedIntent.expectedOutcomes[0].outcomeId='<derived>'
  d.actions[0].stepId='<derived>';d.actions[1].stepId='<derived>';d.actions[1].dataTestValue='<nominated-selector>'
  for(const route of d.flowRouteEvidence)route.supportingObservationIds='<support>'
  d.oracle.supportingObservationIds='<support>'
  return set
}
/** Product hashes are computed only by their existing authoritative producers. */
export function repairDefinitionAuthority(set:CanonicalTestSetV3,rowId:number):Row {
  const d=set.definitions[0],s=set.canonicalSupport
  return {testSetRowId:rowId,testSetId:set.testSetId,testSetRevision:set.revision,
    testSetContentHash:materializeCanonicalTestSet(set).fingerprint,definitionId:d.id,
    definitionContentHash:historicalDefinitionContentHash(d),modelRowId:s.modelRowId,modelVersion:s.modelVersion,supportSealHash:s.supportSealHash}
}
export function repairTransformHash(origin:Row):string {
  return canonicalJsonSha256({materializerVersion:REPAIR_MATERIALIZER_VERSION,proposalHash:origin.proposalAuthority.proposalHash,
    supersessionAuthorityHash:origin.supersessionAuthorityHash,sourceDefinitionAuthority:origin.sourceDefinitionAuthority,
    resultingDefinitionAuthority:origin.resultingDefinitionAuthority})
}
export function checkedRepairTestSetRow(row:Row):ReturnType<typeof parseCanonicalTestSetV3> {
  try {
    const parsed=parseCanonicalTestSetV3(row.payload_json),s=parsed.value.canonicalSupport,set=parsed.value
    if(row.content_hash!==parsed.fingerprint||row.project_id!==set.projectId||row.schema_version!==3||row.test_set_id!==set.testSetId
      ||row.revision!==set.revision||row.generation_id!==set.generationId||row.generated_at!==set.generatedAt||row.outcome!==set.outcome
      ||row.definition_count!==set.definitions.length||row.source_observation_id!==null||row.model_row_id!==s.modelRowId
      ||row.model_version!==s.modelVersion||row.observation_run_id!==s.observationRunId||row.support_seal_hash!==s.supportSealHash
      ||row.characterization_policy_id!==s.characterizationPolicy.id||row.characterization_policy_version!==s.characterizationPolicy.version)materializationFail()
    return parsed
  } catch { return materializationFail() }
}
/** Read-only preflight: no exported insert capability or caller-supplied callback
 * can manufacture approval. Called inside the repository's owned transaction. */
export async function inspectRepairMaterialization(db:Kysely<Database>,workspaceRoot:string,input:RepairMaterializationInput):Promise<{
  authority:Row; proposal:Row; source:CanonicalTestSetV3; generation:CanonicalV3FlowGenerationInput;
}> {
  const authority=parseRepairAuthority('app_model_transition_supersessions',input.supersession)
  let committed:Row|undefined,decision:Row|undefined
  for(const table of ['repair_decisions','app_model_transition_supersessions'] as const) {
    const rows=await db.selectFrom(table).selectAll().execute()
    for(const row of rows) {
      if(isExactRepairAuthorityRow(table,row.canonical_payload,JSON.stringify(projectRepairAuthorityColumns(table,row)))!==1)materializationFail()
      const value=parseRepairAuthority(table,row.canonical_payload)
      if(table==='app_model_transition_supersessions'&&(value.authorityId===authority.authorityId||value.proposalAuthority.proposalId===authority.proposalAuthority.proposalId)) {
        if(!repairSame(value,authority))materializationFail();committed=value
      }
      if(table==='repair_decisions'&&(value.decisionId===authority.decisionAuthority.decisionId||value.proposalAuthority.proposalId===authority.proposalAuthority.proposalId))decision=value
    }
  }
  const proposal=await new GovernedRepairProposalService(workspaceRoot,()=>db).readExactInTransaction(input.request,authority.proposalAuthority.proposalId,db)
  if(proposal.kind==='refused')throw new RepairMaterializationError(proposal.code,proposal.counts)
  if(!committed||!decision)materializationFail('stale_authority')
  try { assertApprovedCorrespondence(proposal.proposal,decision,authority) } catch { materializationFail('stale_authority') }
  if(Date.parse(decision.decidedAt)<Date.parse(proposal.proposal.proposedAt)||Date.parse(authority.promotedAt)<Date.parse(decision.decidedAt)
    ||Date.parse(input.generatedAt)<Date.parse(authority.promotedAt))materializationFail('stale_authority')
  const sourceRow=await db.selectFrom('test_set_revisions').selectAll().where('id','=',input.request.sourceDefinitionAuthority.testSetRowId).executeTakeFirst()
  if(!sourceRow)materializationFail('historical_authority_mismatch')
  const source=checkedRepairTestSetRow(sourceRow).value
  const candidate=await new AppModelRepository().getCommittedById(Number(authority.candidate.modelRowId),db)
  const support=await new TestDefinitionAuthorityProjectionService().readExact(input.request.projectId,candidate.rowId,db)
  if(support.kind!=='ok')materializationFail('stale_authority')
  const routes=await new CanonicalRouteEvidenceProjection().readExact(input.request.projectId,support.authority,db)
  if(routes.kind!=='ok')materializationFail('stale_authority')
  const authentication=new AuthenticationExpectationProjectionService().read(input.request.projectId,workspaceRoot)
  const slots=enumeratePhysicalEndpointSlots(candidate.snapshot).flatMap(slot=>slot.element.strategies.map((strategy:Row,strategyPosition:number)=>({...slot,strategy,strategyPosition})))
    .filter(slot=>repairSame(physicalCandidateIdentity(slot),proposal.candidateIdentity))
  if(slots.length!==1)materializationFail('candidate_semantics_unproven')
  const normalized=normalizeDiscoveredIntentV1({projectId:input.request.projectId,model:modelForGovernedPhysicalCandidate(candidate.snapshot,slots[0]),authority:support.authority,
    routeEvidence:routes.evidence,authenticationExpectation:authentication,
    selection:{flowId:authority.candidate.flowId,selectedFlowStepIndexes:[authority.candidate.stepIndex]}})
  if(normalized.kind!=='supported')materializationFail('candidate_semantics_unproven')
  return {authority,proposal:proposal.proposal,source,generation:{projectId:input.request.projectId,generatedAt:input.generatedAt,
    authority:support.authority,routeEvidence:routes.evidence,authenticationExpectation:authentication,normalizedIntent:normalized.materialized}}
}
export function generateRepairTestSet(preflight:Awaited<ReturnType<typeof inspectRepairMaterialization>>,generationId:string,revision:number) {
  const generated=generateCanonicalFlowTestSetV3(preflight.generation,generationId,revision)
  if(!repairSame(repairSemanticProjection(preflight.source),repairSemanticProjection(generated.value)))materializationFail('candidate_semantics_unproven')
  const d=generated.value.definitions[0],c=preflight.authority.candidate
  if(d.actions[1].kind!=='click_observed_data_test'||d.actions[1].dataTestValue!==c.selector.value
    ||d.normalizedIntent.steps[1].kind!=='click_observed_data_test'||d.normalizedIntent.steps[1].dataTestValue!==c.selector.value)materializationFail()
  return generated
}
export function createRepairOrigin(input:RepairMaterializationInput,set:CanonicalTestSetV3,rowId:number):Row {
  const authority=input.supersession as Row
  const origin:Row={schemaVersion:'forge.m5.repair-revision-link/v1',repairOriginId:input.repairOriginId,originKind:'repair',
    projectId:set.projectId,testSetRowId:rowId,sourceDefinitionAuthority:input.request.sourceDefinitionAuthority,
    supersessionAuthorityId:authority.authorityId,supersessionAuthorityHash:authority.authorityHash,
    proposalAuthority:authority.proposalAuthority,decisionAuthority:{decisionId:authority.decisionAuthority.decisionId,decisionHash:authority.decisionAuthority.decisionHash},
    materializerVersion:REPAIR_MATERIALIZER_VERSION,transformHash:'0'.repeat(64),resultingDefinitionAuthority:repairDefinitionAuthority(set,rowId),
    createdAt:input.generatedAt,lineageHash:'0'.repeat(64)}
  origin.transformHash=repairTransformHash(origin);origin.lineageHash=repairAuthorityHash('repair_revision_origins',origin)
  return origin
}
