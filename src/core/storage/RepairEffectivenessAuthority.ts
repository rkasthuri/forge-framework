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
import { createHash } from 'node:crypto'
import type { Database } from './types'
import { canonicalJson, canonicalJsonSha256 } from './JsonAppModelMigrationPlanner'
import { parseRepairAuthority, isExactRepairAuthorityRow, projectRepairAuthorityColumns } from './RepairAuthorityValidation'
import { readRepairExecutionBinding, inspectRepairExecution, isExactRepairExecutionBinding } from './RepairExecutionAuthority'
import { assertRerunProductAuthority, rerunProductRowsSql } from './RepairRerunAuthority'
import { assertSourceProductAuthority, sourceProductRowsSql } from './RepairSourceAuthority'
import { assertProposalIdentityPair, isExactProposalIdentityRow, projectProposalIdentityColumns } from './RepairProposalIdentityAuthority'
import { checkedRepairTestSetRow, repairSemanticProjection } from './RepairMaterializationAuthority'
import { projectPersistedCanonicalFlowPlan } from '../execution/ExecutionProjectionService'
import { HistoricalDefinitionAuthorityResolver, historicalDefinitionContentHash } from '../execution/HistoricalDefinitionAuthorityResolver'
import { canonicalDiagnosticJson, DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION, parseDiagnosticEvidenceV1, type DiagnosticEvidenceV1 } from '../execution/DiagnosticEvidenceContract'
import { classifyDiagnosticEvidence, DIAGNOSTIC_CLASSIFIER_VERSION } from '../execution/DiagnosticClassificationContract'
import { aggregatePersistedEvidence, type PersistedExecutionEvidence } from '../execution/PersistedEvidenceAggregator'
import { productResultTruth } from '../execution/ExecutionRunCoordinator'
import { comparisonFail, freezeRepairComparison, repairComparisonId, classifyRepairEffectiveness, REPAIR_EFFECTIVENESS_SCHEMA,
  type RepairComparisonRequest, type RepairComparisonResult, type RepairEffectivenessEvidence } from '../healing/RepairEffectivenessContract'

type Row = Record<string, any>
type Snapshot = Record<string, Row[]> & { sourceRows:any; rerunRows:any }
const same = (a:unknown,b:unknown) => canonicalJson(a) === canonicalJson(b)
const one = (rows:Row[]) => rows.length === 1 ? rows[0] : comparisonFail()
const zeroOrOne = (rows:Row[]) => rows.length < 2 ? rows[0] ?? null : comparisonFail()

/** Shared source eligibility for Product entry and immutable comparison. */
export function assertRepairSourceTargeted(evidence:DiagnosticEvidenceV1,evidenceHash:string):void {
  const sourceMode=classifyDiagnosticEvidence(evidence,evidenceHash,DIAGNOSTIC_CLASSIFIER_VERSION)
  if(sourceMode.kind!=='classified_failure'||!['target_not_observed','action_not_completed'].includes(sourceMode.failureMode))comparisonFail('comparison_source_not_targeted')
}

