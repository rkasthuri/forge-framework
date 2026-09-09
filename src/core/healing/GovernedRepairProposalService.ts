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
import { sql, type Kysely } from 'kysely';
import { getProductDb } from '../storage/db';
import type { Database } from '../storage/types';
import { AppModelRepository } from '../storage/repositories/AppModelRepository';
import { TestDefinitionAuthorityProjectionService } from '../test-design/TestDefinitionAuthorityProjectionService';
import { CanonicalRouteEvidenceProjection } from '../test-design/CanonicalRouteEvidenceProjection';
import { AuthenticationExpectationProjectionService } from '../test-design/AuthenticationExpectationProjection';
import { canonicalJson } from '../storage/JsonAppModelMigrationPlanner';
import { sourceProductRowsSql } from '../storage/RepairSourceAuthority';
import { projectRepairAuthorityColumns, isExactRepairAuthorityRow, parseRepairAuthority, repairAuthorityRow, validateRepairComponent } from '../storage/RepairAuthorityValidation';
import { validateRepairRequestEnvelope, firstRepairRefusal, generatedRepairProposalIdentity, inspectGovernedRepair, type RepairInspection, type RepairProposalRequest, type RepairEligibilityResult } from './GovernedRepairEligibility';
import { captureProposalIdentityAuthority, proposalIdentityAuthorityRow, parseProposalIdentityAuthority,
    projectProposalIdentityColumns, isExactProposalIdentityRow, assertProposalIdentityPair, type ProposalOriginKind } from '../storage/RepairProposalIdentityAuthority';
type Refused = Extract<RepairEligibilityResult, {
    kind: 'refused';
}>;
export type RepairProposalResult = Refused | (Extract<RepairEligibilityResult, {
    kind: 'eligible';
}> & {
    replay: boolean;
});
const refused = (code: Refused['code']): Refused => ({ kind: 'refused', code, counts: { a: 0, b: 0, c: 0 } });
/** One transaction contains Product rebound, identity inspection and atomic
 * append of a non-authoritative repair proposal with its independent witness. */
