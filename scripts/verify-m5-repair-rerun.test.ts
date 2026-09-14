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
import { openProjectDatabase } from '../src/core/storage/DatabaseFactory'
import { createWorkspace } from '../src/core/workspace/WorkspaceManager'
import { runMigrations } from '../src/core/storage/migrate'
import { createHash } from 'node:crypto'
import { closeDb, getDb } from '../src/core/storage/db'
import { ExecutionService, executionIntentFingerprint } from '../src/core/execution/ExecutionService'
import { ExecutionRepository, type BeginExecutionInput } from '../src/core/storage/repositories/ExecutionRepository'
import { TestResultRepository } from '../src/core/storage/repositories/TestResultRepository'
import { repairAuthorityHash, repairAuthorityRow } from '../src/core/storage/RepairAuthorityValidation'
import { RepairAuthorityRepository } from '../src/core/storage/repositories/RepairAuthorityRepository'
import { ExecutionResultProjectionService } from '../src/core/execution/ExecutionResultProjectionService'
import { createRepairRerunFixture, allRepairRows, repairReady, repairClock, completedRepairOutcome, captureRepairHistory, assertRepairHistoryPreserved } from './helpers/m5-rerun-fixture'
type Fixture=Awaited<ReturnType<typeof createRepairRerunFixture>>
async function withFixture(run:(f:Fixture)=>Promise<void>,options:Parameters<typeof createRepairRerunFixture>[1]={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-chunk5-'))
  try {await run(await createRepairRerunFixture(root,options))}
  finally {await closeDb();assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-chunk5-'));fs.rmSync(root,{recursive:true,force:true})}
}
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v))
function service(extra:ConstructorParameters<typeof ExecutionService>[0]={}) {return new ExecutionService({now:repairClock(),runnerReadiness:repairReady,
  executor:{execute:async()=>completedRepairOutcome()},...extra})}

for(const sourceSuite of [false,true])test('M5-C5-01 canonical governed rerun, exact evidence, history and replay '+(sourceSuite?'Suite source':'direct source'),async()=>{
  await withFixture(async f=>{
    const history=await captureRepairHistory();let calls=0
    const engine=service({executor:{execute:async plan=>{calls++;assert.equal(plan.definitionId,f.materialized.testSet.definitions[0].id);return completedRepairOutcome()}}})
    const result=await engine.start(f.startRequest)
    assert.equal(result.kind,'accepted',JSON.stringify(result));if(result.kind!=='accepted')throw Error('acceptance')
    await result.completion
    const results=(await allRepairRows('test_results')).filter((r:any)=>r.result_id!==f.sourceResult.result_id)
    assert.equal(results.length,1);assert.equal(results[0].status,'passed');assert.notEqual(results[0].result_id,f.sourceResult.result_id)
    const links=await allRepairRows('repair_rerun_links');assert.equal(links.length,1)
    const link=await new RepairAuthorityRepository().readRerunExact(f.project,links[0].rerun_link_id)
    assert.equal(link?.executionAuthority.resultId,results[0].result_id)
    assert.equal(link?.resultingDefinitionAuthority.testSetRowId,f.materialized.rowId)
    const projection=await new ExecutionResultProjectionService().read(f.project,result.executionId)
    assert.equal(projection.kind,'ok',JSON.stringify(projection))
    const replay=await engine.start(f.startRequest);assert.equal(replay.kind,'accepted');if(replay.kind==='accepted'){assert.equal(replay.replayed,true);assert.equal(replay.executionId,result.executionId)}
    assert.equal(calls,1);assert.equal((await allRepairRows('execution_repair_bindings')).length,1)
    assert.deepEqual((await sql.raw('PRAGMA foreign_key_check').execute(getDb())).rows,[])
    await assertRepairHistoryPreserved(history)
  },{sourceSuite})
})

