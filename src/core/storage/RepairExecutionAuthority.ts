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
import { sql, type Kysely, type Transaction } from 'kysely'
import type { Database, TestResult } from './types'
import { canonicalJson } from './JsonAppModelMigrationPlanner'
import {
  readCommittedRepairMaterialization, freezeRepairMaterialization, inspectRepairMaterialization, generateRepairTestSet,
  checkedRepairTestSetRow, repairDefinitionAuthority, createRepairOrigin,
  type RepairMaterializationInput,
} from './RepairMaterializationAuthority'
import { validateRepairJson, validateRepairComponent, parseRepairAuthority, repairAuthorityHash,
  repairAuthorityRow, isExactRepairAuthorityRow, projectRepairAuthorityColumns } from './RepairAuthorityValidation'
import { verifyRerunProductAuthority } from './RepairRerunAuthority'
import { AppModelRepository } from './repositories/AppModelRepository'
import { DiagnosticEvidenceRepository } from './repositories/DiagnosticEvidenceRepository'
import { HistoricalDefinitionAuthorityResolver } from '../execution/HistoricalDefinitionAuthorityResolver'
import { DiagnosticClassificationService } from '../execution/DiagnosticClassificationService'
import { DIAGNOSTIC_CLASSIFIER_VERSION } from '../execution/DiagnosticClassificationContract'
import { DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION, parseDiagnosticEvidenceV1 } from '../execution/DiagnosticEvidenceContract'
import { parseCanonicalTestSetV3 } from '../test-design/TestDefinitionContract'
import { projectPersistedCanonicalFlowPlan, projectExecutablePlan, type CurrentV2ProjectionAuthority } from '../execution/ExecutionProjectionService'
import { executionIntentFingerprint } from '../execution/ExecutionIntentIdentity'

type Row = Record<string, any>
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/
const HASH=/^[a-f0-9]{64}$/
const same=(a:unknown,b:unknown):boolean=>canonicalJson(a)===canonicalJson(b)
const keys=(v:object,expected:string[]):boolean=>Object.keys(v).sort().join('|')===[...expected].sort().join('|')

export interface RepairOriginalEvidence {
  executionId:string; runId:string; resultId:string; itemOrdinal:number;
  planHash:string; evidenceSchemaVersion:typeof DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION; evidenceHash:string;
}
export interface RepairRerunSelection {
  kind:'repair_rerun'
  materialization:RepairMaterializationInput
  resultingDefinitionAuthority:Row
  originalEvidence:RepairOriginalEvidence
}
export class RepairExecutionAuthorityError extends Error {
  constructor(readonly code:'repair_integrity_invalid'|'repair_authority_unavailable'|'repair_source_invalid'|'repair_transaction_unsupported'='repair_integrity_invalid') {
    super('Governed repair execution refused: '+code);this.name='RepairExecutionAuthorityError'
  }
}
function fail(code?:RepairExecutionAuthorityError['code']):never {throw new RepairExecutionAuthorityError(code)}

export function freezeRepairRerunSelection(value:unknown):RepairRerunSelection {
  try {
    validateRepairJson(value)
    if(!value||typeof value!=='object'||!keys(value,['kind','materialization','resultingDefinitionAuthority','originalEvidence']))fail()
    const selection=value as RepairRerunSelection
    if(selection.kind!=='repair_rerun')fail()
    freezeRepairMaterialization(selection.materialization)
    validateRepairComponent('definitionAuthority',selection.resultingDefinitionAuthority)
    const e=selection.originalEvidence
    if(!e||!keys(e,['executionId','runId','resultId','itemOrdinal','planHash','evidenceSchemaVersion','evidenceHash'])
      ||![e.executionId,e.runId,e.resultId].every(id=>typeof id==='string'&&ID.test(id))
      ||!Number.isSafeInteger(e.itemOrdinal)||e.itemOrdinal<1||!HASH.test(e.planHash)||!HASH.test(e.evidenceHash)
      ||e.evidenceSchemaVersion!==DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION)fail()
    return JSON.parse(canonicalJson(selection))
  } catch(cause) {if(cause instanceof RepairExecutionAuthorityError)throw cause;return fail()}
}

