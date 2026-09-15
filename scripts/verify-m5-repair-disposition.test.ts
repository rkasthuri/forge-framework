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
import {getDb,closeDb,initDisposableDatabase} from '../src/core/storage/db'
import {runMigrations} from '../src/core/storage/migrate'
import {openProjectDatabase} from '../src/core/storage/DatabaseFactory'
import {createWorkspace} from '../src/core/workspace/WorkspaceManager'
import {ExecutionService} from '../src/core/execution/ExecutionService'
import {GovernedRepairComparisonService} from '../src/core/healing/GovernedRepairComparisonService'
import {GovernedRepairDispositionService} from '../src/core/healing/GovernedRepairDispositionService'
import {RepairDispositionError,repairDispositionPolicy} from '../src/core/healing/RepairDispositionContract'
import {RepairAuthorityRepository,isRepairDispositionAdmission} from '../src/core/storage/repositories/RepairAuthorityRepository'
import {TestSetRepository} from '../src/core/storage/repositories/TestSetRepository'
import {inspectRepairComparison} from '../src/core/storage/RepairEffectivenessAuthority'
import {deriveRepairDisposition,repairDispositionRowsSql} from '../src/core/storage/RepairDispositionAuthority'
import {canonicalJson} from '../src/core/storage/JsonAppModelMigrationPlanner'
import {REPAIR_EFFECTIVENESS_POLICY} from '../src/core/healing/RepairEffectivenessContract'
import {createRepairRerunFixture,completedRepairOutcome,repairReady,repairClock,allRepairRows,captureRepairHistory} from './helpers/m5-rerun-fixture'
import type {PlaywrightPlanExecutionResult} from '../src/core/execution/PlaywrightPlanExecutor'