test('M5-C5-02 hostile public requests leave no acceptance or lifecycle',async()=>withFixture(async f=>{
  const history=await captureRepairHistory(),before=await allRepairRows('executions');let calls=0
  const engine=service({executor:{execute:async()=>{calls++;return completedRepairOutcome()}}})
  const cases:Array<[string,(r:any)=>void]>=[
    ['missing runtime',r=>delete r.runtime],['null runtime',r=>r.runtime=null],['invalid URL',r=>r.runtime.baseUrl='file:///host'],
    ['secret URL',r=>r.runtime.baseUrl='http://user:secret@localhost'],['unknown runtime',r=>r.runtime.command='bad'],
    ['missing credential reference',r=>delete r.credentialReference],['mixed suite',r=>r.selection.suiteId='foreign'],
    ['unknown selection',r=>r.selection.autonomousApproval=true],['foreign proposal',r=>r.selection.materialization.request.proposalId='foreign'],
    ['altered proposal hash',r=>r.selection.materialization.supersession.proposalAuthority.proposalHash='f'.repeat(64)],
    ['foreign materialization',r=>r.selection.materialization.repairOriginId='foreign'],
    ['foreign output',r=>r.selection.resultingDefinitionAuthority.testSetRowId=701],
    ['foreign original execution',r=>r.selection.originalEvidence.executionId='foreign'],
    ['foreign original Run',r=>r.selection.originalEvidence.runId='foreign'],['foreign original Result',r=>r.selection.originalEvidence.resultId='foreign'],
    ['foreign item',r=>r.selection.originalEvidence.itemOrdinal=2],['foreign plan',r=>r.selection.originalEvidence.planHash='f'.repeat(64)],
    ['foreign diagnostic',r=>r.selection.originalEvidence.evidenceHash='f'.repeat(64)],
    ['unknown original field',r=>r.selection.originalEvidence.approved=true],
  ]
  for(const [name,mutate] of cases){const request:any=clone(f.startRequest);mutate(request);const result=await engine.start(request);assert.equal(result.kind,'rejected',name+': '+JSON.stringify(result));assert.equal((await allRepairRows('executions')).length,before.length,name)}
  assert.equal(calls,0);assert.equal((await allRepairRows('execution_repair_bindings')).length,0);await assertRepairHistoryPreserved(history)
}))

for(const [name,outcome,status] of [
  ['oracle failed',{status:'oracle_failed',reasonCode:'oracle_failed',finalUrl:'http://localhost/cart.html',navigationUrl:'http://localhost/cart.html',targetCardinality:'one'},'failed'],
  ['target missing',{status:'action_failed',reasonCode:'action_failed',navigationUrl:'http://localhost/cart.html',targetCardinality:'zero'},'could_not_verify'],
  ['authentication failed',{status:'authentication_failed',reasonCode:'authentication_failed'},'could_not_verify'],
  ['browser unavailable',{status:'executor_failure',reasonCode:'executor_failure',failureClass:'browser_session_unavailable'},'could_not_verify'],
] as const)test('M5-C5-03 truthful canonical outcome '+name,async()=>withFixture(async f=>{
  const history=await captureRepairHistory();const result=await service({executor:{execute:async()=>outcome}}).start(f.startRequest)
  assert.equal(result.kind,'accepted',JSON.stringify(result));if(result.kind!=='accepted')throw Error('acceptance');await result.completion
  const rows=(await allRepairRows('test_results')).filter((r:any)=>r.result_id!==f.sourceResult.result_id)
  assert.equal(rows.length,1);assert.equal(rows[0].status,status);assert.equal((await allRepairRows('repair_rerun_links')).length,1)
  assert.equal((await new ExecutionResultProjectionService().read(f.project,result.executionId)).kind,'ok');await assertRepairHistoryPreserved(history)
}))