// Fixed current Product columns, captured from actual rows by SQL. This is not
// a caller-supplied authority snapshot and does not become a second fact store.
const COLUMNS: Record<string,string[]> = {"executions":["repair_binding_id","execution_id","project_id","accepted_at","test_set_authority_scope","test_set_id","test_set_revision","definition_schema_version","model_row_id","model_version","source_observation_id","support_seal_hash","route_evidence_identity_hash","authentication_expectation_identity_hash","manifest_hash","max_run_attempts","dispatch_mode","stop_rule","execution_intent_key","execution_intent_fingerprint","suite_id","suite_revision","suite_content_hash"],"execution_items":["execution_id","item_ordinal","definition_id","executable_plan_hash","oracle_kind","oracle_subject_id"],"execution_item_authorities":["execution_id","item_ordinal","test_set_row_id","test_set_id","test_set_revision","test_set_content_hash","definition_schema_version","definition_id"],"execution_events":["id","execution_id","project_id","event_type","outcome","occurred_at","process_instance_id","safe_code","safe_message","execution_plan_hash","lifecycle"],"execution_locks":["project_id","execution_id","process_instance_id","acquired_at","last_heartbeat_at"],"runs":["id","run_id","app_name","branch","commit_sha","environment","base_url","triggered_by","reporter_version","status","total_tests","passed","failed","skipped","duration_ms","started_at","completed_at","metadata","input_health","input_health_reason","lifecycle","execution_id","origin","attempt_ordinal"],"test_results":["repair_rerun_link_id","id","run_id","test_id","title","suite","status","duration_ms","retry_count","error_msg","browser","tier","started_at","worker_index","tags","flaky_history","screenshot_path","video_path","metadata","result_id","execution_item_ordinal","definition_id","executable_plan_hash","oracle_kind","observed_subject_id"],"diagnostic_evidence":["id","evidence_schema_version","evidence_hash","project_id","execution_id","run_id","item_ordinal","result_id","definition_id","executable_plan_hash","accepted_definition_authority_json","suite_authority_json","evidence_json"],"execution_repair_bindings":["execution_id","project_id","repair_origin_id","repair_lineage_hash","test_set_row_id","definition_id","original_execution_id","original_run_id","original_result_id","original_item_ordinal","original_plan_hash","original_diagnostic_hash","request_fingerprint","plan_hash","selection_json"],"repair_revision_origins":["canonical_payload","repair_origin_id","test_set_row_id","project_id","source_definition_authority_json","result_definition_authority_json","supersession_authority_id","supersession_authority_hash","proposal_id","proposal_hash","decision_id","decision_hash","materializer_version","transform_hash","created_at"],"repair_proposals":["proposal_id","project_id","schema_version","repair_kind","canonical_payload","proposal_hash","source_endpoint_identity","candidate_endpoint_identity","enumerator_version","candidate_set_hash","derived_successor_count"],"repair_decisions":["decision_id","proposal_id","project_id","proposal_hash","decision","actor_kind","actor_id","mechanism_id","decided_at","canonical_payload","decision_hash"],"app_model_transition_supersessions":["canonical_payload","authority_id","authority_hash","project_id","source_endpoint_identity","candidate_endpoint_identity","proposal_id","proposal_hash","decision_id","decision_hash","decision_kind","actor_kind","actor_id","mechanism_id","promoted_at"],"repair_rerun_links":["canonical_payload","rerun_link_id","rerun_link_hash","repair_origin_id","repair_lineage_hash","project_id","resulting_test_set_row_id","resulting_test_set_id","resulting_test_set_revision","resulting_test_set_content_hash","resulting_definition_schema_version","resulting_definition_id","resulting_definition_content_hash","model_row_id","model_version","support_seal_hash","execution_id","item_ordinal","plan_hash","run_id","attempt_ordinal","result_id","suite_project_id","suite_id","suite_revision","suite_content_hash","suite_item_ordinal","recorded_at"],"test_set_revisions":["id","test_set_id","revision","project_id","generation_id","schema_version","source_observation_id","model_row_id","model_version","observation_run_id","support_seal_hash","characterization_policy_id","characterization_policy_version","generated_at","outcome","definition_count","payload_json","content_hash","revision_origin_kind","repair_origin_id"],"app_models":["id","app_name","version","base_url","app_type","intake_mode","crawl_config_hash","page_count","flow_count","role_count","model_json","crawled_at","crawled_by","status","evidence_state","operation_id","candidate_hash","recovery_source_row_id","recovery_source_fingerprint"]}

COLUMNS.repair_proposals.push('identity_authority_hash')
COLUMNS.repair_proposal_identity_authorities=['proposal_id','origin_kind','proposal_hash_at_creation','identity_authority_hash','identity_algorithm_version','expected_candidate_set_hash','canonical_payload']

/** SQL fragments are generated only from internal table/column constants.
 * The request is a bound SQL value in repository reads or NEW.request_json. */
