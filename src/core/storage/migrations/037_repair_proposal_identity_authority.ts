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
import { Kysely, sql } from 'kysely';
import { currentMigrationDialect } from '../MigrationContext';
export const PROPOSAL_TABLE_037 = "CREATE TABLE repair_proposals (\n    proposal_id varchar(255) NOT NULL PRIMARY KEY, project_id varchar(255) NOT NULL,\n    schema_version varchar(100) NOT NULL CHECK(schema_version='forge.m5.transition-correspondence-proposal/v1'),\n    repair_kind varchar(40) NOT NULL CHECK(repair_kind='selector_replacement'), canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),\n    proposal_hash varchar(64) NOT NULL CHECK(length(proposal_hash)=64 AND proposal_hash NOT GLOB '*[^a-f0-9]*'),\n    source_endpoint_identity text NOT NULL CHECK(json_valid(source_endpoint_identity)),\n    candidate_endpoint_identity text NOT NULL CHECK(json_valid(candidate_endpoint_identity)),\n    enumerator_version varchar(100) NOT NULL CHECK(enumerator_version='forge.m5.bounded-successor-enumerator/v1'),\n    candidate_set_hash varchar(64) NOT NULL CHECK(length(candidate_set_hash)=64 AND candidate_set_hash NOT GLOB '*[^a-f0-9]*'),\n    derived_successor_count integer NOT NULL CHECK(derived_successor_count=1),\n    identity_authority_hash text NOT NULL, UNIQUE(proposal_id,project_id,proposal_hash), UNIQUE(proposal_id,proposal_hash,identity_authority_hash), FOREIGN KEY(proposal_id,proposal_hash,identity_authority_hash) REFERENCES repair_proposal_identity_authorities(proposal_id,proposal_hash_at_creation,identity_authority_hash) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED)";
export const IDENTITY_TABLE_037 = "CREATE TABLE repair_proposal_identity_authorities (\n proposal_id text NOT NULL PRIMARY KEY, origin_kind text NOT NULL CHECK(origin_kind IN ('generated','caller')),\n proposal_hash_at_creation text NOT NULL, identity_authority_hash text NOT NULL,\n identity_algorithm_version text, expected_candidate_set_hash text,\n canonical_payload text NOT NULL CHECK(json_valid(canonical_payload)),\n UNIQUE(proposal_id,proposal_hash_at_creation,identity_authority_hash),\n CHECK((origin_kind='generated' AND identity_algorithm_version IS NOT NULL AND expected_candidate_set_hash IS NOT NULL)\n OR (origin_kind='caller' AND identity_algorithm_version IS NULL AND expected_candidate_set_hash IS NULL)),\n FOREIGN KEY(proposal_id,proposal_hash_at_creation,identity_authority_hash) REFERENCES repair_proposals(proposal_id,proposal_hash,identity_authority_hash)\n ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED)";
export const IDENTITY_TRIGGERS_037: Readonly<Record<string,string>> = Object.freeze({
  "repair_proposal_identity_validate_insert": "CREATE TRIGGER repair_proposal_identity_validate_insert BEFORE INSERT ON repair_proposal_identity_authorities WHEN forge_m5_exact_proposal_identity_row(NEW.canonical_payload,json_object('proposal_id',NEW.proposal_id,'origin_kind',NEW.origin_kind,'proposal_hash_at_creation',NEW.proposal_hash_at_creation,'identity_authority_hash',NEW.identity_authority_hash,'identity_algorithm_version',NEW.identity_algorithm_version,'expected_candidate_set_hash',NEW.expected_candidate_set_hash))<>1 BEGIN SELECT RAISE(ABORT,'Invalid proposal identity witness'); END",
  "repair_proposal_identity_no_replace": "CREATE TRIGGER repair_proposal_identity_no_replace BEFORE INSERT ON repair_proposal_identity_authorities WHEN EXISTS(SELECT 1 FROM repair_proposal_identity_authorities WHERE proposal_id=NEW.proposal_id) BEGIN SELECT RAISE(ABORT,'Proposal identity witness is append-only'); END",
  "repair_proposal_identity_no_update": "CREATE TRIGGER repair_proposal_identity_no_update BEFORE UPDATE ON repair_proposal_identity_authorities BEGIN SELECT RAISE(ABORT,'Proposal identity witness is append-only'); END",
  "repair_proposal_identity_no_delete": "CREATE TRIGGER repair_proposal_identity_no_delete BEFORE DELETE ON repair_proposal_identity_authorities BEGIN SELECT RAISE(ABORT,'Proposal identity witness is append-only'); END",
  "repair_proposal_identity_pair_insert": "CREATE TRIGGER repair_proposal_identity_pair_insert AFTER INSERT ON repair_proposal_identity_authorities WHEN EXISTS(SELECT 1 FROM repair_proposals p WHERE p.proposal_id=NEW.proposal_id AND forge_m5_proposal_identity_pair(NEW.canonical_payload,p.canonical_payload,p.identity_authority_hash)<>1) BEGIN SELECT RAISE(ABORT,'Proposal identity pairing mismatch'); END",
  "repair_proposal_pair_insert": "CREATE TRIGGER repair_proposal_pair_insert AFTER INSERT ON repair_proposals WHEN EXISTS(SELECT 1 FROM repair_proposal_identity_authorities w WHERE w.proposal_id=NEW.proposal_id AND forge_m5_proposal_identity_pair(w.canonical_payload,NEW.canonical_payload,NEW.identity_authority_hash)<>1) BEGIN SELECT RAISE(ABORT,'Proposal identity pairing mismatch'); END"
});
/** No origin can be inferred retroactively from an old proposal or its ID shape. */
export async function up(db: Kysely<any>): Promise<void> {
    if (currentMigrationDialect() !== 'sqlite') throw Error('Migration 037 requires SQLite.');
    if (Number((await sql.raw<any>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys) !== 1)
        throw Error('Migration 037 requires foreign_keys=ON before its transaction.');
    if (Number((await sql.raw<any>('SELECT count(*) n FROM repair_proposals').execute(db)).rows[0].n) !== 0)
        throw Error('Migration 037 cannot infer historical proposal origin or backfill generation-time witnesses; existing proposals require a separately approved transition.');
    // With zero proposals the existing FK graph proves there can be no dependent
    // decision/promotion rows. Preserve those tables and their contracts verbatim.
    const violations = (await sql.raw('PRAGMA foreign_key_check').execute(db)).rows;
    if (violations.length) throw Error('Migration 037 requires an intact pre-migration FK graph.');
    const objects = (await sql.raw<{type:string;name:string;sql:string}>(
        "SELECT type,name,sql FROM sqlite_schema WHERE type IN ('trigger','view') AND sql IS NOT NULL ORDER BY type,name").execute(db)).rows;
    const indexes = (await sql.raw<{sql:string}>("SELECT sql FROM sqlite_schema WHERE type='index' AND tbl_name='repair_proposals' AND sql IS NOT NULL").execute(db)).rows;
    const quote = (name:string) => '"' + name.replace(/"/g, '""') + '"';
    for (const object of objects) await sql.raw('DROP ' + object.type + ' ' + quote(object.name)).execute(db);
    await sql.raw(IDENTITY_TABLE_037.replace('REFERENCES repair_proposals(', 'REFERENCES repair_proposals_037(')).execute(db);
    await sql.raw(PROPOSAL_TABLE_037.replace('CREATE TABLE repair_proposals (', 'CREATE TABLE repair_proposals_037 (')).execute(db);
    await sql.raw('DROP TABLE repair_proposals').execute(db);
    await sql.raw('ALTER TABLE repair_proposals_037 RENAME TO repair_proposals').execute(db);
    for (const index of indexes) await sql.raw(index.sql).execute(db);
    for (const object of [...objects].sort((a,b) => a.type === b.type ? 0 : a.type === 'view' ? -1 : 1)) await sql.raw(object.sql).execute(db);
    for (const definition of Object.values(IDENTITY_TRIGGERS_037)) await sql.raw(definition).execute(db);
    if ((await sql.raw('PRAGMA foreign_key_check').execute(db)).rows.length) throw Error('Migration 037 foreign_key_check failed.');
}
export async function down(): Promise<void> { throw Error('Migration 037 is intentionally irreversible.'); }
