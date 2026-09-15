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
import {closeDb,getDb} from '../src/core/storage/db'
import {ExecutionService} from '../src/core/execution/ExecutionService'
import {ExecutionResultProjectionService} from '../src/core/execution/ExecutionResultProjectionService'
import {GovernedRepairComparisonService} from '../src/core/healing/GovernedRepairComparisonService'
import {deriveRepairEffectiveness,repairEffectivenessRowsSql} from '../src/core/storage/RepairEffectivenessAuthority'
import {canonicalJson} from '../src/core/storage/JsonAppModelMigrationPlanner'
import {runMigrations} from '../src/core/storage/migrate'
import {RepairAuthorityRepository} from '../src/core/storage/repositories/RepairAuthorityRepository'
import {REPAIR_EFFECTIVENESS_POLICY,RepairComparisonError} from '../src/core/healing/RepairEffectivenessContract'
import {createRepairRerunFixture,completedRepairOutcome,repairReady,repairClock,allRepairRows,captureRepairHistory,assertRepairHistoryPreserved} from './helpers/m5-rerun-fixture'
import type {PlaywrightPlanExecutionResult} from '../src/core/execution/PlaywrightPlanExecutor'

async function fixture(after:PlaywrightPlanExecutionResult,body:(f:any)=>Promise<void>,before?:PlaywrightPlanExecutionResult) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk6-'))
  try {
    const f=await createRepairRerunFixture(root,before?{sourceExecutor:{execute:async()=>before}}:{})
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk6-after',runnerReadiness:repairReady,executor:{execute:async()=>after}})
    const started=await execution.start(f.startRequest)
    assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance')
    await started.completion
    const result=(await allRepairRows('test_results')).find((r:any)=>r.result_id!==f.sourceResult.result_id)
    const request={projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:result?.result_id??null,policyVersion:REPAIR_EFFECTIVENESS_POLICY}
    await body({...f,request,started,result,service:new GovernedRepairComparisonService(root)})
  } finally {await closeDb();fs.rmSync(root,{recursive:true,force:true})}
}
const actionFailure:PlaywrightPlanExecutionResult={status:'action_failed',reasonCode:'action_failed',navigationUrl:'http://localhost/cart.html',targetCardinality:'one',failureClass:'target_not_actionable'}