for(const kind of ['thrown','cancelled'] as const)test('M5-C5-04 no fabricated Result or retry after '+kind,async()=>withFixture(async f=>{
  const history=await captureRepairHistory();let calls=0
  const engine=service({executor:{execute:async()=>{calls++;if(kind==='thrown')throw Error('controlled fixture fault');return {status:'cancelled',reasonCode:'cancellation_requested'}}}})
  const result=await engine.start(f.startRequest);assert.equal(result.kind,'accepted');if(result.kind!=='accepted')throw Error('acceptance');await result.completion
  assert.equal((await allRepairRows('test_results')).length,1);assert.equal((await allRepairRows('repair_rerun_links')).length,0)
  const replay=await engine.start(f.startRequest);assert.equal(replay.kind,'accepted');assert.equal(calls,1)
  assert.equal((await allRepairRows('runs')).filter((r:any)=>r.execution_id===result.executionId).length,1);await assertRepairHistoryPreserved(history)
}))

test('M5-C5-05 concurrent identical repair intent and conflicting replay',async()=>withFixture(async f=>{
  let calls=0;const engine=service({executor:{execute:async()=>{calls++;return completedRepairOutcome()}}})
  const [a,b]=await Promise.all([engine.start(f.startRequest),engine.start(f.startRequest)])
  assert.equal(a.kind,'accepted');assert.equal(b.kind,'accepted');if(a.kind!=='accepted'||b.kind!=='accepted')throw Error('acceptance');await a.completion
  assert.equal(a.executionId,b.executionId);assert.equal(calls,1)
  const changed:any=clone(f.startRequest);changed.selection.originalEvidence.planHash='f'.repeat(64)
  assert.equal((await engine.start(changed)).kind,'rejected')
  const ordinary:any={...f.startRequest,selection:undefined,definitionIds:[f.materialized.testSet.definitions[0].id],revision:f.materialized.testSet.revision}
  assert.equal((await engine.start(ordinary)).kind,'rejected')
}))

test('M5-C5-06 repair cannot be manufactured from a passing original Result',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-chunk5-'))
  try {const f=await createRepairRerunFixture(root,{sourceExecutor:{execute:async()=>completedRepairOutcome()}});assert.equal(f.sourceResult.status,'passed');assert.equal((await service().start(f.startRequest)).kind,'rejected');assert.equal((await allRepairRows('execution_repair_bindings')).length,0)}
  finally{await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})

test('M5-C5-07 raw acceptance cannot substitute exact proposal or materialization request',async()=>withFixture(async f=>{
  const accepted=await service().start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  const db=getDb(),root=await db.selectFrom('executions').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  const binding=await db.selectFrom('execution_repair_bindings').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  const item=await db.selectFrom('execution_items').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  const authority=await db.selectFrom('execution_item_authorities').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  const cases:Array<[string,(s:any)=>void]>=[['proposal ID',s=>s.materialization.request.proposalId='unrelated-proposal-id'],
    ['source endpoint',s=>s.materialization.request.source.modelVersion='foreign'],['candidate endpoint',s=>s.materialization.request.candidate.modelVersion='foreign'],
    ['proposal timestamp',s=>s.materialization.request.proposedAt='2026-09-01T12:01:00.001Z'],['generation ID',s=>s.materialization.generationId='foreign'],
    ['generation timestamp',s=>s.materialization.generatedAt='2026-09-01T12:01:03.001Z'],
    ['unsupported contract version',s=>s.materialization.request.contractVersion='unsupported-contract-version'],
    ['unsupported repair kind',s=>s.materialization.request.repairKind='route_replacement']]
  let n=0
  for(const [name,mutate] of cases){const selection=clone(f.selection);mutate(selection);const id='execution-hostile-'+(++n)
    const fingerprint=executionIntentFingerprint({projectId:f.project,definitionIds:[],repairSelection:selection})
    await assert.rejects(db.transaction().execute(async trx=>{
      await trx.insertInto('executions').values({...root,execution_id:id,repair_binding_id:id,execution_intent_key:'hostile-'+n,execution_intent_fingerprint:fingerprint}).execute()
      await trx.insertInto('execution_repair_bindings').values({...binding,execution_id:id,request_fingerprint:fingerprint,selection_json:JSON.stringify(selection)}).execute()
      await trx.insertInto('execution_items').values({...item,execution_id:id}).execute()
      await trx.insertInto('execution_item_authorities').values({...authority,execution_id:id}).execute()
    }),/Governed repair acceptance binding is invalid/,name)
    assert.equal(await db.selectFrom('executions').select('execution_id').where('execution_id','=',id).executeTakeFirst(),undefined)
  }
}))

