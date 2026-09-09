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
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-chunk2-'))
  try {const f=await fixture(root);const baseline=await f.service.evaluate(f.request);assert.equal(baseline.kind,'eligible',JSON.stringify(baseline));await run(f)}
  finally {await closeDb();assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-chunk2-'));fs.rmSync(root,{recursive:true,force:true})}
}
async function corrupt(table:string,mutate:()=>Promise<unknown>):Promise<void> {
  const guards=(await sql<{name:string;sql:string}>`SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name=${table}`.execute(getDb())).rows
  for(const guard of guards)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(getDb())
  // Deliberate single-record corruption bypasses persistence guards only in disposable fixtures.
  await sql.raw('PRAGMA foreign_keys=OFF').execute(getDb())
  try {await mutate()}finally {await sql.raw('PRAGMA foreign_keys=ON').execute(getDb());for(const guard of guards)await sql.raw(guard.sql).execute(getDb())}
}

for(const wasm of [false,true])test('proposal commit/replay/read/reopen and no downstream writes '+(wasm?'WASM':'native'),async()=>{
  const Module=require('node:module'),original=Module._load;let forced=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){forced++;throw Error('Forced WASM fixture')}return original.call(this,name,...args)}
  try {await withFixture(async f=>{
    const tables=['test_set_revisions','executions','execution_items','execution_item_authorities','runs','test_results','repair_decisions','app_model_transition_supersessions','repair_revision_origins','repair_rerun_links','suites','suite_revisions']
    const before=await Promise.all(tables.map(all))
    const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error(JSON.stringify(first));assert.equal(first.replay,false)
    const row=await all('repair_proposals')
    const again=await f.service.propose(f.request);assert.equal(again.kind,'eligible');if(again.kind==='eligible')assert.equal(again.replay,true)
    assert.deepEqual(await all('repair_proposals'),row)
    assert.deepEqual(await Promise.all(tables.map(all)),before)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    const read=await new GovernedRepairProposalService(f.root).readExact(f.request,first.proposal.proposalId)
    assert.equal(read.kind,'eligible',JSON.stringify(read));assert.deepEqual(await all('repair_proposals'),row)
    assert.equal((await f.service.propose({...f.request,proposal:first.proposal})).kind,'eligible')
    if(wasm)assert.ok(forced>=2)
  })}finally{Module._load=original}
})
test('outer transaction rollback leaves zero proposal',()=>withFixture(async f=>{
  await assert.rejects(getDb().transaction().execute(async db=>{const r=await f.service.proposeInTransaction(f.request,db);assert.equal(r.kind,'eligible');throw Error('outer rollback')}),/outer rollback/)
  assert.deepEqual(await all('repair_proposals'),[])
  assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  await closeDb();await openProjectDatabase(createWorkspace(f.root));assert.deepEqual(await all('repair_proposals'),[])
}))
test('same identity different governed bytes is integrity conflict',()=>withFixture(async f=>{
  const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible')
  expectCode(await f.service.propose({...f.request,proposedAt:'2026-09-02T12:00:00.000Z'}),'integrity_mismatch')
  assert.equal((await all('repair_proposals')).length,1)
}))
for(const key of ['top','endpoint','selector','proposal'])test('unknown '+key+' cannot persist any row',()=>withFixture(async f=>{
  const r:any=f.request
  if(key==='proposal'){const p=await f.service.evaluate(f.request);assert.equal(p.kind,'eligible');if(p.kind==='eligible')r.proposal={...p.proposal,unknown:1}}
  else (key==='top'?r:key==='endpoint'?r.candidate:r.candidate.selector).unknown=1
  expectCode(await f.service.propose(r),key==='proposal'?'unsupported_contract_version':'integrity_mismatch');assert.deepEqual(await all('repair_proposals'),[])
  await closeDb();await openProjectDatabase(createWorkspace(f.root));assert.deepEqual(await all('repair_proposals'),[])
}))
for(const wasm of [false,true])test('single-row self-consistent source corruption refuses append/read/replay/reopen '+(wasm?'WASM':'native'),async()=>{
  const Module=require('node:module'),original=Module._load
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3')throw Error('Forced WASM fixture');return original.call(this,name,...args)}
  try {await withFixture(async f=>{
    assert.equal((await f.service.propose(f.request)).kind,'eligible')
    const before=await all('repair_proposals'),set=JSON.parse(JSON.stringify(f.set));set.generatedAt='2026-09-02T12:00:00.000Z'
    const m=materializeCanonicalTestSet(set)
    await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({payload_json:m.json,content_hash:m.fingerprint,generated_at:set.generatedAt}).where('id','=',701).execute())
    const request={...f.request,sourceDefinitionAuthority:{...f.request.sourceDefinitionAuthority,testSetContentHash:m.fingerprint}}
    expectCode(await f.service.propose({...request,proposalId:'transition-proposal-corrupt'}),'historical_authority_mismatch')
    expectCode(await f.service.propose(request),'historical_authority_mismatch')
    expectCode(await f.service.readExact(request,f.request.proposalId!),'historical_authority_mismatch')
    assert.deepEqual(await all('repair_proposals'),before)
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    expectCode(await f.service.propose(request),'historical_authority_mismatch')
    expectCode(await f.service.readExact(request,f.request.proposalId!),'historical_authority_mismatch')
    assert.deepEqual(await all('repair_proposals'),before)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  })}finally{Module._load=original}
})
for(const payload of [false,true])test('persisted '+(payload?'payload':'column')+' tampering refuses reread and replay',()=>withFixture(async f=>{
  const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('first')
  await corrupt('repair_proposals',async()=>{
    if(payload){const p={...first.proposal,proposedAt:'2026-09-03T12:00:00.000Z'};p.proposalHash=repairAuthorityHash('repair_proposals',p);await getDb().updateTable('repair_proposals').set({canonical_payload:canonicalJson(p)}).execute()}
    else await getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute()
  })
  expectCode(await f.service.readExact(f.request,f.request.proposalId!),'integrity_mismatch')
  expectCode(await f.service.propose(f.request),'integrity_mismatch')
}))
test('proposal INSERT OR REPLACE and UPSERT cannot replace authority',()=>withFixture(async f=>{
  assert.equal((await f.service.propose(f.request)).kind,'eligible')
  const row=(await all('repair_proposals'))[0]
  await assert.rejects((getDb() as any).insertInto('repair_proposals').orReplace().values(row).execute(),/immutable|append|replace|unique|identity already exists/i)
  await assert.rejects(getDb().insertInto('repair_proposals').values(row).onConflict(oc=>oc.column('proposal_id').doUpdateSet({proposal_hash:'f'.repeat(64)})).execute(),/immutable|append|update|identity already exists/i)
  assert.deepEqual(await all('repair_proposals'),[row])
}))