test('Chunk6 confirms exact approved selector, persists immutable evidence and replays through public/repository/reporting reads',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const history=await captureRepairHistory()
    const first=await f.service.compare(f.request)
    assert.equal(first.kind,'compared');assert.equal(first.evidence.state,'REPAIR_CONFIRMED');assert.equal(first.evidence.reason,'target_action_completed');assert.equal(first.replayed,false)
    const replay=await new RepairAuthorityRepository().compareRepair(f.root,f.request)
    assert.equal(replay.kind,'compared');if(replay.kind!=='compared')throw Error('replay')
    assert.equal(replay.replayed,true);assert.deepEqual(replay.evidence,first.evidence)
    assert.deepEqual(await f.service.read(f.project,f.started.executionId),first.evidence)
    const projection=await new ExecutionResultProjectionService().read(f.project,f.started.executionId)
    assert.equal(projection.kind,'ok');if(projection.kind==='ok')assert.deepEqual(projection.projection.repairEffectiveness,{state:'available',evidence:first.evidence})
    assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,1)
    await assertRepairHistoryPreserved(history)
  })
})
for(const [name,outcome,state,reason] of [
  ['selector still absent',{status:'action_failed',reasonCode:'action_failed',navigationUrl:'http://localhost/cart.html',targetCardinality:'zero'},'REPAIR_NOT_CONFIRMED','approved_target_absent'],
  ['earlier navigation failure',{status:'navigation_failed',reasonCode:'navigation_failed',failureClass:'browser_navigation_error'},'INCONCLUSIVE','target_not_reached'],
  ['executor unavailable',{status:'executor_failure',reasonCode:'executor_failure'},'INCONCLUSIVE','target_not_reached'],
  ['different action failure',actionFailure,'INCONCLUSIVE','different_target_action_failure'],
  ['ambiguous target',{...actionFailure,targetCardinality:'many'},'INCONCLUSIVE','target_not_unique'],
  ['later oracle mismatch',{...completedRepairOutcome(),status:'oracle_failed',reasonCode:'oracle_failed',finalUrl:'http://localhost/other.html'},'REPAIR_CONFIRMED','target_action_completed'],
] as const)test('Chunk6 '+name,async()=>{
  await fixture(outcome as PlaywrightPlanExecutionResult,async f=>{
    const compared=await f.service.compare(f.request);assert.equal(compared.kind,'compared');assert.equal(compared.evidence.state,state);assert.equal(compared.evidence.reason,reason)
    if(name==='later oracle mismatch')assert.equal(compared.evidence.provenance.after.result.status,'failed')
  })
})
test('Chunk6 distinguishes same bounded action failure from selector absence',async()=>{
  await fixture(actionFailure,async f=>{const compared=await f.service.compare(f.request);assert.equal(compared.evidence.state,'REPAIR_NOT_CONFIRMED');assert.equal(compared.evidence.reason,'same_target_action_failure')},actionFailure)
})
test('Chunk6 refuses malformed/public caller-produced evidence and identity mismatches without new rows',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    for(const bad of [{...f.request,beforeResultId:'wrong-result'},{...f.request,expectedAfterResultId:'wrong-result'},
      {...f.request,afterExecutionId:f.original.executionId},{...f.request,projectId:'wrong-project'},
      {...f.request,evidence:{state:'REPAIR_CONFIRMED'}},{...f.request,policyVersion:'unrecognized'},
      {...f.request,expectedAfterResultId:null}]) {
      await assert.rejects(()=>f.service.compare(bad));assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,0)
      await assert.rejects(()=>new RepairAuthorityRepository().compareRepair(f.root,bad))
    }
  })
})
test('Chunk6 repository refuses caller-owned transactions',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    await getDb().transaction().execute(async trx=>{await assert.rejects(()=>new RepairAuthorityRepository(()=>trx).compareRepair(f.root,f.request),RepairComparisonError)})
    assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,0)
  })
})
test('Chunk6 comparison and historical Result rows reject mutation; a persistence fault rolls back',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    await sql.raw("CREATE TRIGGER chunk6_test_fault AFTER INSERT ON repair_effectiveness_evidence BEGIN SELECT RAISE(ABORT,'fixture persistence fault'); END").execute(getDb())
    await assert.rejects(()=>f.service.compare(f.request));assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,0)
    await sql.raw('DROP TRIGGER chunk6_test_fault').execute(getDb())
    const compared=await f.service.compare(f.request)
    await assert.rejects(()=>getDb().updateTable('repair_effectiveness_evidence').set({evidence_hash:'0'.repeat(64)}).execute())
    await assert.rejects(()=>getDb().deleteFrom('repair_effectiveness_evidence').execute())
    await assert.rejects(()=>getDb().updateTable('test_results').set({status:'passed'}).where('result_id','=',f.sourceResult.result_id).execute())
    assert.deepEqual(await f.service.read(f.project,f.started.executionId),compared.evidence)
  })
})

for(const name of ['cancelled','executor throw'] as const)test('Chunk6 terminal evidence gap remains immutable inconclusive: '+name,async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk6-gap-'))
  try {
    const f=await createRepairRerunFixture(root)
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk6-gap',runnerReadiness:repairReady,executor:{execute:async()=>{
      if(name==='executor throw')throw Error('Controlled fixture adapter failure')
      return {status:'cancelled',reasonCode:'cancellation_requested'}
    }}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance');await started.completion
    await execution.readStatus(f.project,started.executionId)
    const service=new GovernedRepairComparisonService(root)
    const request={projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:null,policyVersion:REPAIR_EFFECTIVENESS_POLICY}
    const compared=await service.compare(request)
    assert.equal(compared.kind,'compared');if(compared.kind!=='compared')throw Error('terminal gap')
    assert.equal(compared.evidence.state,'INCONCLUSIVE');assert.equal(compared.evidence.reason,'no_result_observed')
    assert.equal((compared.evidence.provenance.after as any).result,null)
    assert.equal((await allRepairRows('test_results')).length,1)
    assert.deepEqual((await service.compare(request)),{...compared,replayed:true})
  } finally {await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})
