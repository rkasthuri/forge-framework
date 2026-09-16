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
import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {spawn} from 'node:child_process'

for(const mode of ['entry','caller','reject','ineffective','inconclusive','oracle','busy'] as const)test('actual HTTP Product repair '+mode+' context and lifecycle',async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-product-http-'))
  const child=spawn(process.execPath,[require.resolve('tsx/cli'),path.join(__dirname,'helpers/m5-product-http-server.ts')],{
    env:{...process.env,HOME:home,USERPROFILE:home,FORGE_M5_HTTP_HOME:home,FORGE_M5_UNASSOCIATED:mode},stdio:['ignore','pipe','pipe']})
  let output='';child.stdout.on('data',b=>{output+=b.toString()});child.stderr.on('data',b=>{output+=b.toString()})
  try {
    const ready=await new Promise<any>((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);clearInterval(interval)}
      const timer=setTimeout(()=>{cleanup();reject(Error('Server readiness timeout: '+output))},120000)
      const interval=setInterval(()=>{const line=output.split(/\r?\n/).find(l=>l.startsWith('FORGE_M5_READY '));if(line){cleanup();resolve(JSON.parse(line.slice(15)))}},50)
      child.once('exit',code=>{cleanup();reject(Error('Server exited '+code+': '+output))})
    })
    const endpoint=ready.baseUrl+'/api/v1/projects/'+ready.project
    const call=async(url:string,body?:unknown)=>{const response=await fetch(endpoint+url,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json() as any}}
    const prepared=await call('/repair-workspace/prepare',{});assert.equal(prepared.status,200,JSON.stringify(prepared))
    const context=await call('/results/'+ready.resultId+'/repair')
    if(mode==='caller') {
      assert.equal(context.status,503,JSON.stringify(context));assert.equal(context.body.code,'REPAIR_ASSOCIATION_UNAVAILABLE')
      const entries=await call('/repairs');assert.deepEqual(entries.body.data,[])
      fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,ready,context},null,2))
      console.log('Actual Product HTTP association refusal proof: '+home);return
    }
    assert.equal(context.status,200,JSON.stringify(context))
    assert.equal(context.body.data.kind,'eligible');assert.equal(context.body.data.originalEvidence.resultId,ready.resultId)
    const before=await call('/repairs');assert.deepEqual(before.body.data,[])
    const created=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId})
    assert.equal(created.status,200,JSON.stringify(created));assert.equal(created.body.data.replayed,false)
    const entry=created.body.data.entry;assert.equal(entry.originalEvidence.resultId,ready.resultId)
    const replay=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId})
    assert.equal(replay.status,200,JSON.stringify(replay));assert.equal(replay.body.data.replayed,true);assert.deepEqual(replay.body.data.entry,entry)
    const read=await call('/repairs/'+entry.entryId);assert.equal(read.status,200,JSON.stringify(read));assert.deepEqual(read.body.data.entry,entry)
    const refresh=await call('/results/'+ready.resultId+'/repair');assert.equal(refresh.body.data.kind,'existing');assert.deepEqual(refresh.body.data.entries,[entry])
    const collision=await call('/results/'+ready.secondaryResultId+'/repair')
    assert.equal(collision.status,409,JSON.stringify(collision));assert.equal(collision.body.code,'REPAIR_CONTEXT_CONFLICT')
    const bypass=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId,proposal:{decision:'approve'}})
    assert.equal(bypass.status,400)
    const command=async(action:string,actorId?:string)=>call('/repairs/'+entry.entryId+'/commands',{action,...(actorId?{actorId}:{})})
    assert.equal((await command('materialize')).status,409)
    const decided=await command(mode==='reject'?'reject':'approve','product-operator');assert.equal(decided.status,200,JSON.stringify(decided))
    const repeated=await command(mode==='reject'?'reject':'approve','product-operator');assert.equal(repeated.status,200,JSON.stringify(repeated));assert.deepEqual(repeated.body.data.decision,decided.body.data.decision)
    assert.equal((await command(mode==='reject'?'reject':'approve','different-operator')).status,409)
    if(mode==='reject') {
      assert.equal((await command('promote')).status,409)
      assert.equal(decided.body.data.supersession,null);assert.equal(decided.body.data.origin,null);assert.deepEqual(decided.body.data.nextActions,[])
      fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,ready,view:decided.body.data},null,2))
      console.log('Actual Product HTTP rejection proof: '+home);return
    }
    const promoted=await command('promote');assert.equal(promoted.status,200,JSON.stringify(promoted))
    const materialized=await command('materialize');assert.equal(materialized.status,200,JSON.stringify(materialized))
    assert.equal((await command('compare')).status,409)
    const startInput={executionIntentKey:materialized.body.data.executionIntentKey,selection:{kind:'repair_rerun',repairEntryId:entry.entryId}}
    const started=await call('/execution/start',startInput);assert.equal(started.status,202,JSON.stringify(started))
    if(mode==='busy') {
      try {
        const activePrepare=await call('/repair-workspace/prepare',{});assert.equal(activePrepare.status,409,JSON.stringify(activePrepare))
        assert.equal((await command('compare')).status,409)
        const cancelled=await call('/execution/'+started.body.data.executionId+'/cancel',{});assert.equal(cancelled.status,202,JSON.stringify(cancelled))
      } finally {await fetch(ready.baseUrl+'/fixture-release')}
    }
    let terminal:any
    for(let attempt=0;attempt<240;attempt++) {terminal=await call('/execution/'+started.body.data.executionId+'/status');if(terminal.body.data?.terminal)break;await new Promise(resolve=>setTimeout(resolve,250))}
    assert.equal(terminal?.body.data?.terminal,true,JSON.stringify(terminal))
    const visits=await fetch(ready.baseUrl+'/fixture-visits').then(r=>r.json())
    const restart=await call('/execution/start',startInput);assert.equal(restart.status,202,JSON.stringify(restart));assert.equal(restart.body.data.replayed,true);assert.equal(restart.body.data.executionId,started.body.data.executionId)
    assert.deepEqual(await fetch(ready.baseUrl+'/fixture-visits').then(r=>r.json()),visits)
    const compared=await command('compare');assert.equal(compared.status,200,JSON.stringify(compared))
    const expected=mode==='ineffective'?'REPAIR_NOT_CONFIRMED':mode==='inconclusive'||mode==='busy'?'INCONCLUSIVE':'REPAIR_CONFIRMED'
    assert.equal(compared.body.data.comparison.state,expected)
    if(mode==='oracle')assert.equal(compared.body.data.execution.result.status,'failed')
    if(mode==='entry')assert.equal(compared.body.data.execution.result.status,'passed')
    const disposed=await command(compared.body.data.dispositionEligibility.action,'product-operator');assert.equal(disposed.status,200,JSON.stringify(disposed))
    assert.deepEqual(disposed.body.data.nextActions,[])
    const dispositionReplay=await command(compared.body.data.dispositionEligibility.action,'product-operator');assert.deepEqual(dispositionReplay.body.data.disposition,disposed.body.data.disposition)
    assert.equal((await command(compared.body.data.dispositionEligibility.action,'different-operator')).status,409)
    assert.deepEqual(await fetch(ready.baseUrl+'/fixture-visits').then(r=>r.json()),visits)
    fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,transport:'actual projects route/controller/ExecutionContext/core',ready,entry,view:disposed.body.data,visits},null,2))
    console.log('Actual Product HTTP entry proof: '+home)
  } finally {child.kill();fs.writeFileSync(path.join(home,'server.log'),output)}
})