export class GovernedRepairProposalService {
    constructor(private readonly workspaceRoot: string, private readonly database: () => Kysely<Database> = getProductDb, private readonly authentication = new AuthenticationExpectationProjectionService()) { }
    async evaluate(input: RepairProposalRequest): Promise<RepairEligibilityResult> {
        const request = this.freeze(input);
        if (!request)
            return refused('integrity_mismatch');
        return this.transaction(async (db) => (await this.inspectRequest(db, request)).result);
    }
    async propose(input: RepairProposalRequest): Promise<RepairProposalResult> {
        const request = this.freeze(input);
        if (!request)
            return refused('integrity_mismatch');
        return this.transaction(db => this.proposeInTransaction(request, db));
    }
    async proposeInTransaction(input: RepairProposalRequest, db: Kysely<Database>): Promise<RepairProposalResult> {
        const request = this.freeze(input);
        if (!request)
            return refused('integrity_mismatch');
        if (Number((await sql<{
            foreign_keys: number;
        }> `PRAGMA foreign_keys`.execute(db)).rows[0]?.foreign_keys) !== 1)
            return refused('integrity_mismatch');
        const { result, existing } = await this.inspectRequest(db, request);
        if (result.kind === 'refused')
            return result;
        if (existing)
            return { ...result, replay: true };
        const witness = captureProposalIdentityAuthority(result.proposal, this.origin(request));
        await db.insertInto('repair_proposal_identity_authorities').values(proposalIdentityAuthorityRow(witness)).execute();
        await db.insertInto('repair_proposals').values({ ...repairAuthorityRow('repair_proposals', result.proposal), identity_authority_hash: witness.identityAuthorityHash } as any).execute();
        return { ...result, replay: false };
    }
    async readExact(input: RepairProposalRequest, proposalId: string): Promise<RepairProposalResult> {
        const request = this.freeze(input);
        if (!request)
            return refused('integrity_mismatch');
        return this.transaction(async (db) => {
            // Inspect witness integrity first, including orphaned pairs, before source rebound.
            let pairs: Awaited<ReturnType<GovernedRepairProposalService['verifiedPairs']>>;
            try { pairs = await this.verifiedPairs(db); } catch { return refused('integrity_mismatch'); }
            const row = pairs.get(proposalId)?.row;
            const proposal = row ? this.verifyRow(row) : undefined;
            if (proposal === null)
                return refused('integrity_mismatch');
            // A present invalid caller value must never be replaced by the stored one.
            const rebound = Object.hasOwn(request, 'proposal') || proposal === undefined ? request : { ...request, proposal };
            const { result } = await this.inspectRequest(db, rebound, this.origin(request));
            if (!row)
                return refused(firstRepairRefusal(['historical_authority_mismatch', ...(result.kind === 'refused' ? [result.code] : [])])!);
            if (result.kind === 'refused')
                return result;
            if (canonicalJson(result.proposal) !== canonicalJson(proposal))
                return refused('integrity_mismatch');
            return { ...result, replay: true };
        });
    }
    private origin(request: RepairProposalRequest): ProposalOriginKind {
        return Object.hasOwn(request, 'proposalId') || typeof request.proposal?.proposalId === 'string' ? 'caller' : 'generated';
    }
    /** Establish FK enforcement before BEGIN; a failed deferred COMMIT must roll back. */
    private async transaction<T>(run: (db: Kysely<Database>) => Promise<T>): Promise<T | Refused> {
        return this.database().connection().execute(async db => {
            // Database initialization establishes ON; never silently repair a disabled caller connection.
            if (Number((await sql.raw<{foreign_keys:number}>('PRAGMA foreign_keys').execute(db)).rows[0]?.foreign_keys) !== 1)
                return refused('integrity_mismatch');
            await sql.raw('BEGIN IMMEDIATE').execute(db);
            try {
                const result = await run(db);
                await sql.raw('COMMIT').execute(db);
                return result;
            } catch (cause) { await sql.raw('ROLLBACK').execute(db); throw cause; }
        });
    }
    /** The narrow witness has no project locator. Verify the workspace pair inventory
     * before using proposal fields as lookup hints, so corrupted locators cannot hide rows. */
    private async verifiedPairs(db: Kysely<Database>) {
        const witnesses = await db.selectFrom('repair_proposal_identity_authorities').selectAll().execute();
        const pairs = new Map<string, { row: Database['repair_proposals']; proposal: Record<string,any>; witness: ReturnType<typeof parseProposalIdentityAuthority> }>();
        for (const witnessRow of witnesses) {
            const { canonical_payload } = witnessRow;
            if (isExactProposalIdentityRow(canonical_payload, JSON.stringify(projectProposalIdentityColumns(witnessRow))) !== 1) throw Error('Witness integrity mismatch.');
            const witness = parseProposalIdentityAuthority(canonical_payload);
            const row = await db.selectFrom('repair_proposals').selectAll().where('proposal_id', '=', witness.proposalId).executeTakeFirst();
            const proposal = row && this.verifyRow(row);
            if (!row || !proposal) throw Error('Missing or corrupt paired proposal.');
            assertProposalIdentityPair(witness, proposal, row.identity_authority_hash);
            pairs.set(witness.proposalId, { row, proposal, witness });
        }
        const rows = await db.selectFrom('repair_proposals').select('proposal_id').execute();
        if (rows.some(row => !pairs.has(row.proposal_id))) throw Error('Proposal identity witness missing.');
        return pairs;
    }
    private freeze(input: RepairProposalRequest): RepairProposalRequest | null {
        try {
            validateRepairRequestEnvelope(input);
            return JSON.parse(canonicalJson(input));
        }
        catch {
            return null;
        }
    }
    private verifyRow(row: Database['repair_proposals']): Record<string, any> | null {
        try {
            const { canonical_payload } = row;
            if (isExactRepairAuthorityRow('repair_proposals', canonical_payload, JSON.stringify(projectRepairAuthorityColumns('repair_proposals', row))) !== 1)
                return null;
            return parseRepairAuthority('repair_proposals', canonical_payload);
        }
        catch {
            return null;
        }
    }
    /** Compare every request-owned field of a generated governed proposal.
     * Version/kind are eligibility gates, not replacement proposal metadata.
     * Full independently derived payload comparison follows Product inspection. */
    private generatedInputConflicts(request: RepairProposalRequest, stored: Record<string, any>): boolean {
        const project = (value: Record<string, any>) => ({ projectId: value.projectId,
            source: value.source, candidate: value.candidate, proposedAt: value.proposedAt });
        return canonicalJson(project(request)) !== canonicalJson(project(stored));
    }
    private async inspectRequest(db: Kysely<Database>, request: RepairProposalRequest, requestOrigin = this.origin(request)): Promise<{
        result: RepairEligibilityResult;
        existing: boolean;
    }> {
        const fail = () => ({ result: refused('integrity_mismatch'), existing: false });
        let pairs: Awaited<ReturnType<GovernedRepairProposalService['verifiedPairs']>>;
        try { pairs = await this.verifiedPairs(db); } catch { return fail(); }
        let supplied: Record<string, any> | undefined;
        if (Object.hasOwn(request, 'proposal')) {
            try { supplied = parseRepairAuthority('repair_proposals', request.proposal); } catch { /* Lower shape diagnostics follow. */ }
        }
        const ids = [request.proposalId, request.proposal?.proposalId].filter((id): id is string => typeof id === 'string');
        const identityRows = new Map<string, Database['repair_proposals']>();
        const generatedRows: Database['repair_proposals'][] = [];
        for (const id of new Set(ids)) {
            const pair = pairs.get(id);
            if (!pair) continue;
            if (pair.witness.originKind !== requestOrigin) return fail();
            identityRows.set(id, pair.row);
        }
        if (ids.length === 0 && request.candidate !== undefined) {
            for (const [id, pair] of pairs) {
                // Snapshot data is authenticated by the separate immutable row.
                // Formula equality locates the requested identity; it does not determine origin.
                const hash = pair.witness.originKind === 'generated'
                    ? pair.witness.expectedCandidateSetHash! : pair.proposal.candidateSetHash;
                if (id !== generatedRepairProposalIdentity(request, hash)) continue;
                if (pair.witness.originKind !== requestOrigin || this.generatedInputConflicts(request, pair.proposal)) return fail();
                generatedRows.push(pair.row);
            }
        }
        const explicitId = supplied?.proposalId ?? request.proposalId ?? ids[0];
        const initial = explicitId ? identityRows.get(explicitId) : undefined;
        if (initial) {
            const stored = pairs.get(initial.proposal_id)!.proposal;
            if (supplied !== undefined && canonicalJson(supplied) !== canonicalJson(stored)) return fail();
            if (!Object.hasOwn(request, 'proposal')) {
                let validCandidate = false;
                try { validateRepairComponent('endpoint', request.candidate); validCandidate = true; } catch { /* Lower refusal follows. */ }
                if (validCandidate && this.generatedInputConflicts(request, stored)) return fail();
            }
        }
        const inspection = await this.inspectProduct(db, request);
        // Source-owned proposal fields remain derivable when candidates fail.
        // Compare them before returning lower refusals, without borrowing the
        // persisted proposal's semantics as Product truth.
        if (inspection.sourceBoundFields) {
            for (const row of [...identityRows.values(), ...generatedRows]) {
                const stored = this.verifyRow(row);
                if (stored === null)
                    return fail();
                if (stored.projectId === request.projectId && canonicalJson(stored.source) === canonicalJson(request.source)
                    && canonicalJson(stored.candidate) === canonicalJson(request.candidate)
                    && Object.entries(inspection.sourceBoundFields).some(([key, value]) => canonicalJson(stored.boundedSemantics[key]) !== canonicalJson(value)))
                    return fail();
            }
        }
        const identity = inspection.proposalIdentity ?? explicitId;
        const row = initial && initial.proposal_id === identity ? initial
            : identity ? await db.selectFrom('repair_proposals').selectAll().where('proposal_id', '=', identity).executeTakeFirst() : undefined;
        if (row) {
            if (pairs.get(row.proposal_id)?.witness.originKind !== requestOrigin) return fail();
            const stored = this.verifyRow(row);
            if (stored === null || (inspection.proposed !== undefined && canonicalJson(stored) !== canonicalJson(inspection.proposed)))
                return fail();
        }
        // Exact bytes are necessary but not sufficient: the result still carries
        // any historical failure. Only a fully eligible result can replay or append.
        return { result: inspection.result, existing: row !== undefined };
    }
    private async inspectProduct(db: Kysely<Database>, request: RepairProposalRequest): Promise<RepairInspection> {
        const models = new AppModelRepository(), support = new TestDefinitionAuthorityProjectionService(models), routes = new CanonicalRouteEvidenceProjection(models);
        let source;
        try {
            source = await models.getCommittedById(request.source.modelRowId, db);
        }
        catch {
            return { result: refused('integrity_mismatch') };
        }
        let candidate = null;
        const candidateRowId = request.candidate?.modelRowId;
        if (Number.isSafeInteger(candidateRowId) && candidateRowId > 0) {
            const exists = await db.selectFrom('app_models').select('id').where('id', '=', candidateRowId).executeTakeFirst();
            if (exists) {
                try {
                    candidate = await models.getCommittedById(candidateRowId, db);
                }
                catch {
                    return { result: refused('integrity_mismatch') };
                }
            }
        }
        const sourceSupport = await support.readExact(request.projectId, source.rowId, db);
        const candidateSupport = candidate ? await support.readExact(request.projectId, candidate.rowId, db) : null;
        const sourceRoutes = sourceSupport.kind === 'ok' ? await routes.readExact(request.projectId, sourceSupport.authority, db) : null;
        const candidateRoutes = candidateSupport?.kind === 'ok' ? await routes.readExact(request.projectId, candidateSupport.authority, db) : null;
        if (sourceRoutes?.kind === 'refused' && sourceRoutes.code === 'route_observation_integrity_failed')
            return { result: refused('integrity_mismatch') };
        const candidateObservationInvalid = candidateRoutes?.kind === 'refused'
            && ['route_observation_integrity_failed', 'route_authority_mismatch'].includes(candidateRoutes.code);
        const rows = await sql<{
            authority: string;
        }> `WITH source_input(payload) AS (SELECT ${canonicalJson(request)})
      SELECT ${sql.raw(sourceProductRowsSql('(SELECT payload FROM source_input)'))} AS authority`.execute(db);
        const historical = JSON.parse(rows.rows[0].authority);
        return inspectGovernedRepair(request, { sourceModel: source.snapshot, candidateModel: candidate?.snapshot ?? source.snapshot,
            sourceModelRowId: source.rowId, candidateModelRowId: candidate?.rowId ?? candidateRowId,
            sourceRows: historical.source, witnesses: historical.witnesses,
            sourceAuthority: sourceSupport.kind === 'ok' ? sourceSupport.authority : null,
            candidateAuthority: candidateSupport?.kind === 'ok' && !candidateObservationInvalid ? candidateSupport.authority : null,
            sourceRoutes: sourceRoutes?.kind === 'ok' ? sourceRoutes.evidence : null, candidateRoutes: candidateRoutes?.kind === 'ok' ? candidateRoutes.evidence : null,
            authentication: this.authentication.read(request.projectId, this.workspaceRoot) });
    }
}
