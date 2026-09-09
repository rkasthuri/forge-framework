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
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { sql } from 'kysely';
import { initDb, getDb, closeDb } from '../src/core/storage/db';
import { runMigrations, runSqliteMigrationCoordinator } from '../src/core/storage/migrate';
import { up as up037 } from '../src/core/storage/migrations/037_repair_proposal_identity_authority';
import { canonicalJson } from '../src/core/storage/JsonAppModelMigrationPlanner';
import { repairAuthorityHash, repairAuthorityRow } from '../src/core/storage/RepairAuthorityValidation';
import { captureProposalIdentityAuthority, proposalIdentityAuthorityHash, proposalIdentityAuthorityRow,
  parseProposalIdentityAuthority, generatedRepairProposalIdentity } from '../src/core/storage/RepairProposalIdentityAuthority';
import { GovernedRepairProposalService } from '../src/core/healing/GovernedRepairProposalService';
const migrationName='037_repair_proposal_identity_authority';
function migrations(ceiling:string) {
 const dir=path.join(__dirname,'../src/core/storage/migrations');
 return Object.fromEntries(fs.readdirSync(dir).filter(name=>/^\d.*\.ts$/.test(name)&&name.slice(0,3)<=ceiling).map(name=>[name.slice(0,-3),name.startsWith('004_')?{up:async()=>{}}:require(path.join(dir,name))]));
}
async function fixture(wasm:boolean,run:(root:string)=>Promise<void>,old=false) {
 const Module=require('node:module'),original=Module._load;let loads=0;
 if(wasm)Module._load=function(name:string,...args:any[]){if(name==='better-sqlite3'){loads++;throw Error('Forced identity WASM')}return original.call(this,name,...args)};
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'forge-m5-identity-'));
 try {initDb(path.join(root,'forge.db'));if(old)await runSqliteMigrationCoordinator(getDb(),migrations('036'));else await runMigrations();await run(root);if(wasm)assert.ok(loads>0);}
 finally {await closeDb();Module._load=original;assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'forge-m5-identity-'));fs.rmSync(root,{recursive:true,force:true});}
}
function proposal(id='transition-proposal-identity',generated=false):any {
 const p=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/m5-contract/positive/proposal.json'),'utf8'));
 p.proposalId=generated?generatedRepairProposalIdentity(p,p.candidateSetHash):id;
 p.proposalHash=repairAuthorityHash('repair_proposals',p);return p;
}
async function pair(p:any,origin:'caller'|'generated'='caller') {
 return getDb().transaction().execute(async db=>{
  await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(captureProposalIdentityAuthority(p,origin))).execute();
  await db.insertInto('repair_proposals').values({ ...repairAuthorityRow('repair_proposals',p), identity_authority_hash:captureProposalIdentityAuthority(p,origin).identityAuthorityHash } as any).execute();
 });
}
async function state() {return {schema:(await sql.raw('SELECT type,name,sql FROM sqlite_schema ORDER BY type,name').execute(getDb())).rows,
 history:(await sql.raw('SELECT * FROM kysely_migration ORDER BY name').execute(getDb())).rows};}
