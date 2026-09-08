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
import { createHash } from 'node:crypto'
import { sql } from 'kysely'
import { closeDb, getDb, initDb, getDatabaseProvenance } from '../src/core/storage/db'
import { runMigrations, runSqliteMigrationCoordinator } from '../src/core/storage/migrate'
import { runWithMigrationContext } from '../src/core/storage/MigrationContext'
import { up as migrate036, migration036ImmutableTriggerDefinitions } from '../src/core/storage/migrations/036_m5_repair_persistence_authority'
import { canonicalJson, canonicalJsonSha256 } from '../src/core/storage/JsonAppModelMigrationPlanner'
import { materializeCanonicalTestSet } from '../src/core/test-design/TestDefinitionContract'
import { RepairAuthorityRepository } from '../src/core/storage/repositories/RepairAuthorityRepository'
import { ManualTestSourceRepository } from '../src/core/storage/repositories/ManualTestSourceRepository'
import { SuiteRepository } from '../src/core/storage/repositories/SuiteRepository'
import type { CanonicalSuiteRevision } from '../src/core/suites/SuiteContract'
import { repairAuthorityHash, repairAuthorityRow, parseRepairAuthority, type RepairAuthorityTable } from '../src/core/storage/RepairAuthorityValidation'
import { verifySourceProductAuthority, assertSourceProductAuthority } from '../src/core/storage/RepairSourceAuthority'

const CEILING = '036_m5_repair_persistence_authority'
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'm5-contract', 'positive')
const load = (name: string): any => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8'))
const productHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const insert = (table: string, row: any) => (getDb() as any).insertInto(table).values(row).execute()
const read = (table: string) => (getDb() as any).selectFrom(table).selectAll().execute()

for (const wasm of [false, true]) test(`SOURCE Work self-consistent single-row corruption SQL refuses (${wasm ? 'WASM' : 'native'})`, async () => {
  const Module = require('node:module'), original = Module._load
  if (wasm) Module._load = function(request: string, ...args: any[]) {
    if (request === 'better-sqlite3') throw new Error('Forced source witness WASM')
    return original.call(this, request, ...args)
  }
  try { await withDb(async dbPath => {
    await parents()
    const set = load('source-test-set'); set.generatedAt = '2026-09-02T12:00:00.000Z'
    const materialized = materializeCanonicalTestSet(set)
    await corruptSource({ payload_json:materialized.json, content_hash:materialized.fingerprint, generated_at:set.generatedAt })
    const origin = load('repair-revision-link'); origin.sourceDefinitionAuthority.testSetContentHash = materialized.fingerprint
    reseal('repair_revision_origins', origin)
    await assert.rejects(pair(false, repairAuthorityRow('repair_revision_origins', origin)), /source.*(witness|integrity)/i)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_revision_origins'), [])
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  }) } finally { Module._load = original }
})

async function corruptSource(values: any): Promise<void> {
  const guards = (await sql<{ name:string; sql:string }>`SELECT name,sql FROM sqlite_schema
    WHERE type='trigger' AND tbl_name='test_set_revisions' AND upper(sql) LIKE '%UPDATE%'`.execute(getDb())).rows
  for (const guard of guards) await sql.raw(`DROP TRIGGER "${guard.name}"`).execute(getDb())
  try { await getDb().updateTable('test_set_revisions').set(values).where('id','=',701).execute() }
  finally { for (const guard of guards) await sql.raw(guard.sql).execute(getDb()) }
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

async function appendOrigin(origin=load('repair-revision-link')): Promise<any> {
  return getDb().transaction().execute(async trx=>{
    const result={ ...testSetRow('resulting-test-set',802),revision_origin_kind:'repair',repair_origin_id:origin.repairOriginId }
    await trx.insertInto('test_set_revisions').values(result).execute()
    return new RepairAuthorityRepository().persistOriginExact(origin,trx)
  })
}

for(const wasm of [false,true]) {
  test(`SOURCE Work append/read/replay/restart and transitive rerun refuse (${wasm?'WASM':'native'})`, async()=>{
    const Module=require('node:module'), original=Module._load; let loads=0
    if(wasm) Module._load=function(request:string,...args:any[]) {
      if(request==='better-sqlite3') { loads++; throw new Error('Forced source WASM') }
      return original.call(this,request,...args)
    }
    try {
      await withDb(async dbPath=>{
        await parents()
        const origin=load('repair-revision-link'), repo=new RepairAuthorityRepository()
        assert.equal((await appendOrigin()).replay,false)
        await executionGraph()
        const link=load('repair-rerun-link'); await repo.persistRerunExact(link)
        const before=await read('repair_revision_origins'), guards=(await sql`SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name`.execute(getDb())).rows
        const set=load('source-test-set'); set.generatedAt='2026-09-02T12:00:00.000Z'
        const materialized=materializeCanonicalTestSet(set)
        await corruptSource({ payload_json:materialized.json,content_hash:materialized.fingerprint,generated_at:set.generatedAt })
        assert.deepEqual((await sql`SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name`.execute(getDb())).rows,guards)
        assert.deepEqual(await read('repair_revision_origins'),before)
        await assert.rejects(repo.readOriginExact(origin.projectId,origin.repairOriginId),/source integrity/)
        await assert.rejects(getDb().transaction().execute(trx=>repo.persistOriginExact(origin,trx)),/source integrity/)
        await assert.rejects(repo.persistSupersessionExact(load('supersession-authority')),/source integrity/)
        await assert.rejects(repo.readRerunExact(link.projectId,link.rerunLinkId),/source integrity/)
        await assert.rejects(repo.persistRerunExact(link),/source integrity/)
        await closeDb(); initDb(dbPath)
        await assert.rejects(runMigrations(),/036_m5_repair_persistence_authority/)
      })
      await withDb(async dbPath=>{
        await parents()
        const set=load('source-test-set'); set.generatedAt='2026-09-02T12:00:00.000Z'
        const materialized=materializeCanonicalTestSet(set)
        await corruptSource({payload_json:materialized.json,content_hash:materialized.fingerprint,generated_at:set.generatedAt})
        const origin=load('repair-revision-link'); origin.sourceDefinitionAuthority.testSetContentHash=materialized.fingerprint
        reseal('repair_revision_origins',origin)
        await assert.rejects(appendOrigin(origin),/Stage B/)
        assert.deepEqual(await read('repair_revision_origins'),[])
        assert.equal((await read('test_set_revisions')).length,1,'outer rollback removes reciprocal repaired row')
        await closeDb(); initDb(dbPath); await runMigrations()
        await assert.rejects(appendOrigin(origin),/Stage B/)
        assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
      })
      if(wasm) assert.ok(loads>=4)
    } finally { Module._load=original }
  })
}

for(const multiple of [false,true]) test(`SOURCE ${multiple?'multiple':'one'} exact witnesses authenticate, reopen and replay without writes`, async()=>{
  await withDb(async dbPath=>{
    await parents(); if(multiple) await sourceWitness('second-source-witness')
    const origin=load('repair-revision-link'),repo=new RepairAuthorityRepository()
    assert.deepEqual(await read('diagnostic_evidence'),[],'diagnostics are not prerequisites')
    assert.equal((await appendOrigin()).replay,false)
    await closeDb(); initDb(dbPath); await runMigrations()
    const before=(await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    assert.deepEqual(await repo.readOriginExact(origin.projectId,origin.repairOriginId),origin)
    assert.deepEqual(await getDb().transaction().execute(trx=>repo.persistOriginExact(origin,trx)),{authority:origin,replay:true})
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n,before)
    const altered={...origin,createdAt:'2026-09-04T00:00:00.000Z'}; reseal('repair_revision_origins',altered)
    await assert.rejects(getDb().transaction().execute(trx=>repo.persistOriginExact(altered,trx)),/identity conflicts/)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  })
})

for(const [name,values] of [
  ['wrong hash',{test_set_content_hash:'0'.repeat(64)}],
  ['wrong row identity',{test_set_row_id:999}],
  ['wrong revision',{test_set_revision:99}],
  ['wrong Test Set identity',{test_set_id:'other-set'}],
  ['wrong schema',{definition_schema_version:2}],
  ['wrong Definition',{definition_id:'other-definition'}],
  ['wrong item ordinal',{item_ordinal:2}],
] as const) test(`SOURCE witness ${name} refuses append, SQL and later reread`,async()=>{
  await withDb(async dbPath=>{
    await parents(); await appendOrigin()
    // Intentional external single-witness corruption. Restore FK and exact guards
    // before asserting the independent repository/restart validation behavior.
    await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
    try { await corruptWithGuardsRestored('execution_item_authorities',values) }
    finally { await sql`PRAGMA foreign_keys=ON`.execute(getDb()) }
    const origin=load('repair-revision-link'),repo=new RepairAuthorityRepository()
    await assert.rejects(verifySourceProductAuthority(getDb(),origin),/Stage B/)
    await assert.rejects(repo.readOriginExact(origin.projectId,origin.repairOriginId),/Stage B/)
    await assert.rejects(getDb().transaction().execute(trx=>repo.persistOriginExact(origin,trx)),/Stage B/)
    await closeDb(); initDb(dbPath); await assert.rejects(runMigrations(),/036_m5_repair_persistence_authority/)
  })
  await withDb(async()=>{
    await parents()
    await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
    try { await corruptWithGuardsRestored('execution_item_authorities',values) }
    finally { await sql`PRAGMA foreign_keys=ON`.execute(getDb()) }
    await assert.rejects(appendOrigin(),/Stage B/)
    await assert.rejects(pair(),/source integrity/)
    assert.deepEqual(await read('repair_revision_origins'),[])
  })
})

test('SOURCE contradictory witness cannot be ignored in favor of an exact witness',async()=>{
  await withDb(async()=>{
    await parents(); await sourceWitness('second-source-witness')
    const guards=(await sql<{name:string;sql:string}>`SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name='execution_item_authorities' AND upper(sql) LIKE '%UPDATE%'`.execute(getDb())).rows
    for(const guard of guards) await sql.raw(`DROP TRIGGER "${guard.name}"`).execute(getDb())
    await getDb().updateTable('execution_item_authorities').set({test_set_content_hash:'0'.repeat(64)}).where('execution_id','=','second-source-witness').execute()
    for(const guard of guards) await sql.raw(guard.sql).execute(getDb())
    await assert.rejects(appendOrigin(),/Stage B/)
    await assert.rejects(pair(),/source integrity/)
  })
})

test('SOURCE wrong project owning execution cannot authenticate the source',async()=>{
  await withDb(async()=>{
    await parents()
    await corruptWithGuardsRestored('executions',{project_id:'other-project'})
    await assert.rejects(appendOrigin(),/Stage B/)
    await assert.rejects(pair(),/source integrity/)
  })
})

test('SOURCE no witness or independently valid unrelated Test Set witness refuses',async()=>{
  await withDb(async()=>{
    await insert('repair_proposals',proposalRow()); await insert('repair_decisions',decisionRow())
    await new RepairAuthorityRepository().persistSupersessionExact(load('supersession-authority'))
    await insert('test_set_revisions',testSetRow('source-test-set',701))
    await assert.rejects(appendOrigin(),/Stage B/)
    await assert.rejects(pair(),/source integrity/)
    await insert('test_set_revisions',testSetRow('resulting-test-set',802)); await executionGraph()
    await assert.rejects(verifySourceProductAuthority(getDb(),load('repair-revision-link')),/Stage B/)
    assert.deepEqual(await read('repair_revision_origins'),[])
  })
})

for(const [name,mutate] of [
  ['payload without rehash',(row:any)=>{const set=JSON.parse(row.payload_json);set.generatedAt='2026-09-02T12:00:00.000Z';row.payload_json=JSON.stringify(set)}],
  ['hash without payload',(row:any)=>{row.content_hash='0'.repeat(64)}],
  ['embedded project',(row:any)=>{row.project_id='other-project'}],
  ['embedded generation',(row:any)=>{row.generation_id='other-generation'}],
  ['embedded support',(row:any)=>{row.support_seal_hash='0'.repeat(64)}],
] as const) test(`SOURCE Stage A ${name} refuses before witness inspection`,async()=>{
  await withDb(async()=>{
    await parents()
    const row=(await read('test_set_revisions'))[0];mutate(row)
    const snapshot:any={source:[row],proposal:proposalRow().canonical_payload}
    Object.defineProperty(snapshot,'witnesses',{get(){throw new Error('Stage B must not run')}})
    assert.throws(()=>assertSourceProductAuthority(load('repair-revision-link'),snapshot),/Stage A/)
  })
})

for(const [name,mutate] of [
  ['altered Definition hash',(o:any)=>{o.sourceDefinitionAuthority.definitionContentHash='0'.repeat(64)}],
  ['absent Definition',(o:any)=>{o.sourceDefinitionAuthority.definitionId='missing-definition'}],
  ['altered source model',(o:any)=>{o.sourceDefinitionAuthority.modelRowId=999}],
] as const) test(`SOURCE authenticated Test Set with ${name} refuses`,async()=>{
  await withDb(async()=>{
    await parents();const origin=load('repair-revision-link');mutate(origin);reseal('repair_revision_origins',origin)
    await assert.rejects(appendOrigin(origin),/Stage A/)
    await assert.rejects(pair(false,repairAuthorityRow('repair_revision_origins',origin)),/source integrity/)
  })
})

test('SOURCE changed Definition bytes with rehashed Test Set still refuse unchanged witness',async()=>{
  await withDb(async()=>{
    await parents();const set=load('source-test-set');set.definitions[0].title+=' corrupted'
    const materialized=materializeCanonicalTestSet(set)
    await corruptSource({payload_json:materialized.json,content_hash:materialized.fingerprint})
    const origin=load('repair-revision-link');origin.sourceDefinitionAuthority.testSetContentHash=materialized.fingerprint
    origin.sourceDefinitionAuthority.definitionContentHash=productHash(set.definitions[0]);reseal('repair_revision_origins',origin)
    await assert.rejects(appendOrigin(origin),/Stage B/)
    await assert.rejects(pair(false,repairAuthorityRow('repair_revision_origins',origin)),/source integrity/)
  })
})

test('SOURCE duplicate nominated Definition refuses before witnesses',async()=>{
  await withDb(async()=>{
    await parents();const set=load('source-test-set');set.definitions.push(set.definitions[0])
    await corruptSource({payload_json:JSON.stringify(set),content_hash:productHash(set),definition_count:2})
    const origin=load('repair-revision-link');origin.sourceDefinitionAuthority.testSetContentHash=productHash(set);reseal('repair_revision_origins',origin)
    await assert.rejects(appendOrigin(origin),/Stage A/)
  })
})

for(const [field,value] of [
  ['flowId','other-flow'],['stepIndex',9],['sourceSubjectId','other-subject'],['targetSubjectId','other-target'],
  ['elementId','other-element'],['selector',{kind:'data_test',value:'unapproved-selector'}],
  ['observationRunId','other-observation'],['supportingObservationIds',['other-observation']],
  ['characterizationPolicy',{id:'other-policy',version:'1'}],
] as const) test(`SOURCE proposal ${field} must agree with authenticated original Definition`,async()=>{
  await withDb(async()=>{
    await parents();const proposal=load('proposal');proposal.source[field]=value;reseal('repair_proposals',proposal)
    const origin=load('repair-revision-link');origin.proposalAuthority.proposalHash=proposal.proposalHash;reseal('repair_revision_origins',origin)
    const row=(await read('test_set_revisions'))[0]
    assert.throws(()=>assertSourceProductAuthority(origin,{source:[row],proposal:canonicalJson(proposal),witnesses:[]}),/Stage A/)
  })
})

test('SOURCE corrupt lineage refuses new rerun insertion through repository and raw SQL',async()=>{
  await withDb(async dbPath=>{
    await parents();await pair();await executionGraph()
    const set=load('source-test-set');set.generatedAt='2026-09-02T12:00:00.000Z';const materialized=materializeCanonicalTestSet(set)
    await corruptSource({payload_json:materialized.json,content_hash:materialized.fingerprint,generated_at:set.generatedAt})
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(load('repair-rerun-link')),/source integrity/)
    await assert.rejects(insert('repair_rerun_links',rerunRow()),/persisted Product authority mismatch/)
    assert.deepEqual(await read('repair_rerun_links'),[])
    await closeDb();initDb(dbPath);await assert.rejects(runMigrations(),/036_m5_repair_persistence_authority/)
  })
})

