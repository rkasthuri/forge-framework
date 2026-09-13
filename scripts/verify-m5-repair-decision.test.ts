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
async function fixture(root:string):Promise<Fixture> {
  await openProjectDatabase(createWorkspace(root))
  const project=load('proposal').projectId
  fs.writeFileSync(path.join(root,'.forge','config.json'),JSON.stringify({schemaVersion:1,appName:project,authType:'form-login'}))
  const observation=new ObservationService(project,root,{producerInstanceId:'44444444-4444-4444-8444-444444444444'})
  const endpoints:any[]=[]
  for(const [index,name] of ['source-model','candidate-model'].entries()) {
    const model=load(name),run=await observation.startRun({operationId:'chunk2-observation-'+index,producer:'forge.crawler',producerVersion:'1',
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
async function withFixture(run:(f:Fixture)=>Promise<void>):Promise<void> {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-chunk3-'))
  try {const f=await fixture(root);const baseline=await f.service.evaluate(f.request);assert.equal(baseline.kind,'eligible',JSON.stringify(baseline));await run(f)}
  finally {await closeDb();assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-chunk3-'));fs.rmSync(root,{recursive:true,force:true})}
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
for(const wasm of [false,true])test('M5-C3-01 explicit decisions, replay, promotion, reopen; no downstream writes '+(wasm?'WASM':'native'),async()=>{
  const Module=require('node:module'),original=Module._load;let forced=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){forced++;throw Error('Forced WASM fixture')}return original.call(this,name,...args)}
  try{await withFixture(async f=>{
    const {d,service}=await prepare(f)
    const tables=['test_set_revisions','executions','execution_items','execution_item_authorities','runs','test_results','repair_revision_origins','repair_rerun_links','suites','suite_revisions']
    const before=await Promise.all(tables.map(all))
    expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'stale_authority')
    const accepted=await service.accept(f.request,d);assert.equal(accepted.kind,'accepted');if(accepted.kind==='accepted')assert.equal(accepted.replay,false)
    assert.equal((await all('app_model_transition_supersessions')).length,0)
    const rows=await all('repair_decisions');assert.equal(rows[0].mechanism_id,'local_product')
    assert.deepEqual(await service.accept(f.request,d),{kind:'accepted',decision:d,replay:true})
    const promoted=await service.promote(f.request,d,'authority-c3',PROMOTED);assert.equal(promoted.kind,'promoted',JSON.stringify(promoted))
    if(promoted.kind==='promoted'){
      assert.equal(promoted.replay,false);assert.deepEqual(promoted.authority.source,d.source);assert.deepEqual(promoted.authority.candidate,d.candidate)
      assert.deepEqual(promoted.authority.approvedBy,d.decidedBy)
      assert.equal(promoted.authority.authorityHash,repairAuthorityHash('app_model_transition_supersessions',promoted.authority))
      assert.deepEqual(await service.promote(f.request,d,'authority-c3',PROMOTED),{...promoted,replay:true})
    }
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    assert.deepEqual(await service.readExact(f.request,d),{kind:'accepted',decision:d,replay:true})
    assert.deepEqual(await all('repair_decisions'),rows)
    assert.deepEqual(await Promise.all(tables.map(all)),before)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
    if(wasm)assert.ok(forced>=2)
  })}finally{Module._load=original}
})
test('M5-C3-02 rejection terminal, never promotes',()=>withFixture(async f=>{
  const {d,service}=await prepare(f,'reject');assert.equal((await service.accept(f.request,d)).kind,'accepted')
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'stale_authority')
  expectCode(await service.accept(f.request,rehash({...d,decision:'approve'})),'integrity_mismatch')
  assert.equal((await all('app_model_transition_supersessions')).length,0)
}))
for(const change of ['id','actor','time','decision'])test('M5-C3-03 immutable conflicting second '+change,()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  const next=structuredClone(d)
  if(change==='id')next.decisionId='second-decision'
  if(change==='actor')next.decidedBy.actorId='other-human'
  if(change==='time')next.decidedAt=PROMOTED
  if(change==='decision')next.decision='reject'
  expectCode(await service.accept(f.request,rehash(next)),'integrity_mismatch')
  assert.equal((await all('repair_decisions')).length,1)
}))
for(const change of ['hash','unknown','model','undefined'])test('M5-C3-04 malformed decision '+change,()=>withFixture(async f=>{
  const {d,service}=await prepare(f)
  if(change==='hash')d.decisionHash='f'.repeat(64)
  if(change==='unknown')d.unknown=true
  if(change==='model')d.decidedBy.kind='model'
  if(change==='undefined')d.extra=undefined
  expectCode(await service.accept(f.request,d),'integrity_mismatch');assert.deepEqual(await all('repair_decisions'),[])
}))
for(const change of ['proposal-hash','candidate','project','chronology'])test('M5-C3-05 exact correspondence '+change,()=>withFixture(async f=>{
  const {d,service}=await prepare(f)
  if(change==='proposal-hash')d.proposalAuthority.proposalHash='a'.repeat(64)
  if(change==='candidate')d.candidate.modelRowId+=100
  if(change==='project')d.projectId='another-project'
  if(change==='chronology')d.decidedAt=START
  expectCode(await service.accept(f.request,rehash(d)),'stale_authority');assert.deepEqual(await all('repair_decisions'),[])
}))
test('M5-C3-06 SQL immutable decision guards',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  await assert.rejects(sql`UPDATE repair_decisions SET actor_id='other'`.execute(getDb()))
  await assert.rejects(sql`DELETE FROM repair_decisions`.execute(getDb()))
  assert.equal((await service.readExact(f.request,d)).kind,'accepted')
}))
for(const table of ['repair_decisions','repair_proposals','repair_proposal_identity_authorities','app_model_transition_supersessions'])test('M5-C3-07 corruption refusal '+table,()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d);await service.promote(f.request,d,'authority-c3',PROMOTED)
  await corrupt(table,()=>sql.raw('UPDATE '+table+" SET canonical_payload='{}'").execute(getDb()))
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'integrity_mismatch')
  if(table!=='app_model_transition_supersessions')expectCode(await service.readExact(f.request,d),'integrity_mismatch')
}))
test('M5-C3-08 unavailable historical source blocks replay and promotion without rewriting decisions',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d);const rows=await all('repair_decisions')
  await corrupt('execution_item_authorities',()=>sql`DELETE FROM execution_item_authorities`.execute(getDb()))
  expectCode(await service.readExact(f.request,d),'historical_authority_mismatch')
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'historical_authority_mismatch')
  assert.deepEqual(await all('repair_decisions'),rows)
}))
test('M5-C3-09 disabled FK refuses without repairing connection',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
  try{expectCode(await service.accept(f.request,d),'integrity_mismatch');assert.equal((await all('repair_decisions')).length,0)}
  finally{await sql`PRAGMA foreign_keys=ON`.execute(getDb())}
}))
test('M5-C3-10 failed promotion leaves committed approval and no authority; retry succeeds',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  await sql.raw("CREATE TRIGGER c3_injected_failure BEFORE INSERT ON app_model_transition_supersessions BEGIN SELECT RAISE(ABORT,'injected'); END").execute(getDb())
  await assert.rejects(service.promote(f.request,d,'authority-c3',PROMOTED),/injected/)
  assert.equal((await all('repair_decisions')).length,1);assert.equal((await all('app_model_transition_supersessions')).length,0)
  await sql.raw('DROP TRIGGER c3_injected_failure').execute(getDb())
  assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
}))