for(const wasm of [false,true]) {
 const engine=wasm?'WASM':'native';
 test('IDENTITY migration empty upgrade and reopen '+engine,()=>fixture(wasm,async root=>{
  const prior=await state();await runMigrations();assert.equal((await state()).history.length,prior.history.length+1);
  await pair(proposal());assert.deepEqual((await sql.raw('PRAGMA foreign_key_check').execute(getDb())).rows,[]);
  await closeDb();initDb(path.join(root,'forge.db'));await runMigrations();
  assert.equal((await getDb().selectFrom('repair_proposal_identity_authorities').selectAll().execute()).length,1);
 },true));
 test('IDENTITY migration refuses retroactive origin invention '+engine,()=>fixture(wasm,async()=>{
  await getDb().insertInto('repair_proposals').values(repairAuthorityRow('repair_proposals',proposal()) as any).execute();
  const before=await state();await assert.rejects(runMigrations(),/cannot infer historical proposal origin/);assert.deepEqual(await state(),before);
 },true));
 test('IDENTITY migration atomic rollback after DDL '+engine,()=>fixture(wasm,async()=>{
  const before=await state(),all=migrations('037');all[migrationName]={up:async(db:any)=>{await up037(db);throw Error('injected after witness DDL')}};
  await assert.rejects(runSqliteMigrationCoordinator(getDb(),all),/injected after witness DDL/);assert.deepEqual(await state(),before);
  await runMigrations();assert.equal((await state()).history.length,before.history.length+1);
 },true));
 test('IDENTITY reciprocal crosswire deferred COMMIT rollback '+engine,()=>fixture(wasm,async root=>{
  const a=proposal('transition-proposal-A'),b=proposal('transition-proposal-B');
  // Witness B has all valid scalar identities, but cannot satisfy Proposal A's pair.
  const service=new GovernedRepairProposalService(root,()=>getDb());
  await assert.rejects((service as any).transaction(async(db:any)=>{
   await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(captureProposalIdentityAuthority(b,'caller'))).execute();
   await db.insertInto('repair_proposals').values({...repairAuthorityRow('repair_proposals',a),identity_authority_hash:captureProposalIdentityAuthority(b,'caller').identityAuthorityHash}).execute();
  }),/FOREIGN KEY|foreign key/i);
  assert.deepEqual(await getDb().selectFrom('repair_proposals').selectAll().execute(),[]);
  assert.deepEqual(await getDb().selectFrom('repair_proposal_identity_authorities').selectAll().execute(),[]);
  await pair(a);await pair(b);
  // Both IDs exist. Swapping their hashes still fails the complete reciprocal pair.
  await assert.rejects(getDb().transaction().execute(async db=>{
   await db.updateTable('repair_proposal_identity_authorities').set({proposal_hash_at_creation:b.proposalHash}).where('proposal_id','=',a.proposalId).execute();
  }),/append-only/);
  assert.deepEqual((await sql.raw('PRAGMA foreign_key_check').execute(getDb())).rows,[]);
 }));
 for(const missing of ['proposal','witness'])test('IDENTITY missing '+missing+' deferred rollback '+engine,()=>fixture(wasm,async root=>{
  const p=proposal(),service=new GovernedRepairProposalService(root,()=>getDb());
  await assert.rejects((service as any).transaction(async(db:any)=>{
   if(missing==='proposal')await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(captureProposalIdentityAuthority(p,'caller'))).execute();
   else await db.insertInto('repair_proposals').values({...repairAuthorityRow('repair_proposals',p),identity_authority_hash:captureProposalIdentityAuthority(p,'caller').identityAuthorityHash}).execute();
  }),/FOREIGN KEY|foreign key/i);
  assert.equal((await getDb().selectFrom('repair_proposals').selectAll().execute()).length,0);
  assert.equal((await getDb().selectFrom('repair_proposal_identity_authorities').selectAll().execute()).length,0);
  await pair(p);
 }));
 test('IDENTITY append-only duplicate UPDATE DELETE REPLACE UPSERT '+engine,()=>fixture(wasm,async()=>{
  const p=proposal();await pair(p);
  for(const table of ['repair_proposals','repair_proposal_identity_authorities'] as const) {
   const before=await getDb().selectFrom(table).selectAll().execute(),row=before[0];
   await assert.rejects((getDb() as any).insertInto(table).values(row).execute());
   await assert.rejects((getDb() as any).updateTable(table).set({canonical_payload:row.canonical_payload}).execute(),/append-only|immutable|already exists/i);
   await assert.rejects(getDb().deleteFrom(table).execute(),/append-only|immutable|already exists/i);
   await assert.rejects((getDb() as any).replaceInto(table).values(row).execute(),/append-only|immutable|already exists/i);
   await assert.rejects((getDb() as any).insertInto(table).values(row).onConflict((oc:any)=>oc.column('proposal_id').doUpdateSet({canonical_payload:row.canonical_payload})).execute(),/append-only|immutable|already exists/i);
   assert.deepEqual(await getDb().selectFrom(table).selectAll().execute(),before);
  }
 }));
 test('IDENTITY FK enabled before service transaction '+engine,()=>fixture(wasm,async root=>{
  await sql.raw('PRAGMA foreign_keys=OFF').execute(getDb());
  const service=new GovernedRepairProposalService(root,()=>getDb());
  const refusal=await (service as any).transaction(async()=>{throw Error('must refuse before BEGIN')});
  assert.equal(refusal.code,'integrity_mismatch');
  assert.equal(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(getDb())).rows[0].foreign_keys),0);
  await sql.raw('PRAGMA foreign_keys=ON').execute(getDb());
  await (service as any).transaction(async(db:any)=>assert.equal(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0].foreign_keys),1));
  assert.equal(Number((await sql.raw<any>('PRAGMA foreign_keys').execute(getDb())).rows[0].foreign_keys),1);
 }));
}
for(const attack of ['unknown origin','generated missing snapshot','caller generated field','unknown field','non-finite','hash mismatch'])test('IDENTITY exact canonical field refusal '+attack,()=>{
 const v:any=captureProposalIdentityAuthority(proposal('unused',true),attack==='caller generated field'?'caller':'generated');
 if(attack==='unknown origin')v.originKind='inferred';
 if(attack==='generated missing snapshot')delete v.expectedCandidateSetHash;
 if(attack==='caller generated field')v.expectedCandidateSetHash='f'.repeat(64);
 if(attack==='unknown field')v.extra='x';
 if(attack==='non-finite')v.proposalHashAtCreation=Infinity;
 if(attack==='hash mismatch')v.identityAuthorityHash='f'.repeat(64);
 assert.throws(()=>parseProposalIdentityAuthority(v));
});
test('IDENTITY canonical ordering and frozen snapshot independent of later object mutation',()=>{
 const p=proposal('unused',true),v=captureProposalIdentityAuthority(p,'generated'),saved=canonicalJson(v);
 const reverse=Object.fromEntries(Object.entries(v).reverse());assert.equal(proposalIdentityAuthorityHash(reverse),v.identityAuthorityHash);
 p.candidateSetHash='f'.repeat(64);assert.equal(canonicalJson(v),saved);assert.notEqual(v.expectedCandidateSetHash,p.candidateSetHash);
});

