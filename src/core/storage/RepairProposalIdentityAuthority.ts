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
import { canonicalJson, canonicalJsonSha256 } from './JsonAppModelMigrationPlanner';
import { parseRepairAuthority, validateRepairJson } from './RepairAuthorityValidation';

export const GENERATED_PROPOSAL_IDENTITY_VERSION = 'forge.m5.generated-proposal-id/v1';
export type ProposalOriginKind = 'generated' | 'caller';
export type ProposalIdentityAuthority = {
    proposalId: string;
    originKind: ProposalOriginKind;
    proposalHashAtCreation: string;
    identityAuthorityHash: string;
    identityAlgorithmVersion?: string;
    expectedCandidateSetHash?: string;
};
/** Existing Chunk 2 identity formula, moved here without changing its preimage. */
export function generatedRepairProposalIdentity(request: { projectId: string; source: unknown; candidate: unknown }, candidateSetHash: string): string {
    return 'transition-proposal-' + canonicalJsonSha256({ projectId: request.projectId, source: request.source, candidate: request.candidate, candidateSetHash }).slice(0, 24);
}
function validate(value: unknown): asserts value is ProposalIdentityAuthority {
    validateRepairJson(value);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Invalid proposal identity witness.');
    const v = value as ProposalIdentityAuthority;
    const keys = ['proposalId', 'originKind', 'proposalHashAtCreation', 'identityAuthorityHash',
        ...(v.originKind === 'generated' ? ['identityAlgorithmVersion', 'expectedCandidateSetHash'] : [])];
    const hash = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
    if (!['generated', 'caller'].includes(v.originKind) || Object.keys(v).length !== keys.length
        || keys.some(key => !Object.hasOwn(v, key)) || Object.keys(v).some(key => !keys.includes(key))
        || typeof v.proposalId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(v.proposalId)
        || !hash(v.proposalHashAtCreation) || !hash(v.identityAuthorityHash)
        || (v.originKind === 'generated' && (v.identityAlgorithmVersion !== GENERATED_PROPOSAL_IDENTITY_VERSION || !hash(v.expectedCandidateSetHash))))
        throw Error('Invalid proposal identity witness fields.');
}
export function proposalIdentityAuthorityHash(value: unknown): string {
    validate(value);
    const { identityAuthorityHash: _, ...body } = value;
    return canonicalJsonSha256(body);
}
export function parseProposalIdentityAuthority(input: unknown): ProposalIdentityAuthority {
    const value = typeof input === 'string' ? JSON.parse(input) : input;
    if (proposalIdentityAuthorityHash(value) !== value.identityAuthorityHash) throw Error('Proposal identity witness hash mismatch.');
    return value;
}
/** Independence is the separate immutable row captured in the acceptance transaction.
 * This snapshot is never regenerated during reads; it is not external ground truth. */
export function captureProposalIdentityAuthority(proposalInput: unknown, originKind: ProposalOriginKind): ProposalIdentityAuthority {
    const proposal = parseRepairAuthority('repair_proposals', proposalInput);
    const value: ProposalIdentityAuthority = { proposalId: proposal.proposalId, originKind,
        proposalHashAtCreation: proposal.proposalHash, identityAuthorityHash: '0'.repeat(64),
        ...(originKind === 'generated' ? { identityAlgorithmVersion: GENERATED_PROPOSAL_IDENTITY_VERSION,
            expectedCandidateSetHash: proposal.candidateSetHash } : {}) };
    value.identityAuthorityHash = proposalIdentityAuthorityHash(value);
    assertProposalIdentityPair(value, proposal);
    return value;
}
export function proposalIdentityAuthorityRow(input: unknown) {
    const v = parseProposalIdentityAuthority(input);
    return { proposal_id: v.proposalId, origin_kind: v.originKind, proposal_hash_at_creation: v.proposalHashAtCreation,
        identity_authority_hash: v.identityAuthorityHash, identity_algorithm_version: v.identityAlgorithmVersion ?? null,
        expected_candidate_set_hash: v.expectedCandidateSetHash ?? null, canonical_payload: canonicalJson(v) };
}
/** Physical columns owned by the separate identity witness validator. */
export function projectProposalIdentityColumns(row: Record<string, any>) {
    return { proposal_id: row.proposal_id, origin_kind: row.origin_kind,
        proposal_hash_at_creation: row.proposal_hash_at_creation, identity_authority_hash: row.identity_authority_hash,
        identity_algorithm_version: row.identity_algorithm_version, expected_candidate_set_hash: row.expected_candidate_set_hash };
}
export function isExactProposalIdentityRow(payload: unknown, columns: unknown): number {
    try {
        if (typeof payload !== 'string' || typeof columns !== 'string') return 0;
        return canonicalJson(proposalIdentityAuthorityRow(payload)) === canonicalJson({ canonical_payload: payload, ...JSON.parse(columns) }) ? 1 : 0;
    } catch { return 0; }
}
export function assertProposalIdentityPair(witnessInput: unknown, proposalInput: unknown, pairedIdentityHash?: string): void {
    const witness = parseProposalIdentityAuthority(witnessInput);
    const proposal = parseRepairAuthority('repair_proposals', proposalInput);
    if ((pairedIdentityHash !== undefined && pairedIdentityHash !== witness.identityAuthorityHash)
        || witness.proposalId !== proposal.proposalId || witness.proposalHashAtCreation !== proposal.proposalHash
        || (witness.originKind === 'generated' && (witness.expectedCandidateSetHash !== proposal.candidateSetHash
            || generatedRepairProposalIdentity(proposal as any, witness.expectedCandidateSetHash!) !== proposal.proposalId)))
        throw Error('Proposal and independent identity witness disagree.');
}
export function isProposalIdentityPair(witness: unknown, proposal: unknown, pairedIdentityHash: unknown): number {
    try { if (typeof pairedIdentityHash !== 'string') return 0; assertProposalIdentityPair(witness, proposal, pairedIdentityHash); return 1; } catch { return 0; }
}
