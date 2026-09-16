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
import express from 'express'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import assert from 'node:assert/strict'
import projectsRouter from '../../forge-ui/server/routes/projects'
import {authMiddleware} from '../../forge-ui/server/context/AuthContext'
import {tenantMiddleware} from '../../forge-ui/server/context/TenantContext'
import {localOriginGuard} from '../../forge-ui/server/index'
import {createRepairProductSourceFixture,allRepairRows} from './m5-rerun-fixture'
import {closeDb} from '../../src/core/storage/db'
import {GovernedRepairProposalService} from '../../src/core/healing/GovernedRepairProposalService'

async function main() {
  const home=process.env.FORGE_M5_HTTP_HOME
  assert.ok(home,'An explicit disposable home is required')
  assert.equal(path.resolve(os.homedir()),path.resolve(home))
  const app=express();app.use(localOriginGuard);app.use(express.json());app.use(authMiddleware);app.use(tenantMiddleware)
  app.use('/api/v1/projects',projectsRouter)
  let browserVisits=0
  let releaseNavigation:()=>void=()=>{}
  const heldNavigation=new Promise<void>(resolve=>releaseNavigation=resolve)
  const mode=process.env.FORGE_M5_UNASSOCIATED
  app.get('/fixture-release',(_req,res)=>{releaseNavigation();res.json({released:true})})
  app.get('/cart.html',async(_req,res)=>{
    browserVisits++
    if(mode==='busy')await heldNavigation
    const button='<button data-test="checkout-new" onclick="location.href=\''+(mode==='oracle'?'/wrong.html':'/checkout.html')+'\'">Checkout</button>'
    res.type('html').send(mode==='ineffective'?'<h1>Cart without target</h1>':mode==='inconclusive'?button+button:button)
  })
  app.get('/checkout.html',(_req,res)=>{browserVisits++;res.type('html').send('<h1>Checkout</h1>')})
  app.get('/wrong.html',(_req,res)=>{browserVisits++;res.type('html').send('<h1>Other destination</h1>')})
  app.get('/fixture-visits',(_req,res)=>res.json({browserVisits}))
  const repositoryRoot=path.resolve(__dirname,'../..'),dist=path.join(repositoryRoot,'forge-ui','dist')
  app.get('/forge-logo.png',(_req,res)=>res.sendFile(path.join(repositoryRoot,'Forge-Tool.png')))
  app.use(express.static(dist));app.get('/results',(_req,res)=>res.sendFile(path.join(dist,'index.html')))
  const readyPath=path.join(home,'fixture-ready.json'),resume=process.env.FORGE_M5_RESUME==='1'
  const saved=resume?JSON.parse(fs.readFileSync(readyPath,'utf8')):null
  const server=app.listen(saved?new URL(saved.baseUrl).port:0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve))
  const address=server.address();assert.ok(address&&typeof address!=='string')
  const baseUrl='http://127.0.0.1:'+address.port,root=path.join(home,'.forge-projects','m5-selector-repair')
  if(resume) {
    console.log('FORGE_M5_READY '+JSON.stringify(saved))
    process.on('SIGTERM',()=>server.close(()=>process.exit(0)));return
  }
  const fixture=await createRepairProductSourceFixture(root,{baseUrl,duplicateSource:true,realSource:process.env.FORGE_M5_REAL_SOURCE==='1'})
  assert.equal((await allRepairRows('repair_proposals')).length,0)
  assert.equal((await allRepairRows('repair_decisions')).length,0)
  assert.equal((await allRepairRows('repair_revision_origins')).length,0)
  if(process.env.FORGE_M5_UNASSOCIATED==='caller') {
    const proposal=await new GovernedRepairProposalService(root).propose(fixture.request)
    assert.equal(proposal.kind,'eligible')
  }
  const configPath=path.join(root,'.forge','config.json'),config=JSON.parse(fs.readFileSync(configPath,'utf8'))
  fs.writeFileSync(configPath,JSON.stringify({...config,url:baseUrl}))
  await closeDb()
  // The fixture boundary ends here. Subsequent operator work uses HTTP only.
  const ready={baseUrl,project:fixture.project,resultId:fixture.sourceResult.result_id,originalExecutionId:fixture.original.executionId,secondaryResultId:fixture.secondaryResult.result_id,root}
  fs.writeFileSync(readyPath,JSON.stringify(ready))
  console.log('FORGE_M5_READY '+JSON.stringify(ready))
  process.on('SIGTERM',()=>server.close(()=>process.exit(0)))
}
main().catch(error=>{console.error(error);process.exitCode=1})