test('SOURCE origin-first reciprocal insertion rechecks source before accepting repaired row',async()=>{
  await withDb(async dbPath=>{
    await parents();await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('repair_revision_origins',originRow())
    await corruptSource({content_hash:'0'.repeat(64)})
    await assert.rejects(insert('test_set_revisions',{...testSetRow('resulting-test-set',802),revision_origin_kind:'repair',repair_origin_id:load('repair-revision-link').repairOriginId}),/Repair Test Set origin authority mismatch/)
    await sql`ROLLBACK`.execute(getDb())
    await closeDb();initDb(dbPath);await runMigrations()
    assert.deepEqual(await read('repair_revision_origins'),[])
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows,[])
  })
})

test('SOURCE origin repository refuses unknown fields before using the transaction',async()=>{
  const transaction:any=new Proxy({}, {get(){throw new Error('Transaction must not be accessed')}})
  await assert.rejects(new RepairAuthorityRepository().persistOriginExact({...load('repair-revision-link'),unknown:true},transaction),/schema/)
})

test('SOURCE origin repository refuses disabled foreign keys without partial lineage',async()=>{
  await withDb(async()=>{
    await parents();await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
    try { await assert.rejects(appendOrigin(),/foreign-key enforcement/) }
    finally { await sql`PRAGMA foreign_keys=ON`.execute(getDb()) }
    assert.deepEqual(await read('repair_revision_origins'),[])
    assert.equal((await read('test_set_revisions')).length,1)
  })
})

test('SOURCE origin reader refuses payload/column contradiction even with authentic source witnesses',async()=>{
  await withDb(async dbPath=>{
    await parents();await appendOrigin();const origin=load('repair-revision-link'),repo=new RepairAuthorityRepository()
    const altered={...origin,createdAt:'2026-09-04T00:00:00.000Z'};reseal('repair_revision_origins',altered)
    await corruptWithGuardsRestored('repair_revision_origins',{canonical_payload:canonicalJson(altered)})
    await assert.rejects(repo.readOriginExact(origin.projectId,origin.repairOriginId),/payload\/column integrity/)
    await assert.rejects(getDb().transaction().execute(trx=>repo.persistOriginExact(origin,trx)),/payload\/column integrity/)
    await closeDb();initDb(dbPath);await assert.rejects(runMigrations(),/036_m5_repair_persistence_authority/)
  })
})

for (const [name, mutate] of [
  ['Run ID', (v: any) => { v.persistedAuthorities.run.runId = 'contradictory-run' }],
  ['Result ID', (v: any) => { v.persistedAuthorities.result.resultId = 'contradictory-result' }],
  ['plan hash', (v: any) => { v.persistedAuthorities.execution.manifest[0].planHash = '0'.repeat(64) }],
] as const) test(`RERUN Work reproduction: contradictory nested ${name} refuses`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const value = load('repair-rerun-link'); mutate(value); reseal('repair_rerun_links', value)
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    try {
      await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', value)), /persisted Product authority mismatch/)
      await sql`COMMIT`.execute(getDb())
    } catch (error) { await sql`ROLLBACK`.execute(getDb()); throw error }
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_rerun_links'), [])
  })
})