test('missing historical witness refuses proposal insertion',()=>withFixture(async f=>{
  await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
  expectCode(await f.service.propose(f.request),'historical_authority_mismatch')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('internally inconsistent source refuses before witness evaluation',()=>withFixture(async f=>{
  await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({content_hash:'f'.repeat(64)}).execute())
  expectCode(await f.service.propose(f.request),'integrity_mismatch');assert.deepEqual(await all('repair_proposals'),[])
}))
for(const source of [false,true])test((source?'source':'candidate')+' independent support hash corruption refuses',()=>withFixture(async f=>{
  const rowId=(source?f.request.source:f.request.candidate).modelRowId
  await corrupt('app_model_support_seals',()=>getDb().updateTable('app_model_support_seals').set({support_hash:'f'.repeat(64)}).where('model_row_id','=',rowId).execute())
  expectCode(await f.service.propose(f.request),source?'historical_authority_mismatch':'candidate_not_governed')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('missing candidate model row cannot be self-asserted',()=>withFixture(async f=>{
  expectCode(await f.service.propose({...f.request,candidate:{...f.request.candidate,modelRowId:99999}}),'candidate_not_governed')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('wrong project cannot consume exact model and source rows',()=>withFixture(async f=>{
  expectCode(await f.service.propose({...f.request,projectId:'other-project'}),'historical_authority_mismatch')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('source missing model row is integrity failure',()=>withFixture(async f=>{
  expectCode(await f.service.propose({...f.request,source:{...f.request.source,modelRowId:99999}}),'integrity_mismatch')
}))
test('foreign keys disabled refuses before proposal append',()=>withFixture(async f=>{
  await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
  try{expectCode(await f.service.propose(f.request),'integrity_mismatch');assert.deepEqual(await all('repair_proposals'),[])}
  finally{await sql`PRAGMA foreign_keys=ON`.execute(getDb())}
}))
test('non-enumerable proposal authority field cannot be lost during freeze',()=>withFixture(async f=>{
  Object.defineProperty(f.request.candidate,'hidden',{value:1})
  expectCode(await f.service.propose(f.request),'integrity_mismatch')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('exact historical candidate remains selected after a newer model commits',()=>withFixture(async f=>{
  const models=new AppModelRepository(),candidate=await models.getCommittedById(f.request.candidate.modelRowId)
  const authority=await new TestDefinitionAuthorityProjectionService().readExact(f.request.projectId,candidate.rowId)
  assert.equal(authority.kind,'ok');if(authority.kind!=='ok')throw Error('support')
  const model:any=JSON.parse(JSON.stringify(candidate.snapshot));delete model.app.modelVersion
  model.pages[0].elements[0].strategies[0].value='newest-checkout'
  await models.commitCandidate(model,'third-model',{
    projectId:f.request.projectId,observationRunId:authority.authority.observationRunId,
    observations:authority.authority.supportingObservationIds.map(id=>({observationId:id,claimKey:'page.exists',supportRole:'basis'})),
    subjects:authority.authority.subjectSupport.flatMap(subject=>subject.supportingObservationIds.map(id=>({canonicalSubjectId:subject.canonicalSubjectId,observationId:id,claimKey:'subject.exists',supportRole:'basis'}))),
    gaps:[],characterizationPolicyId:authority.authority.characterizationPolicy.id,characterizationPolicyVersion:authority.authority.characterizationPolicy.version,linkedAt:END})
  const result=await f.service.propose(f.request);assert.equal(result.kind,'eligible',JSON.stringify(result))
  if(result.kind==='eligible')assert.equal(result.proposal.candidate.modelRowId,candidate.rowId)
}))

for(const source of [false,true])test((source?'source':'candidate')+' corrupted Observation authority refuses at its governed boundary',()=>withFixture(async f=>{
  const endpoint=source?f.request.source:f.request.candidate
  await corrupt('observations',()=>getDb().updateTable('observations').set({integrity_hash:'f'.repeat(64)}).where('observation_id','=',endpoint.supportingObservationIds[0]).execute())
  expectCode(await f.service.propose(f.request),source?'integrity_mismatch':'candidate_not_governed')
  assert.deepEqual(await all('repair_proposals'),[])
}))
test('same-identity conflict masks historical witness absence',()=>withFixture(async f=>{
  assert.equal((await f.service.propose(f.request)).kind,'eligible')
  await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
  expectCode(await f.service.propose({...f.request,proposedAt:'2026-09-02T12:00:00.000Z'}),'integrity_mismatch')
}))

for(const wasm of [false,true])test('WORK P2-2 false proposal refuses '+(wasm?'WASM':'native'),async()=>{
  const Module=require('node:module'),original=Module._load
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3')throw Error('Forced WASM');return original.call(this,name,...args)}
  try{await withFixture(async f=>{
    expectCode(await f.service.propose({...f.request,proposal:false} as any),'unsupported_contract_version')
    assert.deepEqual(await all('repair_proposals'),[])
    await closeDb();await openProjectDatabase(createWorkspace(f.root));assert.deepEqual(await all('repair_proposals'),[])
  })}finally{Module._load=original}
})
test('WORK P2-4 generated identity conflict outranks missing witness',()=>withFixture(async f=>{
  const request={...f.request};delete request.proposalId
  assert.equal((await f.service.propose(request)).kind,'eligible')
  await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
  expectCode(await f.service.propose({...request,proposedAt:'2026-09-02T12:00:00.000Z'}),'integrity_mismatch')
}))

async function withBackend(wasm:boolean,run:(f:Fixture)=>Promise<void>):Promise<void>{
  const Module=require('node:module'),original=Module._load;let loads=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){loads++;throw Error('Forced Work WASM')}return original.call(this,name,...args)}
  try{await withFixture(run);if(wasm)assert.ok(loads>0,'WASM fallback actually selected')}finally{Module._load=original}
}
const storageEndpointChanges:[string,any][]=[["modelRowId",999],["modelVersion","9.0.0"],["modelContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["observationRunId","other-run"],["supportSealHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["characterizationPolicy",{"id":"other-policy","version":"1"}],["supportingObservationIds",["other-observation"]],["flowId","other-flow"],["flowContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["stepIndex",99],["action","navigate"],["grounding","inferred"],["sourceSubjectId","other-source"],["sourceSubjectContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["elementId","other-element"],["elementContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["selector.kind","css"],["selector.value","other-selector"],["targetSubjectId","other-target"],["targetSubjectContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"]]
for(const wasm of [false,true]){
  for(const [field,value] of storageEndpointChanges)test('P2-1 persisted endpoint mismatch '+field+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const before=canonicalJson(f.request),candidate=JSON.parse(JSON.stringify(f.request.candidate)),keys=field.split('.')
    const target=keys.length===1?candidate:candidate[keys[0]];target[keys[keys.length-1]]=value
    expectCode(await f.service.propose({...f.request,candidate}),'candidate_not_governed')
    assert.equal(canonicalJson(f.request),before);assert.deepEqual(await all('repair_proposals'),[])
    await closeDb();await openProjectDatabase(createWorkspace(f.root));assert.deepEqual(await all('repair_proposals'),[])
  }))
  for(const [name,value] of [['false',false],['zero',0],['empty string',''],['null',null],['array',[]],['malformed object',{}]] as const)
    test('P2-2 presence '+name+' zero rows after reopen '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const request={...f.request,proposal:value} as any
      expectCode(await f.service.propose(request),'unsupported_contract_version')
      assert.deepEqual(await all('repair_proposals'),[])
      await closeDb();await openProjectDatabase(createWorkspace(f.root))
      assert.deepEqual(await all('repair_proposals'),[])
      expectCode(await f.service.propose(request),'unsupported_contract_version')
    }))
  for(const supplied of [false,true])test('P2-2 '+(supplied?'valid supplied':'absent')+' proposal exact persistence/replay '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request},before=canonicalJson(request),expected=await f.service.evaluate(request)
    assert.equal(expected.kind,'eligible');if(expected.kind!=='eligible')throw Error('expected')
    if(supplied)request.proposal=expected.proposal
    const accepted=canonicalJson(request)
    const first=await f.service.propose(request);assert.equal(first.kind,'eligible',JSON.stringify(first))
    if(first.kind==='eligible')assert.equal(first.replay,false)
    const row=(await all('repair_proposals'))[0]
    assert.equal(row.canonical_payload,canonicalJson(expected.proposal))
    assert.deepEqual(JSON.parse(row.canonical_payload).candidate,request.candidate)
    assert.equal(canonicalJson(request),accepted)
    const replay=await f.service.propose(request);assert.equal(replay.kind,'eligible');if(replay.kind==='eligible')assert.equal(replay.replay,true)
    assert.deepEqual(await all('repair_proposals'),[row])
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    assert.equal((await f.service.propose(request)).kind,'eligible')
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  }))
  for(const scenario of ['different bytes','stored corrupt hash','exact missing history','exact valid history','absent missing history'] as const)
    test('P2-4 generated identity '+scenario+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const request={...f.request};delete request.proposalId
      if(scenario!=='absent missing history')assert.equal((await f.service.propose(request)).kind,'eligible')
      if(scenario==='stored corrupt hash')await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
      if(scenario!=='exact valid history')await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
      const attempt=scenario==='different bytes'?{...request,proposedAt:'2026-09-02T12:00:00.000Z'}:request
      const rows=await all('repair_proposals'),result=await f.service.propose(attempt)
      if(scenario==='exact valid history'){assert.equal(result.kind,'eligible');if(result.kind==='eligible')assert.equal(result.replay,true)}
      else expectCode(result,scenario==='different bytes'||scenario==='stored corrupt hash'?'integrity_mismatch':'historical_authority_mismatch')
      assert.deepEqual(await all('repair_proposals'),rows)
    }))
  test('NOVA invalid persisted model reference is integrity '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const row=await getDb().selectFrom('app_models').selectAll().where('id','=',f.request.candidate.modelRowId).executeTakeFirstOrThrow()
    const model=JSON.parse(row.model_json);model.flows[0].steps[1].pageId={id:'cart-html'}
    assert.equal(validateAppModelObject(model).valid,false)
    await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute())
    expectCode(await f.service.propose({...f.request,candidate:{...f.request.candidate,modelContentHash:canonicalJsonSha256(model)}}),'integrity_mismatch')
    assert.deepEqual(await all('repair_proposals'),[])
  }))
}
test('P2-2 reread cannot substitute a stored proposal for a supplied false value',()=>withFixture(async f=>{
  const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible')
  expectCode(await f.service.readExact({...f.request,proposal:false} as any,f.request.proposalId!),'unsupported_contract_version')
}))

test('P2-4 explicit identity conflict precedes unavailable source row',()=>withFixture(async f=>{
  assert.equal((await f.service.propose(f.request)).kind,'eligible')
  const rows=await all('repair_proposals')
  expectCode(await f.service.propose({...f.request,proposedAt:'2026-09-02T12:00:00.000Z',
    sourceDefinitionAuthority:{...f.request.sourceDefinitionAuthority,testSetRowId:99999}}),'integrity_mismatch')
  assert.deepEqual(await all('repair_proposals'),rows)
}))
for(const wasm of [false,true]){
  test('P2-3 persisted internal corruption masks missing witness '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({model_version:'contradictory-row'}).where('id','=',f.request.sourceDefinitionAuthority.testSetRowId).execute())
    await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
    expectCode(await f.service.propose({...f.request,proposal:false} as any),'integrity_mismatch')
    assert.deepEqual(await all('repair_proposals'),[])
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    expectCode(await f.service.propose(f.request),'integrity_mismatch')
    assert.deepEqual(await all('repair_proposals'),[])
  }))
  test('NOVA valid persisted unresolved reference excludes slot '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const row=await getDb().selectFrom('app_models').selectAll().where('id','=',f.request.candidate.modelRowId).executeTakeFirstOrThrow()
    const model=JSON.parse(row.model_json);model.flows[0].steps[1].targetPageId='unresolved'
    assert.equal(validateAppModelObject(model).valid,true)
    await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute())
    const result=await f.service.propose({...f.request,candidate:{...f.request.candidate,modelContentHash:canonicalJsonSha256(model)}})
    expectCode(result,'candidate_not_found');assert.deepEqual(result.counts,{a:0,b:0,c:0})
    assert.deepEqual(await all('repair_proposals'),[])
  }))
}
for(const wasm of [false,true]) {
  for(const [field,value] of [['contractVersion','wrong'],['repairKind','wrong']] as const)
    test('LATEST WORK A generated conflict plus '+field+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const request={...f.request};delete request.proposalId
      assert.equal((await f.service.propose(request)).kind,'eligible')
      expectCode(await f.service.propose({...request,proposedAt:'2026-09-02T12:00:00.000Z',[field]:value}),'integrity_mismatch')
    }))
  for(const field of ['proposalId','proposedAt'] as const)
    test('LATEST WORK B supplied proposal conflicts with request '+field+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const generated=await f.service.evaluate(f.request);assert.equal(generated.kind,'eligible');if(generated.kind!=='eligible')throw Error('fixture')
      const request={...f.request,proposal:generated.proposal,[field]:field==='proposalId'?'transition-proposal-conflicting-request':'2026-09-02T12:00:00.000Z'}
      expectCode(await f.service.propose(request),'candidate_not_governed')
      assert.deepEqual(await all('repair_proposals'),[])
    }))
  test('LATEST WORK C missing proposal cannot mask internal source corruption '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({content_hash:'f'.repeat(64)}).execute())
    expectCode(await f.service.readExact(f.request,f.request.proposalId!),'integrity_mismatch')
  }))
}
type LatestLower='contract'|'kind'|'history'|'A'|'B'|'C'|'ambiguity'
const latestCode:Record<LatestLower,string>={contract:'unsupported_contract_version',kind:'unsupported_repair_kind',history:'historical_authority_mismatch',A:'candidate_not_found',B:'candidate_not_governed',C:'candidate_semantics_unproven',ambiguity:'candidate_ambiguous'}
async function latestCandidateFailure(f:Fixture,request:RepairProposalRequest,lower:LatestLower):Promise<void>{
  if(lower==='contract')request.contractVersion='wrong'
  if(lower==='kind')request.repairKind='wrong'
  if(lower==='history')await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
  if(lower==='A'){
    const row=await getDb().selectFrom('app_models').selectAll().where('id','=',request.candidate.modelRowId).executeTakeFirstOrThrow()
    const model=JSON.parse(row.model_json);model.flows=[];assert.equal(validateAppModelObject(model).valid,true)
    await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute())
  }
  if(lower==='B')await corrupt('app_model_support_seals',()=>getDb().updateTable('app_model_support_seals').set({support_hash:'f'.repeat(64)}).where('model_row_id','=',request.candidate.modelRowId).execute())
  if(lower==='C')fs.writeFileSync(path.join(f.root,'.forge','config.json'),JSON.stringify({schemaVersion:1,appName:request.projectId,authType:'unknown'}))
}
for(const wasm of [false,true]){
  for(const lower of ['contract','kind','history','A','B','C','ambiguity'] as const)
    for(const state of ['conflicting bytes','corrupt hash','exact','absent'] as const)
      test('LATEST A full identity precedence '+state+' + '+lower+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
        const request={...f.request};delete request.proposalId
        if(lower==='ambiguity'){
          // Chunk 1 can store a non-authoritative proposal; this does not claim
          // the ambiguous model was ever eligible for Chunk 2 generation.
          const evaluated=await f.service.evaluate(request);assert.equal(evaluated.kind,'eligible');if(evaluated.kind!=='eligible')throw Error('fixture')
          const proposal=JSON.parse(JSON.stringify(evaluated.proposal))
          const row=await getDb().selectFrom('app_models').selectAll().where('id','=',request.candidate.modelRowId).executeTakeFirstOrThrow()
          const model=JSON.parse(row.model_json);model.flows.push(JSON.parse(JSON.stringify(model.flows[0])))
          assert.equal(validateAppModelObject(model).valid,true)
          await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute())
          request.candidate={...request.candidate,modelContentHash:canonicalJsonSha256(model)};proposal.candidate=request.candidate
          proposal.proposalId='transition-proposal-'+canonicalJsonSha256({projectId:request.projectId,source:request.source,candidate:request.candidate,candidateSetHash:proposal.candidateSetHash}).slice(0,24)
          proposal.proposalHash=repairAuthorityHash('repair_proposals',proposal)
          if(state!=='absent')await getDb().transaction().execute(async db=>{
            await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(captureProposalIdentityAuthority(proposal,'generated'))).execute()
            await db.insertInto('repair_proposals').values({...repairAuthorityRow('repair_proposals',proposal),identity_authority_hash:captureProposalIdentityAuthority(proposal,'generated').identityAuthorityHash} as any).execute()
          })
        }else if(state!=='absent')assert.equal((await f.service.propose(request)).kind,'eligible')
        if(state==='corrupt hash')await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
        await latestCandidateFailure(f,request,lower)
        const attempt=state==='conflicting bytes'?{...request,proposedAt:'2026-09-02T12:00:00.000Z'}:request
        const before=await all('repair_proposals'),expected=state==='conflicting bytes'||state==='corrupt hash'?'integrity_mismatch':latestCode[lower]
        expectCode(await f.service.propose(attempt),expected);assert.deepEqual(await all('repair_proposals'),before)
        await closeDb()
        if(state==='corrupt hash') {
          await assert.rejects(openProjectDatabase(createWorkspace(f.root)),/M5 repair persistence authority does not match/)
        } else {
          await openProjectDatabase(createWorkspace(f.root))
          expectCode(await f.service.propose(attempt),expected);assert.deepEqual(await all('repair_proposals'),before)
          assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
        }
      }))
  for(const state of ['missing corrupt source','missing history','missing valid source','exact corrupt source','exact missing history','exact valid'] as const)
    test('LATEST C reread source precedence '+state+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      if(state.startsWith('exact'))assert.equal((await f.service.propose(f.request)).kind,'eligible')
      if(state.includes('corrupt source'))await corrupt('test_set_revisions',()=>getDb().updateTable('test_set_revisions').set({content_hash:'f'.repeat(64)}).execute())
      if(state.includes('history'))await corrupt('execution_item_authorities',()=>getDb().deleteFrom('execution_item_authorities').execute())
      const before=await all('repair_proposals')
      for(const restart of [false,true]){
        if(restart){await closeDb();await openProjectDatabase(createWorkspace(f.root))}
        const result=await f.service.readExact(f.request,f.request.proposalId!)
        if(state==='exact valid'){assert.equal(result.kind,'eligible');if(result.kind==='eligible')assert.equal(result.replay,true)}
        else expectCode(result,state.includes('corrupt source')?'integrity_mismatch':'historical_authority_mismatch')
        assert.deepEqual(await all('repair_proposals'),before)
      }
    }))
  test('LATEST B metadata conflict cannot mask persisted identity corruption '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const initial=await f.service.propose(f.request);assert.equal(initial.kind,'eligible');if(initial.kind!=='eligible')throw Error('fixture')
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
    expectCode(await f.service.propose({...f.request,proposal:initial.proposal,proposedAt:'2026-09-02T12:00:00.000Z'}),'integrity_mismatch')
  }))
  test('LATEST A valid generated identity still commits/replays/rolls back '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};delete request.proposalId
    await assert.rejects(getDb().transaction().execute(async db=>{assert.equal((await f.service.proposeInTransaction(request,db)).kind,'eligible');throw Error('rollback latest')}),/rollback latest/)
    assert.deepEqual(await all('repair_proposals'),[])
    const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
    const before=await all('repair_proposals');const replay=await f.service.propose(request);assert.equal(replay.kind,'eligible');if(replay.kind==='eligible')assert.equal(replay.replay,true)
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    const read=await f.service.readExact(request,first.proposal.proposalId);assert.equal(read.kind,'eligible');if(read.kind==='eligible')assert.equal(read.replay,true)
    assert.deepEqual(await all('repair_proposals'),before)
  }))
}
for(const wasm of [false,true]){
  for(const lower of ['contract','kind','history'] as const)
    test('LATEST A full governed byte comparison precedes '+lower+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const request={...f.request};delete request.proposalId
      const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
      const changed=JSON.parse(JSON.stringify(first.proposal));changed.boundedSemantics.oracleIdentityHash='f'.repeat(64);changed.proposalHash=repairAuthorityHash('repair_proposals',changed)
      await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set(repairAuthorityRow('repair_proposals',changed) as any).execute())
      await latestCandidateFailure(f,request,lower)
      expectCode(await f.service.propose(request),'integrity_mismatch')
    }))
  for(const [field,value] of [['proposalId',{}],['projectId',{}],['proposedAt',{}],['contractVersion',{}],['repairKind',{}]] as const)
    test('LATEST identity preflight rejects invalid request '+field+' without SQL binding '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
      const request={...f.request,[field]:value} as any
      expectCode(await f.service.propose(request),'integrity_mismatch');assert.deepEqual(await all('repair_proposals'),[])
    }))
}
for(const wasm of [false,true]){
  test('LATEST B both duplicated identities retain integrity priority '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const result=await f.service.propose(f.request);assert.equal(result.kind,'eligible');if(result.kind!=='eligible')throw Error('fixture')
    const supplied={...result.proposal,proposalId:'transition-proposal-other-supplied'};supplied.proposalHash=repairAuthorityHash('repair_proposals',supplied)
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
    expectCode(await f.service.propose({...f.request,proposal:supplied}),'integrity_mismatch')
  }))
  test('LATEST A invalid supplied proposal cannot conceal available persisted hash corruption '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};delete request.proposalId
    assert.equal((await f.service.propose(request)).kind,'eligible')
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
    await latestCandidateFailure(f,request,'A')
    expectCode(await f.service.propose({...request,proposal:false} as any),'integrity_mismatch')
  }))
  test('LATEST C missing read target cannot conceal another claimed identity corruption '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    assert.equal((await f.service.propose(f.request)).kind,'eligible')
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
    await latestCandidateFailure(f,f.request,'history')
    expectCode(await f.service.readExact(f.request,'transition-proposal-missing-read-target'),'integrity_mismatch')
  }))
}
for(const wasm of [false,true])test('LATEST A invalid supplied shape still exposes explicit persisted integrity '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
  const request={...f.request};delete request.proposalId
  const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
  await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({proposal_hash:'f'.repeat(64)}).execute())
  await latestCandidateFailure(f,request,'A')
  expectCode(await f.service.propose({...request,proposal:{proposalId:first.proposal.proposalId,unknown:true}}),'integrity_mismatch')
}))
for(const wasm of [false,true])for(const lower of ['A','B','C'] as const)
  test('LATEST audit governed oracle conflict precedes candidate '+lower+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};delete request.proposalId
    const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
    const changed=JSON.parse(JSON.stringify(first.proposal));changed.boundedSemantics.oracleIdentityHash='f'.repeat(64);changed.proposalHash=repairAuthorityHash('repair_proposals',changed)
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set(repairAuthorityRow('repair_proposals',changed) as any).execute())
    await latestCandidateFailure(f,request,lower)
    expectCode(await f.service.propose(request),'integrity_mismatch')
  }))