export function repairEffectivenessRowsSql(payload:string):string {
  const f=(key:string)=>`json_extract(${payload},'$.${key}')`
  const binding=`(SELECT selection_json FROM execution_repair_bindings WHERE execution_id=${f('afterExecutionId')})`
  const before=`json_extract(${binding},'$.originalEvidence.executionId')`
  const pair=`(${before},${f('afterExecutionId')})`
  const origin=`(SELECT repair_origin_id FROM execution_repair_bindings WHERE execution_id=${f('afterExecutionId')})`
  const originPayload=`(SELECT canonical_payload FROM repair_revision_origins WHERE repair_origin_id=${origin})`
  const link=`(SELECT repair_rerun_link_id FROM test_results WHERE result_id=${f('expectedAfterResultId')})`
  const linkPayload=`(SELECT canonical_payload FROM repair_rerun_links WHERE rerun_link_id=${link})`
  const where:Record<string,string>={
    executions:`execution_id IN ${pair}`,execution_items:`execution_id IN ${pair}`,execution_item_authorities:`execution_id IN ${pair}`,
    execution_events:`execution_id IN ${pair}`,execution_locks:`execution_id IN ${pair}`,runs:`execution_id IN ${pair}`,
    test_results:`run_id IN (SELECT run_id FROM runs WHERE execution_id IN ${pair})`,diagnostic_evidence:`execution_id IN ${pair}`,
    execution_repair_bindings:`execution_id=${f('afterExecutionId')}`,repair_revision_origins:`repair_origin_id=${origin}`,
    repair_proposals:`proposal_id=json_extract(${originPayload},'$.proposalAuthority.proposalId')`,
    repair_proposal_identity_authorities:`proposal_id=json_extract(${originPayload},'$.proposalAuthority.proposalId')`,
    repair_decisions:`decision_id=json_extract(${originPayload},'$.decisionAuthority.decisionId')`,
    app_model_transition_supersessions:`authority_id=json_extract(${originPayload},'$.supersessionAuthorityId')`,
    repair_rerun_links:`execution_id=${f('afterExecutionId')}`,
    test_set_revisions:`id IN (SELECT test_set_row_id FROM execution_item_authorities WHERE execution_id IN ${pair})`,
    app_models:`id IN (SELECT model_row_id FROM test_set_revisions WHERE id IN (SELECT test_set_row_id FROM execution_item_authorities WHERE execution_id IN ${pair}))`,
  }
  return `json_object(${Object.entries(where).map(([table,filter])=>`'${table}',(SELECT json_group_array(json_object(${COLUMNS[table].map(c=>`'${c}',${c}`).join(',')})) FROM (SELECT ${COLUMNS[table].join(',')} FROM ${table} WHERE ${filter} ORDER BY ${COLUMNS[table][0]}))`).join(',')},'sourceRows',${sourceProductRowsSql(originPayload)},'rerunRows',${rerunProductRowsSql(linkPayload)})`
}
function executionSnapshot(rows:Snapshot,executionId:string):PersistedExecutionEvidence {
  const runs=rows.runs.filter(r=>r.execution_id===executionId)
  return {execution:one(rows.executions.filter(r=>r.execution_id===executionId)),
    items:rows.execution_items.filter(r=>r.execution_id===executionId).sort((a,b)=>a.item_ordinal-b.item_ordinal),
    events:rows.execution_events.filter(r=>r.execution_id===executionId),lock:zeroOrOne(rows.execution_locks.filter(r=>r.execution_id===executionId)),
    runs,results:rows.test_results.filter(r=>runs.some(run=>run.run_id===r.run_id))} as PersistedExecutionEvidence
}
function checkedAuthority(rows:Snapshot,table:'repair_revision_origins'|'repair_proposals'|'repair_decisions'|'app_model_transition_supersessions'|'repair_rerun_links'):Row {
  const row=one(rows[table])
  if(isExactRepairAuthorityRow(table,row.canonical_payload,JSON.stringify(projectRepairAuthorityColumns(table,row)))!==1)comparisonFail()
  return parseRepairAuthority(table,row.canonical_payload)
}
function checkedPlan(rows:Snapshot,execution:Row,item:Row,authority:Row) {
  const row=one(rows.test_set_revisions.filter(r=>r.id===authority.test_set_row_id))
  const parsed=checkedRepairTestSetRow(row),model=one(rows.app_models.filter(r=>r.id===row.model_row_id))
  const projection=projectPersistedCanonicalFlowPlan(parsed.value,parsed.fingerprint,JSON.parse(model.model_json))
  if(projection.kind!=='ok'||projection.plan.fingerprint!==item.executable_plan_hash||parsed.value.projectId!==execution.project_id
    ||authority.test_set_id!==row.test_set_id||authority.test_set_revision!==row.revision||authority.test_set_content_hash!==parsed.fingerprint
    ||authority.definition_schema_version!==3||authority.definition_id!==item.definition_id)comparisonFail()
  const plan=projection.plan.value
  if(plan.schemaVersion!==2||plan.steps.length!==2||plan.steps[1].kind!=='click_observed_data_test')comparisonFail()
  return {row,set:parsed.value,plan,definition:one(parsed.value.definitions.filter(d=>d.id===item.definition_id))}
}
function checkedDiagnostic(rows:Snapshot,snapshot:PersistedExecutionEvidence,itemOrdinal:number,result:Row|null,plan:any):{row:Row;evidence:DiagnosticEvidenceV1} {
  const run=one(snapshot.runs as unknown as Row[]),root=snapshot.execution
  const row=one(rows.diagnostic_evidence.filter(r=>r.execution_id===root.execution_id&&r.run_id===run.run_id&&r.item_ordinal===itemOrdinal&&r.evidence_schema_version===DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION))
  const evidence=parseDiagnosticEvidenceV1(JSON.parse(row.evidence_json)),a=evidence.authority,accepted=a.acceptedDefinitionAuthority
  if(row.project_id!==root.project_id||row.result_id!==(result?.result_id??null)||a.projectId!==root.project_id||a.executionId!==root.execution_id
    ||a.runId!==run.run_id||a.itemOrdinal!==itemOrdinal||a.resultId!==row.result_id||a.definitionId!==plan.definition.id
    ||row.definition_id!==a.definitionId||a.executablePlanHash!==snapshot.items.find(i=>i.item_ordinal===itemOrdinal)?.executable_plan_hash
    ||row.executable_plan_hash!==a.executablePlanHash||row.evidence_hash!==createHash('sha256').update(canonicalDiagnosticJson(evidence)).digest('hex')
    ||row.evidence_json!==canonicalDiagnosticJson(evidence)||!same(accepted,JSON.parse(row.accepted_definition_authority_json))
    ||!same(a.suiteAuthority,row.suite_authority_json===null?null:JSON.parse(row.suite_authority_json))
    ||accepted.testSetId!==plan.row.test_set_id||accepted.testSetRevision!==plan.row.revision||accepted.testSetContentHash!==plan.row.content_hash
    ||accepted.definitionId!==plan.definition.id||accepted.definitionContentHash!==historicalDefinitionContentHash(plan.definition)
    ||accepted.supportSealHash!==plan.row.support_seal_hash)comparisonFail()
  const classification=classifyDiagnosticEvidence(evidence,row.evidence_hash,DIAGNOSTIC_CLASSIFIER_VERSION)
  if(classification.kind==='refusal'&&classification.refusalCode==='integrity_invalid')comparisonFail()
  const click=plan.plan.steps[1],nav=plan.plan.steps[0]
  if(evidence.targetObservation.outcome!=='not_performed'&&!same(evidence.targetObservation.targetAuthority,
    {subjectId:click.subjectId,elementId:click.elementId,selectorKind:'data_test',selectorValue:click.dataTestValue}))comparisonFail()
  if(evidence.navigation.outcome!=='not_performed'&&(evidence.navigation.intendedRoute!==nav.routePath
    ||evidence.navigation.outcome==='completed'&&evidence.navigation.observedRoute!==nav.routePath))comparisonFail()
  if(evidence.oracle.outcome!=='not_performed'&&(evidence.oracle.expected!==plan.plan.oracle.routePath
    ||evidence.oracle.oracleAuthority.subjectId!==plan.plan.oracle.subjectId))comparisonFail()
  if(result) {
    // Ask the existing Result truth owner for the outcome, using only a validated
    // persisted reason discriminant. Diagnostic stages must agree independently.
    const reason=result.error_msg
    const statuses:Record<string,string>={completed:'completed',oracle_failed:'oracle_failed',action_failed:'action_failed',navigation_failed:'navigation_failed',
      credential_missing:'authentication_failed',authentication_failed:'authentication_failed',executor_failure:'executor_failure',
      unsupported_action:'unsupported_plan',unsupported_oracle:'unsupported_plan',unsupported_auth_mechanism:'unsupported_plan',invalid_plan:'unsupported_plan'}
    if(!statuses[reason])comparisonFail()
    const truth=productResultTruth({status:statuses[reason],reasonCode:reason} as any)
    if(truth.outcome!==result.status||result.retry_count!==0||result.flaky_history!==0)comparisonFail()
    const expectedMode:Record<string,string>={action_failed:'target_not_observed|action_not_completed',navigation_failed:'navigation_not_completed',
      credential_missing:'authentication_not_established',authentication_failed:'authentication_not_established',oracle_failed:'oracle_mismatch',
      executor_failure:'executor_failure',unsupported_action:'executor_failure',unsupported_oracle:'executor_failure',unsupported_auth_mechanism:'executor_failure',invalid_plan:'executor_failure'}
    if(reason==='completed') {
      if(evidence.oracle.outcome!=='matched'||evidence.action.outcome!=='completed')comparisonFail()
    } else if(classification.kind!=='classified_failure'||!expectedMode[reason].split('|').includes(classification.failureMode))comparisonFail()
  } else if(evidence.executor.outcome==='completed')comparisonFail()
  return {row,evidence}
}

