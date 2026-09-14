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


import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { sql } from 'kysely'
import { closeDb, getDb, getProductDb, getDatabaseProvenance } from '../src/core/storage/db'
import { openProjectDatabase } from '../src/core/storage/DatabaseFactory'
import { createWorkspace } from '../src/core/workspace/WorkspaceManager'
import { ObservationService } from '../src/core/observation/ObservationService'
import { CRAWL_OBSERVATION_METHOD_VERSIONS } from '../src/core/observation/ObservationTypes'
import { AppModelRepository } from '../src/core/storage/repositories/AppModelRepository'
import { TestDefinitionAuthorityProjectionService } from '../src/core/test-design/TestDefinitionAuthorityProjectionService'
import { CanonicalRouteEvidenceProjection } from '../src/core/test-design/CanonicalRouteEvidenceProjection'
import { AuthenticationExpectationProjectionService } from '../src/core/test-design/AuthenticationExpectationProjection'
import { generateCanonicalFlowTestSetV3, materializeCanonicalTestSet } from '../src/core/test-design/TestDefinitionContract'
import { normalizeDiscoveredIntentV1 } from '../src/core/test-design/NormalizedTestIntentContract'
import { historicalDefinitionContentHash } from '../src/core/execution/HistoricalDefinitionAuthorityResolver'
import { canonicalJsonSha256, canonicalJson } from '../src/core/storage/JsonAppModelMigrationPlanner'
import { GovernedRepairProposalService } from '../src/core/healing/GovernedRepairProposalService'
import { validateAppModelObject } from '../src/core/onboarding/ModelValidator'
import { enumeratePhysicalEndpointSlots, physicalCandidateIdentity } from '../src/core/healing/GovernedRepairEligibility'
import type { RepairProposalRequest } from '../src/core/healing/GovernedRepairEligibility'
import { captureProposalIdentityAuthority, proposalIdentityAuthorityRow, proposalIdentityAuthorityHash } from '../src/core/storage/RepairProposalIdentityAuthority'
import { repairAuthorityHash, repairAuthorityRow } from '../src/core/storage/RepairAuthorityValidation'