/** Read only; the caller supplies an already-owned repository transaction. No
 * write callback or authority capability is returned. Canonical producers are
 * rerun against their exact historical authority, never caller output bytes. */
export async function inspectRepairExecution(
  db:Kysely<Database>,workspaceRoot:string,raw:unknown,projectId:string,projectedAt:string,
) {
  const selection=freezeRepairRerunSelection(raw),input=selection.materialization
  if(input.request.projectId!==projectId)fail()
  const materialized=await readCommittedRepairMaterialization(db,workspaceRoot,input)
  const {origin,testSet:validatedSet}=materialized
  if(!same(selection.resultingDefinitionAuthority,origin.resultingDefinitionAuthority))fail()
  const row=await db.selectFrom('test_set_revisions').selectAll().where('id','=',materialized.rowId).executeTakeFirstOrThrow()
  const parsed={value:validatedSet,fingerprint:materialized.contentHash}
  const preflight=await inspectRepairMaterialization(db,workspaceRoot,input)
  await inspectOriginalRepairEvidence(db,projectId,selection)
  const candidate=await new AppModelRepository().getCommittedById(preflight.authority.candidate.modelRowId,db)
  const authority:CurrentV2ProjectionAuthority={
    currentRevision:{testSetId:parsed.value.testSetId,revision:parsed.value.revision,contentHash:parsed.fingerprint},
    sealedAuthority:preflight.generation.authority,routeEvidence:preflight.generation.routeEvidence,
    authenticationExpectation:preflight.generation.authenticationExpectation,
    activeAppModel:{rowId:candidate.rowId,modelVersion:candidate.snapshot.app.modelVersion,snapshot:candidate.snapshot},
  }
  const definition=parsed.value.definitions[0]
  const projection=projectExecutablePlan({definition,definitionSchemaVersion:3,definitionTestSetId:parsed.value.testSetId,
    definitionRevision:parsed.value.revision,testSetContentHash:parsed.fingerprint},authority,projectedAt)
  if(projection.kind!=='ok')fail('repair_authority_unavailable')
  return {selection,origin,row,testSet:parsed.value,contentHash:parsed.fingerprint,authority,plan:projection.plan}
}

