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
import {spawn,type ChildProcess} from 'node:child_process'

const READY_TIMEOUT_MS=120_000
const EXECUTION_TIMEOUT_MS=180_000
const CHILD_EXIT_TIMEOUT_MS=15_000
const REQUEST_TIMEOUT_MS=60_000
const FIXTURE_CLEANUP_TIMEOUT_MS=60_000

interface ReadyFixture {
  baseUrl:string
  project:string
  resultId:string
  originalExecutionId:string
  secondaryResultId:string
  root:string
}

function waitForExit(child:ChildProcess,timeoutMs:number) {
  if(child.exitCode!==null||child.signalCode!==null)return Promise.resolve(true)
  return new Promise<boolean>(resolve=>{
    const timer=setTimeout(()=>{cleanup();resolve(false)},timeoutMs)
    const onExit=()=>{cleanup();resolve(true)}
    const cleanup=()=>{clearTimeout(timer);child.off('exit',onExit)}
    child.once('exit',onExit)
  })
}

async function terminateChild(child:ChildProcess,getOutput:()=>string) {
  if(child.exitCode!==null||child.signalCode!==null)return
  child.kill('SIGTERM')
  if(await waitForExit(child,CHILD_EXIT_TIMEOUT_MS))return
  child.kill('SIGKILL')
  if(await waitForExit(child,CHILD_EXIT_TIMEOUT_MS))return
  throw Error('M5 fixture server did not terminate after SIGTERM/SIGKILL:\n'+getOutput())
}

async function removeFixture(home:string) {
  const deadline=Date.now()+FIXTURE_CLEANUP_TIMEOUT_MS
  let lastError:unknown
  do {
    try {
      fs.rmSync(home,{recursive:true,force:true})
      return
    } catch(error) {lastError=error}
    await new Promise(resolve=>setTimeout(resolve,500))
  } while(Date.now()<deadline)
  throw Error('M5 fixture cleanup did not complete after '+FIXTURE_CLEANUP_TIMEOUT_MS+'ms: '+String(lastError))
}

function waitForReady(child:ChildProcess,getOutput:()=>string) {
  return new Promise<ReadyFixture>((resolve,reject)=>{
    let pending=''
    let settled=false
    const cleanup=()=>{
      clearTimeout(timer)
      child.stdout?.off('data',onData)
      child.off('exit',onExit)
    }
    const finish=(error?:Error,ready?:ReadyFixture)=>{
      if(settled)return
      settled=true
      cleanup()
      if(error)reject(error)
      else resolve(ready!)
    }
    const inspectLine=(line:string)=>{
      if(!line.startsWith('FORGE_M5_READY '))return
      try {finish(undefined,JSON.parse(line.slice('FORGE_M5_READY '.length)) as ReadyFixture)}
      catch(error) {finish(Error('Invalid server readiness payload: '+String(error)+'\n'+getOutput()))}
    }
    const onData=(chunk:Buffer|string)=>{
      pending+=chunk.toString()
      const lines=pending.split(/\r?\n/)
      pending=lines.pop()??''
      for(const line of lines)inspectLine(line)
    }
    const onExit=(code:number|null,signal:NodeJS.Signals|null)=>finish(Error('Server exited before readiness (code '+code+', signal '+signal+'):\n'+getOutput()))
    const timer=setTimeout(()=>finish(Error('Server readiness timeout after '+READY_TIMEOUT_MS+'ms:\n'+getOutput())),READY_TIMEOUT_MS)
    child.stdout?.on('data',onData)
    child.once('exit',onExit)
  })
}

async function fetchJson(url:string,init?:RequestInit) {
  const response=await fetch(url,{...init,signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)})
  const text=await response.text()
  let body:any
  try {body=text?JSON.parse(text):null}
  catch {throw Error('Non-JSON response from '+url+' ('+response.status+'): '+text)}
  return {status:response.status,body}
}

