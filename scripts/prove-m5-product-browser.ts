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
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {spawn,type ChildProcess} from 'node:child_process'
import {chromium,expect} from '@playwright/test'
import * as crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {canonicalJson} from '../src/core/storage/JsonAppModelMigrationPlanner'

async function start(home:string,mode:string,resume=false) {
  let output=''
  const child=spawn(process.execPath,[...(process.env.FORGE_M5_BROWSER_DB_PRELOAD?['--require',process.env.FORGE_M5_BROWSER_DB_PRELOAD]:[]),require.resolve('tsx/cli'),path.join(__dirname,'helpers/m5-product-http-server.ts')],{
    env:{...process.env,...(process.env.FORGE_M5_BROWSER_DB_PRELOAD?{NODE_OPTIONS:(process.env.NODE_OPTIONS??'')+' --require '+JSON.stringify(process.env.FORGE_M5_BROWSER_DB_PRELOAD)}:{}),HOME:home,USERPROFILE:home,FORGE_M5_HTTP_HOME:home,FORGE_M5_UNASSOCIATED:mode,FORGE_M5_REAL_SOURCE:'1',FORGE_M5_RESUME:resume?'1':'0'},stdio:['ignore','pipe','pipe']})
  child.stdout.on('data',b=>{output+=b.toString()});child.stderr.on('data',b=>{output+=b.toString()})
  const ready=await new Promise<any>((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);clearInterval(interval)}
    const timer=setTimeout(()=>{cleanup();reject(Error('Server timeout: '+output))},120000)
    const interval=setInterval(()=>{const line=output.split(/\r?\n/).find(l=>l.startsWith('FORGE_M5_READY '));if(line){cleanup();resolve(JSON.parse(line.slice(15)))}},50)
    child.once('exit',code=>{cleanup();reject(Error('Server exited '+code+': '+output))})
  })
  return {child,ready,output:()=>output}
}
async function stop(child:ChildProcess) {if(child.exitCode!==null)return;await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill()})}
async function main() {
  const directory=path.resolve(process.argv[2]??fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-browser-evidence-')));fs.mkdirSync(directory,{recursive:true})
  const receipts=[]
  const historical=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):null
  for(const mode of historical?['entry']:['entry','reject','ineffective','inconclusive','oracle']) {
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-browser-home-'))
    const hash=(file:string)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    if(historical) {
      const seedDb=path.join(historical.root,'.forge/forge.db')
      if(hash(seedDb)!==historical.databaseSha256)throw Error('Historical seed bytes changed')
      fs.cpSync(historical.home,home,{recursive:true})
      const ready={...historical.ready,root:path.join(home,'.forge-projects',historical.ready.project)}
      fs.writeFileSync(path.join(home,'fixture-ready.json'),JSON.stringify(ready))
    }
    let server=await start(home,mode,!!historical)
    const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}})
    const requests:any[]=[]
    page.on('request',r=>{if(r.url().includes('/api/v1/projects/')&&r.method()==='POST')requests.push({url:r.url(),method:r.method(),body:r.postDataJSON()})})
    try {
      const ready=server.ready
      await page.goto(ready.baseUrl+'/results?project='+ready.project+'&execution='+ready.originalExecutionId)
      await page.getByRole('button',{name:'Review selector repair',exact:true}).click()
      if(historical) {
        await expect(page.getByRole('button',{name:'Prepare repair workspace',exact:true})).toBeVisible()
        if(hash(path.join(ready.root,'.forge/forge.db'))!==historical.databaseSha256)throw Error('Read-only missing-041 workflow mutated database')
        await page.getByRole('button',{name:'Prepare repair workspace',exact:true}).click()
      }
      await page.getByRole('button',{name:'Create repair proposal',exact:true}).click()
      // Restart after proposal persistence: no fixture writes run in the replacement server.
      fs.writeFileSync(path.join(directory,mode+'-first-server.log'),server.output())
      await expect(page.getByLabel('Local human operator')).toBeVisible()
      await stop(server.child);server=await start(home,mode,true);await page.reload()
      await page.getByLabel('Local human operator').fill('product-browser-operator')
      await page.getByRole('button',{name:mode==='reject'?'Reject repair':'Approve repair',exact:true}).click()
      if(mode!=='reject') {
        await page.getByRole('button',{name:'Promote approved repair',exact:true}).click()
        await page.getByRole('button',{name:'Create repaired revision',exact:true}).click()
        await page.getByRole('button',{name:'Run governed repair',exact:true}).click()
        await expect(page.getByRole('button',{name:'Evaluate repair outcome',exact:true})).toBeVisible({timeout:60000})
        await page.getByRole('button',{name:'Evaluate repair outcome',exact:true}).click()
        const state=mode==='ineffective'?'REPAIR_NOT_CONFIRMED':mode==='inconclusive'?'INCONCLUSIVE':'REPAIR_CONFIRMED'
        await expect(page.getByTestId('repair-effectiveness')).toHaveText(state)
        if(mode==='oracle')await expect(page.getByTestId('repair-overall-result')).toHaveText('failed')
        if(mode==='entry')await expect(page.getByTestId('repair-overall-result')).toHaveText('passed')
        await page.reload();await page.getByLabel('Local human operator').fill('product-browser-operator')
        await page.getByRole('button',{name:mode==='ineffective'?'Close unsuccessful repair':mode==='inconclusive'?'Record manual follow-up':'Resolve bounded repair',exact:true}).click()
        await expect(page.getByTestId('repair-disposition')).not.toHaveText('Not recorded')
      } else await expect(page.getByText('reject by product-browser-operator',{exact:true})).toBeVisible()
      await page.getByText('Canonical repair history and provenance',{exact:true}).click()
      await page.screenshot({path:path.join(directory,mode+'.png'),fullPage:true})
      const screenshot=path.join(directory,mode+'.png')
      if(historical&&hash(path.join(historical.root,'.forge/forge.db'))!==historical.databaseSha256)throw Error('Historical seed changed during copied Product workflow')
      if(historical) {
        const Database=require('better-sqlite3'),db=new Database(path.join(ready.root,'.forge/forge.db'),{readonly:true})
        try {
          assert.equal(db.prepare('SELECT name FROM kysely_migration ORDER BY name DESC LIMIT 1').get().name,'041_repair_workflow_entry')
          for(const [table,rows] of Object.entries(historical.history) as [string,string[]][]) {
            const after=db.prepare('SELECT * FROM "'+table+'"').all().map(canonicalJson)
            for(const row of rows)assert.ok(after.includes(row),'Historical row changed: '+table)
          }
        } finally {db.close()}
      }
      const receipt={status:'PASS',mode,home,ready,screenshot,requests,bodyText:await page.locator('body').innerText(),restartAfterProposal:true,fixtureCallsDuringJourney:0,historicalSeed:historical?process.argv[3]:null,missing041ReadByteIdentical:!!historical}
      fs.writeFileSync(path.join(directory,mode+'.json'),JSON.stringify(receipt,null,2));receipts.push({mode,status:'PASS',screenshot})
      console.log('PASS Product browser '+mode)
    } catch(cause) {
      await page.screenshot({path:path.join(directory,mode+'-failure.png'),fullPage:true}).catch(()=>{})
      fs.writeFileSync(path.join(directory,mode+'-failure.json'),JSON.stringify({mode,error:String(cause),requests,bodyText:await page.locator('body').innerText().catch(()=>''),home},null,2));throw cause
    } finally {fs.writeFileSync(path.join(directory,mode+'-server.log'),server.output());await browser.close();await stop(server.child)}
  }
  fs.writeFileSync(path.join(directory,'summary.json'),JSON.stringify({status:'PASS',scenarios:receipts},null,2));console.log(directory)
}
main().catch(cause=>{console.error(cause);process.exitCode=1})
