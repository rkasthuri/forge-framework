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


import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { sql } from 'kysely'
import { closeDb, getDb, getProductDb, getDatabaseProvenance } from '../../src/core/storage/db'
import { openProjectDatabase } from '../../src/core/storage/DatabaseFactory'
import { createWorkspace } from '../../src/core/workspace/WorkspaceManager'
import { ObservationService } from '../../src/core/observation/ObservationService'
import { CRAWL_OBSERVATION_METHOD_VERSIONS } from '../../src/core/observation/ObservationTypes'
import { AppModelRepository } from '../../src/core/storage/repositories/AppModelRepository'
import { TestDefinitionAuthorityProjectionService } from '../../src/core/test-design/TestDefinitionAuthorityProjectionService'
import { CanonicalRouteEvidenceProjection } from '../../src/core/test-design/CanonicalRouteEvidenceProjection'
import { AuthenticationExpectationProjectionService } from '../../src/core/test-design/AuthenticationExpectationProjection'
import { generateCanonicalFlowTestSetV3, materializeCanonicalTestSet } from '../../src/core/test-design/TestDefinitionContract'
import { normalizeDiscoveredIntentV1 } from '../../src/core/test-design/NormalizedTestIntentContract'
import { historicalDefinitionContentHash } from '../../src/core/execution/HistoricalDefinitionAuthorityResolver'
import { canonicalJsonSha256, canonicalJson } from '../../src/core/storage/JsonAppModelMigrationPlanner'
import { GovernedRepairProposalService } from '../../src/core/healing/GovernedRepairProposalService'
import { validateAppModelObject } from '../../src/core/onboarding/ModelValidator'
import { enumeratePhysicalEndpointSlots, physicalCandidateIdentity } from '../../src/core/healing/GovernedRepairEligibility'
import type { RepairProposalRequest } from '../../src/core/healing/GovernedRepairEligibility'
import { captureProposalIdentityAuthority, proposalIdentityAuthorityRow, proposalIdentityAuthorityHash } from '../../src/core/storage/RepairProposalIdentityAuthority'
import { repairAuthorityHash, repairAuthorityRow } from '../../src/core/storage/RepairAuthorityValidation'

import { runMigrations } from '../../src/core/storage/migrate'
import { ExecutionService, type GovernedExecutionStartRequest } from '../../src/core/execution/ExecutionService'
import type { PlaywrightPlanExecutionResult } from '../../src/core/execution/PlaywrightPlanExecutor'
import { GovernedRepairDecisionService } from '../../src/core/healing/GovernedRepairDecisionService'
import { GovernedRepairMaterializationService } from '../../src/core/healing/GovernedRepairMaterializationService'
import { repairDefinitionAuthority, type RepairMaterializationInput } from '../../src/core/storage/RepairMaterializationAuthority'
import { DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION } from '../../src/core/execution/DiagnosticEvidenceContract'
import type { RepairRerunSelection } from '../../src/core/storage/RepairExecutionAuthority'
import { SuiteRepository } from '../../src/core/storage/repositories/SuiteRepository'