async function inspectOriginalRepairEvidence(db:Kysely<Database>,projectId:string,selection:RepairRerunSelection):Promise<void> {
  // The SQLite UDF registration imports this module during database startup.
  // Load the runtime aggregator only after repository classes are initialized.
  const {PersistedEvidenceAggregator,hasInvalidPersistedEvidence}=await import('../execution/PersistedEvidenceAggregator')
  const e=selection.originalEvidence,source=selection.materialization.request.sourceDefinitionAuthority
  try {
    const read=await new PersistedEvidenceAggregator(()=>db).read(projectId,e.executionId,db as Transaction<Database>)
    if(read.kind!=='ok'||hasInvalidPersistedEvidence(read.aggregation)||!read.aggregation.execution.terminal)fail('repair_source_invalid')
    const run=read.evidence.runs.find(r=>r.run_id===e.runId),result=read.evidence.results.find(r=>r.result_id===e.resultId)
    const terminal=read.evidence.events.find(event=>event.event_type==='terminal')
    if(!run||!result||!terminal||!['failed','could_not_verify'].includes(result.status)
      ||result.run_id!==e.runId||result.definition_id!==source.definitionId
      ||result.execution_item_ordinal!==e.itemOrdinal||result.executable_plan_hash!==e.planHash
      ||![result.started_at,terminal.occurred_at,selection.materialization.request.proposedAt].every(t=>typeof t==='string'&&Number.isFinite(Date.parse(t)))
      ||Date.parse(result.started_at)>Date.parse(selection.materialization.request.proposedAt)
      ||Date.parse(terminal.occurred_at)>Date.parse(selection.materialization.request.proposedAt))fail('repair_source_invalid')
    const item=await db.selectFrom('execution_item_authorities').selectAll().where('execution_id','=',e.executionId)
      .where('item_ordinal','=',e.itemOrdinal).executeTakeFirst()
    if(!item||item.test_set_row_id!==source.testSetRowId||item.test_set_id!==source.testSetId
      ||item.test_set_revision!==source.testSetRevision||item.test_set_content_hash!==source.testSetContentHash
      ||item.definition_schema_version!==3||item.definition_id!==source.definitionId)fail('repair_source_invalid')
    const binding={projectId,executionId:e.executionId,runId:e.runId,itemOrdinal:e.itemOrdinal,
      resultId:e.resultId,definitionId:source.definitionId,executablePlanHash:e.planHash}
    const historical=await new HistoricalDefinitionAuthorityResolver(()=>db).resolve(binding,db as Transaction<Database>)
    if(historical.acceptedDefinitionAuthority.definitionContentHash!==source.definitionContentHash)fail('repair_source_invalid')
    const diagnostics=new DiagnosticEvidenceRepository(()=>db)
    const identity={projectId,executionId:e.executionId,runId:e.runId,itemOrdinal:e.itemOrdinal,evidenceSchemaVersion:e.evidenceSchemaVersion}
    const diagnostic=await diagnostics.readExact(identity,db as Transaction<Database>)
    if(!diagnostic||diagnostic.result_id!==e.resultId||diagnostic.evidence_hash!==e.evidenceHash)fail('repair_source_invalid')
    const evidence=parseDiagnosticEvidenceV1(JSON.parse(diagnostic.evidence_json))
    if(!same(evidence.authority,historical))fail('repair_source_invalid')
    const classified=await new DiagnosticClassificationService({readExact:identity=>diagnostics.readExact(identity,db as Transaction<Database>)}).classify({
      ...identity,evidenceHash:e.evidenceHash,classifierVersion:DIAGNOSTIC_CLASSIFIER_VERSION,
    })
    if(classified.outcome.kind==='refusal'&&classified.outcome.refusalCode==='integrity_invalid')fail('repair_source_invalid')
  } catch(cause) {if(cause instanceof RepairExecutionAuthorityError)throw cause;fail('repair_source_invalid')}
}

export function repairExecutionBindingRow(executionId:string,projectId:string,selection:RepairRerunSelection,origin:Row,requestFingerprint:string,planHash:string) {
  const e=selection.originalEvidence
  if(executionIntentFingerprint({projectId,definitionIds:[],repairSelection:selection})!==requestFingerprint)fail()
  return {execution_id:executionId,project_id:projectId,repair_origin_id:origin.repairOriginId,repair_lineage_hash:origin.lineageHash,
    test_set_row_id:origin.testSetRowId,definition_id:origin.resultingDefinitionAuthority.definitionId,
    original_execution_id:e.executionId,original_run_id:e.runId,original_result_id:e.resultId,original_item_ordinal:e.itemOrdinal,
    original_plan_hash:e.planHash,original_diagnostic_hash:e.evidenceHash,
    request_fingerprint:requestFingerprint,plan_hash:planHash,selection_json:canonicalJson(selection)}
}

/** SQLite native/WASM shape and committed-origin check. Full live configuration,
 * proposal and diagnostic revalidation remains the owned repository preflight. */