test('M5-C3-11 integrity outranks unavailable source and stale decision',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  await corrupt('repair_decisions',()=>sql`UPDATE repair_decisions SET actor_id='tampered'`.execute(getDb()))
  await corrupt('execution_item_authorities',()=>sql`DELETE FROM execution_item_authorities`.execute(getDb()))
  expectCode(await service.promote(f.request,rehash({...d,decidedAt:START}),'authority-c3',START),'integrity_mismatch')
}))
test('M5-C3-12 submitted request and decision frozen before first await',()=>withFixture(async f=>{
  const {d,service}=await prepare(f),expected=structuredClone(d),request=structuredClone(f.request)
  const pending=service.accept(request,d)
  d.decidedBy.actorId='changed-after-call';request.projectId='changed-after-call'
  assert.deepEqual(await pending,{kind:'accepted',decision:expected,replay:false})
  assert.deepEqual(await service.readExact(f.request,expected),{kind:'accepted',decision:expected,replay:true})
}))
test('M5-C3-13 promotion chronology and conflicting identity are terminal refusals',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  expectCode(await service.promote(f.request,d,'authority-c3',START),'stale_authority')
  assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
  expectCode(await service.promote(f.request,d,'different-authority',PROMOTED),'integrity_mismatch')
  expectCode(await service.promote(f.request,d,'authority-c3','2026-09-02T00:00:00Z'),'integrity_mismatch')
  await assert.rejects(sql`UPDATE app_model_transition_supersessions SET actor_id='changed'`.execute(getDb()))
  await assert.rejects(sql`DELETE FROM app_model_transition_supersessions`.execute(getDb()))
  assert.equal((await all('app_model_transition_supersessions')).length,1)
}))
test('M5-C3-14 failed decision append rolls back; exact retry accepted',()=>withFixture(async f=>{
  const {d,service}=await prepare(f)
  await sql.raw("CREATE TRIGGER c3_decision_failure BEFORE INSERT ON repair_decisions BEGIN SELECT RAISE(ABORT,'injected'); END").execute(getDb())
  await assert.rejects(service.accept(f.request,d),/injected/)
  assert.deepEqual(await all('repair_decisions'),[])
  await sql.raw('DROP TRIGGER c3_decision_failure').execute(getDb())
  assert.equal((await service.accept(f.request,d)).kind,'accepted')
}))
test('M5-C3-15 exact reread cannot create a decision',()=>withFixture(async f=>{
  const {d,service}=await prepare(f)
  expectCode(await service.readExact(f.request,d),'stale_authority')
  assert.deepEqual(await all('repair_decisions'),[])
}))