const START='2026-09-01T12:00:00.000Z', END='2026-09-01T12:00:01.000Z'
const load=(name:string):any=>JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/m5-contract/positive',name+'.json'),'utf8'))
const insert=(table:string,row:any)=>(getDb() as any).insertInto(table).values(row).execute()
const all=(table:string)=>(getDb() as any).selectFrom(table).selectAll().execute()
function expectCode(r:any,code:string):void {assert.equal(r.kind,'refused',JSON.stringify(r));assert.equal(r.code,code)}
type Fixture={root:string;request:RepairProposalRequest;service:GovernedRepairProposalService;set:any}
async function fixture(root:string,candidateEdit?:(model:any)=>void):Promise<Fixture> {
  await openProjectDatabase(createWorkspace(root))
  const project=load('proposal').projectId
  fs.writeFileSync(path.join(root,'.forge','config.json'),JSON.stringify({schemaVersion:1,appName:project,authType:'form-login'}))
  const observation=new ObservationService(project,root,{producerInstanceId:'44444444-4444-4444-8444-444444444444'})
  const endpoints:any[]=[]
  for(const [index,name] of ['source-model','candidate-model'].entries()) {
    const model=load(name);if(index===1)candidateEdit?.(model)
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
    endpoints.push(endpoint)
  }
  const source=await new AppModelRepository().getCommittedById(endpoints[0].modelRowId)
  const support=await new TestDefinitionAuthorityProjectionService().readExact(project,source.rowId)
  assert.equal(support.kind,'ok');if(support.kind!=='ok')throw Error('support')
  const routes=await new CanonicalRouteEvidenceProjection().readExact(project,support.authority)
  assert.equal(routes.kind,'ok');if(routes.kind!=='ok')throw Error(JSON.stringify(routes))
  const auth=new AuthenticationExpectationProjectionService().read(project,root)
  const normalized=normalizeDiscoveredIntentV1({projectId:project,model:source.snapshot,authority:support.authority,routeEvidence:routes.evidence,
    authenticationExpectation:auth,selection:{flowId:endpoints[0].flowId,selectedFlowStepIndexes:[endpoints[0].stepIndex]}})
  assert.equal(normalized.kind,'supported');if(normalized.kind!=='supported')throw Error(JSON.stringify(normalized))
  // Product materialization is test setup for the pre-existing source only.
  const m=generateCanonicalFlowTestSetV3({projectId:project,generatedAt:END,authority:support.authority,routeEvidence:routes.evidence,
    authenticationExpectation:auth,normalizedIntent:normalized.materialized},'chunk2-source-generation',1)
  const set=m.value,s=set.canonicalSupport,d=set.definitions[0]
  await insert('test_set_revisions',{id:701,test_set_id:set.testSetId,revision:1,project_id:project,generation_id:set.generationId,schema_version:3,
    source_observation_id:null,model_row_id:s.modelRowId,model_version:s.modelVersion,observation_run_id:s.observationRunId,support_seal_hash:s.supportSealHash,
    characterization_policy_id:s.characterizationPolicy.id,characterization_policy_version:s.characterizationPolicy.version,
    generated_at:set.generatedAt,outcome:set.outcome,definition_count:set.definitions.length,payload_json:m.json,content_hash:m.fingerprint})
  await insert('executions',{execution_id:'historical-witness',project_id:project,accepted_at:END,test_set_id:set.testSetId,test_set_revision:1,
    definition_schema_version:3,model_row_id:s.modelRowId,model_version:s.modelVersion,source_observation_id:null,support_seal_hash:s.supportSealHash,
    route_evidence_identity_hash:routes.evidence.identityHash,authentication_expectation_identity_hash:auth.identityHash,manifest_hash:'c'.repeat(64),
    max_run_attempts:1,dispatch_mode:'serial',stop_rule:'stop_on_first_non_completed',execution_intent_key:'historical-witness',execution_intent_fingerprint:'f'.repeat(64)})
  await insert('execution_items',{execution_id:'historical-witness',item_ordinal:1,definition_id:d.id,executable_plan_hash:'c'.repeat(64)})
  await insert('execution_item_authorities',{execution_id:'historical-witness',item_ordinal:1,test_set_row_id:701,test_set_id:set.testSetId,
    test_set_revision:1,test_set_content_hash:m.fingerprint,definition_schema_version:3,definition_id:d.id})
  const request:RepairProposalRequest={projectId:project,source:endpoints[0],candidate:endpoints[1],proposedAt:END,
    proposalId:'transition-proposal-chunk2',sourceDefinitionAuthority:{testSetRowId:701,testSetId:set.testSetId,testSetRevision:1,
      testSetContentHash:m.fingerprint,definitionId:d.id,definitionContentHash:historicalDefinitionContentHash(d),
      modelRowId:s.modelRowId,modelVersion:s.modelVersion,supportSealHash:s.supportSealHash}}
  return {root,request,set,service:new GovernedRepairProposalService(root)}
}
async function withFixture(run:(f:Fixture)=>Promise<void>,candidateEdit?:(model:any)=>void):Promise<void> {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-chunk4-'))
  try {const f=await fixture(root,candidateEdit);const baseline=await f.service.evaluate(f.request);assert.equal(baseline.kind,'eligible',JSON.stringify(baseline));await run(f)}
  finally {await closeDb();assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-chunk4-'));fs.rmSync(root,{recursive:true,force:true})}
}
async function corrupt(table:string,mutate:()=>Promise<unknown>):Promise<void> {
  const guards=(await sql<{name:string;sql:string}>`SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name=${table}`.execute(getDb())).rows
  for(const guard of guards)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(getDb())
  // Deliberate single-record corruption bypasses persistence guards only in disposable fixtures.
  await sql.raw('PRAGMA foreign_keys=OFF').execute(getDb())
  try {await mutate()}finally {await sql.raw('PRAGMA foreign_keys=ON').execute(getDb());for(const guard of guards)await sql.raw(guard.sql).execute(getDb())}
}

import { GovernedRepairDecisionService } from '../src/core/healing/GovernedRepairDecisionService'
import { RepairAuthorityRepository, type AppModelTransitionSupersessionAuthorityV1 } from '../src/core/storage/repositories/RepairAuthorityRepository'
const DECIDED='2026-09-01T12:00:02.000Z', PROMOTED='2026-09-01T12:00:03.000Z'
function supersession(d:any,promotedAt=PROMOTED):AppModelTransitionSupersessionAuthorityV1 {
  const a:AppModelTransitionSupersessionAuthorityV1={schemaVersion:'forge.m5.app-model-transition-supersession-authority/v1',
    authorityId:'authority-c3',authorityHash:'0'.repeat(64),projectId:d.projectId,relationKind:'human_approved_semantic_successor',
    source:d.source,candidate:d.candidate,proposalAuthority:d.proposalAuthority,
    decisionAuthority:{decisionId:d.decisionId,decisionHash:d.decisionHash,decision:'approve'},approvedBy:d.decidedBy,promotedAt}
  a.authorityHash=repairAuthorityHash('app_model_transition_supersessions',a)
  return a
}
function rehash(d:any):any {d.decisionHash=repairAuthorityHash('repair_decisions',d);return d}
async function prepare(f:Fixture,kind='approve') {
  const p=await f.service.propose(f.request);assert.equal(p.kind,'eligible');if(p.kind!=='eligible')throw Error(JSON.stringify(p))
  const d=rehash({schemaVersion:'forge.m5.transition-correspondence-decision/v1',decisionId:'decision-c3',decisionHash:'0'.repeat(64),
    projectId:p.proposal.projectId,proposalAuthority:{proposalId:p.proposal.proposalId,proposalHash:p.proposal.proposalHash},
    source:p.proposal.source,candidate:p.proposal.candidate,decision:kind,decidedBy:{kind:'human',actorId:'fixture-human'},decidedAt:DECIDED})
  return {d,service:new GovernedRepairDecisionService(f.root)}
}
import { GovernedRepairMaterializationService } from '../src/core/healing/GovernedRepairMaterializationService'
import { TestSetRepository } from '../src/core/storage/repositories/TestSetRepository'
import { repairSemanticProjection, repairDefinitionAuthority, repairTransformHash, inspectRepairMaterialization, generateRepairTestSet, createRepairOrigin, type RepairMaterializationInput } from '../src/core/storage/RepairMaterializationAuthority'
const GENERATED='2026-09-01T12:00:04.000Z'
async function approved(f:Fixture):Promise<RepairMaterializationInput> {
  const {d,service}=await prepare(f)
  assert.equal((await service.accept(f.request,d)).kind,'accepted')
  const a=await service.promote(f.request,d,'authority-c3',PROMOTED)
  assert.equal(a.kind,'promoted');if(a.kind!=='promoted')throw Error(JSON.stringify(a))
  return {request:f.request,supersession:a.authority,generationId:'chunk4-generation',repairOriginId:'chunk4-origin',generatedAt:GENERATED}
}
const protectedTables=['app_models','app_model_support_seals','observations','executions','execution_items','execution_item_authorities','runs','test_results','diagnostic_evidence','suites','suite_revisions','suite_revision_members','suite_revision_member_authorities','repair_proposals','repair_proposal_identity_authorities','repair_decisions','app_model_transition_supersessions']
async function preserved():Promise<unknown[]> { return Promise.all(protectedTables.map(all)) }
for(const wasm of [false,true])test('M5-C4-01 valid atomic materialization, Product hashes, immutable history, replay/reopen '+(wasm?'WASM':'native'),async()=>{
  const Module=require('node:module'),original=Module._load;let forced=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){forced++;throw Error('Forced WASM fixture')}return original.call(this,name,...args)}
  try {await withFixture(async f=>{
    const input=await approved(f),before=await preserved(),source=(await all('test_set_revisions'))[0]
    const service=new GovernedRepairMaterializationService(f.root),result=await service.materialize(input)
    assert.equal(result.kind,'materialized',JSON.stringify(result));if(result.kind!=='materialized')throw Error('result')
    assert.equal(result.replay,false);assert.equal(result.testSet.revision,2);assert.equal(result.testSet.definitions.length,1)
    assert.deepEqual(repairSemanticProjection(result.testSet),repairSemanticProjection(f.set))
    assert.notEqual(result.testSet.definitions[0].id,f.set.definitions[0].id)
    assert.equal((result.testSet.definitions[0].actions[1] as any).dataTestValue,f.request.candidate.selector.value)
    assert.equal(result.contentHash,materializeCanonicalTestSet(result.testSet).fingerprint)
    assert.deepEqual(result.origin.resultingDefinitionAuthority,repairDefinitionAuthority(result.testSet,result.rowId))
    assert.equal(result.origin.transformHash,repairTransformHash(result.origin))
    assert.equal(result.origin.lineageHash,repairAuthorityHash('repair_revision_origins',result.origin))
    assert.deepEqual(await preserved(),before);assert.deepEqual((await all('test_set_revisions'))[0],source)
    assert.equal((await all('test_generation_events')).length,2);assert.equal((await all('test_generation_locks')).length,0)
    const inventory=await new TestSetRepository().readInventory(f.request.projectId,{limit:1})
    assert.ok('current' in inventory&&inventory.current?.testSet.revision===2)
    assert.deepEqual(await service.materialize(input),{...result,replay:true})
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    assert.deepEqual(await service.readExact(input),{...result,replay:true})
    assert.deepEqual(await preserved(),before);assert.equal((await all('test_set_revisions')).length,2)
    assert.equal((await all('repair_revision_origins')).length,1);assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
    if(wasm)assert.ok(forced>=2)
  })}finally{Module._load=original}
})
for(const name of ['missing','reject','not-committed','malformed','source-revision','candidate-revision','proposal-hash','selector','actor','chronology','unknown-input'])test('M5-C4-02 approval/input refuses '+name,()=>withFixture(async f=>{
  let input:RepairMaterializationInput
  if(name==='reject') {const {d,service}=await prepare(f,'reject');await service.accept(f.request,d);input={request:f.request,supersession:supersession(d),generationId:'g4',repairOriginId:'o4',generatedAt:GENERATED}}
  else input=await approved(f)
  const a=input.supersession as any
  if(name==='missing')await corrupt('app_model_transition_supersessions',()=>getDb().deleteFrom('app_model_transition_supersessions').execute())
  if(name==='malformed')a.authorityHash='f'.repeat(64)
  if(name==='source-revision')a.source.modelRowId++
  if(name==='candidate-revision')a.candidate.modelRowId++
  if(name==='proposal-hash')a.proposalAuthority.proposalHash='f'.repeat(64)
  if(name==='selector')a.candidate.selector.value='wrong'
  if(name==='actor')a.approvedBy.kind='model'
  if(name==='chronology')input.generatedAt=START
  if(name==='unknown-input')(input as any).definition=f.set.definitions[0]
  const before=await all('test_set_revisions')
  const result=name==='not-committed'
    ? await getDb().transaction().execute(trx=>new TestSetRepository(undefined,()=>trx).materializeApprovedRepair(f.root,input))
    : await new TestSetRepository().materializeApprovedRepair(f.root,input)
  assert.equal(result.kind,'refused',JSON.stringify(result));assert.deepEqual(await all('test_set_revisions'),before)
  assert.equal((await all('repair_revision_origins')).length,0);assert.equal((await all('test_generation_events')).length,0)
}))
for(const replay of [false,true])for(const target of ['definition-hash','test-set-hash','source-missing','historical-witness','proposal','witness','decision','supersession','route','auth'])test('M5-C4-03 live authority corruption '+target+' replay='+replay,()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root)
  if(replay)assert.equal((await service.materialize(input)).kind,'materialized')
  if(target==='definition-hash')input.request.sourceDefinitionAuthority.definitionContentHash='f'.repeat(64)
  if(target==='test-set-hash')await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({content_hash:'f'.repeat(64)}).where('id','=',701).execute())
  if(target==='source-missing')await corrupt('test_set_revisions',()=>getDb().deleteFrom('test_set_revisions').where('id','=',701).execute())
  if(target==='historical-witness')await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
  if(target==='proposal')await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
  if(target==='witness')await corrupt('repair_proposal_identity_authorities',()=>getDb().updateTable('repair_proposal_identity_authorities').set({identity_authority_hash:'f'.repeat(64)}).execute())
  if(target==='decision')await corrupt('repair_decisions',()=>getDb().updateTable('repair_decisions').set({actor_id:'tampered'}).execute())
  if(target==='supersession')await corrupt('app_model_transition_supersessions',()=>getDb().updateTable('app_model_transition_supersessions').set({authority_hash:'f'.repeat(64)}).execute())
  if(target==='route')await corrupt('observations',()=>getDb().updateTable('observations').set({observed_value_json:'{}'} as any).execute())
  if(target==='auth')fs.writeFileSync(path.join(f.root,'.forge','config.json'),JSON.stringify({schemaVersion:1,appName:f.request.projectId,authType:'none'}))
  const before=await all('test_set_revisions'),origins=await all('repair_revision_origins')
  const result=await service.materialize(input);assert.equal(result.kind,'refused',JSON.stringify(result))
  assert.deepEqual(await all('test_set_revisions'),before);assert.deepEqual(await all('repair_revision_origins'),origins)
}))
for(const target of ['payload','fingerprint','origin-hash','provenance','generation','origin-id','time','route','oracle','subject','target','action'])test('M5-C4-04 conflicting replay '+target,()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root),result=await service.materialize(input)
  assert.equal(result.kind,'materialized');if(result.kind!=='materialized')throw Error('result')
  if(target==='generation')input.generationId='different-generation'
  else if(target==='origin-id')input.repairOriginId='different-origin'
  else if(target==='time')input.generatedAt='2026-09-01T12:00:05.000Z'
  else if(target==='origin-hash'||target==='provenance')await corrupt('repair_revision_origins',()=>getDb().updateTable('repair_revision_origins').set(target==='origin-hash'?{transform_hash:'f'.repeat(64)}:{supersession_authority_hash:'f'.repeat(64)}).execute())
  else await corrupt('test_set_revisions',async()=>{
    const set:any=structuredClone(result.testSet),d=set.definitions[0]
    if(target==='route')d.flowRouteEvidence[0].normalizedPath='/other'
    if(target==='oracle')d.oracle.subjectId='other'
    if(target==='subject')d.actions[1].subjectId='other'
    if(target==='target')d.actions[1].targetSubjectId='other'
    if(target==='action')d.actions[1].kind='navigate_to_observed_route'
    if(target==='payload')d.title='tampered'
    await getDb().updateTable('test_set_revisions').set(target==='fingerprint'?{content_hash:'f'.repeat(64)}:{payload_json:JSON.stringify(set)}).where('id','=',result.rowId).execute()
  })
  const before=await all('test_set_revisions');assert.equal((await service.materialize(input)).kind,'refused')
  assert.deepEqual(await all('test_set_revisions'),before)
}))
for(const stage of ['origin','event','deferred'])test('M5-C4-05 rollback after partial insert '+stage,()=>withFixture(async f=>{
  const input=await approved(f),before=await preserved()
  if(stage==='origin')await sql.raw("CREATE TRIGGER c4_fault BEFORE INSERT ON repair_revision_origins BEGIN SELECT RAISE(ABORT,'c4 origin fault'); END").execute(getDb())
  if(stage==='event')await sql.raw("CREATE TRIGGER c4_fault BEFORE INSERT ON test_generation_events BEGIN SELECT RAISE(ABORT,'c4 event fault'); END").execute(getDb())
  if(stage==='deferred') {
    await sql.raw('CREATE TABLE c4_parent(id INTEGER PRIMARY KEY)').execute(getDb())
    await sql.raw('CREATE TABLE c4_child(id INTEGER REFERENCES c4_parent(id) DEFERRABLE INITIALLY DEFERRED)').execute(getDb())
    await sql.raw('CREATE TRIGGER c4_fault AFTER INSERT ON repair_revision_origins BEGIN INSERT INTO c4_child VALUES(999); END').execute(getDb())
  }
  await assert.rejects(new GovernedRepairMaterializationService(f.root).materialize(input),/c4|FOREIGN KEY/i)
  assert.equal((await all('test_set_revisions')).length,1);assert.equal((await all('repair_revision_origins')).length,0)
  assert.equal((await all('test_generation_events')).length,0);assert.deepEqual(await preserved(),before)
  await sql.raw('DROP TRIGGER c4_fault').execute(getDb())
  assert.equal((await new GovernedRepairMaterializationService(f.root).materialize(input)).kind,'materialized')
}))
test('M5-C4-06 read-only absence and competing generation lock',()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root)
  assert.equal((await service.readExact(input)).kind,'refused')
  await new TestSetRepository().beginGeneration(f.request.projectId,'other-generation','other-process',END)
  assert.equal((await service.materialize(input)).kind,'refused')
  assert.equal((await all('test_set_revisions')).length,1)
}))
test('M5-C4-07 public insertion bypass fails closed; historical bytes immutable',()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root),r=await service.materialize(input)
  assert.equal(r.kind,'materialized');if(r.kind!=='materialized')throw Error('result')
  await assert.rejects(getDb().transaction().execute(trx=>new RepairAuthorityRepository().persistOriginExact(r.origin,trx)),{code:'REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED'})
  await assert.rejects(getDb().updateTable('test_set_revisions').set({payload_json:'{}'}).where('id','=',701).execute(),/immutable/i)
  await assert.rejects(getDb().deleteFrom('test_set_revisions').where('id','=',r.rowId).execute(),/immutable/i)
  await assert.rejects(getDb().updateTable('repair_revision_origins').set({created_at:START}).execute(),/immutable/i)
}))
for(const value of ['2026-09-01','September 1, 2026','not-a-date'])test('M5-C4-08 invalid timestamp refuses before writes '+value,()=>withFixture(async f=>{
  const input=await approved(f);input.generatedAt=value
  assert.equal((await new GovernedRepairMaterializationService(f.root).materialize(input)).kind,'refused')
  assert.equal((await all('test_set_revisions')).length,1);assert.equal((await all('test_generation_events')).length,0)
}))
test('M5-C4-09 exact inactive candidate and project-wide revision allocation',()=>withFixture(async f=>{
  const input=await approved(f),row=(await all('test_set_revisions'))[0]
  const set=structuredClone(f.set);set.revision=9;set.generationId='intervening-generation'
  const m=materializeCanonicalTestSet(set),{id:_,...physical}=row
  await insert('test_set_revisions',{...physical,revision:9,generation_id:set.generationId,payload_json:m.json,content_hash:m.fingerprint})
  await getDb().updateTable('app_models').set({status:'superseded'}).where('id','=',f.request.candidate.modelRowId).execute()
  const r=await new GovernedRepairMaterializationService(f.root).materialize(input)
  assert.equal(r.kind,'materialized',JSON.stringify(r));if(r.kind==='materialized') {
    assert.equal(r.testSet.revision,10);assert.equal(r.testSet.canonicalSupport.modelRowId,f.request.candidate.modelRowId)
  }
}))
test('M5-C4-10 manual outer transaction cannot be committed or rolled back by materializer',()=>withFixture(async f=>{
  const input=await approved(f)
  await getDb().connection().execute(async db=>{
    await sql.raw('BEGIN IMMEDIATE').execute(db)
    try {
      await sql.raw('CREATE TABLE c4_outer_marker(id INTEGER)').execute(db)
      await assert.rejects(new TestSetRepository(undefined,()=>db).materializeApprovedRepair(f.root,input),/transaction/i)
      assert.equal((await sql`SELECT name FROM sqlite_schema WHERE name='c4_outer_marker'`.execute(db)).rows.length,1)
    } finally {await sql.raw('ROLLBACK').execute(db)}
  })
  assert.equal((await all('test_set_revisions')).length,1)
}))