export function isExactRepairExecutionBinding(rowJson:unknown,originJson:unknown,proposalJson:unknown,supersessionJson:unknown,testSetJson:unknown,modelJson:unknown):number {
  try {
    if([rowJson,originJson,proposalJson,supersessionJson,testSetJson,modelJson].some(v=>typeof v!=='string'))return 0
    const row=JSON.parse(rowJson as string),selection=freezeRepairRerunSelection(JSON.parse(row.selection_json))
    const origin=parseRepairAuthority('repair_revision_origins',originJson)
    const proposal=parseRepairAuthority('repair_proposals',proposalJson),supersession=parseRepairAuthority('app_model_transition_supersessions',supersessionJson)
    const parsed=parseCanonicalTestSetV3(testSetJson as string),set=parsed.value,request=selection.materialization.request
    const plan=projectPersistedCanonicalFlowPlan(set,parsed.fingerprint,JSON.parse(modelJson as string))
    if(parsed.fingerprint!==origin.resultingDefinitionAuthority.testSetContentHash||plan.kind!=='ok'||plan.plan.fingerprint!==row.plan_hash)return 0
    if((request.contractVersion!==undefined&&request.contractVersion!==proposal.schemaVersion)
      ||(request.repairKind!==undefined&&request.repairKind!==proposal.repairKind)
      ||!same(supersession,selection.materialization.supersession)||!same(origin.proposalAuthority,supersession.proposalAuthority)
      ||proposal.proposalId!==origin.proposalAuthority.proposalId||proposal.proposalHash!==origin.proposalAuthority.proposalHash
      ||(request.proposalId!==undefined&&request.proposalId!==proposal.proposalId)
      ||(request.proposal!==undefined&&!same(request.proposal,proposal))
      ||!same(request.source,proposal.source)||!same(request.candidate,proposal.candidate)||request.proposedAt!==proposal.proposedAt
      ||selection.materialization.generatedAt!==origin.createdAt||set.generatedAt!==origin.createdAt
      ||selection.materialization.generationId!==set.generationId)return 0
    if(!ID.test(row.execution_id)||!HASH.test(row.plan_hash)||selection.materialization.request.projectId!==row.project_id
      ||origin.projectId!==row.project_id||origin.repairOriginId!==selection.materialization.repairOriginId
      ||origin.supersessionAuthorityId!==(selection.materialization.supersession as Row).authorityId
      ||origin.supersessionAuthorityHash!==(selection.materialization.supersession as Row).authorityHash
      ||!same(origin.resultingDefinitionAuthority,selection.resultingDefinitionAuthority)
      ||!same(origin.sourceDefinitionAuthority,selection.materialization.request.sourceDefinitionAuthority))return 0
    return same(row,repairExecutionBindingRow(row.execution_id,row.project_id,selection,origin,row.request_fingerprint,row.plan_hash))?1:0
  } catch {return 0}
}

export async function readRepairExecutionBinding(db:Kysely<Database>,executionId:string) {
  const row=await db.selectFrom('execution_repair_bindings').selectAll().where('execution_id','=',executionId).executeTakeFirst()
  if(!row)return null
  const selection=freezeRepairRerunSelection(JSON.parse(row.selection_json))
  const originRow=await db.selectFrom('repair_revision_origins').selectAll().where('repair_origin_id','=',row.repair_origin_id).executeTakeFirst()
  if(!originRow)fail('repair_authority_unavailable')
  const origin=parseRepairAuthority('repair_revision_origins',originRow.canonical_payload)
  const proposal=await db.selectFrom('repair_proposals').selectAll().where('proposal_id','=',origin.proposalAuthority.proposalId).executeTakeFirst()
  const supersession=await db.selectFrom('app_model_transition_supersessions').selectAll().where('authority_id','=',origin.supersessionAuthorityId).executeTakeFirst()
  const set=await db.selectFrom('test_set_revisions').selectAll().where('id','=',row.test_set_row_id).executeTakeFirst()
  const model=set?await db.selectFrom('app_models').select('model_json').where('id','=',set.model_row_id).executeTakeFirst():undefined
  if(isExactRepairExecutionBinding(JSON.stringify(row),originRow.canonical_payload,proposal?.canonical_payload,supersession?.canonical_payload,set?.payload_json,model?.model_json)!==1)fail()
  const execution=await db.selectFrom('executions').selectAll().where('execution_id','=',executionId).executeTakeFirst()
  if(!execution||execution.repair_binding_id!==executionId||execution.project_id!==row.project_id
    ||execution.execution_intent_fingerprint!==row.request_fingerprint||execution.manifest_hash!==row.plan_hash)fail()
  if(!set||!model)fail()
  const parsed=parseCanonicalTestSetV3(set.payload_json),projection=projectPersistedCanonicalFlowPlan(parsed.value,parsed.fingerprint,JSON.parse(model.model_json))
  if(projection.kind!=='ok'||projection.plan.value.schemaVersion!==2||projection.plan.fingerprint!==row.plan_hash)fail()
  const plan=projection.plan.value,support=parsed.value.canonicalSupport
  if(execution.test_set_authority_scope!=='single'||execution.test_set_id!==set.test_set_id||execution.test_set_revision!==set.revision
    ||execution.definition_schema_version!==3||execution.model_row_id!==support.modelRowId||execution.model_version!==support.modelVersion
    ||execution.source_observation_id!==null||execution.support_seal_hash!==support.supportSealHash
    ||execution.route_evidence_identity_hash!==plan.provenance.routeEvidenceIdentityHash||execution.authentication_expectation_identity_hash!==plan.provenance.authenticationExpectationIdentityHash
    ||execution.suite_id!==null||execution.suite_revision!==null||execution.suite_content_hash!==null||execution.max_run_attempts!==1)fail()
  const items=await db.selectFrom('execution_items').selectAll().where('execution_id','=',executionId).execute()
  const authorities=await db.selectFrom('execution_item_authorities').selectAll().where('execution_id','=',executionId).execute()
  if(!same(items,[{execution_id:executionId,item_ordinal:1,definition_id:row.definition_id,executable_plan_hash:row.plan_hash,oracle_kind:plan.oracle.kind,oracle_subject_id:plan.oracle.subjectId}])
    ||!same(authorities,[{execution_id:executionId,item_ordinal:1,test_set_row_id:set.id,test_set_id:set.test_set_id,test_set_revision:set.revision,test_set_content_hash:set.content_hash,definition_schema_version:3,definition_id:row.definition_id}]))fail()
  return {row,selection,origin}
}