const latestBoundedChanges:[string,any][]=[['appArea','Other'],['sourceRoute','/other-source'],['targetRoute','/other-target'],
  ['preconditionIdentityHash','f'.repeat(64)],['oracleIdentityHash','f'.repeat(64)],['excludedFlowStepIndexes',[99]],['authenticationExpectationIdentityHash','f'.repeat(64)]]
for(const wasm of [false,true])for(const [field,value] of latestBoundedChanges)
  test('LATEST source-derived governed '+field+' conflicts before Stage A '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};delete request.proposalId
    const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
    const changed=JSON.parse(JSON.stringify(first.proposal));changed.boundedSemantics[field]=value;changed.proposalHash=repairAuthorityHash('repair_proposals',changed)
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set(repairAuthorityRow('repair_proposals',changed) as any).execute())
    await latestCandidateFailure(f,request,'A')
    expectCode(await f.service.propose(request),'integrity_mismatch')
  }))
for(const wasm of [false,true]) {
  for(const origin of ['generated','caller'] as const)test('WITNESS origin '+origin+' and exact replay '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};if(origin==='generated')delete request.proposalId;else request.proposalId='transition-proposal-'+ 'a'.repeat(24);
    const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture');
    const witness=JSON.parse((await all('repair_proposal_identity_authorities'))[0].canonical_payload);
    assert.equal(witness.originKind,origin);assert.equal(witness.proposalHashAtCreation,first.proposal.proposalHash);
    assert.equal(Object.hasOwn(witness,'expectedCandidateSetHash'),origin==='generated');
    const before=await all('repair_proposal_identity_authorities');
    for(const reopen of [false,true]){if(reopen){await closeDb();await openProjectDatabase(createWorkspace(f.root))}
      const replay=await f.service.propose(request);assert.equal(replay.kind,'eligible');if(replay.kind==='eligible')assert.equal(replay.replay,true);
      assert.equal((await f.service.readExact(request,first.proposal.proposalId)).kind,'eligible');assert.deepEqual(await all('repair_proposal_identity_authorities'),before);
    }
    await latestCandidateFailure(f,request,'history');expectCode(await f.service.propose(request),'historical_authority_mismatch');
  }));
  for(const starting of ['generated','caller'] as const)test('WITNESS same ID different origin '+starting+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const generated={...f.request};delete generated.proposalId;
    const result=await f.service.evaluate(generated);assert.equal(result.kind,'eligible');if(result.kind!=='eligible')throw Error('fixture');
    const caller={...generated,proposalId:result.proposal.proposalId};
    assert.equal((await f.service.propose(starting==='generated'?generated:caller)).kind,'eligible');
    expectCode(await f.service.propose(starting==='generated'?caller:generated),'integrity_mismatch');
  }));
  const attacks=['proposal set','proposal rehashed set','witness set','witness rehashed set','witness creation hash','proposal count','proposal enumerator','proposal candidate','missing witness','missing proposal'] as const;
  for(const attack of attacks)for(const lower of ['unavailable source','history'] as const)test('WITNESS single-row '+attack+' + '+lower+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const request={...f.request};delete request.proposalId;assert.equal((await f.service.propose(request)).kind,'eligible');
    if(lower==='unavailable source')request.sourceDefinitionAuthority={...request.sourceDefinitionAuthority,testSetRowId:99999};else await latestCandidateFailure(f,request,'history');
    const isWitness=attack.startsWith('witness')||attack==='missing witness',table=isWitness?'repair_proposal_identity_authorities':'repair_proposals';
    const row=(await all(table))[0],value=JSON.parse(row.canonical_payload);
    await corrupt(table,async()=>{
      if(attack.startsWith('missing')){await (getDb() as any).deleteFrom(table).execute();return}
      if(isWitness){
        if(attack==='witness creation hash')value.proposalHashAtCreation='f'.repeat(64);else value.expectedCandidateSetHash='f'.repeat(64);
        if(attack==='witness rehashed set')value.identityAuthorityHash=proposalIdentityAuthorityHash(value);
        await (getDb() as any).updateTable(table).set({canonical_payload:canonicalJson(value),expected_candidate_set_hash:value.expectedCandidateSetHash,
          proposal_hash_at_creation:value.proposalHashAtCreation,identity_authority_hash:value.identityAuthorityHash}).execute();
      }else{
        if(attack==='proposal count')value.derivedSuccessorCount=2;
        else if(attack==='proposal enumerator')value.enumeratorVersion='wrong';
        else if(attack==='proposal candidate')value.candidate.selector.value='altered';
        else value.candidateSetHash='f'.repeat(64);
        if(attack!=='proposal set')value.proposalHash=repairAuthorityHash('repair_proposals',value);
        // CHECK constraints still protect count/version columns; corrupt only payload for those attacks.
        const values=attack==='proposal count'||attack==='proposal enumerator'?{canonical_payload:canonicalJson(value)}:
          {...repairAuthorityRow('repair_proposals',{...value,proposalHash:repairAuthorityHash('repair_proposals',value)}),canonical_payload:canonicalJson(value),proposal_hash:value.proposalHash};
        await getDb().updateTable('repair_proposals').set(values as any).execute();
      }
    });
    const before=await all(table);expectCode(await f.service.propose(request),'integrity_mismatch');assert.deepEqual(await all(table),before);
    await closeDb();await assert.rejects(openProjectDatabase(createWorkspace(f.root)),/Migration 03[67]|Migration 036|Migration 037|migration.*03[67]|proposal identity/i);
  }));
}