test('M5-C4-11 first-write legacy origin bypass denied with valid reciprocal output',()=>withFixture(async f=>{
  const input=await approved(f),p=await inspectRepairMaterialization(getDb(),f.root,input),m=generateRepairTestSet(p,input.generationId,2)
  const origin=createRepairOrigin(input,m.value,702),source=(await all('test_set_revisions'))[0],s=m.value.canonicalSupport
  assert.equal((await all('repair_revision_origins')).length,0)
  await assert.rejects(getDb().transaction().execute(async trx=>{
    await trx.insertInto('test_set_revisions').values({...source,id:702,revision:2,generation_id:m.value.generationId,
      model_row_id:s.modelRowId,model_version:s.modelVersion,observation_run_id:s.observationRunId,support_seal_hash:s.supportSealHash,
      characterization_policy_id:s.characterizationPolicy.id,characterization_policy_version:s.characterizationPolicy.version,
      generated_at:m.value.generatedAt,payload_json:m.json,content_hash:m.fingerprint,revision_origin_kind:'repair',repair_origin_id:origin.repairOriginId}).execute()
    return new RepairAuthorityRepository().persistOriginExact(origin,trx)
  }),{code:'REPAIR_MATERIALIZATION_BOUNDARY_REQUIRED'})
  assert.equal((await all('test_set_revisions')).length,1);assert.equal((await all('repair_revision_origins')).length,0)
}))
test('M5-C4-12 independently rehashed wrong origin project refuses replay',()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root),r=await service.materialize(input)
  assert.equal(r.kind,'materialized');if(r.kind!=='materialized')throw Error('result')
  const origin=structuredClone(r.origin);origin.projectId='other-project';origin.lineageHash=repairAuthorityHash('repair_revision_origins',origin)
  await corrupt('repair_revision_origins',()=>getDb().updateTable('repair_revision_origins').set(repairAuthorityRow('repair_revision_origins',origin) as any).execute())
  assert.equal((await service.readExact(input)).kind,'refused');assert.equal((await all('test_set_revisions')).length,2)
}))
test('M5-C4-13 exact unique approved physical candidate among strategies materializes',()=>withFixture(async f=>{
  const input=await approved(f),r=await new GovernedRepairMaterializationService(f.root).materialize(input)
  assert.equal(r.kind,'materialized',JSON.stringify(r));if(r.kind==='materialized')assert.equal((r.testSet.definitions[0].actions[1] as any).dataTestValue,'checkout-new')
},model=>{model.pages[0].elements[0].strategies.unshift({type:'data-test',value:'checkout-old',confidence:1})}))