test('M5-C5-08 accepted repair binding and original evidence are revalidated before replay',async()=>withFixture(async f=>{
  const engine=service(),accepted=await engine.start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  const db=getDb();const triggers=await sql<{name:string}>`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='diagnostic_evidence'`.execute(db)
  for(const row of triggers.rows)await sql.raw('DROP TRIGGER "'+row.name+'"').execute(db)
  await db.updateTable('diagnostic_evidence').set({evidence_hash:'f'.repeat(64)}).where('result_id','=',f.sourceResult.result_id).execute()
  const count=(await allRepairRows('runs')).length
  assert.equal((await engine.start(f.startRequest)).kind,'rejected');assert.equal((await allRepairRows('runs')).length,count)
  await assert.rejects(new ExecutionRepository().verifyRepairReplay(accepted.executionId,f.root,f.selection))
}))

test('M5-C5-09 binding immutability, missing reciprocal root and ordinary admission remain distinct',async()=>withFixture(async f=>{
  const accepted=await service().start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  const db=getDb(),binding=await db.selectFrom('execution_repair_bindings').selectAll().executeTakeFirstOrThrow()
  await assert.rejects(db.updateTable('execution_repair_bindings').set({original_result_id:'foreign'}).where('execution_id','=',accepted.executionId).execute(),/immutable/)
  await assert.rejects(db.deleteFrom('execution_repair_bindings').where('execution_id','=',accepted.executionId).execute(),/immutable/)
  await assert.rejects(db.insertInto('execution_repair_bindings').values(binding).execute(),/immutable|invalid/)
  const root=await db.selectFrom('executions').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  await assert.rejects(db.insertInto('executions').values({...root,execution_id:'unbound-root',repair_binding_id:'unbound-root',execution_intent_key:'unbound-root'}).execute(),/FOREIGN KEY/)
  const historical=await new RepairAuthorityRepository().readRerunExact(f.project,(await allRepairRows('repair_rerun_links'))[0].rerun_link_id)
  assert.ok(historical)
}))

for(const wasm of [false,true])test('M5-C5-10 native/WASM durable repair reread '+wasm,async()=>{
  const Module=require('node:module'),load=Module._load;let forced=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){forced++;throw Error('Forced WASM fixture')}return load.call(this,name,...args)}
  try{await withFixture(async f=>{
    const accepted=await service().start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
    const history=await captureRepairHistory(),bindings=await allRepairRows('execution_repair_bindings'),links=await allRepairRows('repair_rerun_links')
    await closeDb();await openProjectDatabase(createWorkspace(f.root));await runMigrations()
    const replay=await service().start(f.startRequest);assert.equal(replay.kind,'accepted',JSON.stringify(replay));if(replay.kind==='accepted')assert.equal(replay.executionId,accepted.executionId)
    assert.deepEqual(await allRepairRows('execution_repair_bindings'),bindings);assert.deepEqual(await allRepairRows('repair_rerun_links'),links)
    await assertRepairHistoryPreserved(history);if(wasm)assert.ok(forced>=2)
  })}finally{Module._load=load}
})