const rerunContradictions: [string, (v: any) => void][] = [
  ['nested Product Run ID', v => { v.persistedAuthorities.run.runId = 'other-run' }],
  ['nested Result ID', v => { v.persistedAuthorities.result.resultId = 'other-result' }],
  ['nested manifest plan hash', v => { v.persistedAuthorities.execution.manifest[0].planHash = '0'.repeat(64) }],
  ['wrong execution ID', v => { v.executionAuthority.executionId = 'other-execution' }],
  ['valid execution from another project', v => { v.projectId = 'other-project' }],
  ['wrong item ordinal', v => { v.executionAuthority.itemOrdinal = 2 }],
  ['wrong Definition ID', v => { v.resultingDefinitionAuthority.definitionId = 'other-definition' }],
  ['wrong plan hash', v => { v.executionAuthority.planHash = '0'.repeat(64) }],
  ['wrong attempt ordinal', v => { v.executionAuthority.attemptOrdinal = 2 }],
  ['different repaired Test Set', v => { v.resultingDefinitionAuthority.testSetRowId = 701 }],
  ['wrong repair origin', v => { v.repairOriginId = 'other-origin' }],
  ['wrong repair lineage', v => { v.repairLineageHash = '0'.repeat(64) }],
  ['nested execution identity', v => { v.persistedAuthorities.execution.executionId = 'other-execution' }],
  ['nested execution project', v => { v.persistedAuthorities.execution.projectId = 'other-project' }],
  ['nested run execution relationship', v => { v.persistedAuthorities.run.executionId = 'other-execution' }],
  ['nested run project', v => { v.persistedAuthorities.run.projectId = 'other-project' }],
  ['nested run attempt', v => { v.persistedAuthorities.run.attemptOrdinal = 2 }],
  ['nested Result run relationship', v => { v.persistedAuthorities.result.runId = 'other-run' }],
  ['nested Result item ordinal', v => { v.persistedAuthorities.result.itemOrdinal = 2 }],
  ['nested Result Definition', v => { v.persistedAuthorities.result.definitionId = 'other-definition' }],
  ['nested Result plan hash', v => { v.persistedAuthorities.result.planHash = '0'.repeat(64) }],
  ['nested Result project', v => { v.persistedAuthorities.result.projectId = 'other-project' }],
  ['nested manifest ordinal', v => { v.persistedAuthorities.execution.manifest[0].itemOrdinal = 2 }],
  ['nested manifest Definition hash', v => { v.persistedAuthorities.execution.manifest[0].definitionAuthority.definitionContentHash = '0'.repeat(64) }],
  ['nested manifest Test Set hash', v => { v.persistedAuthorities.execution.manifest[0].definitionAuthority.testSetContentHash = '0'.repeat(64) }],
  ['nested manifest model row', v => { v.persistedAuthorities.execution.manifest[0].definitionAuthority.modelRowId = 999 }],
  ['extra nested manifest item', v => { v.persistedAuthorities.execution.manifest.push({ ...v.persistedAuthorities.execution.manifest[0], itemOrdinal:2 }) }],
  ['direct rerun with Suite reference', v => { v.suiteAuthority = { projectId:v.projectId, suiteId:'other-suite', revision:1, contentHash:'a'.repeat(64), itemOrdinal:1 } }],
  ['direct nested execution with Suite reference', v => { v.persistedAuthorities.execution.suiteAuthority = { projectId:v.projectId, suiteId:'other-suite', revision:1, contentHash:'a'.repeat(64), itemOrdinal:1 } }],
]
for (const [name, mutate] of rerunContradictions) test(`RERUN rejects ${name} at repository and SQL`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const value = load('repair-rerun-link'); mutate(value); reseal('repair_rerun_links', value)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(value), /persisted Product authority mismatch/)
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', value)), /authority mismatch/)
    await sql`COMMIT`.execute(getDb())
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_rerun_links'), [])
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  })
})

async function alternateEvidence(): Promise<void> {
  const id = load('repair-rerun-link').executionAuthority.executionId
  const e = (await read('executions')).find((v:any)=>v.execution_id===id), i = (await read('execution_items')).find((v:any)=>v.execution_id===id), a = (await read('execution_item_authorities')).find((v:any)=>v.execution_id===id)
  await insert('executions', { ...e, execution_id:'alternate-execution', execution_intent_key:'alternate-intent' })
  await insert('execution_items', { ...i, execution_id:'alternate-execution' })
  await insert('execution_item_authorities', { ...a, execution_id:'alternate-execution' })
  await insert('runs', { ...(await read('runs'))[0], id:1902, run_id:'alternate-run', execution_id:'alternate-execution' })
  await insert('test_results', { ...(await read('test_results'))[0], id:2902, result_id:'alternate-result', run_id:'alternate-run' })
  await insert('runs', { ...(await read('runs'))[0], id:1903, run_id:'legacy-run', origin:'legacy', execution_id:null, attempt_ordinal:null })
}

for (const [name, field, value] of [
  ['Product Run from another execution','runId','alternate-run'],
  ['non-Product Run','runId','legacy-run'],
  ['Result from another Run','resultId','alternate-result'],
] as const) test(`RERUN refuses actual ${name}`, async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph(); await alternateEvidence()
    const link = load('repair-rerun-link'); link.executionAuthority[field] = value; reseal('repair_rerun_links', link)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link)), /authority mismatch/)
    assert.deepEqual(await read('repair_rerun_links'), [])
  })
})

async function corruptWithGuardsRestored(table: string, values: any): Promise<void> {
  const guards = (await sql<{ name:string; sql:string }>`SELECT name,sql FROM sqlite_schema
    WHERE type='trigger' AND tbl_name=${table} AND upper(sql) LIKE '%UPDATE%'`.execute(getDb())).rows
  for (const guard of guards) await sql.raw(`DROP TRIGGER "${guard.name}"`).execute(getDb())
  try { await (getDb() as any).updateTable(table).set(values).execute() }
  finally { for (const guard of guards) await sql.raw(guard.sql).execute(getDb()) }
}

for (const [name, table, values] of [
  ['actual Result item ordinal','test_results',{ execution_item_ordinal:2 }],
  ['actual Result Definition ID','test_results',{ definition_id:'other-definition' }],
  ['actual Result plan hash','test_results',{ executable_plan_hash:'0'.repeat(64) }],
  ['actual execution item plan hash','execution_items',{ executable_plan_hash:'0'.repeat(64) }],
  ['actual item Definition ID','execution_items',{ definition_id:'other-definition' }],
  ['actual Run attempt exceeds execution bound','runs',{ attempt_ordinal:3 }],
] as const) test(`RERUN independently rereads ${name}`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const repo = new RepairAuthorityRepository(), link = load('repair-rerun-link')
    await repo.persistRerunExact(link)
    await corruptWithGuardsRestored(table, values)
    await assert.rejects(repo.readRerunExact(link.projectId, link.rerunLinkId), /persisted Product authority mismatch/)
    await assert.rejects(repo.persistRerunExact(link), /persisted Product authority mismatch/)
    await closeDb(); initDb(dbPath)
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

for (const corruption of ['columns', 'nested-payload', 'nested-payload-and-hash'] as const) test(`RERUN ${corruption} tampering refuses reread/replay/restart with guards present`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph(); await alternateEvidence()
    const repo = new RepairAuthorityRepository(), link = load('repair-rerun-link')
    await repo.persistRerunExact(link)
    const changed = load('repair-rerun-link'); changed.persistedAuthorities.run.runId = 'alternate-run'; reseal('repair_rerun_links', changed)
    await corruptWithGuardsRestored('repair_rerun_links', corruption === 'columns' ? { run_id:'alternate-run' }
      : { canonical_payload:canonicalJson(changed), ...(corruption === 'nested-payload-and-hash' ? { rerun_link_hash:changed.rerunLinkHash } : {}) })
    await assert.rejects(repo.readRerunExact(link.projectId, link.rerunLinkId), /integrity mismatch|persisted Product authority mismatch/)
    await assert.rejects(repo.persistRerunExact(link), /integrity mismatch|persisted Product authority mismatch/)
    await closeDb(); initDb(dbPath)
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

for (const suiteMode of [false, true]) test(`RERUN exact ${suiteMode ? 'new immutable Suite revision' : 'direct'} authority succeeds and replay is a no-op`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair()
    const suites = suiteMode ? await repairedSuiteGraph() : null
    await executionGraph(testSetRow('resulting-test-set', 802), suites?.repaired ?? false)
    const link = suites ? suiteRerun(suites.repaired) : load('repair-rerun-link'), repo = new RepairAuthorityRepository()
    const productTables = ['executions','execution_items','execution_item_authorities','runs','test_results','suites','suite_revisions','suite_revision_members','suite_revision_member_authorities','test_set_revisions']
    const before = await Promise.all(productTables.map(read))
    assert.equal((await repo.persistRerunExact(link)).replay, false)
    const changes = (await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    assert.deepEqual(await repo.persistRerunExact(link), { authority:link, replay:true })
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n, changes)
    assert.deepEqual(await Promise.all(productTables.map(read)), before)
    const changed = { ...link, recordedAt:'2026-09-06T00:00:00.000Z' }; reseal('repair_rerun_links', changed)
    await assert.rejects(repo.persistRerunExact(changed), /identity conflicts/)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await repo.readRerunExact(link.projectId, link.rerunLinkId), link)
    assert.equal((await repo.persistRerunExact(link)).replay, true)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
    if (suites) assert.deepEqual(await new SuiteRepository().read(link.projectId, suites.source.suiteId, suites.source.revision), suites.source)
  })
})

for (const [name, mutate] of [
  ['another project', (v: any) => { v.suiteAuthority.projectId = 'other-project' }],
  ['wrong Suite ID', (v: any) => { v.suiteAuthority.suiteId = 'other-suite' }],
  ['wrong Suite content hash', (v: any) => { v.suiteAuthority.contentHash = '0'.repeat(64) }],
  ['wrong repaired member ordinal', (v: any) => { v.suiteAuthority.itemOrdinal = 2 }],
  ['missing nested Suite', (v: any) => { delete v.persistedAuthorities.suite }],
  ['nested Suite member excludes repaired Definition', (v: any) => { v.persistedAuthorities.suite.members[0].definitionAuthority.definitionId = 'other-definition' }],
  ['nested Suite provenance', (v: any) => { v.persistedAuthorities.suite.provenance.changeIntentKey = 'other-intent' }],
] as const) test(`RERUN Suite refuses ${name}`, async () => {
  await withDb(async () => {
    await parents(); await pair(); const suites = await repairedSuiteGraph()
    await executionGraph(testSetRow('resulting-test-set', 802), suites.repaired)
    const link = suiteRerun(suites.repaired); mutate(link); reseal('repair_rerun_links', link)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link)), /authority mismatch/)
    assert.deepEqual(await read('repair_rerun_links'), [])
  })
})

test('RERUN historical Suite revision without repaired Definition cannot replace accepted new revision', async () => {
  await withDb(async () => {
    await parents(); await pair(); const suites = await repairedSuiteGraph()
    await executionGraph(testSetRow('resulting-test-set', 802), suites.repaired)
    const link = suiteRerun(suites.source)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link)), /authority mismatch/)
    assert.deepEqual(await new SuiteRepository().read(link.projectId, suites.source.suiteId, 1), suites.source)
  })
})

