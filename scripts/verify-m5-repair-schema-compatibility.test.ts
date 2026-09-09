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
import { initDb, getDb, closeDb } from '../src/core/storage/db'
import { runSqliteMigrationCoordinator } from '../src/core/storage/migrate'
import { canonicalJson } from '../src/core/storage/JsonAppModelMigrationPlanner'
import { materializeCanonicalTestSet } from '../src/core/test-design/TestDefinitionContract'
import type { CanonicalSuiteRevision } from '../src/core/suites/SuiteContract'
import { RepairAuthorityRepository } from '../src/core/storage/repositories/RepairAuthorityRepository'
import { REPAIR_AUTHORITY_COLUMNS, projectRepairAuthorityColumns, repairAuthorityHash, repairAuthorityRow, isExactRepairAuthorityRow, type RepairAuthorityTable } from '../src/core/storage/RepairAuthorityValidation'
import { captureProposalIdentityAuthority, proposalIdentityAuthorityRow } from '../src/core/storage/RepairProposalIdentityAuthority'

const load=(name:string):any=>JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/m5-contract/positive',name+'.json'),'utf8'))
const insert=(table:string,row:any)=>(getDb() as any).insertInto(table).values(row).execute()
const read=(table:string)=>(getDb() as any).selectFrom(table).selectAll().execute()
async function migrate(ceiling:string) {
  const dir=path.join(__dirname,'../src/core/storage/migrations')
  const migrations=Object.fromEntries(fs.readdirSync(dir).filter(name=>/^\d.*\.ts$/.test(name)&&name.slice(0,3)<=ceiling)
    .map(name=>[name.slice(0,-3),name.startsWith('004_')?{up:async()=>{}}:require(path.join(dir,name))]))
  await runSqliteMigrationCoordinator(getDb(),migrations)
}
async function fixture(wasm:boolean,ceiling:string,run:(dbPath:string)=>Promise<void>) {
  const Module=require('node:module'),original=Module._load;let forced=0
  if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){forced++;throw Error('Forced compatibility WASM')}return original.call(this,name,...args)}
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-compat-')),dbPath=path.join(root,'forge.db')
  try {initDb(dbPath);await migrate(ceiling);await run(dbPath);if(wasm)assert.ok(forced>0)}
  finally {await closeDb();Module._load=original;assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-compat-'));fs.rmSync(root,{recursive:true,force:true})}
}
async function approval(ceiling:string) {
  const p=load('proposal'),d=load('approve'),w=captureProposalIdentityAuthority(p,'caller')
  await getDb().transaction().execute(async db=>{
    if(ceiling==='037')await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(w)).execute()
    await db.insertInto('repair_proposals').values({...repairAuthorityRow('repair_proposals',p),...(ceiling==='037'?{identity_authority_hash:w.identityAuthorityHash}:{})} as any).execute()
    await db.insertInto('repair_decisions').values(repairAuthorityRow('repair_decisions',d) as any).execute()
  })
  assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
}
async function corrupt(table:string,values:any) {
  const guards=(await sql<{name:string;sql:string}>`SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name=${table}`.execute(getDb())).rows
  for(const guard of guards)await sql.raw('DROP TRIGGER "'+guard.name+'"').execute(getDb())
  await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
  try {if(typeof values==='function')await values();else await (getDb() as any).updateTable(table).set(values).execute()}
  finally {await sql`PRAGMA foreign_keys=ON`.execute(getDb());for(const guard of guards)await sql.raw(guard.sql).execute(getDb())}
}
const authorityFixtures:[RepairAuthorityTable,string][]=[['repair_proposals','proposal'],['repair_decisions','approve'],
  ['app_model_transition_supersessions','supersession-authority'],['repair_revision_origins','repair-revision-link'],['repair_rerun_links','repair-rerun-link']]