const START='2026-09-01T12:00:00.000Z',END='2026-09-01T12:00:01.000Z'
const load=(name:string):any=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../fixtures/m5-contract/positive',name+'.json'),'utf8'))
const insert=(table:string,row:any)=>(getDb() as any).insertInto(table).values(row).execute()
export const allRepairRows=(table:string)=>(getDb() as any).selectFrom(table).selectAll().execute()
export const repairReady=()=>({available:true,safeCode:'ready' as const,safeMessage:'Fixture adapter available.'})
export function repairClock(start='2026-09-01T12:02:00.000Z') {let clock=Date.parse(start);return()=>new Date(clock++).toISOString()}
export function completedRepairOutcome(baseUrl='http://localhost'):PlaywrightPlanExecutionResult {return {status:'completed',reasonCode:'completed',navigationUrl:baseUrl+'/cart.html',finalUrl:baseUrl+'/checkout.html',targetCardinality:'one'}}
/** Initial canonical failure/candidate only. Product operator tests begin after this returns. */
export async function createRepairProductSourceFixture(root:string,options:{baseUrl?:string;sourceExecutor?:{execute:(...args:any[])=>Promise<PlaywrightPlanExecutionResult>};sourceSuite?:boolean;realSource?:boolean;duplicateSource?:boolean;ambiguousCandidate?:boolean}={}) {
  await openProjectDatabase(createWorkspace(root))
  const project=load('proposal').projectId
  fs.writeFileSync(path.join(root,'.forge','config.json'),JSON.stringify({schemaVersion:1,appName:project,authType:'none'}))
  const observation=new ObservationService(project,root,{producerInstanceId:'44444444-4444-4444-8444-444444444444'})
  async function admitModel(name:string,index:number) {
    const model=load(name);if(options.baseUrl)model.app.baseUrl=options.baseUrl
    if(index===1&&options.ambiguousCandidate) {
      const element=model.pages.flatMap((page:any)=>page.elements).find((element:any)=>element.strategies.some((strategy:any)=>strategy.type==='data-test'))
      const strategy=element.strategies.find((strategy:any)=>strategy.type==='data-test')
      element.strategies.push({...strategy,value:strategy.value+'-alternative'})
    }
    const run=await observation.startRun({operationId:'chunk2-observation-'+index,producer:'forge.crawler',producerVersion:'1',
      acquisitionKind:'web_crawl',startedAt:START,policyId:'forge.chunk2-fixture',policyVersion:'1',acquisitionPlan:{target:model.app.baseUrl}})
    const ids:string[]=[]
    for(const page of model.pages) {
      const record=await observation.recordObservation({observationRunId:run.value.observationRunId,projectId:project,
        producer:'forge.crawler',producerVersion:'1',method:'browser_dom_inspection',methodVersion:CRAWL_OBSERVATION_METHOD_VERSIONS.browser_dom_inspection,
        subjectId:page.id,predicate:'page.discovered',outcome:'present',observedValue:{urlPattern:page.urlPattern,elementCount:page.elements.length,fingerprint:page.fingerprint},
        boundary:{schemaVersion:'forge-observation-boundary/v1',kind:'document',scope:{acquisitionKind:'web_crawl'},startedAt:START,endedAt:END,
          completion:'complete',policyId:'forge.chunk2-fixture',policyVersion:'1'},capturedAt:END,idempotencyKey:'page-'+page.id+'-'+index})
      ids.push(record.value.observationId)
    }
    await observation.terminalizeRun({observationRunId:run.value.observationRunId,lifecycle:'completed',completeness:'complete',terminalAt:END,
      safeReasonCode:'completed',safeMessage:'Complete fixture acquisition.'})
    delete model.app.modelVersion
    const committed=await new AppModelRepository().commitCandidate(model,'chunk2-model-'+index,{
      projectId:project,observationRunId:run.value.observationRunId,
      observations:ids.map(id=>({observationId:id,claimKey:'page.exists',supportRole:'basis'})),
      subjects:model.pages.map((page:any,i:number)=>({canonicalSubjectId:page.id,observationId:ids[i],claimKey:'subject.exists',supportRole:'basis'})),
      gaps:[],characterizationPolicyId:'forge.crawl-observation-characterization',characterizationPolicyVersion:'1',linkedAt:END})
    const rowId=committed.committed.rowId,snapshot=committed.committed.snapshot
    const support=await new TestDefinitionAuthorityProjectionService().readExact(project,rowId)
    assert.equal(support.kind,'ok');if(support.kind!=='ok')throw Error(JSON.stringify(support))
    const endpoint={...load('proposal')[index?'candidate':'source'],modelRowId:rowId,modelVersion:snapshot.app.modelVersion,
      modelContentHash:canonicalJsonSha256(snapshot),observationRunId:support.authority.observationRunId,
      supportSealHash:support.authority.supportSealHash,characterizationPolicy:support.authority.characterizationPolicy,
      supportingObservationIds:support.authority.supportingObservationIds}
    endpoint.flowContentHash=canonicalJsonSha256(snapshot.flows!.find(flow=>flow.id===endpoint.flowId))
    endpoint.sourceSubjectContentHash=canonicalJsonSha256(snapshot.pages.find(page=>page.id===endpoint.sourceSubjectId))
    endpoint.targetSubjectContentHash=canonicalJsonSha256(snapshot.pages.find(page=>page.id===endpoint.targetSubjectId))
    endpoint.elementContentHash=canonicalJsonSha256(snapshot.pages.find(page=>page.id===endpoint.sourceSubjectId)!.elements.find(element=>element.id===endpoint.elementId))

    return endpoint
  }
  const sourceEndpoint=await admitModel('source-model',0)
  const source=await new AppModelRepository().getCommittedById(sourceEndpoint.modelRowId)
  const support=await new TestDefinitionAuthorityProjectionService().readExact(project,source.rowId)
  assert.equal(support.kind,'ok');if(support.kind!=='ok')throw Error('support')
  const routes=await new CanonicalRouteEvidenceProjection().readExact(project,support.authority)
  assert.equal(routes.kind,'ok');if(routes.kind!=='ok')throw Error(JSON.stringify(routes))
  const auth=new AuthenticationExpectationProjectionService().read(project,root)
  const normalized=normalizeDiscoveredIntentV1({projectId:project,model:source.snapshot,authority:support.authority,routeEvidence:routes.evidence,
    authenticationExpectation:auth,selection:{flowId:sourceEndpoint.flowId,selectedFlowStepIndexes:[sourceEndpoint.stepIndex]}})
  assert.equal(normalized.kind,'supported');if(normalized.kind!=='supported')throw Error(JSON.stringify(normalized))
  // Product materialization is test setup for the pre-existing source only.
  const m=generateCanonicalFlowTestSetV3({projectId:project,generatedAt:END,authority:support.authority,routeEvidence:routes.evidence,
    authenticationExpectation:auth,normalizedIntent:normalized.materialized},'chunk2-source-generation',1)
  const set=m.value,s=set.canonicalSupport,d=set.definitions[0]
  await insert('test_set_revisions',{id:701,test_set_id:set.testSetId,revision:1,project_id:project,generation_id:set.generationId,schema_version:3,
    source_observation_id:null,model_row_id:s.modelRowId,model_version:s.modelVersion,observation_run_id:s.observationRunId,support_seal_hash:s.supportSealHash,
    characterization_policy_id:s.characterizationPolicy.id,characterization_policy_version:s.characterizationPolicy.version,
    generated_at:set.generatedAt,outcome:set.outcome,definition_count:set.definitions.length,payload_json:m.json,content_hash:m.fingerprint})

  for(const event of ['started','terminal'] as const)await insert('test_generation_events',{
    generation_id:set.generationId,project_id:project,event_type:event,outcome:event==='terminal'?set.outcome:null,
    occurred_at:END,process_instance_id:'chunk5-original-generation',test_set_row_id:event==='terminal'?701:null,
    safe_code:null,safe_message:'Canonical original generation fixture.'})
  const baseUrl=options.baseUrl??'http://localhost'
  const sourceExecution=new ExecutionService({now:repairClock('2026-09-01T12:00:02.000Z'),processInstanceId:'chunk5-source-process',
    ...(!options.realSource?{runnerReadiness:repairReady,executor:options.sourceExecutor??{execute:async()=>({status:'action_failed' as const,reasonCode:'action_failed' as const,navigationUrl:baseUrl+'/cart.html',targetCardinality:'zero' as const})}}:{})})
  let selection:any={definitionIds:[d.id],revision:1}
  if(options.sourceSuite) {
    const suite=await new SuiteRepository().write({schemaVersion:2,suiteId:'chunk5-original-suite',projectId:project,expectedRevision:null,
      name:'Original source suite',changeIntentKey:'chunk5-original-suite',changeIntentFingerprint:'a'.repeat(64),createdAt:END,
      members:[{testSetRowId:701,testSetId:set.testSetId,testSetRevision:1,testSetContentHash:m.fingerprint,definitionSchemaVersion:3,definitionId:d.id}]})
    selection={selection:{kind:'suite_revision',suiteId:suite.suiteId,suiteRevision:suite.revision}}
  }
  await runMigrations()
  const original=await sourceExecution.start({projectId:project,executionIntentKey:'chunk5-original-execution',workspaceRoot:root,
    credentialReference:{usernameEnv:'FORGE_FIXTURE_UNUSED_USER',passwordEnv:'FORGE_FIXTURE_UNUSED_PASSWORD'},runtime:{baseUrl,navigationTimeoutMs:1000},...selection})
  assert.equal(original.kind,'accepted',JSON.stringify(original));if(original.kind!=='accepted')throw Error('source acceptance')
  await original.completion
  const sourceResult=(await allRepairRows('test_results'))[0]
  assert.ok(sourceResult,'Original canonical Result must be persisted')
  const sourceDiagnostic=(await allRepairRows('diagnostic_evidence'))[0]
  assert.ok(sourceDiagnostic,'Original diagnostic must be persisted')
  let secondaryResult:any=null
  if(options.duplicateSource) {
    const second=await sourceExecution.start({projectId:project,executionIntentKey:'chunk5-second-original',workspaceRoot:root,
      credentialReference:{usernameEnv:'FORGE_FIXTURE_UNUSED_USER',passwordEnv:'FORGE_FIXTURE_UNUSED_PASSWORD'},runtime:{baseUrl,navigationTimeoutMs:1000},...selection})
    assert.equal(second.kind,'accepted');if(second.kind!=='accepted')throw Error('second original')
    await second.completion
    secondaryResult=(await allRepairRows('test_results')).find((row:any)=>row.result_id!==sourceResult.result_id)
    assert.ok(secondaryResult)
  }
  const candidateEndpoint=await admitModel('candidate-model',1)
  const request:RepairProposalRequest={projectId:project,source:sourceEndpoint,candidate:candidateEndpoint,proposedAt:'2026-09-01T12:01:00.000Z',
    proposalId:'chunk5-proposal',sourceDefinitionAuthority:repairDefinitionAuthority(set,701)}
  return {root,project,request,original,sourceResult,sourceDiagnostic,secondaryResult}
}