for(const wasm of [false,true])test('WITNESS self-consistent origin rewrite remains single-row detectable '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
 const request={...f.request};delete request.proposalId;const first=await f.service.propose(request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture');
 const changed=captureProposalIdentityAuthority(first.proposal,'caller');
 await corrupt('repair_proposal_identity_authorities',()=>getDb().updateTable('repair_proposal_identity_authorities').set(proposalIdentityAuthorityRow(changed)).execute());
 await latestCandidateFailure(f,request,'history');
 // Even a caller request cannot hide the changed witness behind its new origin.
 expectCode(await f.service.propose({...request,proposalId:first.proposal.proposalId}),'integrity_mismatch');
}));
for(const wasm of [false,true])test('WITNESS caller ID without generated prefix '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
 const request={...f.request,proposalId:'rp_abc'};const r=await f.service.propose(request);assert.equal(r.kind,'eligible');
 assert.equal(JSON.parse((await all('repair_proposal_identity_authorities'))[0].canonical_payload).originKind,'caller');
 assert.equal((await f.service.propose(request)).kind,'eligible');
}));

for(const wasm of [false,true])for(const c of [0,2])for(const mismatch of [false,true])test('WITNESS Product candidate membership C='+c+' mismatch='+mismatch+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
 const request=JSON.parse(JSON.stringify(f.request));
 if(c===0)await latestCandidateFailure(f,request,'C');
 else {
  const row=await getDb().selectFrom('app_models').selectAll().where('id','=',request.candidate.modelRowId).executeTakeFirstOrThrow();
  const model=JSON.parse(row.model_json);model.flows.push(JSON.parse(JSON.stringify(model.flows[0])));
  await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute());
  request.candidate.modelContentHash=canonicalJsonSha256(model);
 }
 if(mismatch)request.candidate.selector.value='never-enumerated';
 const expected=mismatch?'candidate_not_governed':c===0?'candidate_semantics_unproven':'candidate_ambiguous';
 for(const reopen of [false,true]){if(reopen){await closeDb();await openProjectDatabase(createWorkspace(f.root))}expectCode(await f.service.propose(request),expected);}
 assert.deepEqual(await all('repair_proposals'),[]);assert.deepEqual(await all('repair_proposal_identity_authorities'),[]);
}));
for(const wasm of [false,true])for(const field of ['enumeratorVersion','derivedSuccessorCount','candidateSetHash','exact','candidate mismatch'])test('WITNESS Product enumerator C=2 '+field+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
 const first=await f.service.evaluate(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture');
 const request=JSON.parse(JSON.stringify(f.request)),proposal=first.proposal;
 const row=await getDb().selectFrom('app_models').selectAll().where('id','=',request.candidate.modelRowId).executeTakeFirstOrThrow();
 const model=JSON.parse(row.model_json);model.flows.push(JSON.parse(JSON.stringify(model.flows[0])));
 await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute());
 request.candidate.modelContentHash=canonicalJsonSha256(model);proposal.candidate=JSON.parse(JSON.stringify(request.candidate));
 const identities=enumeratePhysicalEndpointSlots(model).flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>physicalCandidateIdentity({...slot,strategy,strategyPosition})));
 proposal.derivedSuccessorCount=2;proposal.candidateSetHash=canonicalJsonSha256(identities);
 if(field==='enumeratorVersion')proposal.enumeratorVersion='wrong';
 if(field==='derivedSuccessorCount')proposal.derivedSuccessorCount=3;
 if(field==='candidateSetHash'||field==='candidate mismatch')proposal.candidateSetHash='f'.repeat(64);
 if(field==='candidate mismatch')request.candidate.selector.value='never-enumerated';
 proposal.proposalHash=repairAuthorityHash('repair_proposals',proposal);request.proposal=proposal;
 for(const reopen of [false,true]){if(reopen){await closeDb();await openProjectDatabase(createWorkspace(f.root))}
  expectCode(await f.service.propose(request),field==='exact'?'candidate_ambiguous':field==='candidate mismatch'?'candidate_not_governed':'candidate_semantics_unproven');}
 assert.deepEqual(await all('repair_proposals'),[]);assert.deepEqual(await all('repair_proposal_identity_authorities'),[]);
}));