test('M5-C5-11 existing execution fingerprint preimages remain byte-identical',()=>{
  const inputs:any[]=[{projectId:'project',definitionIds:['b','a']},{projectId:'project',definitionIds:['a'],revision:3},
    {projectId:'project',definitionIds:['a'],suiteAuthority:{suiteId:'suite',revision:2,contentHash:'f'.repeat(64),members:[{definitionAuthority:{testSetId:'set',testSetRevision:4,testSetContentHash:'e'.repeat(64)}}]}}]
  for(const i of inputs){const a=i.suiteAuthority;const legacy={schemaVersion:a?2:1,projectId:i.projectId,selection:a?{kind:'suite_revision',suiteId:a.suiteId,suiteRevision:a.revision,suiteContentHash:a.contentHash,testSetId:a.members[0].definitionAuthority.testSetId,testSetRevision:a.members[0].definitionAuthority.testSetRevision,testSetContentHash:a.members[0].definitionAuthority.testSetContentHash}:undefined,revision:i.revision??null,definitionIds:i.definitionIds}
    assert.equal(executionIntentFingerprint(i),createHash('sha256').update(JSON.stringify(legacy)).digest('hex'))}
})

for(const table of ['execution_repair_bindings','execution_items','runs','test_results','diagnostic_evidence','repair_rerun_links'])test('M5-C5-13 atomic persistence fault at '+table,async()=>withFixture(async f=>{
  const history=await captureRepairHistory(),db=getDb(),before=(await allRepairRows('executions')).length
  const accepted=await service({migrate:async()=>{await runMigrations();await sql.raw('CREATE TRIGGER fixture_failure BEFORE INSERT ON '+table+" BEGIN SELECT RAISE(ABORT,'controlled fixture persistence failure'); END").execute(db)}}).start(f.startRequest)
  if(['execution_repair_bindings','execution_items'].includes(table)){assert.equal(accepted.kind,'rejected');assert.equal((await allRepairRows('executions')).length,before);assert.equal((await allRepairRows('execution_repair_bindings')).length,0)}
  else {assert.equal(accepted.kind,'accepted');if(accepted.kind==='accepted')await accepted.completion;assert.equal((await allRepairRows('test_results')).length,1);assert.equal((await allRepairRows('diagnostic_evidence')).length,1);assert.equal((await allRepairRows('repair_rerun_links')).length,0)}
  await assertRepairHistoryPreserved(history)
}))

test('M5-C5-14 repository refuses forged manifests, missing repair discriminator, and caller transactions',async()=>withFixture(async f=>{
  let captured:BeginExecutionInput|undefined
  class Capture extends ExecutionRepository {override async beginExecution(input:BeginExecutionInput){captured=clone(input);return super.beginExecution(input)}}
  const accepted=await service({repository:new Capture()}).start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  assert.ok(captured);const repo=new ExecutionRepository(),before=(await allRepairRows('executions')).length
  const ordinary=clone(captured!);delete ordinary.repair;await assert.rejects(repo.beginExecution(ordinary))
  for(const field of ['oracleSubjectId','executablePlanHash','itemOrdinal'] as const){const bad=clone(captured!);bad.executionId='forged-'+field;bad.executionIntentKey='forged-'+field;(bad.manifestItems[0] as any)[field]=field==='itemOrdinal'?2:field==='executablePlanHash'?'f'.repeat(64):'foreign';await assert.rejects(repo.beginExecution(bad))}
  await getDb().transaction().execute(async trx=>{const nested=new ExecutionRepository(()=>trx);await assert.rejects(nested.beginExecution(captured!),/repair_transaction_unsupported/);await assert.rejects(nested.verifyRepairReplay(accepted.executionId,f.root,f.selection),/repair_transaction_unsupported/)})
  await sql.raw('BEGIN IMMEDIATE').execute(getDb());try{await assert.rejects(repo.beginExecution(captured!));assert.equal((await sql.raw('SELECT 1 AS alive').execute(getDb())).rows.length,1)}finally{await sql.raw('ROLLBACK').execute(getDb())}
  assert.equal((await allRepairRows('executions')).length,before)
}))

test('M5-C5-15 late materialization refusal retains frozen code and counts',async()=>withFixture(async f=>{
  class Late extends ExecutionRepository {override async beginExecution(input:BeginExecutionInput){
    const changed=clone(input);changed.repair!.selection.materialization.generatedAt='2026-09-01T12:01:03.001Z'
    return super.beginExecution(changed)
  }}
  const result=await service({repository:new Late()}).start(f.startRequest)
  assert.equal(result.kind,'rejected');if(result.kind==='rejected')assert.ok(result.repairRefusal,JSON.stringify(result))
  assert.equal((await allRepairRows('execution_repair_bindings')).length,0)
}))