test('Chunk6 running evidence remains transient and cannot freeze absence',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk6-running-'))
  let release!:()=>void
  try {
    const f=await createRepairRerunFixture(root)
    let entered!:()=>void;const live=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve)
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk6-running',runnerReadiness:repairReady,executor:{execute:async()=>{entered();await held;return completedRepairOutcome()}}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance');await live
    const service=new GovernedRepairComparisonService(root),request={projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:null,policyVersion:REPAIR_EFFECTIVENESS_POLICY}
    const pending=await service.compare(request)
    assert.equal(pending.kind,'pending');assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,0)
    release();await started.completion
    const result=(await allRepairRows('test_results')).find((r:any)=>r.result_id!==f.sourceResult.result_id)
    const completed=await service.compare({...request,expectedAfterResultId:result.result_id})
    assert.equal(completed.kind,'compared');if(completed.kind==='compared'&&pending.kind==='pending')assert.equal(completed.evidence.comparisonId,pending.comparisonId)
    await assert.rejects(()=>service.compare(request))
  } finally {release?.();await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})



test('Chunk6 exact persisted input validator refuses mismatched evidence fields',async t=>{
  await fixture(completedRepairOutcome(),async f=>{
    const rows=(await sql<{payload:string}>`WITH input AS (SELECT ${canonicalJson(f.request)} AS payload) SELECT ${sql.raw(repairEffectivenessRowsSql('(SELECT payload FROM input)'))} AS payload`.execute(getDb())).rows
    const source=JSON.parse(rows[0].payload)
    const afterResult=(r:any)=>r.test_results.find((x:any)=>x.result_id===f.result.result_id)
    const afterDiagnostic=(r:any)=>r.diagnostic_evidence.find((x:any)=>x.result_id===f.result.result_id)
    const cases:[string,(r:any)=>void][]=[
      ['Result identity',r=>afterResult(r).result_id='unrelated-result'],
      ['Result outcome',r=>afterResult(r).status='could_not_verify'],
      ['Result reason',r=>afterResult(r).error_msg='action_failed'],
      ['Run identity',r=>afterResult(r).run_id=f.sourceResult.run_id],
      ['Execution item identity',r=>afterResult(r).execution_item_ordinal=2],
      ['Definition identity',r=>afterResult(r).definition_id='other-definition'],
      ['Plan identity',r=>afterResult(r).executable_plan_hash='0'.repeat(64)],
      ['retry evidence',r=>afterResult(r).retry_count=1],
      ['Test Set identity',r=>r.execution_item_authorities.find((x:any)=>x.execution_id===f.started.executionId).test_set_id='other-set'],
      ['Test Set revision',r=>r.test_set_revisions.find((x:any)=>x.id===f.materialized.rowId).revision++],
      ['supersession authority',r=>r.app_model_transition_supersessions[0].authority_hash='0'.repeat(64)],
      ['proposal identity witness',r=>r.repair_proposal_identity_authorities=[]],
      ['App Model content',r=>{const m=r.app_models.at(-1);const parsed=JSON.parse(m.model_json);parsed.app.modelVersion='other-version';m.model_json=JSON.stringify(parsed)}],
      ['missing original diagnostic',r=>r.diagnostic_evidence=r.diagnostic_evidence.filter((x:any)=>x.result_id!==f.sourceResult.result_id)],
      ['missing rerun diagnostic',r=>r.diagnostic_evidence=r.diagnostic_evidence.filter((x:any)=>x.result_id!==f.result.result_id)],
      ['diagnostic content hash',r=>afterDiagnostic(r).evidence_hash='0'.repeat(64)],
      ['diagnostic Result reference',r=>afterDiagnostic(r).result_id=f.sourceResult.result_id],
      ['rerun provenance',r=>r.repair_rerun_links[0].repair_lineage_hash='0'.repeat(64)],
      ['source binding',r=>r.execution_repair_bindings[0].original_result_id='other-original'],
    ]
    for(const [name,mutate] of cases)await t.test(name,()=>{const invalid=structuredClone(source);mutate(invalid);assert.throws(()=>deriveRepairEffectiveness(f.request,invalid))})
    assert.equal((await allRepairRows('repair_effectiveness_evidence')).length,0)
  })
})
test('Chunk6 supported SQL boundary refuses caller-generated comparison envelopes',async()=>{
  await fixture(completedRepairOutcome(),async f=>{
    const compared=await f.service.compare(f.request),row=(await allRepairRows('repair_effectiveness_evidence'))[0]
    await assert.rejects(()=>getDb().insertInto('repair_effectiveness_evidence').values(row).execute())
    await assert.rejects(()=>getDb().insertInto('repair_effectiveness_evidence').values({...row,comparison_id:'caller-comparison',after_execution_id:f.original.executionId,canonical_payload:'{}'}).execute())
    assert.deepEqual(await f.service.read(f.project,f.started.executionId),compared.evidence)
  })
})
test('Chunk6 actual operator cancellation remains null-Result inconclusive',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk6-cancel-'));let release!:()=>void
  try {
    const f=await createRepairRerunFixture(root);let entered!:()=>void
    const live=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve)
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk6-cancel',runnerReadiness:repairReady,executor:{execute:async()=>{entered();await held;return {status:'cancelled',reasonCode:'cancellation_requested'}}}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance');await live
    await execution.cancel(f.project,started.executionId);release();await started.completion;await execution.readStatus(f.project,started.executionId)
    const compared=await new GovernedRepairComparisonService(root).compare({projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:null,policyVersion:REPAIR_EFFECTIVENESS_POLICY})
    assert.equal(compared.kind,'compared');if(compared.kind!=='compared')throw Error('cancelled')
    assert.equal(compared.evidence.state,'INCONCLUSIVE');assert.equal((compared.evidence.provenance.after as any).terminal.lifecycle,'cancelled')
    assert.equal((await allRepairRows('test_results')).length,1)
  } finally {release?.();await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})