for(const mode of ['entry','caller','reject','ineffective','inconclusive','oracle','busy'] as const)test('actual HTTP Product repair '+mode+' context and lifecycle',async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-product-http-'))
  const child=spawn(process.execPath,[require.resolve('tsx/cli'),path.join(__dirname,'helpers/m5-product-http-server.ts')],{
    env:{...process.env,HOME:home,USERPROFILE:home,FORGE_M5_HTTP_HOME:home,FORGE_M5_UNASSOCIATED:mode},stdio:['ignore','pipe','pipe']})
  let output=''
  child.stdout.on('data',chunk=>{output+=chunk.toString()})
  child.stderr.on('data',chunk=>{output+=chunk.toString()})
  let completed=false
  let testError:unknown
  try {
    const ready=await waitForReady(child,()=>output)
    const health=await fetchJson(ready.baseUrl+'/fixture-health')
    assert.equal(health.status,200,JSON.stringify(health))
    assert.deepEqual(health.body,{ready:true})
    const endpoint=ready.baseUrl+'/api/v1/projects/'+ready.project
    const call=(url:string,body?:unknown)=>fetchJson(endpoint+url,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    const prepared=await call('/repair-workspace/prepare',{})
    assert.equal(prepared.status,200,JSON.stringify(prepared))
    const context=await call('/results/'+ready.resultId+'/repair')
    if(mode==='caller') {
      assert.equal(context.status,503,JSON.stringify(context))
      assert.equal(context.body.code,'REPAIR_ASSOCIATION_UNAVAILABLE')
      const entries=await call('/repairs')
      assert.deepEqual(entries.body.data,[])
      fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,ready,context},null,2))
      completed=true
      return
    }
    assert.equal(context.status,200,JSON.stringify(context))
    assert.equal(context.body.data.kind,'eligible')
    assert.equal(context.body.data.originalEvidence.resultId,ready.resultId)
    const before=await call('/repairs')
    assert.deepEqual(before.body.data,[])
    const created=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId})
    assert.equal(created.status,200,JSON.stringify(created))
    assert.equal(created.body.data.replayed,false)
    const entry=created.body.data.entry
    assert.equal(entry.originalEvidence.resultId,ready.resultId)
    const replay=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId})
    assert.equal(replay.status,200,JSON.stringify(replay))
    assert.equal(replay.body.data.replayed,true)
    assert.deepEqual(replay.body.data.entry,entry)
    const read=await call('/repairs/'+entry.entryId)
    assert.equal(read.status,200,JSON.stringify(read))
    assert.deepEqual(read.body.data.entry,entry)
    const refresh=await call('/results/'+ready.resultId+'/repair')
    assert.equal(refresh.body.data.kind,'existing')
    assert.deepEqual(refresh.body.data.entries,[entry])
    const collision=await call('/results/'+ready.secondaryResultId+'/repair')
    assert.equal(collision.status,409,JSON.stringify(collision))
    assert.equal(collision.body.code,'REPAIR_CONTEXT_CONFLICT')
    const bypass=await call('/results/'+ready.resultId+'/repair',{candidateModelRowId:context.body.data.candidateModelRowId,proposal:{decision:'approve'}})
    assert.equal(bypass.status,400)
    const command=(action:string,actorId?:string)=>call('/repairs/'+entry.entryId+'/commands',{action,...(actorId?{actorId}:{})})
    assert.equal((await command('materialize')).status,409)
    const decided=await command(mode==='reject'?'reject':'approve','product-operator')
    assert.equal(decided.status,200,JSON.stringify(decided))
    const repeated=await command(mode==='reject'?'reject':'approve','product-operator')
    assert.equal(repeated.status,200,JSON.stringify(repeated))
    assert.deepEqual(repeated.body.data.decision,decided.body.data.decision)
    assert.equal((await command(mode==='reject'?'reject':'approve','different-operator')).status,409)
    if(mode==='reject') {
      assert.equal((await command('promote')).status,409)
      assert.equal(decided.body.data.supersession,null)
      assert.equal(decided.body.data.origin,null)
      assert.deepEqual(decided.body.data.nextActions,[])
      fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,ready,view:decided.body.data},null,2))
      completed=true
      return
    }
    const promoted=await command('promote')
    assert.equal(promoted.status,200,JSON.stringify(promoted))
    const materialized=await command('materialize')
    assert.equal(materialized.status,200,JSON.stringify(materialized))
    assert.equal((await command('compare')).status,409)
    const startInput={executionIntentKey:materialized.body.data.executionIntentKey,selection:{kind:'repair_rerun',repairEntryId:entry.entryId}}
    const started=await call('/execution/start',startInput)
    assert.equal(started.status,202,JSON.stringify(started))
    if(mode==='busy') {
      try {
        const activePrepare=await call('/repair-workspace/prepare',{})
        assert.equal(activePrepare.status,409,JSON.stringify(activePrepare))
        assert.equal((await command('compare')).status,409)
        const cancelled=await call('/execution/'+started.body.data.executionId+'/cancel',{})
        assert.equal(cancelled.status,202,JSON.stringify(cancelled))
      } finally {await fetchJson(ready.baseUrl+'/fixture-release')}
    }
    let terminal:any
    let statusReads=0
    const executionDeadline=Date.now()+EXECUTION_TIMEOUT_MS
    while(Date.now()<executionDeadline) {
      terminal=await call('/execution/'+started.body.data.executionId+'/status')
      statusReads++
      if(terminal.body.data?.terminal)break
      await new Promise(resolve=>setTimeout(resolve,250))
    }
    assert.equal(terminal?.body.data?.terminal,true,'Execution '+started.body.data.executionId+' for mode '+mode+' was not terminal after '+EXECUTION_TIMEOUT_MS+'ms and '+statusReads+' status reads. Last response: '+JSON.stringify(terminal)+'\nServer output:\n'+output)
    const visits=(await fetchJson(ready.baseUrl+'/fixture-visits')).body
    const restart=await call('/execution/start',startInput)
    assert.equal(restart.status,202,JSON.stringify(restart))
    assert.equal(restart.body.data.replayed,true)
    assert.equal(restart.body.data.executionId,started.body.data.executionId)
    assert.deepEqual((await fetchJson(ready.baseUrl+'/fixture-visits')).body,visits)
    const compared=await command('compare')
    assert.equal(compared.status,200,JSON.stringify(compared))
    const expected=mode==='ineffective'?'REPAIR_NOT_CONFIRMED':mode==='inconclusive'||mode==='busy'?'INCONCLUSIVE':'REPAIR_CONFIRMED'
    assert.equal(compared.body.data.comparison.state,expected)
    if(mode==='oracle')assert.equal(compared.body.data.execution.result.status,'failed')
    if(mode==='entry')assert.equal(compared.body.data.execution.result.status,'passed')
    const disposed=await command(compared.body.data.dispositionEligibility.action,'product-operator')
    assert.equal(disposed.status,200,JSON.stringify(disposed))
    assert.deepEqual(disposed.body.data.nextActions,[])
    const dispositionReplay=await command(compared.body.data.dispositionEligibility.action,'product-operator')
    assert.deepEqual(dispositionReplay.body.data.disposition,disposed.body.data.disposition)
    assert.equal((await command(compared.body.data.dispositionEligibility.action,'different-operator')).status,409)
    assert.deepEqual((await fetchJson(ready.baseUrl+'/fixture-visits')).body,visits)
    fs.writeFileSync(path.join(home,'phase2-receipt.json'),JSON.stringify({status:'PASS',mode,transport:'actual projects route/controller/ExecutionContext/core',ready,entry,view:disposed.body.data,visits},null,2))
    completed=true
  } catch(error) {
    testError=error
    throw error
  } finally {
    let teardownError:unknown
    try {await terminateChild(child,()=>output)}
    catch(error) {teardownError=error}
    if(completed&&!testError&&!teardownError) {
      try {await removeFixture(home)}
      catch(error) {
        fs.writeFileSync(path.join(home,'server.log'),output)
        console.error('M5 HTTP fixture cleanup failed; diagnostics retained at '+home)
        throw error
      }
    } else {
      fs.writeFileSync(path.join(home,'server.log'),output)
      console.error('M5 HTTP fixture diagnostics retained at '+home)
    }
    if(teardownError) {
      if(testError)console.error(teardownError)
      else throw teardownError
    }
  }
},{timeout:300_000})