test('M5-C5-16 Result repository and historical-link crosswire escapes roll back in either insertion order',async()=>withFixture(async f=>{
  const first=await service().start(f.startRequest);assert.equal(first.kind,'accepted');if(first.kind!=='accepted')throw Error('acceptance');await first.completion
  const template=(await allRepairRows('test_results')).find((r:any)=>r.result_id!==f.sourceResult.result_id)
  const templateLink=JSON.parse((await allRepairRows('repair_rerun_links'))[0].canonical_payload)
  const {selection,...ordinaryFields}=f.startRequest as any
  const ordinary=await service().start({...ordinaryFields,executionIntentKey:'ordinary-repaired-definition',definitionIds:[f.materialized.testSet.definitions[0].id],revision:f.materialized.testSet.revision})
  assert.equal(ordinary.kind,'accepted',JSON.stringify(ordinary));if(ordinary.kind!=='accepted')throw Error('ordinary');await ordinary.completion
  const ordinaryRun=(await allRepairRows('runs')).find((r:any)=>r.execution_id===ordinary.executionId)
  const ordinaryResult=(await allRepairRows('test_results')).find((r:any)=>r.run_id===ordinaryRun.run_id);assert.equal(ordinaryResult.repair_rerun_link_id,null)
  let entered!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve)
  const engine=service({executor:{execute:async()=>{entered();await held;return completedRepairOutcome()}}})
  const accepted=await engine.start({...f.startRequest,executionIntentKey:'second-governed-repair'});assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('second');await started
  try{
    const run=(await allRepairRows('runs')).find((r:any)=>r.execution_id===accepted.executionId),{id,...copy}=template
    const forged:any={...copy,run_id:run.run_id,result_id:'hostile-result',repair_rerun_link_id:'hostile-future-link'}
    const repo=new TestResultRepository();await assert.rejects(repo.insert({...forged,repair_rerun_link_id:null}),/atomic evidence link/)
    await assert.rejects(repo.insertBatch([{...forged,repair_rerun_link_id:null}]),/atomic evidence link/)
    await assert.rejects(repo.insert(forged),/FOREIGN KEY/)
    await assert.rejects(repo.insert({...forged,repair_rerun_link_id:templateLink.rerunLinkId}),/cannot reuse historical/)
    const link=clone(templateLink);link.rerunLinkId='hostile-future-link';link.executionAuthority.executionId=ordinary.executionId;link.executionAuthority.runId=ordinaryRun.run_id;link.executionAuthority.resultId=ordinaryResult.result_id
    link.persistedAuthorities.execution.executionId=ordinary.executionId;link.persistedAuthorities.run.executionId=ordinary.executionId;link.persistedAuthorities.run.runId=ordinaryRun.run_id;link.persistedAuthorities.result.runId=ordinaryRun.run_id;link.persistedAuthorities.result.resultId=ordinaryResult.result_id
    link.rerunLinkHash=repairAuthorityHash('repair_rerun_links',link)
    for(const linkFirst of [false,true])await assert.rejects(getDb().transaction().execute(async trx=>{
      if(linkFirst)await trx.insertInto('repair_rerun_links').values(repairAuthorityRow('repair_rerun_links',link) as any).execute()
      await repo.insert(forged,trx)
      if(!linkFirst)await trx.insertInto('repair_rerun_links').values(repairAuthorityRow('repair_rerun_links',link) as any).execute()
    }),/exact referencing Result|cannot reuse historical/)
    assert.equal((await allRepairRows('test_results')).filter((r:any)=>r.run_id===run.run_id).length,0)
  }finally{release();await accepted.completion}
  assert.equal((await allRepairRows('repair_rerun_links')).length,2)
}))