/** Deterministic authority reconstruction shared by SQL admission and repository
 * reads. The SQL snapshot contains actual rows, never nested caller witnesses. */
export function deriveRepairEffectiveness(requestValue:unknown,rows:Snapshot):RepairComparisonResult {
  const request=freezeRepairComparison(requestValue),binding=one(rows.execution_repair_bindings),selection=JSON.parse(binding.selection_json)
  if(binding.execution_id!==request.afterExecutionId||binding.project_id!==request.projectId||binding.original_result_id!==request.beforeResultId)comparisonFail('comparison_identity_conflict')
  const origin=checkedAuthority(rows,'repair_revision_origins'),proposal=checkedAuthority(rows,'repair_proposals'),supersession=checkedAuthority(rows,'app_model_transition_supersessions')
  const decision=checkedAuthority(rows,'repair_decisions')
  const witness=one(rows.repair_proposal_identity_authorities)
  if(isExactProposalIdentityRow(witness.canonical_payload,JSON.stringify(projectProposalIdentityColumns(witness)))!==1)comparisonFail()
  assertProposalIdentityPair(witness.canonical_payload,proposal,one(rows.repair_proposals).identity_authority_hash)
  for(const endpoint of [proposal.source,proposal.candidate]) {
    const model=one(rows.app_models.filter(r=>r.id===endpoint.modelRowId))
    const snapshot=JSON.parse(model.model_json)
    if(canonicalJsonSha256(snapshot)!==endpoint.modelContentHash||snapshot.app.modelVersion!==endpoint.modelVersion)comparisonFail()
  }
  if(decision.decision!=='approve'||decision.decisionHash!==supersession.decisionAuthority.decisionHash
    ||decision.decisionId!==supersession.decisionAuthority.decisionId)comparisonFail()
  assertSourceProductAuthority(origin,rows.sourceRows)
  const before=executionSnapshot(rows,binding.original_execution_id),after=executionSnapshot(rows,request.afterExecutionId)
  const beforeAggregation=aggregatePersistedEvidence(before),afterAggregation=aggregatePersistedEvidence(after)
  if(beforeAggregation.integrityWarnings.some(w=>w.code!=='missing_expected_result')||afterAggregation.integrityWarnings.some(w=>w.code!=='missing_expected_result')
    ||!beforeAggregation.execution.terminal)comparisonFail()
  const beforeResult=one((before.results as unknown as Row[]).filter(r=>r.result_id===request.beforeResultId))
  if(!['failed','could_not_verify'].includes(beforeResult.status)||beforeResult.run_id!==binding.original_run_id
    ||beforeResult.execution_item_ordinal!==binding.original_item_ordinal||beforeResult.executable_plan_hash!==binding.original_plan_hash)comparisonFail()
  const beforeItem=one((before.items as unknown as Row[]).filter(i=>i.item_ordinal===binding.original_item_ordinal))
  const beforeAuthority=one(rows.execution_item_authorities.filter(r=>r.execution_id===binding.original_execution_id&&r.item_ordinal===binding.original_item_ordinal))
  const afterItem=one(after.items as unknown as Row[]),afterAuthority=one(rows.execution_item_authorities.filter(r=>r.execution_id===request.afterExecutionId))
  const beforePlan=checkedPlan(rows,before.execution,beforeItem,beforeAuthority),afterPlan=checkedPlan(rows,after.execution,afterItem,afterAuthority)
  const model=one(rows.app_models.filter(r=>r.id===afterPlan.row.model_row_id))
  if(isExactRepairExecutionBinding(JSON.stringify(binding),canonicalJson(origin),canonicalJson(proposal),canonicalJson(supersession),afterPlan.row.payload_json,model.model_json)!==1
    ||after.execution.repair_binding_id!==after.execution.execution_id||after.execution.execution_intent_fingerprint!==binding.request_fingerprint
    ||after.execution.max_run_attempts!==1||after.execution.suite_id!==null||afterItem.item_ordinal!==1
    ||before.execution.project_id!==request.projectId||after.execution.project_id!==request.projectId
    ||!same(repairSemanticProjection(beforePlan.set),repairSemanticProjection(afterPlan.set)))comparisonFail()
  const beforeDiagnostic=checkedDiagnostic(rows,before,binding.original_item_ordinal,beforeResult,beforePlan)
  if(beforeDiagnostic.row.evidence_hash!==binding.original_diagnostic_hash)comparisonFail()
  assertRepairSourceTargeted(beforeDiagnostic.evidence,beforeDiagnostic.row.evidence_hash)
  const afterResult=zeroOrOne(after.results as unknown as Row[])
  if((afterResult?.result_id??null)!==request.expectedAfterResultId)comparisonFail('comparison_identity_conflict')
  if(!afterAggregation.execution.terminal)return {kind:'pending',state:'INCONCLUSIVE',reason:'execution_not_terminal',comparisonId:repairComparisonId(request)}
  let afterDiagnostic:null|ReturnType<typeof checkedDiagnostic>=null,link:Row|null=null
  const afterDiagnosticRows=rows.diagnostic_evidence.filter(r=>r.execution_id===request.afterExecutionId)
  if(afterResult||afterDiagnosticRows.length)afterDiagnostic=checkedDiagnostic(rows,after,1,afterResult,afterPlan)
  if(afterResult) {
    link=checkedAuthority(rows,'repair_rerun_links')
    assertRerunProductAuthority(link,rows.rerunRows)
    if(!afterDiagnostic||afterResult.repair_rerun_link_id!==link.rerunLinkId||link.executionAuthority.resultId!==afterResult.result_id
      ||link.executionAuthority.executionId!==request.afterExecutionId||link.repairOriginId!==origin.repairOriginId)comparisonFail()
  } else if(rows.repair_rerun_links.length)comparisonFail()
  const classification=classifyRepairEffectiveness(beforeDiagnostic.evidence,afterResult?afterDiagnostic!.evidence:null)
  const evidenceBase={schemaVersion:REPAIR_EFFECTIVENESS_SCHEMA,comparisonId:repairComparisonId(request),request,...classification,
    provenance:{before:{result:beforeResult,diagnostic:beforeDiagnostic.row,terminal:before.events.find(e=>e.event_type==='terminal')},
      after:{result:afterResult,diagnostic:afterDiagnostic?.row??null,terminal:after.events.find(e=>e.event_type==='terminal'),runId:after.runs[0]?.run_id??null},
      acceptance:binding,rerunLink:link,repairOrigin:origin,supersession,proposal,proposalIdentity:witness,decision}}
  return {kind:'compared',evidence:{...evidenceBase,evidenceHash:canonicalJsonSha256(evidenceBase)},replayed:false}
}