for (const field of ['top-level', 'nested', 'partial-suite']) test(`RERUN ${field} schema refuses before any Product read`, async () => {
  const link = load('repair-rerun-link')
  if (field === 'top-level') link.unknown = true
  else if (field === 'nested') link.persistedAuthorities.run.unknown = true
  else link.suiteAuthority = { suiteId:'partial' }
  const repo = new RepairAuthorityRepository(() => { throw new Error('Database must not be read before strict schema validation.') })
  await assert.rejects(repo.persistRerunExact(link), /schema/)
})

test('RERUN Product contradiction refuses before own hash verification', async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph()
    const link = load('repair-rerun-link'); link.persistedAuthorities.run.runId = 'wrong-run'; link.rerunLinkHash = '0'.repeat(64)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
  })
})

test('RERUN contradictory insert aborts before commit and outer rollback leaves zero partial links', async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const link = load('repair-rerun-link'), bad = load('repair-rerun-link')
    bad.rerunLinkId += '-bad'; bad.persistedAuthorities.result.resultId = 'wrong-result'; reseal('repair_rerun_links', bad)
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link))
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', bad)), /persisted Product authority mismatch/)
    await sql`ROLLBACK`.execute(getDb())
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_rerun_links'), [])
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  })
})

test('RERUN failed outer COMMIT then rollback removes the uncommitted link', async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('repair_rerun_links', rerunRow())
    await insert('test_set_revisions', { ...testSetRow('resulting-test-set', 803), revision:9, generation_id:'uncommitted-generation',
      revision_origin_kind:'repair', repair_origin_id:'missing-origin' })
    await assert.rejects(sql`COMMIT`.execute(getDb()), /FOREIGN KEY/)
    await sql`ROLLBACK`.execute(getDb())
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_rerun_links'), [])
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  })
})

for (const operation of ['INSERT OR REPLACE', 'UPSERT DO UPDATE']) test(`RERUN ${operation} cannot substitute different valid governed bytes`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const repo = new RepairAuthorityRepository(), link = load('repair-rerun-link')
    await repo.persistRerunExact(link)
    const changed = { ...link, recordedAt:'2026-09-06T00:00:00.000Z' }; reseal('repair_rerun_links', changed)
    const row = repairAuthorityRow('repair_rerun_links', changed)
    const statement = sql`${sql.raw(operation === 'INSERT OR REPLACE' ? 'INSERT OR REPLACE' : 'INSERT')}
      INTO repair_rerun_links (${sql.raw(Object.keys(row).join(','))}) VALUES (${sql.join(Object.values(row).map(value => sql`${value}`))})
      ${sql.raw(operation === 'UPSERT DO UPDATE' ? 'ON CONFLICT(rerun_link_id) DO UPDATE SET canonical_payload=excluded.canonical_payload,rerun_link_hash=excluded.rerun_link_hash,recorded_at=excluded.recorded_at' : '')}`
    await assert.rejects(statement.execute(getDb()), /identity already exists|immutable/)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await repo.readRerunExact(link.projectId, link.rerunLinkId), link)
  })
})

for (const [name, table, values] of [
  ['actual Suite revision project','suite_revisions',{ project_id:'other-project' }],
  ['actual Suite member authority','suite_revision_member_authorities',{ definition_id:'other-definition' }],
] as const) test(`RERUN reread refuses ${name} contradiction`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); const suites = await repairedSuiteGraph()
    await executionGraph(testSetRow('resulting-test-set', 802), suites.repaired)
    const repo = new RepairAuthorityRepository(), link = suiteRerun(suites.repaired)
    await repo.persistRerunExact(link)
    if (table === 'suite_revisions') {
      // The real composite FK already refuses a cross-project rewrite. Then
      // bypass it only to prove reread detects externally corrupted storage.
      await assert.rejects(corruptWithGuardsRestored(table, values), /FOREIGN KEY/)
      await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
      try { await corruptWithGuardsRestored(table, values) }
      finally { await sql`PRAGMA foreign_keys=ON`.execute(getDb()) }
    } else await corruptWithGuardsRestored(table, values)
    await assert.rejects(repo.readRerunExact(link.projectId, link.rerunLinkId), /persisted Product authority mismatch/)
    await closeDb(); initDb(dbPath)
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

test('RERUN forced WASM enforces nested rebound, exact replay and reopen', async () => {
  const Module = require('node:module'), originalLoad = Module._load
  let forcedLoads = 0
  Module._load = function(request: string, ...args: any[]) {
    if (request === 'better-sqlite3') { forcedLoads++; throw new Error('Forced WASM rerun certification') }
    return originalLoad.call(this, request, ...args)
  }
  try {
    await withDb(async dbPath => {
      await parents(); await pair(); await executionGraph()
      const repo = new RepairAuthorityRepository(), link = load('repair-rerun-link')
      for (const mutate of rerunContradictions.slice(0,3).map(([, mutate]) => mutate)) {
        const bad = load('repair-rerun-link'); mutate(bad); reseal('repair_rerun_links', bad)
        await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', bad)), /persisted Product authority mismatch/)
      }
      assert.equal((await repo.persistRerunExact(link)).replay, false)
      await closeDb(); initDb(dbPath); await runMigrations()
      assert.equal((await repo.persistRerunExact(link)).replay, true)
      assert.deepEqual(await repo.readRerunExact(link.projectId, link.rerunLinkId), link)
      assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
    })
    assert.ok(forcedLoads >= 2)
  } finally { Module._load = originalLoad }
})

test('RERUN direct link cannot carry even an independently valid nested Suite', async () => {
  await withDb(async () => {
    await parents(); await pair(); const suites = await repairedSuiteGraph(); await executionGraph()
    const link = load('repair-rerun-link'); link.persistedAuthorities.suite = suites.repaired; reseal('repair_rerun_links', link)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link)), /persisted Product authority mismatch/)
  })
})

test('RERUN even matching Run/payload attempt cannot exceed the accepted Execution attempt bound', async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph()
    await corruptWithGuardsRestored('runs', { attempt_ordinal:3 })
    const link = load('repair-rerun-link'); link.executionAuthority.attemptOrdinal = 3
    link.persistedAuthorities.run.attemptOrdinal = 3; reseal('repair_rerun_links', link)
    await assert.rejects(new RepairAuthorityRepository().persistRerunExact(link), /persisted Product authority mismatch/)
    await assert.rejects(insert('repair_rerun_links', repairAuthorityRow('repair_rerun_links', link)), /persisted Product authority mismatch/)
    assert.deepEqual(await read('repair_rerun_links'), [])
  })
})

function reseal(table: RepairAuthorityTable, value: any): any {
  const key = { repair_proposals:'proposalHash', repair_decisions:'decisionHash',
    app_model_transition_supersessions:'authorityHash', repair_revision_origins:'lineageHash', repair_rerun_links:'rerunLinkHash' }[table]
  value[key] = repairAuthorityHash(table, value)
  return value
}

for (const side of ['source', 'candidate']) {
  for (const [field, replacement] of Object.entries({
    modelRowId: 999, modelVersion: 'alternative', modelContentHash: 'c'.repeat(64),
    observationRunId: 'alternative-run', supportSealHash: 'c'.repeat(64),
    characterizationPolicy: { id:'alternative-policy', version:'2' }, supportingObservationIds:['alternative-observation'],
    flowId:'alternative-flow', flowContentHash:'c'.repeat(64), stepIndex:3,
    sourceSubjectId:'alternative-source', sourceSubjectContentHash:'c'.repeat(64),
    elementId:'alternative-element', elementContentHash:'c'.repeat(64), selector:{ kind:'data_test', value:'alternative-selector' },
    targetSubjectId:'alternative-target', targetSubjectContentHash:'c'.repeat(64),
  })) test(`P1 exact approved ${side}.${field} cannot be substituted at repository or SQL commit`, async () => {
    await withDb(async dbPath => {
      await insert('repair_proposals', proposalRow()); await insert('repair_decisions', decisionRow())
      const changed = load('supersession-authority')
      changed[side][field] = replacement
      reseal('app_model_transition_supersessions', changed)
      assert.doesNotThrow(() => parseRepairAuthority('app_model_transition_supersessions', changed))
      await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(changed), /approved endpoint correspondence mismatch/)
      await sql`BEGIN IMMEDIATE`.execute(getDb())
      await assert.rejects(insert('app_model_transition_supersessions', repairAuthorityRow('app_model_transition_supersessions', changed)), /approved endpoint correspondence mismatch/)
      await sql`COMMIT`.execute(getDb())
      assert.deepEqual(await read('app_model_transition_supersessions'), [])
      await closeDb(); initDb(dbPath); await runMigrations()
      assert.deepEqual(await read('app_model_transition_supersessions'), [])
      assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
      const repository = new RepairAuthorityRepository()
      const exact = load('supersession-authority')
      assert.equal((await repository.persistSupersessionExact(exact)).replay, false)
      const before = (await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
      assert.equal((await repository.persistSupersessionExact(exact)).replay, true)
      assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n, before)
      await assert.rejects(repository.persistSupersessionExact(changed), /conflicts/)
    })
  })
}

test('P1 independently committed alternative candidate approval cannot replace the true approval', async () => {
  await withDb(async () => {
    await insert('repair_proposals', proposalRow()); await insert('repair_decisions', decisionRow())
    const p = load('proposal'), d = load('approve'), a = load('supersession-authority')
    p.proposalId += '-alternative'; p.candidate.modelRowId = 999
    reseal('repair_proposals', p)
    d.decisionId += '-alternative'; d.candidate = p.candidate
    d.proposalAuthority = { proposalId:p.proposalId, proposalHash:p.proposalHash }
    reseal('repair_decisions', d)
    a.authorityId += '-alternative'; a.candidate = p.candidate; a.proposalAuthority = d.proposalAuthority
    a.decisionAuthority = { decisionId:d.decisionId, decisionHash:d.decisionHash, decision:'approve' }
    reseal('app_model_transition_supersessions', a)
    await insert('repair_proposals', repairAuthorityRow('repair_proposals', p))
    await insert('repair_decisions', repairAuthorityRow('repair_decisions', d))
    assert.equal((await new RepairAuthorityRepository().persistSupersessionExact(a)).replay, false)
    const substituted = load('supersession-authority'); substituted.candidate = a.candidate
    reseal('app_model_transition_supersessions', substituted)
    await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(substituted), /approved endpoint correspondence mismatch/)
  })
})