export async function createRepairRerunFixture(root:string,options:{baseUrl?:string;sourceExecutor?:{execute:(...args:any[])=>Promise<PlaywrightPlanExecutionResult>};sourceSuite?:boolean;realSource?:boolean}={}) {
  const baseUrl=options.baseUrl??'http://localhost'
  const {project,request,original,sourceResult,sourceDiagnostic}=await createRepairProductSourceFixture(root,options)
  const proposals=new GovernedRepairProposalService(root),proposal=await proposals.propose(request)
  assert.equal(proposal.kind,'eligible',JSON.stringify(proposal));if(proposal.kind!=='eligible')throw Error('proposal')
  const decision:any={schemaVersion:'forge.m5.transition-correspondence-decision/v1',decisionId:'chunk5-human-decision',decisionHash:'0'.repeat(64),
    projectId:project,proposalAuthority:{proposalId:proposal.proposal.proposalId,proposalHash:proposal.proposal.proposalHash},source:proposal.proposal.source,
    candidate:proposal.proposal.candidate,decision:'approve',decidedBy:{kind:'human',actorId:'fixture-human'},decidedAt:'2026-09-01T12:01:01.000Z'}
  decision.decisionHash=repairAuthorityHash('repair_decisions',decision)
  const decisions=new GovernedRepairDecisionService(root)
  assert.equal((await decisions.accept(request,decision)).kind,'accepted')
  const promoted=await decisions.promote(request,decision,'chunk5-supersession','2026-09-01T12:01:02.000Z')
  assert.equal(promoted.kind,'promoted',JSON.stringify(promoted));if(promoted.kind!=='promoted')throw Error('promotion')
  const materialization:RepairMaterializationInput={request,supersession:promoted.authority,generationId:'chunk5-materialization',repairOriginId:'chunk5-origin',generatedAt:'2026-09-01T12:01:03.000Z'}
  const materialized=await new GovernedRepairMaterializationService(root).materialize(materialization)
  assert.equal(materialized.kind,'materialized',JSON.stringify(materialized));if(materialized.kind!=='materialized')throw Error('materialization')
  const repairSelection:RepairRerunSelection={kind:'repair_rerun',materialization,resultingDefinitionAuthority:materialized.origin.resultingDefinitionAuthority,
    originalEvidence:{executionId:original.executionId,runId:sourceResult.run_id,resultId:sourceResult.result_id,itemOrdinal:1,planHash:sourceResult.executable_plan_hash,
      evidenceSchemaVersion:DIAGNOSTIC_EVIDENCE_SCHEMA_VERSION,evidenceHash:sourceDiagnostic.evidence_hash}}
  const startRequest:GovernedExecutionStartRequest={projectId:project,executionIntentKey:'chunk5-rerun-intent',workspaceRoot:root,
    credentialReference:{usernameEnv:'FORGE_FIXTURE_UNUSED_USER',passwordEnv:'FORGE_FIXTURE_UNUSED_PASSWORD'},runtime:{baseUrl,navigationTimeoutMs:1000},selection:repairSelection}
  return {root,project,request,materialization,materialized,selection:repairSelection,startRequest,original,sourceResult,sourceDiagnostic}
}

export const repairHistoricalTables=['test_set_revisions','app_models','app_model_support_seals','app_model_observation_support','app_model_subject_support','app_model_gap_support',
  'observations','observation_runs','execution_items','execution_item_authorities','executions','execution_events','runs','test_results','diagnostic_evidence',
  'suites','suite_revisions','suite_revision_members','suite_revision_member_authorities','repair_proposals','repair_proposal_identity_authorities',
  'repair_decisions','app_model_transition_supersessions','repair_revision_origins']
export async function captureRepairHistory() {const result:Record<string,string[]>={};for(const table of repairHistoricalTables)result[table]=(await allRepairRows(table)).map((r:any)=>canonicalJson(r));return result}
export async function assertRepairHistoryPreserved(before:Record<string,string[]>) {for(const [table,rows] of Object.entries(before)){const after=(await allRepairRows(table)).map((r:any)=>canonicalJson(r));for(const row of rows)assert.ok(after.includes(row),'Original '+table+' row changed or disappeared')}}