test('Chunk6 terminal acceptance without Run preserves null Run/Result/diagnostic',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-chunk6-no-run-'))
  try {
    const f=await createRepairRerunFixture(root)
    const execution=new ExecutionService({now:repairClock(),processInstanceId:'chunk6-no-run',runnerReadiness:repairReady,executor:{execute:async()=>{throw Error('Executor must not run')}},
      migrate:async()=>{await runMigrations();await sql.raw("CREATE TRIGGER chunk6_run_fault BEFORE INSERT ON runs BEGIN SELECT RAISE(ABORT,'Controlled Run admission failure'); END").execute(getDb())}})
    const started=await execution.start(f.startRequest);assert.equal(started.kind,'accepted');if(started.kind!=='accepted')throw Error('acceptance');await started.completion;await execution.readStatus(f.project,started.executionId)
    const compared=await new GovernedRepairComparisonService(root).compare({projectId:f.project,beforeResultId:f.sourceResult.result_id,afterExecutionId:started.executionId,expectedAfterResultId:null,policyVersion:REPAIR_EFFECTIVENESS_POLICY})
    assert.equal(compared.kind,'compared');if(compared.kind!=='compared')throw Error('gap')
    const after=compared.evidence.provenance.after as any
    assert.equal(after.runId,null);assert.equal(after.result,null);assert.equal(after.diagnostic,null);assert.equal(compared.evidence.state,'INCONCLUSIVE')
  } finally {await closeDb();fs.rmSync(root,{recursive:true,force:true})}
})