for (const side of ['source', 'candidate']) test(`P1 decision cannot approve a different ${side} under the same proposal identity`, async () => {
  await withDb(async () => {
    await insert('repair_proposals', proposalRow())
    const d = load('approve'); d[side].modelRowId = 999; reseal('repair_decisions', d)
    await assert.rejects(insert('repair_decisions', repairAuthorityRow('repair_decisions', d)), /approved endpoint correspondence mismatch/)
    assert.deepEqual(await read('repair_decisions'), [])
  })
})

test('P1 replay and reopen revalidate committed approval after deliberately bypassed corruption guards', async () => {
  await withDb(async dbPath => {
    await parents()
    const a = load('supersession-authority'); a.candidate.modelRowId = 999
    reseal('app_model_transition_supersessions', a)
    await sql`DROP TRIGGER app_model_transition_supersessions_immutable_update`.execute(getDb())
    await (getDb() as any).updateTable('app_model_transition_supersessions')
      .set(repairAuthorityRow('app_model_transition_supersessions', a)).execute()
    // Restore exact schema: reopen must detect the data, not merely a missing trigger.
    await sql.raw(migration036ImmutableTriggerDefinitions().app_model_transition_supersessions_immutable_update).execute(getDb())
    await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(a), /approved endpoint correspondence mismatch/)
    await closeDb(); initDb(dbPath)
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

const authorityFixtures: [RepairAuthorityTable, string, () => any][] = [
  ['repair_proposals','proposal',proposalRow], ['repair_decisions','approve',decisionRow],
  ['app_model_transition_supersessions','supersession-authority',supersessionRow],
  ['repair_revision_origins','repair-revision-link',originRow], ['repair_rerun_links','repair-rerun-link',rerunRow],
]
for (const [table, fixture, row] of authorityFixtures) {
  for (const nested of [false, true]) test(`P2 ${table} rejects unknown ${nested ? 'nested' : 'top-level'} fields before hashing/mapping/SQL`, async () => {
    await withDb(async dbPath => {
      if (table === 'repair_decisions' || table === 'app_model_transition_supersessions') await insert('repair_proposals', proposalRow())
      if (table === 'app_model_transition_supersessions') await insert('repair_decisions', decisionRow())
      if (table === 'repair_revision_origins' || table === 'repair_rerun_links') await parents()
      if (table === 'repair_rerun_links') { await pair(); await executionGraph() }
      const value = load(fixture)
      const target = !nested ? value : value.candidate?.selector ?? value.sourceDefinitionAuthority ?? value.persistedAuthorities.run
      target.unknownAuthorityField = 'must refuse'
      // Attacker recomputes a self-consistent hash, so schema rejection cannot
      // be confused with merely detecting a stale hash.
      const hashKey = { repair_proposals:'proposalHash', repair_decisions:'decisionHash', app_model_transition_supersessions:'authorityHash',
        repair_revision_origins:'lineageHash', repair_rerun_links:'rerunLinkHash' }[table]
      const { [hashKey]: _oldHash, ...body } = value
      value[hashKey] = canonicalJsonSha256(body)
      const unchanged = JSON.stringify(value)
      assert.throws(() => repairAuthorityHash(table, value), /schema/)
      assert.throws(() => parseRepairAuthority(table, value), /schema/)
      assert.throws(() => repairAuthorityRow(table, value), /schema/)
      assert.equal(JSON.stringify(value), unchanged, 'no parser strips unknown properties')
      const before = await read(table)
      await sql`BEGIN IMMEDIATE`.execute(getDb())
      await assert.rejects(insert(table, { ...row(), canonical_payload: canonicalJson(value) }), /schema|correspondence/)
      await sql`COMMIT`.execute(getDb())
      assert.deepEqual(await read(table), before)
      await closeDb(); initDb(dbPath); await runMigrations()
      assert.deepEqual(await read(table), before)
      assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
    })
  })
}

for (const field of ['candidate', 'candidate.characterizationPolicy', 'proposalAuthority', 'decisionAuthority', 'approvedBy']) {
  test(`P2 repository rejects unknown ${field} property without partial authority`, async () => {
    await withDb(async () => {
      const value = load('supersession-authority')
      field.split('.').reduce((v, key) => v[key], value).unknownAuthorityField = true
      await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(value), /schema/)
      assert.deepEqual(await read('app_model_transition_supersessions'), [])
    })
  })
}

for (const [label, mutate] of [
  ['symbol', (v: any) => { v[Symbol('unknown')] = true }],
  ['non-enumerable', (v: any) => { Object.defineProperty(v, 'unknown', { value:true }) }],
  ['accessor', (v: any) => { const id = v.authorityId; Object.defineProperty(v, 'authorityId', { enumerable:true, get:() => id }) }],
  ['custom-prototype', (v: any) => { Object.setPrototypeOf(v, { custom:true }) }],
  ['array-extra', (v: any) => { v.candidate.supportingObservationIds.extra = true }],
  ['sparse-array', (v: any) => { delete v.candidate.supportingObservationIds[0] }],
  ['undefined', (v: any) => { v.candidate.selector.value = undefined }],
  ['non-finite', (v: any) => { v.candidate.modelRowId = NaN }],
] as const) test(`P2 lossless JSON boundary refuses ${label}`, () => {
  const value = load('supersession-authority'); mutate(value)
  assert.throws(() => repairAuthorityHash('app_model_transition_supersessions', value), /schema/)
})

test('P1 proposal endpoint columns cannot disagree with the hash-bound proposal payload', async () => {
  await withDb(async () => {
    const row = proposalRow(), endpoint = JSON.parse(row.candidate_endpoint_identity)
    endpoint.modelRowId = 999; row.candidate_endpoint_identity = canonicalJson(endpoint)
    await assert.rejects(insert('repair_proposals', row), /schema or integrity mismatch/)
    assert.deepEqual(await read('repair_proposals'), [])
  })
})

for (const [table, fixture, row] of authorityFixtures) test(`P2 ${table} persists exact bytes and revalidates after reopen`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph(); await insert('repair_rerun_links', rerunRow())
    await closeDb(); initDb(dbPath); await runMigrations()
    const before = (await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    const rows = await read(table)
    assert.equal(rows.length, 1)
    assert.deepEqual(parseRepairAuthority(table, rows[0].canonical_payload), load(fixture))
    assert.equal(rows[0].canonical_payload, canonicalJson(load(fixture)))
    assert.deepEqual(repairAuthorityRow(table, rows[0].canonical_payload), row())
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n, before)
    const changed = load(fixture)
    const timestamp = { repair_proposals:'proposedAt', repair_decisions:'decidedAt', app_model_transition_supersessions:'promotedAt',
      repair_revision_origins:'createdAt', repair_rerun_links:'recordedAt' }[table]
    changed[timestamp] = '2026-09-05T00:00:00.000Z'; reseal(table, changed)
    await assert.rejects(insert(table, repairAuthorityRow(table, changed)), /identity already exists/)
    assert.deepEqual(await read(table), rows)
    // Corrupt only the canonical payload, restoring the guard before reopening.
    await sql.raw(`DROP TRIGGER ${table}_immutable_update`).execute(getDb())
    const invalid = { ...load(fixture), unknownAuthorityField:true }
    await (getDb() as any).updateTable(table).set({ canonical_payload:canonicalJson(invalid) }).execute()
    await sql.raw(migration036ImmutableTriggerDefinitions()[`${table}_immutable_update`]).execute(getDb())
    await closeDb(); initDb(dbPath)
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

test('P1 substituted candidate refuses before commit and remains absent after reopen', async () => {
  await withDb(async dbPath => {
    await insert('repair_proposals', proposalRow())
    await insert('repair_decisions', decisionRow())
    const authority = load('supersession-authority')
    authority.candidate.modelRowId += 1
    const { authorityHash: _hash, ...body } = authority
    authority.authorityHash = canonicalJsonSha256(body)
    await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(authority), /approved endpoint correspondence/)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('app_model_transition_supersessions'), [])
  })
})

test('P2 unknown supersession input refuses before persistence', async () => {
  await withDb(async dbPath => {
    await insert('repair_proposals', proposalRow())
    await insert('repair_decisions', decisionRow())
    const authority = { ...load('supersession-authority'), unapproved: true }
    const { authorityHash: _hash, ...body } = authority
    authority.authorityHash = canonicalJsonSha256(body)
    await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(authority), /schema/)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('app_model_transition_supersessions'), [])
  })
})

async function withDb(run: (dbPath: string) => Promise<void>, through035 = false): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-m5-persistence-'))
  const dbPath = path.join(root, 'forge.db')
  initDb(dbPath)
  try {
    if (through035) {
      const dir = path.join(__dirname, '..', 'src', 'core', 'storage', 'migrations')
      const migrations = Object.fromEntries(fs.readdirSync(dir).filter(name => /^\d.*\.ts$/.test(name)
        && name.slice(0, 3) <= '035').map(name => [name.slice(0, -3), name.startsWith('004_')
        ? { up: async () => {} } : require(path.join(dir, name))]))
      await runSqliteMigrationCoordinator(getDb(), migrations)
    } else await runMigrations()
    await run(dbPath)
  } finally {
    await closeDb()
    fs.rmSync(root, { recursive: true, force: true })
  }
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

function proposalRow(): any {
  const p = load('proposal')
  return { proposal_id: p.proposalId, project_id: p.projectId, schema_version: p.schemaVersion,
    repair_kind: p.repairKind, canonical_payload: canonicalJson(p), proposal_hash: p.proposalHash,
    source_endpoint_identity: canonicalJson(p.source), candidate_endpoint_identity: canonicalJson(p.candidate),
    enumerator_version: p.enumeratorVersion, candidate_set_hash: p.candidateSetHash,
    derived_successor_count: p.derivedSuccessorCount }
}

function decisionRow(): any {
  const d = load('approve')
  return { decision_id: d.decisionId, proposal_id: d.proposalAuthority.proposalId, project_id: d.projectId,
    proposal_hash: d.proposalAuthority.proposalHash, decision: d.decision, actor_kind: d.decidedBy.kind,
    actor_id: d.decidedBy.actorId, mechanism_id: 'local_product', decided_at: d.decidedAt,
    canonical_payload: canonicalJson(d), decision_hash: d.decisionHash }
}