for(const wasm of [false,true])test('WITNESS invalid proposal presence cannot invent caller origin '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
 const request={...f.request};delete request.proposalId;assert.equal((await f.service.propose(request)).kind,'eligible');
 for(const proposal of [false,0,'',null,[]])expectCode(await f.service.propose({...request,proposal} as any),'unsupported_contract_version');
 assert.equal((await all('repair_proposals')).length,1);assert.equal((await all('repair_proposal_identity_authorities')).length,1);
}));

for(const wasm of [false,true]) {
  test('COMPAT physical-only proposal and witness columns preserve logical replay '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
    for(const table of ['repair_proposals','repair_proposal_identity_authorities'])
      await sql.raw('ALTER TABLE '+table+' ADD COLUMN future_physical TEXT').execute(getDb())
    const before=(await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    const replay=await f.service.propose(f.request);assert.equal(replay.kind,'eligible');if(replay.kind==='eligible')assert.equal(replay.replay,true)
    const exact=await f.service.readExact(f.request,first.proposal.proposalId);assert.equal(exact.kind,'eligible');if(exact.kind==='eligible')assert.equal(exact.replay,true)
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n,before)
    expectCode(await f.service.propose({...f.request,proposal:{...first.proposal,unknownAuthority:true}}),'unsupported_contract_version')
  }))
  for(const history of ['valid','missing'])test('COMPAT physical pair hash corruption precedes '+history+' history '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
    const first=await f.service.propose(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture')
    await corrupt('repair_proposals',()=>getDb().updateTable('repair_proposals').set({identity_authority_hash:'f'.repeat(64)}).execute())
    if(history==='missing')await latestCandidateFailure(f,f.request,'history')
    let sourceCalls=0;(f.service as any).inspectProduct=async()=>{sourceCalls++;throw Error('must verify pair before source inspection')}
    expectCode(await f.service.propose(f.request),'integrity_mismatch')
    expectCode(await f.service.readExact(f.request,first.proposal.proposalId),'integrity_mismatch')
    assert.equal(sourceCalls,0)
  }))
}