/** The existing frozen link producer is composed with canonical Result writing;
 * it never mints Result identity, decides outcome, or initiates execution. */
export async function appendRepairExecutionResultLink(db:Kysely<Database>,executionId:string,result:TestResult,recordedAt:string,replayed=false):Promise<void> {
  const binding=await readRepairExecutionBinding(db,executionId)
  if(!binding) {if(result.repair_rerun_link_id!==null)fail();return}
  const {row,origin}=binding,claim={executionId,itemOrdinal:Number(result.execution_item_ordinal),planHash:result.executable_plan_hash,
    runId:result.run_id,attemptOrdinal:1,resultId:result.result_id}
  if(!result.repair_rerun_link_id||claim.itemOrdinal!==1)fail()
  const link:Row={schemaVersion:'forge.m5.repair-rerun-link/v1',rerunLinkId:result.repair_rerun_link_id,projectId:row.project_id,
    repairOriginId:origin.repairOriginId,repairLineageHash:origin.lineageHash,resultingDefinitionAuthority:origin.resultingDefinitionAuthority,
    executionAuthority:claim,suiteAuthority:null,persistedAuthorities:{
      execution:{projectId:row.project_id,executionId,origin:'product',manifest:[{itemOrdinal:1,
        definitionAuthority:origin.resultingDefinitionAuthority,planHash:claim.planHash}],suiteAuthority:null},
      run:{projectId:row.project_id,runId:claim.runId,executionId,origin:'product',attemptOrdinal:1},
      result:{projectId:row.project_id,resultId:claim.resultId,runId:claim.runId,itemOrdinal:1,
        definitionId:result.definition_id,planHash:claim.planHash},
    },recordedAt,rerunLinkHash:'0'.repeat(64)}
  link.rerunLinkHash=repairAuthorityHash('repair_rerun_links',link)
  const existing=await db.selectFrom('repair_rerun_links').selectAll().where('rerun_link_id','=',link.rerunLinkId).executeTakeFirst()
  if(replayed) {
    if(!existing)fail()
    const historical=parseRepairAuthority('repair_rerun_links',existing.canonical_payload)
    link.recordedAt=historical.recordedAt;link.rerunLinkHash=repairAuthorityHash('repair_rerun_links',link)
    if(!same(historical,link))fail()
    await verifyRerunProductAuthority(db,historical);return
  }
  if(existing)fail()
  await verifyRerunProductAuthority(db,link)
  await db.insertInto('repair_rerun_links').values(repairAuthorityRow('repair_rerun_links',link) as any).execute()
}