function originRow(): any {
  const r = load('repair-revision-link')
  return { canonical_payload: canonicalJson(r), repair_origin_id: r.repairOriginId, test_set_row_id: r.testSetRowId, project_id: r.projectId,
    source_definition_authority_json: canonicalJson(r.sourceDefinitionAuthority),
    result_definition_authority_json: canonicalJson(r.resultingDefinitionAuthority),
    supersession_authority_id: r.supersessionAuthorityId, supersession_authority_hash: r.supersessionAuthorityHash,
    proposal_id: r.proposalAuthority.proposalId, proposal_hash: r.proposalAuthority.proposalHash,
    decision_id: r.decisionAuthority.decisionId, decision_hash: r.decisionAuthority.decisionHash,
    materializer_version: r.materializerVersion, transform_hash: r.transformHash, created_at: r.createdAt }
}

function supersessionRow(): any {
  const a = load('supersession-authority')
  return { canonical_payload: canonicalJson(a), authority_id: a.authorityId, authority_hash: a.authorityHash, project_id: a.projectId,
    source_endpoint_identity: canonicalJson(a.source), candidate_endpoint_identity: canonicalJson(a.candidate),
    proposal_id: a.proposalAuthority.proposalId, proposal_hash: a.proposalAuthority.proposalHash,
    decision_id: a.decisionAuthority.decisionId, decision_hash: a.decisionAuthority.decisionHash,
    decision_kind: a.decisionAuthority.decision, actor_kind: a.approvedBy.kind, actor_id: a.approvedBy.actorId,
    mechanism_id: 'local_product', promoted_at: a.promotedAt }
}