import { SuiteRepository } from '../src/core/storage/repositories/SuiteRepository'
import { DiagnosticEvidenceRepository } from '../src/core/storage/repositories/DiagnosticEvidenceRepository'
import { routeEvidenceIdentity } from '../src/core/execution/ExecutionProjectionService'
test('M5-C4-14 nonempty failed Result, diagnostic and source Suite remain immutable',()=>withFixture(async f=>{
  const input=await approved(f),d=f.set.definitions[0],root=(await all('executions'))[0]
  const suite=await new SuiteRepository().write({suiteId:'c4-source-suite',projectId:f.request.projectId,expectedRevision:null,
    name:'Preserved source Suite',changeIntentKey:'c4-suite-history',changeIntentFingerprint:'e'.repeat(64),createdAt:END,
    members:[{definitionId:d.id,definitionSchemaVersion:3,testSetId:f.set.testSetId,testSetRevision:1,testSetContentHash:f.request.sourceDefinitionAuthority.testSetContentHash}]})
  await insert('executions',{...root,execution_id:'c4-failed-execution',execution_intent_key:'c4-failed-history',route_evidence_identity_hash:routeEvidenceIdentity(d)})
  await insert('execution_items',{execution_id:'c4-failed-execution',item_ordinal:1,definition_id:d.id,executable_plan_hash:'c'.repeat(64)})
  await insert('execution_item_authorities',{...(await all('execution_item_authorities'))[0],execution_id:'c4-failed-execution'})
  await insert('runs',{run_id:'c4-failed-run',app_name:f.request.projectId,started_at:START,completed_at:END,execution_id:'c4-failed-execution',origin:'product',attempt_ordinal:1})
  await insert('test_results',{run_id:'c4-failed-run',test_id:d.id,title:'Source selector failure',suite:'source-history',status:'failed',
    result_id:'c4-failed-result',execution_item_ordinal:1,definition_id:d.id,executable_plan_hash:'c'.repeat(64)})
  await new DiagnosticEvidenceRepository().append({binding:{projectId:f.request.projectId,executionId:'c4-failed-execution',runId:'c4-failed-run',
    itemOrdinal:1,resultId:'c4-failed-result',definitionId:d.id,executablePlanHash:'c'.repeat(64)},facts:{executor:{outcome:'completed'},
    authentication:{state:'established',attemptOccurred:true},navigation:{outcome:'completed',intendedRoute:'/cart.html',observedRoute:'/cart.html'},
    targetObservation:{outcome:'not_observed',cardinality:'zero',targetAuthority:{subjectId:f.request.source.sourceSubjectId,elementId:f.request.source.elementId,
      selectorKind:'data_test',selectorValue:f.request.source.selector.value}},action:{outcome:'not_performed'},oracle:{outcome:'not_performed'}}})
  const before=await preserved(),source=(await all('test_set_revisions'))[0],members=await all('suite_revision_member_authorities')
  for(const table of ['test_results','diagnostic_evidence','suite_revisions'])assert.equal((await all(table)).length,1)
  const service=new GovernedRepairMaterializationService(f.root)
  assert.equal((await service.materialize(input)).kind,'materialized')
  assert.deepEqual(await preserved(),before);assert.deepEqual((await all('test_set_revisions'))[0],source)
  assert.deepEqual(await all('suite_revision_member_authorities'),members)
  assert.deepEqual(await new SuiteRepository().read(f.request.projectId,suite.suiteId,suite.revision),suite)
  assert.equal((await service.readExact(input)).kind,'materialized');assert.deepEqual(await preserved(),before)
}))
test('M5-C4-15 producer-valid source semantic drift reaches semantic guard',()=>withFixture(async f=>{
  const input=await approved(f),preflight=await inspectRepairMaterialization(getDb(),f.root,input)
  const source:any=structuredClone(preflight.source);source.definitions[0].title='Different approved meaning'
  const changed=materializeCanonicalTestSet(source)
  assert.notEqual(changed.fingerprint,f.request.sourceDefinitionAuthority.testSetContentHash)
  assert.throws(()=>generateRepairTestSet({...preflight,source:changed.value as any},input.generationId,2),{code:'candidate_semantics_unproven'})
}))
for(const field of ['route','oracle','subject','target','action','authentication','order'])test('M5-C4-16 semantic projection retains '+field,()=>{
  const source=load('source-test-set'),changed=structuredClone(source),d=changed.definitions[0]
  if(field==='route')d.flowRouteEvidence[0].normalizedPath='/changed'
  if(field==='oracle')d.oracle.subjectId='changed'
  if(field==='subject')d.actions[1].subjectId='changed'
  if(field==='target')d.actions[1].targetSubjectId='changed'
  if(field==='action')d.actions[1].kind='changed'
  if(field==='authentication')d.authenticationExpectation.mechanism='changed'
  if(field==='order')d.actions.reverse()
  assert.notDeepEqual(repairSemanticProjection(source),repairSemanticProjection(changed))
})
test('M5-C4-17 simultaneous identical materialization serializes to one revision',()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root)
  const results=await Promise.all([service.materialize(input),service.materialize(input)])
  assert.ok(results.every(r=>r.kind==='materialized'));assert.deepEqual(results.map(r=>r.kind==='materialized'&&r.replay).sort(),[false,true])
  assert.equal((await all('test_set_revisions')).length,2);assert.equal((await all('repair_revision_origins')).length,1)
}))
test('M5-C4-18 foreign keys disabled refuses without repair',()=>withFixture(async f=>{
  const input=await approved(f)
  await sql.raw('PRAGMA foreign_keys=OFF').execute(getDb())
  try {
    expectCode(await new GovernedRepairMaterializationService(f.root).materialize(input),'integrity_mismatch')
    assert.equal((await sql<any>`PRAGMA foreign_keys`.execute(getDb())).rows[0].foreign_keys,0)
    assert.equal((await all('test_set_revisions')).length,1)
  } finally {await sql.raw('PRAGMA foreign_keys=ON').execute(getDb())}
}))

for(const replay of [false,true])for(const boundary of ['service','repository'])test('M5-C4-R1 exact preflight refusal evidence '+boundary+' replay='+replay,()=>withFixture(async f=>{
  const input=await approved(f),service=new GovernedRepairMaterializationService(f.root)
  if(replay)assert.equal((await service.materialize(input)).kind,'materialized')
  input.request.candidate={...input.request.candidate,selector:{kind:'data_test',value:'not-the-approved-selector'}}
  const expected=await f.service.readExact(input.request,(input.supersession as any).proposalAuthority.proposalId)
  assert.equal(expected.kind,'refused');if(expected.kind!=='refused')throw Error('Expected refusal')
  assert.ok(expected.counts.a>0,'The preflight actually enumerated candidates')
  const before=await all('test_set_revisions'),events=await all('test_generation_events')
  const actual=boundary==='service'?await service.materialize(input):await new TestSetRepository().materializeApprovedRepair(f.root,input)
  assert.deepEqual(actual,expected)
  assert.deepEqual(await service.readExact(input),expected)
  assert.deepEqual(await all('test_set_revisions'),before);assert.deepEqual(await all('test_generation_events'),events)
}))