test('REVIEW-R1 repository promotion refuses chronology before proposal and decision',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  expectCode(await service.promote(f.request,d,'authority-c3',START),'stale_authority')
  await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(supersession(d,START)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
  assert.deepEqual(await all('app_model_transition_supersessions'),[])
}))

test('REVIEW-R2 repository promotion refuses unavailable historical source',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  await corrupt('execution_item_authorities',()=>sql`DELETE FROM execution_item_authorities`.execute(getDb()))
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'historical_authority_mismatch')
  await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(supersession(d)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
  assert.deepEqual(await all('app_model_transition_supersessions'),[])
}))

test('REVIEW-R3 caller transaction cannot promote an uncommitted decision',()=>withFixture(async f=>{
  const {d}=await prepare(f)
  await assert.rejects(getDb().transaction().execute(async db=>{
    await db.insertInto('repair_decisions').values(repairAuthorityRow('repair_decisions',d) as any).execute()
    const repository=new RepairAuthorityRepository(()=>db)
    assert.equal('persistSupersessionInTransaction' in repository,false)
    await assert.rejects(repository.persistSupersessionExact(supersession(d)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
    const service=new GovernedRepairDecisionService(f.root,()=>db)
    expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'stale_authority')
    assert.deepEqual(await db.selectFrom('app_model_transition_supersessions').selectAll().execute(),[])
    assert.equal((await db.selectFrom('repair_decisions').selectAll().execute()).length,1)
    throw Error('caller rollback')
  }),/caller rollback/)
  assert.deepEqual(await all('repair_decisions'),[])
  const service=new GovernedRepairDecisionService(f.root)
  assert.equal((await service.accept(f.request,d)).kind,'accepted')
  assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
}))

test('REVIEW-R3 manual caller transaction cannot be borrowed, committed, or rolled back by promotion',()=>withFixture(async f=>{
  const {d}=await prepare(f)
  await getDb().connection().execute(async db=>{
    await sql`BEGIN IMMEDIATE`.execute(db)
    try {
      await db.insertInto('repair_decisions').values(repairAuthorityRow('repair_decisions',d) as any).execute()
      const service=new GovernedRepairDecisionService(f.root,()=>db)
      await assert.rejects(service.promote(f.request,d,'authority-c3',PROMOTED),/transaction/i)
      assert.equal((await db.selectFrom('repair_decisions').selectAll().execute()).length,1)
      assert.deepEqual(await db.selectFrom('app_model_transition_supersessions').selectAll().execute(),[])
    } finally {await sql`ROLLBACK`.execute(db)}
  })
  assert.deepEqual(await all('repair_decisions'),[])
}))

test('REVIEW-R3 caller may commit a decision, then independently promote and replay it',()=>withFixture(async f=>{
  const {d,service}=await prepare(f)
  await getDb().transaction().execute(async db=>{
    await db.insertInto('repair_decisions').values(repairAuthorityRow('repair_decisions',d) as any).execute()
    expectCode(await new GovernedRepairDecisionService(f.root,()=>db).promote(f.request,d,'authority-c3',PROMOTED),'stale_authority')
  })
  const promoted=await service.promote(f.request,d,'authority-c3',PROMOTED)
  assert.equal(promoted.kind,'promoted')
  assert.deepEqual(await service.promote(f.request,d,'authority-c3',PROMOTED),{...promoted,replay:true})
  assert.equal((await all('app_model_transition_supersessions')).length,1)
}))

// Preserve the old repository writer's corruption coverage at the sole Product
// promotion boundary. Run both first insertion and exact replay through preflight.
for(const replay of [false,true])for(const attack of [
  'proposal-column','decision-column','proposal-payload-unknown','decision-payload-unknown',
  'proposal-hash','decision-hash','pair-hash','witness-hash','witness-pair','missing-witness','witness-payload-unknown',
])test(`M5-C3-16 Product integrity preflight ${attack} replay=${replay}`,()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  if(replay)assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
  const before=await all('app_model_transition_supersessions')
  if(attack==='proposal-column')await corrupt('repair_proposals',()=>sql`UPDATE repair_proposals SET candidate_set_hash=${'f'.repeat(64)}`.execute(getDb()))
  if(attack==='decision-column')await corrupt('repair_decisions',()=>sql`UPDATE repair_decisions SET actor_id='changed-human'`.execute(getDb()))
  if(attack==='proposal-hash')await corrupt('repair_proposals',()=>sql`UPDATE repair_proposals SET proposal_hash=${'f'.repeat(64)}`.execute(getDb()))
  if(attack==='decision-hash')await corrupt('repair_decisions',()=>sql`UPDATE repair_decisions SET decision_hash=${'f'.repeat(64)}`.execute(getDb()))
  if(attack==='pair-hash')await corrupt('repair_proposals',()=>sql`UPDATE repair_proposals SET identity_authority_hash=${'f'.repeat(64)}`.execute(getDb()))
  if(attack==='witness-hash')await corrupt('repair_proposal_identity_authorities',()=>sql`UPDATE repair_proposal_identity_authorities SET identity_authority_hash=${'f'.repeat(64)}`.execute(getDb()))
  if(attack==='missing-witness')await corrupt('repair_proposal_identity_authorities',()=>sql`DELETE FROM repair_proposal_identity_authorities`.execute(getDb()))
  if(attack.endsWith('payload-unknown')) {
    const table=attack.startsWith('proposal')?'repair_proposals':attack.startsWith('decision')?'repair_decisions':'repair_proposal_identity_authorities'
    const payload=JSON.parse((await all(table))[0].canonical_payload)
    await corrupt(table,()=>(getDb() as any).updateTable(table).set({canonical_payload:canonicalJson({...payload,unknownAuthority:true})}).execute())
  }
  if(attack==='witness-pair') {
    const p=JSON.parse((await all('repair_proposals'))[0].canonical_payload)
    p.proposedAt=PROMOTED;p.proposalHash=repairAuthorityHash('repair_proposals',p)
    await corrupt('repair_proposal_identity_authorities',()=>getDb().updateTable('repair_proposal_identity_authorities')
      .set(proposalIdentityAuthorityRow(captureProposalIdentityAuthority(p,'caller'))).execute())
  }
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'integrity_mismatch')
  await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(supersession(d)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
  assert.deepEqual(await all('app_model_transition_supersessions'),before)
}))