export async function inspectRepairComparison(db:Kysely<Database>,workspaceRoot:string,requestValue:unknown):Promise<RepairComparisonResult> {
  const request=freezeRepairComparison(requestValue)
  const binding=await readRepairExecutionBinding(db,request.afterExecutionId)
  if(!binding||binding.row.project_id!==request.projectId)comparisonFail('comparison_evidence_unavailable')
  const root=await db.selectFrom('executions').select('accepted_at').where('execution_id','=',request.afterExecutionId).executeTakeFirstOrThrow()
  await inspectRepairExecution(db,workspaceRoot,binding.selection,request.projectId,root.accepted_at)
  // Bind a single request once through a CTE; SQL fragments never interpolate IDs.
  const rows=(await sql<{payload:string}>`WITH input AS (SELECT ${canonicalJson(request)} AS payload) SELECT ${sql.raw(repairEffectivenessRowsSql('(SELECT payload FROM input)'))} AS payload`.execute(db)).rows
  const facts=JSON.parse(rows[0].payload) as Snapshot
  const result=deriveRepairEffectiveness(request,facts)
  for(const row of facts.diagnostic_evidence) {
    const relevant=row.execution_id===binding.row.original_execution_id&&row.run_id===binding.row.original_run_id&&row.item_ordinal===binding.row.original_item_ordinal
      ||row.execution_id===request.afterExecutionId
    if(!relevant)continue
    const authority=await new HistoricalDefinitionAuthorityResolver(()=>db).resolve({projectId:row.project_id,executionId:row.execution_id,runId:row.run_id,
      itemOrdinal:row.item_ordinal,resultId:row.result_id,definitionId:row.definition_id,executablePlanHash:row.executable_plan_hash},db as Transaction<Database>)
    if(!same(authority,JSON.parse(row.evidence_json).authority))comparisonFail()
  }
  return result
}
export function isExactRepairEffectiveness(requestJson:unknown,payloadJson:unknown,evidenceHash:unknown,rowsJson:unknown):number {
  try {
    if([requestJson,payloadJson,evidenceHash,rowsJson].some(v=>typeof v!=='string'))return 0
    const result=deriveRepairEffectiveness(JSON.parse(requestJson as string),JSON.parse(rowsJson as string))
    return result.kind==='compared'&&canonicalJson(result.evidence)===payloadJson&&result.evidence.evidenceHash===evidenceHash?1:0
  } catch {return 0}
}
export async function readRepairComparisonEvidence(db:Kysely<Database>,projectId:string,afterExecutionId:string):Promise<RepairEffectivenessEvidence|null> {
  const row=await db.selectFrom('repair_effectiveness_evidence').selectAll().where('project_id','=',projectId).where('after_execution_id','=',afterExecutionId).executeTakeFirst()
  if(!row)return null
  const rows=(await sql<{payload:string}>`WITH input AS (SELECT ${row.request_json} AS payload) SELECT ${sql.raw(repairEffectivenessRowsSql('(SELECT payload FROM input)'))} AS payload`.execute(db)).rows
  if(isExactRepairEffectiveness(row.request_json,row.canonical_payload,row.evidence_hash,rows[0].payload)!==1)comparisonFail()
  const evidence=JSON.parse(row.canonical_payload) as RepairEffectivenessEvidence
  if(row.comparison_id!==evidence.comparisonId||row.before_result_id!==evidence.request.beforeResultId||row.after_result_id!==evidence.request.expectedAfterResultId
    ||row.project_id!==evidence.request.projectId||row.after_execution_id!==evidence.request.afterExecutionId||row.policy_version!==evidence.request.policyVersion)comparisonFail()
  return evidence
}