const bhrCases = [
  ...[0,1,2].flatMap(c=>['XY','XX','ZX','XZ','ZZ','YX'].map(pair=>({c,pair,variant:'standard'}))),
  {c:0,pair:'XY',variant:'same-selector'},
  {c:2,pair:'XX',variant:'physical-duplicates'},
  {c:2,pair:'XY',variant:'wrong-enumerator'},
];
for(const wasm of [false,true])for(const {c,pair,variant} of bhrCases)test('BHR-01 Product '+pair+' C='+c+' '+variant+' '+(wasm?'WASM':'native'),()=>withBackend(wasm,async f=>{
  const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
  const first=await f.service.evaluate(f.request);assert.equal(first.kind,'eligible');if(first.kind!=='eligible')throw Error('fixture');
  const request=clone(f.request),proposal=clone(first.proposal);
  const row=await getDb().selectFrom('app_models').selectAll().where('id','=',request.candidate.modelRowId).executeTakeFirstOrThrow();
  const model=JSON.parse(row.model_json),distinctFlows=c===1||variant==='same-selector';
  if(distinctFlows){model.flows.push(clone(model.flows[0]));model.flows[1].displayName='Different governed flow';}
  else model.pages[0].elements[0].strategies.push({...clone(model.pages[0].elements[0].strategies[0]),value:variant==='physical-duplicates'?'checkout-new':'second-checkout'});
  if(c===0)model.pages[0].displayName='Semantic drift';
  assert.equal(validateAppModelObject(model).valid,true);
  await corrupt('app_models',()=>getDb().updateTable('app_models').set({model_json:JSON.stringify(model)}).where('id','=',row.id).execute());
  request.candidate.modelContentHash=canonicalJsonSha256(model);request.candidate.flowContentHash=canonicalJsonSha256(model.flows[0]);
  request.candidate.sourceSubjectContentHash=canonicalJsonSha256(model.pages[0]);request.candidate.elementContentHash=canonicalJsonSha256(model.pages[0].elements[0]);
  const x=clone(request.candidate),y=clone(x),z=clone(x);
  if(distinctFlows)y.flowContentHash=canonicalJsonSha256(model.flows[1]);else y.selector.value='second-checkout';
  z.selector.value='not-in-stage-b';
  const baseline=await f.service.evaluate(request);assert.equal(baseline.counts.b,2);assert.equal(baseline.counts.c,c);
  if(c===1)assert.equal(baseline.kind,'eligible');else expectCode(baseline,c===0?'candidate_semantics_unproven':'candidate_ambiguous');
  const candidates:{[key:string]:any}={X:x,Y:y,Z:z};request.candidate=clone(candidates[pair[0]]);proposal.candidate=clone(candidates[pair[1]]);
  const members=enumeratePhysicalEndpointSlots(model).flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>({...slot,strategy,strategyPosition})));
  const complete=c===1?members.filter(value=>value.flowPosition===0):members;
  proposal.derivedSuccessorCount=complete.length;proposal.candidateSetHash=canonicalJsonSha256(complete.map(physicalCandidateIdentity));
  if(variant==='wrong-enumerator')proposal.enumeratorVersion='wrong';
  proposal.proposalHash=repairAuthorityHash('repair_proposals',proposal);request.proposal=proposal;
  if(variant==='same-selector'||c===1){assert.deepEqual(x.selector,y.selector);assert.equal(x.elementId,y.elementId);assert.notEqual(x.flowContentHash,y.flowContentHash);}
  const before=clone(request);
  for(const reopen of [false,true]){
    if(reopen){await closeDb();await openProjectDatabase(createWorkspace(f.root));}
    const result=await f.service.propose(request);assert.deepEqual(request,before);
    if(pair==='XX'&&c===1){assert.equal(result.kind,'eligible');if(result.kind==='eligible'){assert.deepEqual(result.proposal,proposal);assert.equal(result.replay,reopen);}
      const stored=await all('repair_proposals'),witnesses=await all('repair_proposal_identity_authorities');
      const exact=await f.service.readExact(request,proposal.proposalId);assert.equal(exact.kind,'eligible');if(exact.kind==='eligible')assert.equal(exact.replay,true);
      assert.deepEqual(await all('repair_proposals'),stored);assert.deepEqual(await all('repair_proposal_identity_authorities'),witnesses);
    }else{expectCode(result,pair==='XX'?(c===0?'candidate_semantics_unproven':'candidate_ambiguous'):'candidate_not_governed');assert.deepEqual(await all('repair_proposals'),[]);assert.deepEqual(await all('repair_proposal_identity_authorities'),[]);}
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[]);
  }
}));