for(const replay of [false,true])for(const side of ['source','candidate'] as const)
test(`REVIEW-R2 live ${side} App Model corruption refuses promotion replay=${replay}`,()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  if(replay)assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
  const before=await all('app_model_transition_supersessions'),decisions=await all('repair_decisions')
  await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:'{}'}).where('id','=',d[side].modelRowId).execute())
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'integrity_mismatch')
  await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(supersession(d)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
  assert.deepEqual(await all('app_model_transition_supersessions'),before)
  assert.deepEqual(await all('repair_decisions'),decisions)
}))

for(const replay of [false,true])test(`REVIEW-R2 mismatched historical source witness refuses promotion replay=${replay}`,()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  if(replay)assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
  const before=await all('app_model_transition_supersessions')
  await corrupt('execution_item_authorities',()=>sql`UPDATE execution_item_authorities SET test_set_content_hash=${'f'.repeat(64)}`.execute(getDb()))
  expectCode(await service.promote(f.request,d,'authority-c3',PROMOTED),'historical_authority_mismatch')
  await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(supersession(d)),{code:'SUPERSESSION_PROMOTION_BOUNDARY_REQUIRED'})
  assert.deepEqual(await all('app_model_transition_supersessions'),before)
}))

test('M5-C3-17 deferred COMMIT failure rolls back authority and trigger writes, preserving committed approval',()=>withFixture(async f=>{
  const {d,service}=await prepare(f);await service.accept(f.request,d)
  const decisions=await all('repair_decisions')
  await sql.raw('CREATE TABLE c3_deferred_failure (decision_id TEXT REFERENCES repair_decisions(decision_id) DEFERRABLE INITIALLY DEFERRED)').execute(getDb())
  await sql.raw("CREATE TRIGGER c3_commit_failure AFTER INSERT ON app_model_transition_supersessions BEGIN INSERT INTO c3_deferred_failure VALUES ('missing-decision'); END").execute(getDb())
  await assert.rejects(service.promote(f.request,d,'authority-c3',PROMOTED),/FOREIGN KEY/i)
  assert.deepEqual(await all('app_model_transition_supersessions'),[])
  assert.deepEqual(await all('c3_deferred_failure'),[])
  assert.deepEqual(await all('repair_decisions'),decisions)
  await sql.raw('DROP TRIGGER c3_commit_failure').execute(getDb())
  assert.equal((await service.promote(f.request,d,'authority-c3',PROMOTED)).kind,'promoted')
}))