const absent:PlaywrightPlanExecutionResult={status:'action_failed',reasonCode:'action_failed',navigationUrl:'http://localhost/cart.html',targetCardinality:'zero'}
const inconclusive:PlaywrightPlanExecutionResult={status:'navigation_failed',reasonCode:'navigation_failed',failureClass:'browser_navigation_error'}
async function history() {
  const rows=await captureRepairHistory()
  for(const table of ['execution_repair_bindings','repair_rerun_links','repair_effectiveness_evidence'])rows[table]=(await allRepairRows(table)).map(canonicalJson)
  return rows
}
async function fixture(outcome:PlaywrightPlanExecutionResult,body:(f:any)=>Promise<void>,commitComparison=true) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk7-'))
  try {
    const f=await createRepairRerunFixture(root)
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk7-after',runnerReadiness:repairReady,executor:{execute:async()=>outcome}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance')
    await started.completion;await execution.readStatus(f.project,started.executionId)
    const after=(await allRepairRows('test_results')).find((r:any)=>r.result_id!==f.sourceResult.result_id)
    const comparisonRequest={projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:after?.result_id??null,policyVersion:REPAIR_EFFECTIVENESS_POLICY}
    const compared=commitComparison?await new GovernedRepairComparisonService(root).compare(comparisonRequest):await inspectRepairComparison(getDb(),root,comparisonRequest)
    assert.equal(compared.kind,'compared');if(compared.kind!=='compared')throw Error('comparison')
    const comparison=compared.evidence,p=comparison.provenance as any
    const request={comparison:comparisonRequest,comparisonId:comparison.comparisonId,evidenceHash:comparison.evidenceHash,repairOriginId:p.repairOrigin.repairOriginId,
      supersessionAuthorityId:p.repairOrigin.supersessionAuthorityId,supersessionAuthorityHash:p.repairOrigin.supersessionAuthorityHash,resultingDefinitionAuthority:p.repairOrigin.resultingDefinitionAuthority}
    const decision={decisionId:'chunk7-explicit-human',actor:{kind:'human',actorId:'fixture-human'},decidedAt:'2026-09-01T12:05:00.000Z',action:repairDispositionPolicy(comparison.state).action}
    await body({...f,started,after,comparison,comparisonRequest,request,decision,service:new GovernedRepairDispositionService(root)})
  } finally {await closeDb();fs.rmSync(root,{recursive:true,force:true})}
}
for(const [name,outcome,state] of [['confirmed',completedRepairOutcome(),'bounded_repair_resolved'],['unsuccessful',absent,'repair_unsuccessful'],['inconclusive',inconclusive,'manual_followup_required']] as const) {
  test('Chunk7 '+name+' requires explicit human disposition and preserves exact history/current revision',async()=>{
    await fixture(outcome,async f=>{
      const before=await history(),inventory=await new TestSetRepository().readInventory(f.project)
      const eligibility=await f.service.eligibility(f.request)
      assert.equal(eligibility.kind,'eligible');assert.equal(eligibility.state,state);assert.equal(eligibility.existing,null)
      assert.equal(await f.service.read(f.request),null);assert.equal((await allRepairRows('repair_dispositions')).length,0)
      await assert.rejects(()=>f.service.dispose(f.request,undefined),RepairDispositionError)
      const first=await f.service.dispose(f.request,f.decision)
      assert.equal(first.kind,'disposed');assert.equal(first.evidence.state,state);assert.equal(first.replayed,false)
      assert.deepEqual(first.evidence.provenance,f.comparison.provenance)
      assert.deepEqual(first.evidence.effectiveness,{comparisonId:f.comparison.comparisonId,evidenceHash:f.comparison.evidenceHash,state:f.comparison.state,reason:f.comparison.reason})
      assert.deepEqual(await new RepairAuthorityRepository().disposeRepair(f.root,f.request,f.decision),{...first,replayed:true})
      assert.deepEqual(await f.service.read(f.request),first.evidence)
      assert.deepEqual(await history(),before);assert.deepEqual(await new TestSetRepository().readInventory(f.project),inventory)
      for(const action of ['resolve_bounded_repair','close_unsuccessful','record_inconclusive'].filter(x=>x!==f.decision.action))await assert.rejects(()=>f.service.dispose(f.request,{...f.decision,action}),RepairDispositionError)
      for(const change of [{decisionId:'another'},{actor:{kind:'human',actorId:'other'}},{decidedAt:'2026-09-01T12:06:00.000Z'}])await assert.rejects(()=>f.service.dispose(f.request,{...f.decision,...change}),RepairDispositionError)
      assert.equal((await allRepairRows('repair_dispositions')).length,1)
      assert.deepEqual(await history(),before)
    })
  })
}
test('Chunk7 bounded confirmation leaves later oracle failure unchanged',async()=>{
  await fixture({...completedRepairOutcome(),status:'oracle_failed',reasonCode:'oracle_failed',finalUrl:'http://localhost/other.html'},async f=>{
    const before=await history(),result=await f.service.dispose(f.request,f.decision)
    assert.equal(result.evidence.state,'bounded_repair_resolved');assert.equal(f.after.status,'failed')
    assert.deepEqual(await history(),before)
  })
})
test('Chunk7 terminal missing Result preserves explicit nulls and manual followup',async()=>{
  await fixture({status:'cancelled',reasonCode:'cancellation_requested'},async f=>{
    assert.equal(f.request.comparison.expectedAfterResultId,null)
    const result=await f.service.dispose(f.request,f.decision)
    assert.equal(result.evidence.state,'manual_followup_required');assert.equal(result.evidence.provenance.after.result,null)
    assert.equal((await allRepairRows('test_results')).length,1)
  })
})
test('Chunk7 malformed declarations and exact lineage mismatches refuse through service and repository',async t=>{
  await fixture(completedRepairOutcome(),async f=>{
    const cases:[string,(r:any)=>void][]=[
      ['wrong comparison',r=>r.comparisonId='other-comparison'],['wrong comparison hash',r=>r.evidenceHash='0'.repeat(64)],
      ['wrong original Result',r=>r.comparison.beforeResultId='other-original'],['wrong rerun Result',r=>r.comparison.expectedAfterResultId='other-after'],
      ['unrelated execution',r=>r.comparison.afterExecutionId=f.original.executionId],['wrong project',r=>r.comparison.projectId='unrelated'],
      ['wrong supersession',r=>r.supersessionAuthorityId='other-authority'],['wrong supersession hash',r=>r.supersessionAuthorityHash='0'.repeat(64)],
      ['wrong origin',r=>r.repairOriginId='other-origin'],['wrong materialized Test Set',r=>r.resultingDefinitionAuthority.testSetId='other-set'],
      ['wrong materialized revision',r=>r.resultingDefinitionAuthority.testSetRevision++],['mismatched App Model revision',r=>r.resultingDefinitionAuthority.modelVersion='other-version'],
      ['fabricated authority',r=>r.evidence={state:'bounded_repair_resolved'}],['automatic second repair',r=>r.nextRepair=true],
    ]
    for(const [name,mutate] of cases)await t.test(name,async()=>{
      const r=structuredClone(f.request);mutate(r)
      await assert.rejects(()=>f.service.dispose(r,f.decision));await assert.rejects(()=>new RepairAuthorityRepository().disposeRepair(f.root,r,f.decision))
      assert.equal((await allRepairRows('repair_dispositions')).length,0)
    })
    for(const bad of [{...f.decision,actor:{kind:'model',actorId:'model'}},{...f.decision,actor:{kind:'human',actorId:''}},
      {...f.decision,action:'start_next_repair'},{...f.decision,decidedAt:'2026-09-01T12:00:00.000Z'},{...f.decision,decisionHash:'0'.repeat(64)}])await assert.rejects(()=>f.service.dispose(f.request,bad),RepairDispositionError)
  })
})
test('Chunk7 requires committed comparison and refuses caller-owned uncommitted prerequisites',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    await assert.rejects(()=>f.service.dispose(f.request,f.decision),(e:any)=>e.code==='disposition_evidence_unavailable')
    await getDb().transaction().execute(async trx=>{
      const r=f.comparisonRequest,e=f.comparison
      await trx.insertInto('repair_effectiveness_evidence').values({comparison_id:e.comparisonId,project_id:r.projectId,before_result_id:r.beforeResultId,after_execution_id:r.afterExecutionId,
        after_result_id:r.expectedAfterResultId,policy_version:r.policyVersion,request_json:canonicalJson(r),canonical_payload:canonicalJson(e),evidence_hash:e.evidenceHash}).execute()
      await assert.rejects(()=>new GovernedRepairDispositionService(f.root,()=>trx).dispose(f.request,f.decision),(e:any)=>e.code==='disposition_transaction_unsupported')
      assert.equal((await trx.selectFrom('repair_dispositions').selectAll().execute()).length,0)
    })
    assert.equal((await f.service.dispose(f.request,f.decision)).kind,'disposed')
  },false)
})
test('Chunk7 manual caller transaction is refused without rolling back caller work',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    await getDb().connection().execute(async connection=>{
      await sql`BEGIN IMMEDIATE`.execute(connection)
      try {
        await sql.raw('CREATE TABLE chunk7_caller_marker (value text)').execute(connection)
        await sql.raw("INSERT INTO chunk7_caller_marker VALUES ('kept')").execute(connection)
        await assert.rejects(()=>new RepairAuthorityRepository(()=>connection).disposeRepair(f.root,f.request,f.decision),(e:any)=>e.code==='disposition_transaction_unsupported')
        assert.equal((await sql.raw<any>('SELECT value FROM chunk7_caller_marker').execute(connection)).rows[0].value,'kept')
      } finally {await sql`ROLLBACK`.execute(connection)}
    })
    assert.equal((await allRepairRows('repair_dispositions')).length,0)
  })
})
test('Chunk7 direct SQL recomputed envelope fails, inserted fault rolls back, and admission is cleared',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const rows=(await sql<{payload:string}>`WITH input AS (SELECT ${canonicalJson(f.request)} AS payload) SELECT ${sql.raw(repairDispositionRowsSql('(SELECT payload FROM input)'))} AS payload`.execute(getDb())).rows
    const evidence=deriveRepairDisposition(f.request,f.decision,JSON.parse(rows[0].payload)),payload=canonicalJson(evidence)
    const row={disposition_id:evidence.dispositionId,comparison_id:f.request.comparisonId,project_id:f.project,after_execution_id:f.started.executionId,
      decision_id:f.decision.decisionId,request_json:canonicalJson(f.request),decision_json:canonicalJson(f.decision),canonical_payload:payload,disposition_hash:evidence.dispositionHash}
    await assert.rejects(()=>getDb().insertInto('repair_dispositions').values(row).execute())
    const before=await history()
    await sql.raw("CREATE TRIGGER chunk7_fault AFTER INSERT ON repair_dispositions BEGIN SELECT RAISE(ABORT,'Controlled disposition fault'); END").execute(getDb())
    await assert.rejects(()=>f.service.dispose(f.request,f.decision))
    assert.equal((await allRepairRows('repair_dispositions')).length,0);assert.equal(isRepairDispositionAdmission(getDb(),payload),0)
    assert.equal((await sql<{v:number}>`SELECT forge_m5_disposition_admission(${payload}) AS v`.execute(getDb())).rows[0].v,0)
    await sql.raw('DROP TRIGGER chunk7_fault').execute(getDb())
    const result=await f.service.dispose(f.request,f.decision)
    assert.deepEqual(result.evidence,evidence)
    await assert.rejects(()=>getDb().updateTable('repair_dispositions').set({canonical_payload:'{}'}).execute())
    await assert.rejects(()=>getDb().deleteFrom('repair_dispositions').execute())
    await assert.rejects(()=>getDb().insertInto('repair_dispositions').values(row).execute())
    await assert.rejects(()=>sql`INSERT OR REPLACE INTO repair_dispositions SELECT * FROM repair_dispositions`.execute(getDb()))
    await assert.rejects(()=>getDb().updateTable('repair_effectiveness_evidence').set({evidence_hash:'0'.repeat(64)}).execute())
    await assert.rejects(()=>getDb().updateTable('test_results').set({status:'passed'}).where('result_id','=',f.sourceResult.result_id).execute())
    assert.deepEqual(await history(),before);assert.equal(isRepairDispositionAdmission(getDb(),payload),0)
  })
})
test('Chunk7 stale local authority refuses fresh disposition and exact replay',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const config=path.join(f.root,'.forge/config.json'),original=fs.readFileSync(config,'utf8')
    fs.writeFileSync(config,JSON.stringify({schemaVersion:1,appName:f.project,authType:'basic'}))
    await assert.rejects(()=>f.service.dispose(f.request,f.decision))
    fs.writeFileSync(config,original);await f.service.dispose(f.request,f.decision)
    fs.writeFileSync(config,JSON.stringify({schemaVersion:1,appName:f.project,authType:'basic'}))
    await assert.rejects(()=>f.service.dispose(f.request,f.decision));await assert.rejects(()=>f.service.read(f.request))
    assert.equal((await allRepairRows('repair_dispositions')).length,1)
  })
})
test('Chunk7 failure after successful INSERT rolls back the entire disposition transaction',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const owner=getDb(),base=Object.getPrototypeOf(Object.getPrototypeOf(owner.getExecutor())),execute=base.executeQuery
    let inserted=false,injected=false
    base.executeQuery=async function(compiled:any,...args:any[]) {
      if(inserted&&!injected&&compiled.sql==='COMMIT') {injected=true;throw Error('Controlled commit transport failure before COMMIT executes')}
      const result=await execute.call(this,compiled,...args)
      if(/^insert into "repair_dispositions"/i.test(compiled.sql))inserted=true
      return result
    }
    try {await assert.rejects(()=>f.service.dispose(f.request,f.decision))} finally {base.executeQuery=execute}
    assert.equal(inserted,true);assert.equal(injected,true);assert.equal((await allRepairRows('repair_dispositions')).length,0)
    const result=await f.service.dispose(f.request,f.decision)
    assert.equal(result.replayed,false);assert.equal(isRepairDispositionAdmission(owner,canonicalJson(result.evidence)),0)
  })
})
test('Chunk7 freezes caller intent before asynchronous authority inspection',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const request=structuredClone(f.request),decision=structuredClone(f.decision)
    const pending=f.service.dispose(request,decision)
    request.comparison.beforeResultId='changed-after-entry';decision.actor.actorId='changed-after-entry'
    const result=await pending
    assert.deepEqual(result.evidence.request,f.request);assert.deepEqual(result.evidence.decision,f.decision)
  })
})
test('Chunk7 persisted comparison corruption refuses through public and repository reads',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    await f.service.dispose(f.request,f.decision)
    // Model storage corruption explicitly after proving ordinary mutation is blocked.
    await assert.rejects(()=>getDb().updateTable('repair_effectiveness_evidence').set({evidence_hash:'0'.repeat(64)}).execute())
    await sql.raw('DROP TRIGGER repair_effectiveness_no_update').execute(getDb())
    await getDb().updateTable('repair_effectiveness_evidence').set({evidence_hash:'0'.repeat(64)}).execute()
    await assert.rejects(()=>f.service.dispose(f.request,f.decision));await assert.rejects(()=>f.service.read(f.request))
    await assert.rejects(()=>new RepairAuthorityRepository().repairDispositionEligibility(f.root,f.request))
    assert.equal((await allRepairRows('repair_dispositions')).length,1)
  })
})
test('Chunk7 active transient comparison cannot authorize disposition',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk7-pending-'));let release!:()=>void
  try {
    const f=await createRepairRerunFixture(root);let entered!:()=>void
    const live=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r)
    const execution=new ExecutionService({now:repairClock(),runnerReadiness:repairReady,executor:{execute:async()=>{entered();await held;return completedRepairOutcome()}}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance');await live
    const comparison={projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:null,policyVersion:REPAIR_EFFECTIVENESS_POLICY}
    const pending=await new GovernedRepairComparisonService(root).compare(comparison);assert.equal(pending.kind,'pending')
    const request={comparison,comparisonId:pending.kind==='pending'?pending.comparisonId:'invalid',evidenceHash:'0'.repeat(64),repairOriginId:f.materialized.origin.repairOriginId,
      supersessionAuthorityId:f.materialized.origin.supersessionAuthorityId,supersessionAuthorityHash:f.materialized.origin.supersessionAuthorityHash,resultingDefinitionAuthority:f.materialized.origin.resultingDefinitionAuthority}
    await assert.rejects(()=>new GovernedRepairDispositionService(root).dispose(request,{decisionId:'pending-human',actor:{kind:'human',actorId:'human'},decidedAt:'2026-09-01T12:05:00.000Z',action:'record_inconclusive'}),(e:any)=>e.code==='disposition_evidence_unavailable')
    assert.equal((await allRepairRows('repair_dispositions')).length,0)
    release();await started.completion
  } finally {release?.();await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})
for(const mode of ['native','wasm','native-memory','wasm-memory'])test('Chunk7 admission stays with original physical owner across '+mode+' context replacement',async()=>{
  const Module=require('node:module'),originalLoad=Module._load;let forced=0
  Module._load=function(name:string,...args:any[]) {if(mode.startsWith('wasm')&&name==='better-sqlite3'){forced++;throw Error('Forced WASM proof')}return originalLoad.call(this,name,...args)}
  try {
    await fixture(completedRepairOutcome(),async f=>{
      const first=getDb(),destroy=first.destroy.bind(first)
      // Retain the actual first backend only for this overlap probe; ordinary
      // closeDb destroys it. Its UDF must not retarget the new global database.
      first.destroy=async()=>{}
      await closeDb();first.destroy=destroy
      const otherRoot=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk7-other-owner-'))
      let base:any,execute:any,observed=false
      try {
        if(mode.endsWith('memory')) {initDisposableDatabase(':memory:');await runMigrations()}
        else await openProjectDatabase(createWorkspace(otherRoot))
        const second=getDb()
        base=Object.getPrototypeOf(Object.getPrototypeOf(first.getExecutor()));execute=base.executeQuery
        base.executeQuery=async function(compiled:any,...args:any[]) {
          if(!observed&&/^insert into "repair_dispositions"/i.test(compiled.sql)) {
            observed=true
            const payload=compiled.parameters.find((v:any)=>typeof v==='string'&&v.includes('"dispositionHash"'))
            assert.equal(typeof payload,'string')
            assert.equal(isRepairDispositionAdmission(first,payload),1)
            assert.equal(isRepairDispositionAdmission(second,payload),0)
            assert.equal((await sql<{v:number}>`SELECT forge_m5_disposition_admission(${payload}) AS v`.execute(second)).rows[0].v,0)
          }
          return execute.call(this,compiled,...args)
        }
        const service=new GovernedRepairDispositionService(f.root,()=>first)
        const result=await service.dispose(f.request,f.decision)
        assert.equal(observed,true);assert.equal(result.kind,'disposed')
        assert.equal(isRepairDispositionAdmission(first,canonicalJson(result.evidence)),0)
        assert.deepEqual(await service.dispose(f.request,f.decision),{...result,replayed:true})
        assert.equal((await second.selectFrom('repair_dispositions').selectAll().execute()).length,0)
      } finally {
        if(base&&execute)base.executeQuery=execute
        await closeDb();await destroy();fs.rmSync(otherRoot,{recursive:true,force:true})
      }
    })
    if(mode.startsWith('wasm'))assert.ok(forced>0)
  } finally {Module._load=originalLoad}
})