async function parents(): Promise<void> {
  await insert('repair_proposals', proposalRow())
  await insert('repair_decisions', decisionRow())
  await new RepairAuthorityRepository().persistSupersessionExact(load('supersession-authority'))
  await insert('test_set_revisions', testSetRow('source-test-set', 701))
  await sourceWitness()
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

async function suiteGraph(set = testSetRow('source-test-set', 701)): Promise<void> {
  const definitionId = JSON.parse(set.payload_json).definitions[0].id
  await insert('suites', { suite_id: 'm5-preserved-suite', project_id: set.project_id, current_revision: 1,
    name_key: 'preserved suite', created_at: set.generated_at })
  await insert('suite_revisions', { suite_id: 'm5-preserved-suite', revision: 1, project_id: set.project_id,
    name: 'Preserved Suite', name_key: 'preserved suite', purpose: 'sanity', suite_schema_version: 1,
    definition_schema_version: 3, test_set_row_id: set.id, test_set_id: set.test_set_id,
    test_set_revision: set.revision, test_set_content_hash: set.content_hash,
    created_at: set.generated_at, provenance_source: 'product_api', change_kind: 'created', prior_revision: null,
    change_intent_key: 'm5-suite-create', change_intent_fingerprint: 'e'.repeat(64), member_count: 1, content_hash: 'f'.repeat(64) })
  await insert('suite_revision_members', { suite_id: 'm5-preserved-suite', suite_revision: 1, member_ordinal: 1, definition_id: definitionId })
  await insert('suite_revision_member_authorities', { suite_id: 'm5-preserved-suite', suite_revision: 1, member_ordinal: 1,
    test_set_row_id: set.id, test_set_id: set.test_set_id, test_set_revision: set.revision,
    test_set_content_hash: set.content_hash, definition_schema_version: 3, definition_id: definitionId })
}

function rerunRow(): any {
  const r = load('repair-rerun-link'), d = r.resultingDefinitionAuthority, a = r.executionAuthority
  return { canonical_payload: canonicalJson(r), rerun_link_id: r.rerunLinkId, rerun_link_hash: r.rerunLinkHash, repair_origin_id: r.repairOriginId,
    repair_lineage_hash: r.repairLineageHash, project_id: r.projectId, resulting_test_set_row_id: d.testSetRowId,
    resulting_test_set_id: d.testSetId, resulting_test_set_revision: d.testSetRevision,
    resulting_test_set_content_hash: d.testSetContentHash, resulting_definition_schema_version: 3,
    resulting_definition_id: d.definitionId, resulting_definition_content_hash: d.definitionContentHash,
    model_row_id: d.modelRowId, model_version: d.modelVersion, support_seal_hash: d.supportSealHash,
    execution_id: a.executionId, item_ordinal: a.itemOrdinal, plan_hash: a.planHash,
    run_id: a.runId, attempt_ordinal: a.attemptOrdinal, result_id: a.resultId,
    suite_project_id: null, suite_id: null, suite_revision: null, suite_content_hash: null,
    suite_item_ordinal: null, recorded_at: r.recordedAt }
}

async function repairedSuiteGraph(): Promise<{ source: CanonicalSuiteRevision; repaired: CanonicalSuiteRevision }> {
  const repository = new SuiteRepository(), source = testSetRow('source-test-set', 701), repaired = testSetRow('resulting-test-set', 802)
  const member = (set: any) => ({ testSetRowId:set.id, definitionId:JSON.parse(set.payload_json).definitions[0].id,
    definitionSchemaVersion:3 as const, testSetId:set.test_set_id, testSetRevision:set.revision, testSetContentHash:set.content_hash })
  const original = await repository.write({ schemaVersion:2, suiteId:'m5-repaired-suite', projectId:source.project_id,
    expectedRevision:null, name:'Repaired suite', changeIntentKey:'m5-source-suite', changeIntentFingerprint:'a'.repeat(64),
    createdAt:'2026-09-03T16:00:00.000Z', members:[member(source)] }).catch(error => { throw new Error(`Source Suite setup: ${error.message}`) })
  const successor = await repository.write({ schemaVersion:2, suiteId:original.suiteId, projectId:source.project_id,
    expectedRevision:original.revision, name:original.name, changeIntentKey:'m5-repaired-suite', changeIntentFingerprint:'b'.repeat(64),
    createdAt:'2026-09-03T18:00:00.000Z', members:[member(repaired)] }).catch(error => { throw new Error(`Repaired Suite setup: ${error.message}`) })
  return { source:original, repaired:successor }
}

function suiteRerun(suite: CanonicalSuiteRevision): any {
  const payload = load('repair-rerun-link')
  payload.suiteAuthority = { projectId:suite.projectId, suiteId:suite.suiteId, revision:suite.revision, contentHash:suite.contentHash, itemOrdinal:1 }
  payload.persistedAuthorities.execution.suiteAuthority = payload.suiteAuthority
  payload.persistedAuthorities.suite = suite
  return reseal('repair_rerun_links', payload)
}

async function pair(originFirst = false, origin = originRow(), result = testSetRow('resulting-test-set', 802)): Promise<void> {
  const row = { ...result, revision_origin_kind: 'repair', repair_origin_id: origin.repair_origin_id }
  await sql`BEGIN IMMEDIATE`.execute(getDb())
  try {
    if (originFirst) { await insert('repair_revision_origins', origin); await insert('test_set_revisions', row) }
    else { await insert('test_set_revisions', row); await insert('repair_revision_origins', origin) }
    await sql`COMMIT`.execute(getDb())
  } catch (error) { await sql`ROLLBACK`.execute(getDb()); throw error }
}

test('036 preserves populated Test Sets, indexes and triggers, commits and reopens', async () => {
  await withDb(async dbPath => {
    await insert('test_set_revisions', testSetRow('source-test-set', 701))
    await insert('test_set_revisions', testSetRow('resulting-test-set', 802))
    await executionGraph()
    await suiteGraph()
    const graphTables = ['suites', 'suite_revisions', 'suite_revision_members', 'suite_revision_member_authorities',
      'executions', 'execution_items', 'execution_item_authorities', 'runs', 'test_results']
    const graphBefore = await Promise.all(graphTables.map(read))
    const before = await read('test_set_revisions')
    const objects = (await sql<any>`SELECT name,sql FROM sqlite_schema WHERE type IN ('index','trigger')
      AND sql IS NOT NULL ORDER BY name`.execute(getDb())).rows
    await runMigrations()
    await closeDb(); initDb(dbPath); await runMigrations()
    const after = await read('test_set_revisions')
    assert.deepEqual(after.map(({ revision_origin_kind, repair_origin_id, ...row }: any) => {
      assert.equal(revision_origin_kind, 'generation'); assert.equal(repair_origin_id, null); return row
    }), before)
    assert.deepEqual(await Promise.all(graphTables.map(read)), graphBefore)
    const actual = new Map((await sql<any>`SELECT name,sql FROM sqlite_schema WHERE type IN ('index','trigger')
      AND sql IS NOT NULL`.execute(getDb())).rows.map(row => [row.name, row.sql]))
    for (const row of objects) if (row.name !== 'manual_test_promotions_authority_insert') {
      assert.equal(actual.get(row.name), row.sql, row.name)
    }
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  }, true)
})

for (const originFirst of [false, true]) test(`036 reciprocal pair commits in ${originFirst ? 'origin' : 'Test Set'} first order and reopens`, async () => {
  await withDb(async dbPath => {
    await parents(); await pair(originFirst)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.equal((await read('repair_revision_origins')).length, 1)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
    const ddl = (await sql<any>`SELECT sql FROM sqlite_schema WHERE name IN ('test_set_revisions','repair_revision_origins')`.execute(getDb())).rows
    assert.equal(ddl.length, 2)
    for (const row of ddl) assert.match(row.sql, /DEFERRABLE INITIALLY DEFERRED/)
  })
})

for (const authority of ['source', 'result']) for (const field of ['testSetContentHash', 'definitionContentHash']) {
  test(`036 rejects sorted-key ${authority} ${field} in both insertion orders`, async () => {
    await withDb(async () => {
      await parents()
      const origin = originRow()
      const key = `${authority}_definition_authority_json`
      const value = JSON.parse(origin[key])
      const set = load(authority === 'source' ? 'source-test-set' : 'resulting-test-set')
      const target = field === 'testSetContentHash' ? set : set.definitions[0]
      assert.equal(value[field], productHash(target))
      value[field] = canonicalJsonSha256(target)
      assert.notEqual(value[field], productHash(target))
      origin[key] = canonicalJson(value)
      const payload = JSON.parse(origin.canonical_payload)
      payload[authority === 'source' ? 'sourceDefinitionAuthority' : 'resultingDefinitionAuthority'] = value
      payload.lineageHash = repairAuthorityHash('repair_revision_origins', payload)
      origin.canonical_payload = canonicalJson(payload)
      for (const order of [false, true]) await assert.rejects(pair(order, origin), /authority mismatch/)
      assert.equal((await read('repair_revision_origins')).length, 0)
    })
  })
}

test('036 deferred FK rejects missing reciprocal authority at outer COMMIT', async () => {
  await withDb(async () => {
    await parents()
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('test_set_revisions', { ...testSetRow('resulting-test-set', 802),
      revision_origin_kind: 'repair', repair_origin_id: 'missing-origin' })
    await assert.rejects(sql`COMMIT`.execute(getDb()), /FOREIGN KEY/)
    await sql`ROLLBACK`.execute(getDb())
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('repair_revision_origins', originRow())
    await assert.rejects(sql`COMMIT`.execute(getDb()), /FOREIGN KEY/)
    await sql`ROLLBACK`.execute(getDb())
  })
})

test('036 cross-wire cannot satisfy reciprocal linkage with a generation row', async () => {
  await withDb(async () => {
    await parents()
    const origin = { ...originRow(), test_set_row_id: 701 }
    const payload = JSON.parse(origin.canonical_payload)
    payload.testSetRowId = 701
    payload.lineageHash = repairAuthorityHash('repair_revision_origins', payload)
    origin.canonical_payload = canonicalJson(payload)
    await assert.rejects(pair(false, origin), /authority mismatch|FOREIGN KEY/)
    assert.equal((await read('repair_revision_origins')).length, 0)
  })
})

test('036 composite reciprocal FK itself rejects two cross-wired repair rows at COMMIT', async () => {
  await withDb(async () => {
    await parents()
    // Isolate the reciprocal FK even when earlier payload/correspondence guards
    // are bypassed. The production schema retains all of these guards.
    for (const table of ['repair_proposals', 'repair_decisions', 'app_model_transition_supersessions', 'repair_revision_origins']) {
      await sql.raw(`DROP TRIGGER ${table}_exact_payload_insert`).execute(getDb())
    }
    await sql`DROP TRIGGER repair_decisions_correspondence_insert`.execute(getDb())
    await sql`DROP TRIGGER app_model_transition_supersessions_correspondence_insert`.execute(getDb())
    const proposal = { ...proposalRow(), proposal_id: 'proposal-second' }
    const decision = { ...decisionRow(), proposal_id: proposal.proposal_id, decision_id: 'decision-second' }
    await insert('repair_proposals', proposal); await insert('repair_decisions', decision)
    const supersession = (await read('app_model_transition_supersessions'))[0]
    await insert('app_model_transition_supersessions', { ...supersession, authority_id: 'supersession-second',
      proposal_id: proposal.proposal_id, decision_id: decision.decision_id })
    // Deliberately remove semantic guards to isolate the composite FK. Both
    // scalar origin IDs and both Test Set IDs exist, but the pairs disagree.
    await sql`DROP TRIGGER repair_revision_origin_validate_insert`.execute(getDb())
    await sql`DROP TRIGGER test_set_repair_origin_validate_insert`.execute(getDb())
    const first = originRow()
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await insert('test_set_revisions', { ...testSetRow('resulting-test-set', 802),
      revision_origin_kind: 'repair', repair_origin_id: first.repair_origin_id })
    await insert('test_set_revisions', { ...testSetRow('resulting-test-set', 803), revision: 9,
      generation_id: 'generation-second', revision_origin_kind: 'repair', repair_origin_id: 'origin-second' })
    await insert('repair_revision_origins', { ...first, test_set_row_id: 803 })
    await insert('repair_revision_origins', { ...first, test_set_row_id: 802, repair_origin_id: 'origin-second',
      supersession_authority_id: 'supersession-second', proposal_id: proposal.proposal_id, decision_id: decision.decision_id })
    const violations = (await sql<any>`PRAGMA foreign_key_check`.execute(getDb())).rows
    assert.equal(violations.filter(row => row.table === 'repair_revision_origins').length, 2)
    await assert.rejects(sql`COMMIT`.execute(getDb()), /FOREIGN KEY/)
    await sql`ROLLBACK`.execute(getDb())
    assert.equal((await read('repair_revision_origins')).length, 0)
  })
})

test('036 FK-disabled migration and repository refuse before authority writes', async () => {
  await withDb(async () => {
    await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
    await assert.rejects(runWithMigrationContext(getDatabaseProvenance(), () => migrate036(getDb())), /foreign_keys=ON/)
    await assert.rejects(new RepairAuthorityRepository().persistSupersessionExact(load('supersession-authority')), /foreign-key enforcement/)
    assert.equal((await read('app_model_transition_supersessions')).length, 0)
    await sql`PRAGMA foreign_keys=ON`.execute(getDb())
  })
})

test('036 exact replay verifies stored integrity, compares and performs no writes', async () => {
  await withDb(async () => {
    await parents()
    const repository = new RepairAuthorityRepository()
    const authority = load('supersession-authority')
    const before = (await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n
    assert.equal((await repository.persistSupersessionExact(authority)).replay, true)
    assert.equal((await sql<any>`SELECT total_changes() n`.execute(getDb())).rows[0].n, before)
    const changed = { ...authority, promotedAt: '2026-09-04T00:00:00.000Z' }
    const { authorityHash: ignored, ...payload } = changed
    changed.authorityHash = canonicalJsonSha256(payload)
    await assert.rejects(repository.persistSupersessionExact(changed), /conflicts/)
    await assert.rejects(repository.persistSupersessionExact({ ...authority, authorityHash: '0'.repeat(64) }), /integrity/)
    await sql`DROP TRIGGER app_model_transition_supersessions_immutable_update`.execute(getDb())
    await sql`UPDATE app_model_transition_supersessions SET authority_hash=${'0'.repeat(64)}`.execute(getDb())
    await assert.rejects(repository.persistSupersessionExact(authority), /integrity/)
  })
})

for (const table of ['repair_proposals', 'repair_decisions', 'app_model_transition_supersessions', 'repair_revision_origins', 'repair_rerun_links', 'test_set_revisions']) {
  for (const operation of ['UPDATE', 'DELETE', 'REPLACE', 'INSERT OR REPLACE', 'UPSERT']) {
    test(`036 hostile ${operation} cannot mutate ${table}`, async () => {
      await withDb(async () => {
        await parents(); await pair()
        if (table === 'repair_rerun_links') { await executionGraph(); await insert(table, rerunRow()) }
        const before = await read(table)
        const row = before[0]
        assert.ok(row)
        const columns = Object.keys(row)
        const statement = operation === 'UPDATE' ? `UPDATE ${table} SET ${columns[0]}=${columns[0]}`
          : operation === 'DELETE' ? `DELETE FROM ${table}`
          : `${operation === 'UPSERT' ? 'INSERT' : operation} INTO ${table} (${columns.join(',')}) SELECT ${columns.join(',')} FROM ${table} WHERE 1 LIMIT 1`
            + (operation === 'UPSERT' ? ` ON CONFLICT DO UPDATE SET ${columns[0]}=excluded.${columns[0]}` : '')
        await assert.rejects(sql.raw(statement).execute(getDb()), /immutable|identity already exists/)
        assert.deepEqual(await read(table), before)
      })
    })
  }
}

for (const [kind, origin] of [[null, null], ['other', null], ['generation', 'origin'], ['repair', null]]) {
  test(`036 origin CHECK/NOT NULL rejects ${kind}/${origin}`, async () => {
    await withDb(async () => {
      await assert.rejects(insert('test_set_revisions', { ...testSetRow('resulting-test-set', 802),
        revision_origin_kind: kind, repair_origin_id: origin }), /CHECK|NOT NULL/)
    })
  })
}

test('036 result_id FK target is a full unique single-column index', async () => {
  await withDb(async () => {
    const indexes = (await sql<any>`PRAGMA index_list(test_results)`.execute(getDb())).rows
    const index = indexes.find(row => row.name === 'uq_results_result_id_fk')
    assert.equal(index?.unique, 1); assert.equal(index.partial, 0)
    assert.deepEqual((await sql<any>`PRAGMA index_info(uq_results_result_id_fk)`.execute(getDb())).rows.map(row => row.name), ['result_id'])
  })
})

test('036 duplicate non-NULL result_id preflight refuses without changing populated history', async () => {
  await withDb(async () => {
    // Deliberately damaged pre-036 legacy state: remove the older partial index
    // so preflight, rather than that older UNIQUE guard, must catch duplicates.
    const indexes = (await sql<any>`PRAGMA index_list(test_results)`.execute(getDb())).rows
    for (const index of indexes) {
      const columns = (await sql.raw<any>(`PRAGMA index_info("${index.name}")`).execute(getDb())).rows
      if (index.unique && columns.length === 1 && columns[0].name === 'result_id') {
        await sql.raw(`DROP INDEX "${index.name}"`).execute(getDb())
      }
    }
    await insert('test_set_revisions', testSetRow('resulting-test-set', 802))
    await executionGraph()
    const existing = (await read('test_results'))[0]
    // A second attempt reaches a distinct valid run/item uniqueness key while
    // retaining the deliberately duplicated global Result identity.
    const run = (await read('runs'))[0]
    await insert('runs', { ...run, id: 1902, run_id: 'run-repair-2', attempt_ordinal: 2 })
    await insert('test_results', { ...existing, id: 2902, run_id: 'run-repair-2' })
    const before = await read('test_results')
    const schema = (await sql`SELECT type,name,sql FROM sqlite_schema ORDER BY type,name`.execute(getDb())).rows
    // The coordinator also refuses the damaged 021 index contract. Exercise
    // 036's own duplicate preflight directly inside its required outer transaction.
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await assert.rejects(runWithMigrationContext(getDatabaseProvenance(), () => migrate036(getDb())),
      /duplicate non-NULL.*result-repair-1 \(2\)/)
    await sql`ROLLBACK`.execute(getDb())
    await assert.rejects(runMigrations(), /021_execution_identity_manifest_run_linkage/)
    assert.deepEqual(await read('test_results'), before)
    assert.deepEqual((await sql`SELECT type,name,sql FROM sqlite_schema ORDER BY type,name`.execute(getDb())).rows, schema)
    assert.equal((await sql<any>`SELECT count(*) n FROM kysely_migration WHERE name=${CEILING}`.execute(getDb())).rows[0].n, 0)
  }, true)
})

test('036 full result index rejects duplicate non-NULL identity but preserves multiple NULL identities', async () => {
  await withDb(async () => {
    const result = { run_id: 'legacy-run', title: 'Legacy evidence', suite: 'legacy', status: 'failed' }
    await insert('runs', { run_id: 'legacy-run', app_name: 'legacy', started_at: '2026-09-03T00:00:00.000Z', completed_at: '2026-09-03T00:00:00.000Z' })
    await insert('test_results', { ...result, test_id: 'legacy-1', result_id: null })
    await insert('test_results', { ...result, test_id: 'legacy-2', result_id: null })
    await parents(); await pair(); await executionGraph()
    const existing = (await read('test_results')).find((row: any) => row.result_id !== null)
    await assert.rejects(insert('test_results', { ...existing, id: 2902 }), /UNIQUE/)
    assert.equal((await read('test_results')).length, 3)
  })
})

test('036 coordinator establishes foreign keys before BEGIN when a connection initially disables them', async () => {
  await withDb(async () => {
    await sql`PRAGMA foreign_keys=OFF`.execute(getDb())
    await runMigrations()
    assert.equal((await sql<any>`PRAGMA foreign_keys`.execute(getDb())).rows[0].foreign_keys, 1)
  }, true)
})

for (const field of ['resulting_test_set_content_hash', 'resulting_definition_content_hash', 'plan_hash',
  'repair_lineage_hash', 'project_id', 'execution_id', 'run_id', 'result_id', 'attempt_ordinal']) {
  test(`036 rerun rejects cross-wired ${field}`, async () => {
    await withDb(async () => {
      await parents(); await pair(); await executionGraph()
      const row = rerunRow()
      row[field] = typeof row[field] === 'number' ? row[field] + 1 : field.includes('hash') ? '0'.repeat(64) : 'wrong-authority'
      await assert.rejects(insert('repair_rerun_links', row), /authority mismatch|FOREIGN KEY/)
      assert.equal((await read('repair_rerun_links')).length, 0)
    })
  })
}

test('036 rerun exact Product hashes persist and reopen without changing Result evidence', async () => {
  await withDb(async dbPath => {
    await parents(); await pair(); await executionGraph()
    const before = await read('test_results')
    const row = rerunRow()
    await insert('repair_rerun_links', row)
    await closeDb(); initDb(dbPath); await runMigrations()
    assert.deepEqual(await read('repair_rerun_links'), [row])
    assert.deepEqual(await read('test_results'), before)
    assert.deepEqual((await sql`PRAGMA foreign_key_check`.execute(getDb())).rows, [])
  })
})

test('036 restart refuses an inert same-name append-only guard', async () => {
  await withDb(async () => {
    await sql`DROP TRIGGER repair_proposals_immutable_update`.execute(getDb())
    await sql.raw('CREATE TRIGGER repair_proposals_immutable_update BEFORE UPDATE ON repair_proposals BEGIN SELECT 1; END').execute(getDb())
    await assert.rejects(runMigrations(), /036_m5_repair_persistence_authority/)
  })
})

for (const [field, value] of [
  ['schema_version', 'other'], ['repair_kind', 'other'], ['canonical_payload', '{'],
  ['proposal_hash', 'BAD'], ['source_endpoint_identity', '{'], ['candidate_endpoint_identity', '{'],
  ['enumerator_version', 'other'], ['candidate_set_hash', 'BAD'], ['derived_successor_count', 2],
] as const) test(`036 proposal CHECK rejects ${field}`, async () => {
  await withDb(async () => {
    await assert.rejects(insert('repair_proposals', { ...proposalRow(), [field]: value }), /CHECK/)
  })
})

for (const [field, value] of [['decision', 'other'], ['actor_kind', 'ai'], ['mechanism_id', 'remote'],
  ['canonical_payload', '{'], ['decision_hash', 'BAD']] as const) test(`036 decision CHECK rejects ${field}`, async () => {
  await withDb(async () => {
    await insert('repair_proposals', proposalRow())
    await sql`DROP TRIGGER repair_decisions_correspondence_insert`.execute(getDb())
    await assert.rejects(insert('repair_decisions', { ...decisionRow(), [field]: value }), /CHECK/)
  })
})

for (const field of ['proposal_id', 'project_id', 'proposal_hash']) test(`036 decision composite FK rejects ${field}`, async () => {
  await withDb(async () => {
    await insert('repair_proposals', proposalRow())
    await sql`DROP TRIGGER repair_decisions_exact_payload_insert`.execute(getDb())
    await sql`DROP TRIGGER repair_decisions_correspondence_insert`.execute(getDb())
    await assert.rejects(insert('repair_decisions', { ...decisionRow(), [field]: 'wrong' }), /FOREIGN KEY/)
  })
})

for (const [field, value] of [['source_definition_authority_json', '{'], ['result_definition_authority_json', '{'],
  ['materializer_version', 'other'], ['transform_hash', 'BAD']] as const) test(`036 origin CHECK rejects ${field}`, async () => {
  await withDb(async () => {
    await parents()
    await sql`BEGIN IMMEDIATE`.execute(getDb())
    await assert.rejects(insert('repair_revision_origins', { ...originRow(), [field]: value }), /CHECK/)
    await sql`ROLLBACK`.execute(getDb())
  })
})

test('036 origin one-to-one collision rejects a new identity reusing the Test Set or supersession', async () => {
  await withDb(async () => {
    await parents(); await pair()
    await assert.rejects(insert('repair_revision_origins', { ...originRow(), repair_origin_id: 'new-origin' }), /identity already exists/)
    await assert.rejects(insert('repair_revision_origins', { ...originRow(), repair_origin_id: 'new-origin', test_set_row_id: 999 }), /identity already exists/)
  })
})

test('036 manual promotion cannot relabel a repair Test Set as generation authority', async () => {
  await withDb(async () => {
    await parents(); await pair()
    const row = testSetRow('resulting-test-set', 802)
    const source = await new ManualTestSourceRepository(() => 'manual-source-m5').admit(row.project_id, {
      schemaVersion: 'forge-manual-test-source-input/v1', sourceKind: 'manual', title: 'Checkout',
      objective: 'Reach checkout', steps: [{ ordinal: 1, text: 'Click Checkout.' }], expectedOutcome: 'Checkout is visible.',
    }, row.generated_at)
    const persisted = (await read('manual_test_sources'))[0]
    await assert.rejects(insert('manual_test_promotions', { source_id: source.sourceId, project_id: row.project_id,
      source_content_hash: persisted.content_hash, proposal_payload_json: '{}', proposal_content_hash: 'b'.repeat(64), test_set_row_id: 802,
      test_set_id: row.test_set_id, test_set_revision: row.revision, test_set_content_hash: row.content_hash,
      definition_id: load('resulting-test-set').definitions[0].id, promoted_at: row.generated_at }), /Manual Test promotion authority mismatch/)
  })
})

test('036 direct rerun cannot claim an unrelated but valid Suite membership', async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph(); await suiteGraph(testSetRow('resulting-test-set', 802))
    await assert.rejects(insert('repair_rerun_links', { ...rerunRow(), suite_project_id: load('proposal').projectId,
      suite_id: 'm5-preserved-suite', suite_revision: 1, suite_content_hash: 'f'.repeat(64), suite_item_ordinal: 1 }), /authority mismatch/)
  })
})