for(const [table,name] of authorityFixtures)test('COMPAT frozen logical exactness '+table,()=>{
  const payload=load(name),row=repairAuthorityRow(table,payload),{canonical_payload,...columns}=row
  assert.equal(isExactRepairAuthorityRow(table,canonical_payload,JSON.stringify(columns)),1)
  assert.equal(isExactRepairAuthorityRow(table,canonical_payload,JSON.stringify({...columns,future_column:'unowned'})),0)
  assert.equal(isExactRepairAuthorityRow(table,canonicalJson({...payload,unknownAuthority:true}),JSON.stringify(columns)),0)
  for(const key of Object.keys(REPAIR_AUTHORITY_COLUMNS[table])) {
    assert.equal(isExactRepairAuthorityRow(table,canonical_payload,JSON.stringify({...columns,[key]:columns[key]===null?'tampered':null})),0,key)
  }
})
for(const wasm of [false,true])for(const ceiling of ['036','037']) {
  const label=ceiling+' '+(wasm?'WASM':'native')
  for(const extra of [false,true])test('COMPAT append/read/replay/reopen all sibling readers '+label+' extra='+extra,()=>fixture(wasm,ceiling,async dbPath=>{
    await approval(ceiling)
    const repo=new RepairAuthorityRepository(()=>getDb()),a=load('supersession-authority'),origin=load('repair-revision-link'),link=load('repair-rerun-link')
    if(extra)for(const [table] of authorityFixtures)await sql.raw('ALTER TABLE '+table+' ADD COLUMN future_physical TEXT').execute(getDb())
    const physical=(await read('repair_proposals'))[0],logical=projectRepairAuthorityColumns('repair_proposals',physical)
    assert.equal(Object.hasOwn(logical,'identity_authority_hash'),false)
    assert.equal(Object.hasOwn(logical,'future_physical'),false)
    assert.equal(isExactRepairAuthorityRow('repair_proposals',physical.canonical_payload,JSON.stringify(logical)),1)
    assert.deepEqual(await repo.persistSupersessionExact(a),{authority:a,replay:false})
    await insert('test_set_revisions',testSetRow('source-test-set',701));await sourceWitness()
    await getDb().transaction().execute(async trx=>{
      await trx.insertInto('test_set_revisions').values({...testSetRow('resulting-test-set',802),revision_origin_kind:'repair',repair_origin_id:origin.repairOriginId}).execute()
      assert.deepEqual(await repo.persistOriginExact(origin,trx),{authority:origin,replay:false})
    })
    await executionGraph();assert.deepEqual(await repo.persistRerunExact(link),{authority:link,replay:false})
    await closeDb();initDb(dbPath)
    // Extra columns deliberately simulate a later schema, not an approved migration.
    if(!extra)await migrate(ceiling)
    const before=(await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    assert.deepEqual(await repo.persistSupersessionExact(a),{authority:a,replay:true})
    assert.deepEqual(await repo.readOriginExact(origin.projectId,origin.repairOriginId),origin)
    assert.deepEqual(await getDb().transaction().execute(trx=>repo.persistOriginExact(origin,trx)),{authority:origin,replay:true})
    assert.deepEqual(await repo.readRerunExact(link.projectId,link.rerunLinkId),link)
    assert.deepEqual(await repo.persistRerunExact(link),{authority:link,replay:true})
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n,before)
    const changed={...a,promotedAt:'2026-09-04T00:00:00.000Z'};changed.authorityHash=repairAuthorityHash('app_model_transition_supersessions',changed)
    await assert.rejects(repo.persistSupersessionExact(changed),/identity conflicts/)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  }))
  for(const attack of ['proposal-column','decision-column','proposal-payload-unknown','decision-payload-unknown','proposal-hash','decision-hash',...(ceiling==='037'?['pair-hash','witness-hash','witness-pair','missing-witness','witness-payload-unknown']:[])])
    test('COMPAT approval corruption refuses append and replay '+label+' '+attack,()=>fixture(wasm,ceiling,async()=>{
      await approval(ceiling)
      const repo=new RepairAuthorityRepository(()=>getDb()),a=load('supersession-authority')
      assert.equal((await repo.persistSupersessionExact(a)).replay,false)
      if(attack==='proposal-column')await corrupt('repair_proposals',{candidate_set_hash:'f'.repeat(64)})
      if(attack==='decision-column')await corrupt('repair_decisions',{actor_id:'changed-human'})
      if(attack==='proposal-payload-unknown')await corrupt('repair_proposals',{canonical_payload:canonicalJson({...load('proposal'),unknownAuthority:true})})
      if(attack==='decision-payload-unknown')await corrupt('repair_decisions',{canonical_payload:canonicalJson({...load('approve'),unknownAuthority:true})})
      if(attack==='proposal-hash')await corrupt('repair_proposals',{proposal_hash:'f'.repeat(64)})
      if(attack==='decision-hash')await corrupt('repair_decisions',{decision_hash:'f'.repeat(64)})
      if(attack==='pair-hash')await corrupt('repair_proposals',{identity_authority_hash:'f'.repeat(64)})
      if(attack==='witness-hash')await corrupt('repair_proposal_identity_authorities',{identity_authority_hash:'f'.repeat(64)})
      if(attack==='missing-witness')await corrupt('repair_proposal_identity_authorities',()=>getDb().deleteFrom('repair_proposal_identity_authorities').execute())
      if(attack==='witness-payload-unknown') {
        const w=JSON.parse((await read('repair_proposal_identity_authorities'))[0].canonical_payload)
        await corrupt('repair_proposal_identity_authorities',{canonical_payload:canonicalJson({...w,unknownAuthority:true})})
      }
      if(attack==='witness-pair') {
        const p=load('proposal');p.proposedAt='2026-09-04T00:00:00.000Z';p.proposalHash=repairAuthorityHash('repair_proposals',p)
        await corrupt('repair_proposal_identity_authorities',proposalIdentityAuthorityRow(captureProposalIdentityAuthority(p,'caller')))
      }
      const before=await read('app_model_transition_supersessions')
      await assert.rejects(repo.persistSupersessionExact(a),{code:'SUPERSESSION_INTEGRITY_INVALID'})
      const another={...a,authorityId:a.authorityId+'-another'};another.authorityHash=repairAuthorityHash('app_model_transition_supersessions',another)
      await assert.rejects(repo.persistSupersessionExact(another),{code:'SUPERSESSION_INTEGRITY_INVALID'})
      assert.deepEqual(await read('app_model_transition_supersessions'),before)
    }))
}