for(const wasm of [false,true])test('IDENTITY composite FK rejects two-way crosswire with all IDs present '+(wasm?'WASM':'native'),()=>fixture(wasm,async root=>{
 const a=proposal('transition-proposal-A'),b=proposal('transition-proposal-B');
 const wa=captureProposalIdentityAuthority(a,'caller'),wb=captureProposalIdentityAuthority(b,'caller');
 wa.proposalHashAtCreation=b.proposalHash;wa.identityAuthorityHash=proposalIdentityAuthorityHash(wa);
 wb.proposalHashAtCreation=a.proposalHash;wb.identityAuthorityHash=proposalIdentityAuthorityHash(wb);
 const triggers=(await sql.raw<{name:string;sql:string}>("SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND name IN ('repair_proposal_identity_pair_insert','repair_proposal_pair_insert')").execute(getDb())).rows;
 // Isolate the deferred composite FK from the additional semantic pair guards.
 for(const t of triggers)await sql.raw('DROP TRIGGER '+t.name).execute(getDb());
 try {
  const service=new GovernedRepairProposalService(root,()=>getDb());
  await assert.rejects((service as any).transaction(async(db:any)=>{
   for(const w of [wa,wb])await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(w)).execute();
   for(const [p,w] of [[a,wa],[b,wb]])await db.insertInto('repair_proposals').values({...repairAuthorityRow('repair_proposals',p),identity_authority_hash:w.identityAuthorityHash}).execute();
   assert.equal((await db.selectFrom('repair_proposals').selectAll().execute()).length,2);
   assert.equal((await db.selectFrom('repair_proposal_identity_authorities').selectAll().execute()).length,2);
  }),/FOREIGN KEY|foreign key/i);
 }finally{for(const t of triggers)await sql.raw(t.sql).execute(getDb());}
 assert.equal((await getDb().selectFrom('repair_proposals').selectAll().execute()).length,0);
 assert.equal((await getDb().selectFrom('repair_proposal_identity_authorities').selectAll().execute()).length,0);
 assert.deepEqual((await sql.raw('PRAGMA foreign_key_check').execute(getDb())).rows,[]);
}));
