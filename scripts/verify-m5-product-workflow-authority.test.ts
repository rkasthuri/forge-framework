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
import {test} from 'node:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {sql} from 'kysely'
import {closeDb,getDb,initDisposableDatabase} from '../src/core/storage/db'
import {runMigrations} from '../src/core/storage/migrate'
import {GovernedRepairWorkflowService} from '../src/core/healing/GovernedRepairWorkflowService'
import {RepairAuthorityRepository,isRepairWorkflowAdmission} from '../src/core/storage/repositories/RepairAuthorityRepository'
import {createRepairProductSourceFixture,allRepairRows,captureRepairHistory,assertRepairHistoryPreserved} from './helpers/m5-rerun-fixture'
import {openProjectDatabase} from '../src/core/storage/DatabaseFactory'
import {createWorkspace} from '../src/core/workspace/WorkspaceManager'
import {ExecutionService} from '../src/core/execution/ExecutionService'
import {repairClock,repairReady} from './helpers/m5-rerun-fixture'
import {completedRepairOutcome} from './helpers/m5-rerun-fixture'

async function fixture(body:(f:any,s:GovernedRepairWorkflowService)=>Promise<void>,options:Parameters<typeof createRepairProductSourceFixture>[1]={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-workflow-authority-'))
  try {const f=await createRepairProductSourceFixture(root,options);await body({...f,root},new GovernedRepairWorkflowService(root))}
  finally {await closeDb()}
}
async function create(f:any,s:GovernedRepairWorkflowService) {
  const context=await s.context(f.project,f.sourceResult.result_id)
  assert.equal(context.kind,'eligible');if(context.kind!=='eligible')throw Error('context')
  return s.create(f.project,f.sourceResult.result_id,{candidateModelRowId:context.candidateModelRowId})
}
test('workflow stale candidate removes promotion actions but permits explicit rejection and exact replay',async()=>fixture(async(f,s)=>{
  const {entry}=await create(f,s),before=await captureRepairHistory()
  await getDb().updateTable('app_models').set({status:'superseded'}).where('id','=',entry.request.candidate.modelRowId).execute()
  const view=await s.read(f.project,entry.entryId)
  assert.deepEqual(view.nextActions,['reject']);assert.equal(view.operationReadiness.state,'refused')
  await assert.rejects(()=>s.command(f.project,entry.entryId,{action:'approve',actorId:'operator'}))
  const rejected=await s.command(f.project,entry.entryId,{action:'reject',actorId:'operator'})
  assert.equal(rejected.decision?.decision,'reject');assert.deepEqual(rejected.nextActions,[])
  assert.deepEqual((await s.command(f.project,entry.entryId,{action:'reject',actorId:'operator'})).decision,rejected.decision)
  assert.equal((await s.create(f.project,f.sourceResult.result_id,{candidateModelRowId:entry.request.candidate.modelRowId})).replayed,true)
  delete before.app_models;await assertRepairHistoryPreserved(before)
}))
test('workflow proposal and association roll back together on insert failure and admission is cleared',async()=>fixture(async(f,s)=>{
  await sql.raw("CREATE TRIGGER fixture_entry_fault AFTER INSERT ON repair_workflow_entries BEGIN SELECT RAISE(ABORT,'injected entry fault'); END").execute(getDb())
  await assert.rejects(()=>create(f,s),/injected entry fault/)
  for(const table of ['repair_workflow_entries','repair_proposals','repair_proposal_identity_authorities'])assert.equal((await allRepairRows(table)).length,0)
  await sql.raw('DROP TRIGGER fixture_entry_fault').execute(getDb())
  const {entry}=await create(f,s)
  assert.equal(isRepairWorkflowAdmission(getDb(),JSON.stringify(entry)),0)
  assert.equal((await allRepairRows('repair_workflow_entries')).length,1)
}))
test('workflow refuses caller transactions without rolling back caller state',async()=>fixture(async(f,s)=>{
  await sql`BEGIN IMMEDIATE`.execute(getDb())
  await assert.rejects(()=>create(f,s),/repair_transaction_unsupported/)
  await sql`ROLLBACK`.execute(getDb())
  await getDb().transaction().execute(async trx=>{
    const repository=new RepairAuthorityRepository(()=>trx)
    await assert.rejects(()=>repository.createWorkflowEntry(f.root,f.project,f.sourceResult.result_id,{candidateModelRowId:f.request.candidate.modelRowId},new Date().toISOString()),/repair_transaction_unsupported/)
  })
  assert.equal((await allRepairRows('repair_proposals')).length,0)
  await create(f,s)
}))
test('workflow exact association cannot be inserted by raw SQL or changed after persistence',async()=>fixture(async(f,s)=>{
  const {entry}=await create(f,s),row=(await allRepairRows('repair_workflow_entries'))[0]
  await assert.rejects(()=>getDb().updateTable('repair_workflow_entries').set({project_id:'another'}).execute(),/immutable/)
  await assert.rejects(()=>getDb().deleteFrom('repair_workflow_entries').execute(),/immutable/)
  await sql.raw('DROP TRIGGER repair_workflow_no_delete').execute(getDb())
  await getDb().deleteFrom('repair_workflow_entries').execute()
  await assert.rejects(()=>getDb().insertInto('repair_workflow_entries').values(row).execute(),/admission/)
  assert.equal(isRepairWorkflowAdmission(getDb(),row.canonical_payload),0)
  assert.equal((await allRepairRows('repair_workflow_entries')).length,0)
  assert.equal(entry.proposalId,row.proposal_id)
}))
test('workflow discovery refuses corrupt projected locators before filtering a selected project',async()=>fixture(async(f,s)=>{
  await create(f,s)
  await sql.raw('DROP TRIGGER repair_workflow_no_update').execute(getDb())
  await getDb().updateTable('repair_workflow_entries').set({project_id:'unrelated-project'}).execute()
  await assert.rejects(()=>s.list(f.project))
  await assert.rejects(()=>s.context(f.project,f.sourceResult.result_id))
}))
test('workflow discovery refuses a missing proposal identity witness instead of showing intact entry context',async()=>fixture(async(f,s)=>{
  await create(f,s)
  const triggers=await sql<{name:string}>`SELECT name FROM sqlite_schema WHERE type='trigger' AND tbl_name='repair_proposal_identity_authorities'`.execute(getDb())
  for(const trigger of triggers.rows)await sql.raw('DROP TRIGGER "'+trigger.name.replaceAll('"','""')+'"').execute(getDb())
  await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
  await getDb().deleteFrom('repair_proposal_identity_authorities').execute()
  await sql`PRAGMA foreign_keys=ON`.execute(getDb())
  await assert.rejects(()=>s.list(f.project))
  await assert.rejects(()=>s.context(f.project,f.sourceResult.result_id))
}))
for(const mode of ['absent','multiple-active-corruption','stale-selection'] as const)test('workflow refuses candidate '+mode+' before proposal persistence',async()=>fixture(async(f,s)=>{
  const context=await s.context(f.project,f.sourceResult.result_id);assert.equal(context.kind,'eligible')
  if(mode==='absent')await getDb().updateTable('app_models').set({status:'superseded'}).execute()
  if(mode==='multiple-active-corruption') {await sql`DROP INDEX idx_models_one_active`.execute(getDb());await getDb().updateTable('app_models').set({status:'active'}).execute()}
  await assert.rejects(()=>s.create(f.project,f.sourceResult.result_id,{candidateModelRowId:mode==='stale-selection'?f.request.source.modelRowId:f.request.candidate.modelRowId}))
  assert.equal((await allRepairRows('repair_proposals')).length,0);assert.equal((await allRepairRows('repair_workflow_entries')).length,0)
}))
test('workflow refuses two physical eligible candidates in one valid committed active model',async()=>fixture(async(f,s)=>{
  assert.equal((await getDb().selectFrom('app_models').select('id').where('status','=','active').execute()).length,1)
  await assert.rejects(()=>s.context(f.project,f.sourceResult.result_id),/candidate_ambiguous|ambiguous_successor/)
  assert.equal((await allRepairRows('repair_proposals')).length,0)
},{ambiguousCandidate:true}))
test('workflow missing diagnostic is unavailable and never creates a proposal',async()=>fixture(async(f,s)=>{
  const triggers=await sql<{name:string}>`SELECT name FROM sqlite_schema WHERE type='trigger' AND tbl_name='diagnostic_evidence'`.execute(getDb())
  for(const trigger of triggers.rows)await sql.raw('DROP TRIGGER "'+trigger.name.replaceAll('"','""')+'"').execute(getDb())
  await sql`PRAGMA foreign_keys=OFF`.execute(getDb());await getDb().deleteFrom('diagnostic_evidence').execute();await sql`PRAGMA foreign_keys=ON`.execute(getDb())
  await assert.rejects(()=>s.context(f.project,f.sourceResult.result_id))
  assert.equal((await allRepairRows('repair_proposals')).length,0)
}))
test('workflow refuses an original later-oracle-only failure as a selector repair source',async()=>fixture(async(f,s)=>{
  await assert.rejects(()=>s.context(f.project,f.sourceResult.result_id),/comparison_source_not_targeted/)
  assert.equal((await allRepairRows('repair_proposals')).length,0)
},{sourceExecutor:{execute:async()=>({...completedRepairOutcome(),status:'oracle_failed',reasonCode:'oracle_failed',finalUrl:'http://localhost/wrong.html'})}}))
test('workflow reopens exact decision, promotion, and materialization partial stages',async()=>fixture(async(f,s)=>{
  const {entry}=await create(f,s)
  for(const [action,next] of [['approve','promote'],['promote','materialize'],['materialize','repair_rerun']]) {
    const before=await s.command(f.project,entry.entryId,{action,...(action==='approve'?{actorId:'operator'}:{})})
    await closeDb();await openProjectDatabase(createWorkspace(f.root))
    const reopened=await new GovernedRepairWorkflowService(f.root).read(f.project,entry.entryId)
    assert.deepEqual(reopened,before);assert.deepEqual(reopened.nextActions,[next])
    assert.deepEqual(await s.command(f.project,entry.entryId,{action,...(action==='approve'?{actorId:'operator'}:{})}),before)
  }
}))
test('workflow pending execution cannot dispose; cancelled no-Result becomes explicit terminal inconclusive',async()=>fixture(async(f,s)=>{
  const {entry}=await create(f,s)
  await s.command(f.project,entry.entryId,{action:'approve',actorId:'operator'});await s.command(f.project,entry.entryId,{action:'promote'})
  const view=await s.command(f.project,entry.entryId,{action:'materialize'})
  const selection=await s.selection(f.project,entry.entryId,view.executionIntentKey)
  let entered!:()=>void,release!:()=>void
  const active=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve)
  const execution=new ExecutionService({now:repairClock(new Date().toISOString()),processInstanceId:'workflow-cancel',runnerReadiness:repairReady,executor:{execute:async()=>{entered();await held;return {status:'cancelled',reasonCode:'cancellation_requested'}}}})
  const started=await execution.start({projectId:f.project,executionIntentKey:view.executionIntentKey,workspaceRoot:f.root,credentialReference:{usernameEnv:'FORGE_FIXTURE_UNUSED_USER',passwordEnv:'FORGE_FIXTURE_UNUSED_PASSWORD'},runtime:{baseUrl:'http://localhost',navigationTimeoutMs:1000},selection})
  assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('start')
  await active
  try {
    const pending=await s.read(f.project,entry.entryId);assert.equal(pending.comparison,null);assert.equal(pending.disposition,null)
    await assert.rejects(()=>s.command(f.project,entry.entryId,{action:'compare'}))
    await assert.rejects(()=>s.command(f.project,entry.entryId,{action:'record_inconclusive',actorId:'operator'}))
    await execution.cancel(f.project,started.executionId)
  } finally {release()}
  await started.completion;await execution.readStatus(f.project,started.executionId)
  const compared=await s.command(f.project,entry.entryId,{action:'compare'})
  assert.equal(compared.comparison?.state,'INCONCLUSIVE');assert.equal(compared.execution?.result,null)
  assert.equal(compared.disposition,null)
  const disposed=await s.command(f.project,entry.entryId,{action:'record_inconclusive',actorId:'operator'})
  assert.deepEqual(disposed.nextActions,[]);assert.equal((await allRepairRows('test_results')).length,1)
}))
for(const table of ['repair_effectiveness_evidence','repair_dispositions','execution_repair_bindings'] as const)test('workflow refuses damaged terminal locator or missing binding in '+table+' without reopening a completed stage',async()=>fixture(async(f,s)=>{
  const {entry}=await create(f,s)
  await s.command(f.project,entry.entryId,{action:'approve',actorId:'operator'});await s.command(f.project,entry.entryId,{action:'promote'})
  const view=await s.command(f.project,entry.entryId,{action:'materialize'})
  const selection=await s.selection(f.project,entry.entryId,view.executionIntentKey)
  const execution=new ExecutionService({now:repairClock(new Date().toISOString()),processInstanceId:'workflow-terminal-locator',runnerReadiness:repairReady,executor:{execute:async()=>completedRepairOutcome()}})
  const started=await execution.start({projectId:f.project,executionIntentKey:view.executionIntentKey,workspaceRoot:f.root,credentialReference:{usernameEnv:'FORGE_FIXTURE_UNUSED_USER',passwordEnv:'FORGE_FIXTURE_UNUSED_PASSWORD'},runtime:{baseUrl:'http://localhost',navigationTimeoutMs:1000},selection})
  assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('start')
  await started.completion;await execution.readStatus(f.project,started.executionId)
  await s.command(f.project,entry.entryId,{action:'compare'})
  if(table==='repair_dispositions')await s.command(f.project,entry.entryId,{action:'resolve_bounded_repair',actorId:'operator'})
  const triggers=await sql<{name:string}>`SELECT name FROM sqlite_schema WHERE type='trigger' AND tbl_name=${table}`.execute(getDb())
  for(const trigger of triggers.rows)await sql.raw('DROP TRIGGER "'+trigger.name.replaceAll('"','""')+'"').execute(getDb())
  await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
  if(table==='execution_repair_bindings')await getDb().deleteFrom(table).execute()
  else await getDb().updateTable(table).set({project_id:'corrupted-locator'}).execute()
  await sql`PRAGMA foreign_keys=ON`.execute(getDb())
  await assert.rejects(()=>s.read(f.project,entry.entryId))
  await assert.rejects(()=>s.command(f.project,entry.entryId,{action:table==='repair_dispositions'?'resolve_bounded_repair':'compare',...(table==='repair_dispositions'?{actorId:'operator'}:{})}))
  assert.equal((await allRepairRows(table)).length,table==='execution_repair_bindings'?0:1)
}))
test('workflow rollback after successful INSERT leaves no partial proposal or entry and clears admission',async()=>fixture(async(f,s)=>{
  const owner=getDb(),base=Object.getPrototypeOf(Object.getPrototypeOf(owner.getExecutor())),execute=base.executeQuery
  let inserted=false,payload=''
  try {
    base.executeQuery=async function(compiled:any,...args:any[]) {
      const result=await execute.call(this,compiled,...args)
      if(!inserted&&/^insert into "repair_workflow_entries"/i.test(compiled.sql)) {
        inserted=true;payload=compiled.parameters.find((v:any)=>typeof v==='string'&&v.includes('"entryHash"'))
        assert.equal(isRepairWorkflowAdmission(owner,payload),1)
        throw Error('injected after successful insert')
      }
      return result
    }
    await assert.rejects(()=>create(f,s),/injected after successful insert/)
  } finally {base.executeQuery=execute}
  assert.equal(inserted,true);assert.equal(isRepairWorkflowAdmission(owner,payload),0)
  for(const table of ['repair_workflow_entries','repair_proposals','repair_proposal_identity_authorities'])assert.equal((await allRepairRows(table)).length,0)
  await create(f,s)
}))
for(const mode of ['native','wasm'])test('workflow admission remains bound to original '+mode+' owner during cross-database overlap',async()=>{
  const Module=require('node:module'),load=Module._load;let forced=0
  Module._load=function(name:string,...args:any[]){if(mode==='wasm'&&name==='better-sqlite3'){forced++;throw Error('Explicit WASM owner qualification')}return load.call(this,name,...args)}
  try {await fixture(async(f)=>{
    const first=getDb(),destroy=first.destroy.bind(first)
    first.destroy=async()=>{};await closeDb();first.destroy=destroy
    let base:any,execute:any,payload='',observed=false
    try {
      initDisposableDatabase(':memory:');await runMigrations();const second=getDb()
      base=Object.getPrototypeOf(Object.getPrototypeOf(first.getExecutor()));execute=base.executeQuery
      base.executeQuery=async function(compiled:any,...args:any[]) {
        if(!observed&&/^insert into "repair_workflow_entries"/i.test(compiled.sql)) {
          observed=true;payload=compiled.parameters.find((v:any)=>typeof v==='string'&&v.includes('"entryHash"'))
          assert.equal(isRepairWorkflowAdmission(first,payload),1);assert.equal(isRepairWorkflowAdmission(second,payload),0)
          assert.equal((await sql<{v:number}>`SELECT forge_m5_workflow_admission(${payload}) AS v`.execute(second)).rows[0].v,0)
        }
        return execute.call(this,compiled,...args)
      }
      const repository=new RepairAuthorityRepository(()=>first)
      const result=await repository.createWorkflowEntry(f.root,f.project,f.sourceResult.result_id,{candidateModelRowId:f.request.candidate.modelRowId},new Date().toISOString())
      assert.equal(observed,true);assert.equal(result.replayed,false);assert.equal(isRepairWorkflowAdmission(first,payload),0)
      assert.equal((await second.selectFrom('repair_workflow_entries').selectAll().execute()).length,0)
    } finally {if(base&&execute)base.executeQuery=execute;await closeDb();await destroy()}
  });if(mode==='wasm')assert.ok(forced>0)} finally {Module._load=load}
})