function testSetRow(name: string, id: number): any {
  const set = load(name)
  const support = set.canonicalSupport
  const materialized = materializeCanonicalTestSet(set)
  return { id, test_set_id: set.testSetId, revision: set.revision, project_id: set.projectId,
    generation_id: set.generationId, schema_version: 3, source_observation_id: null,
    model_row_id: support.modelRowId, model_version: support.modelVersion,
    observation_run_id: support.observationRunId, support_seal_hash: support.supportSealHash,
    characterization_policy_id: support.characterizationPolicy.id,
    characterization_policy_version: support.characterizationPolicy.version,
    generated_at: set.generatedAt, outcome: set.outcome, definition_count: set.definitions.length,
    payload_json: materialized.json, content_hash: materialized.fingerprint }
}

async function sourceWitness(id = 'source-witness'): Promise<void> {
  const set = testSetRow('source-test-set',701), definition = JSON.parse(set.payload_json).definitions[0]
  await insert('executions', { execution_id:id, project_id:set.project_id, accepted_at:set.generated_at,
    test_set_id:set.test_set_id, test_set_revision:set.revision, definition_schema_version:3,
    model_row_id:set.model_row_id, model_version:set.model_version, source_observation_id:null,
    support_seal_hash:set.support_seal_hash, route_evidence_identity_hash:'d'.repeat(64),
    authentication_expectation_identity_hash:'d'.repeat(64), manifest_hash:'c'.repeat(64), max_run_attempts:1,
    dispatch_mode:'serial', stop_rule:'stop_on_first_non_completed', execution_intent_key:id, execution_intent_fingerprint:'f'.repeat(64) })
  await insert('execution_items', { execution_id:id, item_ordinal:1, definition_id:definition.id, executable_plan_hash:'c'.repeat(64) })
  await insert('execution_item_authorities', { execution_id:id, item_ordinal:1, test_set_row_id:set.id,
    test_set_id:set.test_set_id, test_set_revision:set.revision, test_set_content_hash:set.content_hash,
    definition_schema_version:3, definition_id:definition.id })
}

async function executionGraph(set = testSetRow('resulting-test-set', 802), suite: boolean | CanonicalSuiteRevision = false): Promise<void> {
  const rerun = load('repair-rerun-link')
  const a = rerun.executionAuthority
  const definition = JSON.parse(set.payload_json).definitions[0]
  await insert('executions', { execution_id: a.executionId, project_id: set.project_id,
    accepted_at: rerun.recordedAt, test_set_id: set.test_set_id, test_set_revision: set.revision,
    definition_schema_version: 3, model_row_id: set.model_row_id, model_version: set.model_version,
    source_observation_id: null, support_seal_hash: set.support_seal_hash,
    route_evidence_identity_hash: 'd'.repeat(64), authentication_expectation_identity_hash: 'd'.repeat(64),
    manifest_hash: a.planHash, max_run_attempts: 2, dispatch_mode: 'serial', stop_rule: 'stop_on_first_non_completed',
    execution_intent_key: 'm5-test-execution', execution_intent_fingerprint: 'f'.repeat(64),
    ...(suite ? { suite_id: typeof suite === 'object' ? suite.suiteId : 'm5-preserved-suite',
      suite_revision: typeof suite === 'object' ? suite.revision : 1,
      suite_content_hash: typeof suite === 'object' ? suite.contentHash : 'f'.repeat(64) } : {}),
    ...(typeof suite === 'object' && suite.schemaVersion === 2 ? {
      test_set_authority_scope:'per_item', test_set_id:null, test_set_revision:null, definition_schema_version:null,
      model_row_id:null, model_version:null, source_observation_id:null, support_seal_hash:null,
      route_evidence_identity_hash:null, authentication_expectation_identity_hash:null,
    } : {}) })
  await insert('execution_items', { execution_id: a.executionId, item_ordinal: a.itemOrdinal,
    definition_id: definition.id, executable_plan_hash: a.planHash })
  await insert('execution_item_authorities', { execution_id: a.executionId, item_ordinal: a.itemOrdinal,
    test_set_row_id: set.id, test_set_id: set.test_set_id, test_set_revision: set.revision,
    test_set_content_hash: set.content_hash, definition_schema_version: 3, definition_id: definition.id })
  await insert('runs', { id: 1901, run_id: a.runId, app_name: set.project_id, started_at: rerun.recordedAt,
    completed_at: rerun.recordedAt, execution_id: a.executionId, origin: 'product', attempt_ordinal: 1 })
  await insert('test_results', { id: 2901, run_id: a.runId, test_id: definition.id, title: 'Persisted test evidence',
    suite: 'direct', status: 'failed', result_id: a.resultId, execution_item_ordinal: a.itemOrdinal,
    definition_id: definition.id, executable_plan_hash: a.planHash })
}