test('036 Suite rerun requires the accepted Suite and preserves exact membership', async () => {
  await withDb(async () => {
    await parents(); await pair()
    const set = testSetRow('resulting-test-set', 802)
    const suite = await repairedSuiteGraph()
    await executionGraph(set, suite.repaired)
    await assert.rejects(insert('repair_rerun_links', rerunRow()), /authority mismatch/)
    const row = repairAuthorityRow('repair_rerun_links', suiteRerun(suite.repaired))
    await insert('repair_rerun_links', row)
    assert.deepEqual(await read('repair_rerun_links'), [row])
  })
})

test('036 rerun refuses partial Suite authority', async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph()
    await assert.rejects(insert('repair_rerun_links', { ...rerunRow(), suite_project_id: load('proposal').projectId }), /CHECK/)
  })
})

for (const [field, value] of [['authority_hash', 'BAD'], ['source_endpoint_identity', '{'], ['candidate_endpoint_identity', '{'],
  ['decision_kind', 'reject'], ['actor_kind', 'ai'], ['mechanism_id', 'remote']] as const) {
  test(`036 supersession CHECK rejects ${field}`, async () => {
    await withDb(async () => {
      await insert('repair_proposals', proposalRow()); await insert('repair_decisions', decisionRow())
      await assert.rejects(insert('app_model_transition_supersessions', { ...supersessionRow(), [field]: value }), /CHECK/)
    })
  })
}

for (const field of ['decision_id', 'decision_hash', 'proposal_id', 'proposal_hash', 'project_id', 'actor_id']) {
  test(`036 supersession decision FK rejects cross-wired ${field}`, async () => {
    await withDb(async () => {
      await insert('repair_proposals', proposalRow()); await insert('repair_decisions', decisionRow())
      await sql`DROP TRIGGER app_model_transition_supersessions_exact_payload_insert`.execute(getDb())
      await sql`DROP TRIGGER app_model_transition_supersessions_correspondence_insert`.execute(getDb())
      await assert.rejects(insert('app_model_transition_supersessions', { ...supersessionRow(), [field]: 'wrong' }), /FOREIGN KEY/)
    })
  })
}

test('036 alternate unique identities reject colliding decision, supersession and rerun rows', async () => {
  await withDb(async () => {
    await parents(); await pair(); await executionGraph(); await insert('repair_rerun_links', rerunRow())
    await assert.rejects(insert('repair_decisions', { ...decisionRow(), decision_id: 'another-decision' }), /identity already exists/)
    await assert.rejects(insert('app_model_transition_supersessions', { ...supersessionRow(), authority_id: 'another-authority' }), /identity already exists/)
    await assert.rejects(insert('repair_rerun_links', { ...rerunRow(), rerun_link_id: 'another-rerun' }), /identity already exists/)
  })
})