for(const [table,column,value] of [['repair_proposals','canonical_payload','{}'],['app_model_transition_supersessions','canonical_payload','{}'],['repair_revision_origins','canonical_payload','{}'],['diagnostic_evidence','evidence_json','{}']] as const)test('M5-C5-17 corrupted committed '+table+' cannot initiate repair',async()=>withFixture(async f=>{
  const db=getDb(),before=(await allRepairRows('executions')).length
  const engine=service({migrate:async()=>{await runMigrations();const guards=await sql<{name:string}>`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=${table}`.execute(db)
    for(const guard of guards.rows)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(db)
    await (db as any).updateTable(table).set({[column]:value}).execute()
  }})
  assert.equal((await engine.start(f.startRequest)).kind,'rejected');assert.equal((await allRepairRows('executions')).length,before);assert.equal((await allRepairRows('execution_repair_bindings')).length,0)
}))

test('M5-C5-18 missing committed original diagnostic refuses without manufacturing evidence',async()=>withFixture(async f=>{
  const db=getDb(),engine=service({migrate:async()=>{await runMigrations();const guards=await sql<{name:string}>`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='diagnostic_evidence'`.execute(db)
    for(const guard of guards.rows)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(db)
    await db.deleteFrom('diagnostic_evidence').where('result_id','=',f.sourceResult.result_id).execute()
  }})
  assert.equal((await engine.start(f.startRequest)).kind,'rejected');assert.equal((await allRepairRows('test_results')).length,1);assert.equal((await allRepairRows('execution_repair_bindings')).length,0)
}))

test('M5-C5-19 unchanged-upstream forged canonical plan SQL admission is refused',async()=>withFixture(async f=>{
  const accepted=await service().start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  const db=getDb(),root=await db.selectFrom('executions').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow(),binding=await db.selectFrom('execution_repair_bindings').selectAll().executeTakeFirstOrThrow()
  const item=await db.selectFrom('execution_items').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow(),authority=await db.selectFrom('execution_item_authorities').selectAll().where('execution_id','=',accepted.executionId).executeTakeFirstOrThrow()
  const id='forged-plan-execution',hash='f'.repeat(64)
  await assert.rejects(db.transaction().execute(async trx=>{
    await trx.insertInto('executions').values({...root,execution_id:id,repair_binding_id:id,execution_intent_key:'forged-plan-intent',manifest_hash:hash}).execute()
    await trx.insertInto('execution_repair_bindings').values({...binding,execution_id:id,plan_hash:hash}).execute()
    await trx.insertInto('execution_items').values({...item,execution_id:id,executable_plan_hash:hash}).execute()
    await trx.insertInto('execution_item_authorities').values({...authority,execution_id:id}).execute()
  }),/Governed repair acceptance binding is invalid/)
  assert.equal(await db.selectFrom('executions').select('execution_id').where('execution_id','=',id).executeTakeFirst(),undefined)
  const replay=await service().start(f.startRequest);assert.equal(replay.kind,'accepted');if(replay.kind==='accepted')assert.equal(replay.executionPlanHash,accepted.executionPlanHash)
}))

for(const column of ['executable_plan_hash','oracle_subject_id'])test('M5-C5-20 stored manifest '+column+' corruption refuses all repair replay',async()=>withFixture(async f=>{
  const engine=service(),accepted=await engine.start(f.startRequest);assert.equal(accepted.kind,'accepted');if(accepted.kind!=='accepted')throw Error('acceptance');await accepted.completion
  const db=getDb(),guards=await sql<{name:string}>`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='execution_items'`.execute(db)
  for(const guard of guards.rows)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(db)
  await db.updateTable('execution_items').set({[column]:column==='executable_plan_hash'?'f'.repeat(64):'foreign'}).where('execution_id','=',accepted.executionId).execute()
  await assert.rejects(new ExecutionRepository().verifyRepairReplay(accepted.executionId,f.root,f.selection))
  assert.equal((await service({migrate:async()=>{}}).start(f.startRequest)).kind,'rejected')
}))
