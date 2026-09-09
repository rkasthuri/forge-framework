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
import type { AppModel } from '../onboarding/types';
import { validateAppModelObject } from '../onboarding/ModelValidator';
import { canonicalJson, canonicalJsonSha256 } from '../storage/JsonAppModelMigrationPlanner';
import { parseCanonicalTestSetV3 } from '../test-design/TestDefinitionContract';
import { historicalDefinitionContentHash } from '../execution/HistoricalDefinitionAuthorityResolver';
import { normalizeDiscoveredIntentV1 } from '../test-design/NormalizedTestIntentContract';
import type { CanonicalTestDefinitionAuthority } from '../test-design/TestDefinitionAuthorityProjectionService';
import type { CanonicalRouteEvidence } from '../test-design/CanonicalRouteEvidenceProjection';
import type { AuthenticationExpectationProjection } from '../test-design/AuthenticationExpectationProjection';
import { assertSourceEndpointAuthority, RepairSourceAuthorityError } from '../storage/RepairSourceAuthority';
import { repairAuthorityHash, validateRepairAuthority, validateRepairComponent, validateRepairJson, repairComponentStatus } from '../storage/RepairAuthorityValidation';
import { generatedRepairProposalIdentity } from '../storage/RepairProposalIdentityAuthority';
export { generatedRepairProposalIdentity } from '../storage/RepairProposalIdentityAuthority';
type ObjectValue = Record<string, any>;
export const REPAIR_PROPOSAL_SCHEMA = 'forge.m5.transition-correspondence-proposal/v1';
export const REPAIR_ENUMERATOR_VERSION = 'forge.m5.bounded-successor-enumerator/v1';
export const REPAIR_REFUSAL_PRECEDENCE = [
    'integrity_mismatch', 'historical_authority_mismatch', 'unsupported_contract_version',
    'unsupported_repair_kind', 'candidate_not_found', 'candidate_not_governed',
    'candidate_semantics_unproven', 'candidate_ambiguous', 'stale_authority',
] as const;
export type RepairRefusalCode = typeof REPAIR_REFUSAL_PRECEDENCE[number];
export function firstRepairRefusal(codes: readonly RepairRefusalCode[]): RepairRefusalCode | null {
    return REPAIR_REFUSAL_PRECEDENCE.find(code => codes.includes(code)) ?? null;
}
export interface RepairProposalRequest {
    projectId: string;
    sourceDefinitionAuthority: ObjectValue;
    source: ObjectValue;
    candidate: ObjectValue;
    proposedAt: string;
    proposalId?: string;
    contractVersion?: string;
    repairKind?: string;
    proposal?: ObjectValue;
}
/** Read-only Product inputs; only the service's independently loaded snapshot
 * may be used to persist a proposal. This evaluator performs no writes. */
export interface RepairEvaluationSnapshot {
    sourceModel: AppModel;
    candidateModel: AppModel;
    sourceModelRowId: number;
    candidateModelRowId: number;
    sourceRows: ObjectValue[];
    witnesses: ObjectValue[];
    sourceAuthority: CanonicalTestDefinitionAuthority | null;
    candidateAuthority: CanonicalTestDefinitionAuthority | null;
    sourceRoutes: CanonicalRouteEvidence | null;
    candidateRoutes: CanonicalRouteEvidence | null;
    authentication: AuthenticationExpectationProjection | null;
}
export interface PhysicalEndpointSlot {
    flowPosition: number;
    stepPosition: number;
    sourcePagePosition: number;
    targetPagePosition: number;
    elementPosition: number;
    flow: ObjectValue;
    step: ObjectValue;
    source: ObjectValue;
    target: ObjectValue;
    element: ObjectValue;
}
export interface GovernedPhysicalCandidate extends PhysicalEndpointSlot {
    strategyPosition: number;
    strategy: ObjectValue;
}
export type RepairEligibilityResult = {
    kind: 'refused';
    code: RepairRefusalCode;
    counts: {
        a: number;
        b: number;
        c: number;
    };
} | {
    kind: 'eligible';
    proposal: ObjectValue;
    counts: {
        a: number;
        b: number;
        c: number;
    };
    candidateIdentity: ObjectValue;
};
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const omit = (value: ObjectValue, ...keys: string[]) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const safe = (value: GovernedPhysicalCandidate): boolean => typeof value.strategy.value === 'string'
    && value.strategy.value.length > 0
    && !/credential|secret|password|username|token|\$\{|%[A-Z_]+%/i.test([value.strategy.value, value.element.id, value.element.name, value.element.label].join('|'));
export function enumeratePhysicalEndpointSlots(model: AppModel): PhysicalEndpointSlot[] {
    const result: PhysicalEndpointSlot[] = [];
    for (const [flowPosition, flow] of (model.flows ?? []).entries())
        for (const [stepPosition, step] of flow.steps.entries())
            for (const [sourcePagePosition, source] of (model.pages ?? []).entries())
                if (source.id === step.pageId)
                    for (const [targetPagePosition, target] of (model.pages ?? []).entries())
                        if (target.id === step.targetPageId)
                            for (const [elementPosition, element] of source.elements.entries())
                                if (element.id === step.elementId)
                                    result.push({ flowPosition, stepPosition, sourcePagePosition, targetPagePosition, elementPosition, flow, step, source, target, element });
    return result;
}
function strategies(slot: PhysicalEndpointSlot): GovernedPhysicalCandidate[] {
    return slot.element.strategies.map((strategy: ObjectValue, strategyPosition: number) => ({ ...slot, strategyPosition, strategy }));
}
export function physicalCandidateIdentity(value: GovernedPhysicalCandidate): ObjectValue {
    return { flowPosition: value.flowPosition, stepPosition: value.stepPosition, sourcePagePosition: value.sourcePagePosition,
        targetPagePosition: value.targetPagePosition, elementPosition: value.elementPosition, strategyPosition: value.strategyPosition,
        selectorKind: value.strategy.type, selectorValue: value.strategy.value };
}
function endpoint(request: RepairProposalRequest, snapshot: RepairEvaluationSnapshot, value: GovernedPhysicalCandidate): ObjectValue {
    const authority = snapshot.candidateAuthority!;
    return { modelRowId: snapshot.candidateModelRowId, modelVersion: snapshot.candidateModel.app.modelVersion,
        modelContentHash: canonicalJsonSha256(snapshot.candidateModel), observationRunId: authority.observationRunId,
        supportSealHash: authority.supportSealHash, characterizationPolicy: authority.characterizationPolicy,
        supportingObservationIds: authority.supportingObservationIds,
        flowId: value.flow.id, flowContentHash: canonicalJsonSha256(value.flow), stepIndex: value.step.stepIndex,
        action: value.step.action, grounding: value.step.grounding, sourceSubjectId: value.source.id,
        sourceSubjectContentHash: canonicalJsonSha256(value.source), elementId: value.element.id,
        elementContentHash: canonicalJsonSha256(value.element), selector: { kind: 'data_test', value: value.strategy.value },
        targetSubjectId: value.target.id, targetSubjectContentHash: canonicalJsonSha256(value.target) };
}
function declares(value: GovernedPhysicalCandidate, declared: ObjectValue): boolean {
    return value.flow.id === declared.flowId && value.step.stepIndex === declared.stepIndex && value.step.action === declared.action
        && value.step.grounding === declared.grounding && value.source.id === declared.sourceSubjectId
        && value.target.id === declared.targetSubjectId && value.element.id === declared.elementId
        && declared.selector?.kind === 'data_test' && value.strategy.type === 'data-test' && value.strategy.value === declared.selector.value;
}
function withoutNominatedStrategies(element: ObjectValue): ObjectValue {
    return { ...element, strategies: element.strategies.filter((value: ObjectValue) => value.type !== 'data-test') };
}
function sourceSemantics(slot: PhysicalEndpointSlot): ObjectValue {
    const page = clone(slot.source);
    page.elements[slot.elementPosition] = withoutNominatedStrategies(page.elements[slot.elementPosition]);
    return page;
}
function intentSemantics(value: ObjectValue): ObjectValue {
    const result = clone(value);
    delete result.intentId;
    for (const key of ['modelRowId', 'modelVersion', 'observationRunId', 'supportSealHash', 'subjectSupport'])
        delete result.grounding[key];
    for (const step of result.steps) {
        delete step.stepId;
        if (step.kind === 'click_observed_data_test')
            step.dataTestValue = '<nominated-selector>';
    }
    for (const outcome of result.expectedOutcomes)
        delete outcome.outcomeId;
    return result;
}
function routesSemantics(value: CanonicalRouteEvidence): ObjectValue {
    return { ...omit(value, 'modelRowId', 'supportSealHash', 'identityHash'),
        subjects: value.subjects.map(subject => omit(subject, 'supportingObservationIds')) };
}
function normalizedCandidate(request: RepairProposalRequest, snapshot: RepairEvaluationSnapshot, slot: GovernedPhysicalCandidate): ObjectValue | null {
    if (!snapshot.candidateAuthority || !snapshot.candidateRoutes || !snapshot.authentication)
        return null;
    const model = clone(snapshot.candidateModel);
    model.flows = model.flows!.filter((flow, index) => flow.id !== slot.flow.id || index === slot.flowPosition);
    model.pages = model.pages!.flatMap((page, index) => {
        if ((page.id === slot.source.id && index !== slot.sourcePagePosition) || (page.id === slot.target.id && index !== slot.targetPagePosition))
            return [];
        if (index === slot.sourcePagePosition) {
            page.elements = page.elements.filter((element, position) => element.id !== slot.element.id || position === slot.elementPosition);
            const element = page.elements.find(element => element.id === slot.element.id)!;
            element.strategies = element.strategies.filter((strategy, index) => strategy.type !== 'data-test' || index === slot.strategyPosition);
        }
        return [page];
    });
    const result = normalizeDiscoveredIntentV1({ projectId: request.projectId, model, authority: snapshot.candidateAuthority,
        routeEvidence: snapshot.candidateRoutes, authenticationExpectation: snapshot.authentication,
        selection: { flowId: slot.flow.id, selectedFlowStepIndexes: [slot.step.stepIndex] } });
    return result.kind === 'supported' ? result.materialized.value : null;
}
function completeSemantics(request: RepairProposalRequest, snapshot: RepairEvaluationSnapshot, source: GovernedPhysicalCandidate, candidate: GovernedPhysicalCandidate, definition: ObjectValue): boolean {
    const normalized = normalizedCandidate(request, snapshot, candidate);
    if (!normalized || !snapshot.sourceRoutes || !snapshot.candidateRoutes || !snapshot.authentication)
        return false;
    return same(sourceSemantics(source), sourceSemantics(candidate))
        && same(withoutNominatedStrategies(source.element), withoutNominatedStrategies(candidate.element))
        && same(source.target, candidate.target) && same(source.flow, candidate.flow)
        && same(snapshot.sourceModel.roles.filter(role => role.id === source.flow.roleId), snapshot.candidateModel.roles.filter(role => role.id === candidate.flow.roleId))
        && same(routesSemantics(snapshot.sourceRoutes), routesSemantics(snapshot.candidateRoutes))
        && same(omit(snapshot.authentication, 'schemaVersion', 'identityHash'), definition.authenticationExpectation)
        && same(intentSemantics(normalized), intentSemantics(definition.normalizedIntent))
        && normalized.appArea.id === definition.appArea;
}
function validateProposalStructure(proposal: ObjectValue): void {
    if (typeof proposal.schemaVersion !== 'string' || typeof proposal.repairKind !== 'string'
        || typeof proposal.enumeratorVersion !== 'string' || !Number.isSafeInteger(proposal.derivedSuccessorCount))
        throw new Error('M5 proposal audit fields require governed scalar types.');
    // Validate every original key without accepting unsupported values for persistence.
    // Version/kind/audit refusals are ordered after integrity, so validate their
    // structural positions using v1 constants while hashing the unmodified input.
    validateRepairAuthority('repair_proposals', { ...proposal, schemaVersion: REPAIR_PROPOSAL_SCHEMA,
        repairKind: 'selector_replacement', enumeratorVersion: REPAIR_ENUMERATOR_VERSION, derivedSuccessorCount: 1 });
}
/** Fields fixed by the internally validated source Definition, independent of
 * whether any candidate survives A/B/C. These are comparison evidence only. */
function sourceBoundedFields(definition: ObjectValue): ObjectValue | undefined {
    const intent = definition.normalizedIntent;
    const navigate = intent.steps.find((value: ObjectValue) => value.kind === 'navigate_to_observed_route');
    const outcome = intent.expectedOutcomes[0];
    if (!navigate || !outcome || typeof navigate.routePath !== 'string' || typeof outcome.routePath !== 'string')
        return undefined;
    return { appArea: definition.appArea, sourceRoute: navigate.routePath, targetRoute: outcome.routePath,
        preconditionIdentityHash: canonicalJsonSha256(intent.preconditions),
        oracleIdentityHash: canonicalJsonSha256({ kind: 'subject_observable', subjectId: outcome.subjectId, routePath: outcome.routePath }),
        excludedFlowStepIndexes: intent.grounding.excludedFlowStepIndexes };
}
/** A prospective proposal is only for identity-conflict inspection. A refused
 * result never becomes eligible until the complete historical rebound succeeds. */
export interface RepairInspection {
    result: RepairEligibilityResult;
    proposalIdentity?: string;
    proposed?: ObjectValue;
    sourceBoundFields?: ObjectValue;
}
/** Identity only; this does not certify candidate eligibility or historical authority. */
/** Validate request keys and scalar bindings before repository identity reads. */
export function validateRepairRequestEnvelope(request: RepairProposalRequest): void {
    validateRepairJson(request);
    validateRepairComponent('endpoint', request.source);
    validateRepairComponent('definitionAuthority', request.sourceDefinitionAuthority);
    const allowed = ['projectId', 'sourceDefinitionAuthority', 'source', 'candidate', 'proposedAt', 'proposalId', 'contractVersion', 'repairKind', 'proposal'];
    if (Object.keys(request).some(key => !allowed.includes(key)) || typeof request.projectId !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(request.projectId)
        || typeof request.proposedAt !== 'string' || !Number.isFinite(Date.parse(request.proposedAt))
        || (request.proposalId !== undefined && (typeof request.proposalId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(request.proposalId)))
        || (request.contractVersion !== undefined && typeof request.contractVersion !== 'string')
        || (request.repairKind !== undefined && typeof request.repairKind !== 'string'))
        throw new Error('Invalid M5 repair request envelope.');
}
export function evaluateGovernedRepair(request: RepairProposalRequest, snapshot: RepairEvaluationSnapshot): RepairEligibilityResult {
    return inspectGovernedRepair(request, snapshot).result;
}
export function inspectGovernedRepair(request: RepairProposalRequest, snapshot: RepairEvaluationSnapshot): RepairInspection {
    const counts = { a: 0, b: 0, c: 0 };
    const pending: RepairRefusalCode[] = [];
    let sourceBoundFields: ObjectValue | undefined;
    let sourceCorrespondence = false;
    const finish = (code?: RepairRefusalCode, proposalIdentity?: string, proposed?: ObjectValue, candidateIdentity?: ObjectValue): RepairInspection => {
        const refusal = firstRepairRefusal(code ? [...pending, code] : pending);
        return {
            result: refusal
                ? { kind: 'refused', code: refusal, counts: { ...counts } }
                : { kind: 'eligible', proposal: proposed!, counts: { ...counts }, candidateIdentity: candidateIdentity! },
            ...(proposalIdentity === undefined ? {} : { proposalIdentity }),
            ...(proposed === undefined ? {} : { proposed }),
            ...(sourceBoundFields === undefined ? {} : { sourceBoundFields }),
        };
    };
    let definition: ObjectValue, sources: GovernedPhysicalCandidate[];
    let candidateSchemaValid = false;
    let hasProposal = false, proposal: ObjectValue | undefined;
    try {
        validateRepairRequestEnvelope(request);
        const candidateStatus = repairComponentStatus('endpoint', request.candidate);
        if (candidateStatus.unknownFields)
            return finish('integrity_mismatch');
        candidateSchemaValid = candidateStatus.valid;
        hasProposal = Object.hasOwn(request, 'proposal');
        if (hasProposal) {
            try {
                validateProposalStructure(request.proposal!);
                proposal = request.proposal;
            }
            catch {
                pending.push('unsupported_contract_version');
            }
            // Hash only the complete, fixed-key representation. Schema-invalid
            // supplied values are never converted into the generation path.
            if (proposal !== undefined
                && canonicalJsonSha256(omit(proposal, 'proposalHash')) !== proposal.proposalHash)
                return finish('integrity_mismatch');
        }
        if (!validateAppModelObject(snapshot.sourceModel).valid || !validateAppModelObject(snapshot.candidateModel).valid
            || request.source.modelContentHash !== canonicalJsonSha256(snapshot.sourceModel))
            return finish('integrity_mismatch');
        sources = enumeratePhysicalEndpointSlots(snapshot.sourceModel).flatMap(strategies).filter(value => declares(value, request.source) && safe(value));
        if (sources.length !== 1)
            return finish('integrity_mismatch');
        const physical = sources[0];
        if (request.source.flowContentHash !== canonicalJsonSha256(physical.flow)
            || request.source.sourceSubjectContentHash !== canonicalJsonSha256(physical.source)
            || request.source.targetSubjectContentHash !== canonicalJsonSha256(physical.target)
            || request.source.elementContentHash !== canonicalJsonSha256(physical.element))
            return finish('integrity_mismatch');
        if (snapshot.sourceRows.length === 0)
            return finish('historical_authority_mismatch');
        if (snapshot.sourceRows.length !== 1)
            return finish('integrity_mismatch');
        const parsed = parseCanonicalTestSetV3(snapshot.sourceRows[0].payload_json);
        if (parsed.fingerprint !== snapshot.sourceRows[0].content_hash)
            return finish('integrity_mismatch');
        const members = parsed.value.definitions.filter(value => value.id === request.sourceDefinitionAuthority.definitionId);
        if (members.length !== 1)
            return finish('integrity_mismatch');
        definition = members[0];
        if (historicalDefinitionContentHash(members[0]) !== request.sourceDefinitionAuthority.definitionContentHash)
            return finish('integrity_mismatch');
        // The shared owner finishes ALL internal row checks before testing
        // historical correspondence/witnesses. Typed failures preserve taxonomy.
        try {
            assertSourceEndpointAuthority(request.projectId, request.sourceDefinitionAuthority, request.source, { source: snapshot.sourceRows, witnesses: snapshot.witnesses });
            sourceCorrespondence = true;
        }
        catch (error) {
            if (!(error instanceof RepairSourceAuthorityError) || error.code === 'integrity_mismatch')
                return finish('integrity_mismatch');
            sourceCorrespondence = error.stage === 'B';
            pending.push('historical_authority_mismatch');
        }
    }
    catch {
        return finish('integrity_mismatch');
    }
    if (sourceCorrespondence) {
        sourceBoundFields = sourceBoundedFields(definition!);
        // Use the existing Product projection only when it still agrees with
        // the source Definition. Changed live configuration remains a semantic
        // refusal, not an invented historical authentication hash.
        if (sourceBoundFields && snapshot.authentication
            && same(omit(snapshot.authentication, 'schemaVersion', 'identityHash'), definition!.authenticationExpectation))
            sourceBoundFields.authenticationExpectationIdentityHash = snapshot.authentication.identityHash;
    }
    const sourceAuthority = snapshot.sourceAuthority;
    if (snapshot.sourceModelRowId !== request.source.modelRowId || snapshot.sourceModel.app.name !== request.projectId
        || snapshot.sourceModel.app.modelVersion !== request.source.modelVersion
        || !sourceAuthority || sourceAuthority.projectId !== request.projectId || sourceAuthority.modelRowId !== request.source.modelRowId
        || sourceAuthority.modelVersion !== request.source.modelVersion || sourceAuthority.observationRunId !== request.source.observationRunId
        || sourceAuthority.supportSealHash !== request.source.supportSealHash
        || !same(sourceAuthority.characterizationPolicy, request.source.characterizationPolicy)
        || !same(sourceAuthority.supportingObservationIds, request.source.supportingObservationIds))
        pending.push('historical_authority_mismatch');
    if ([request.contractVersion, proposal?.schemaVersion].some(value => value !== undefined && value !== REPAIR_PROPOSAL_SCHEMA))
        pending.push('unsupported_contract_version');
    if ([request.repairKind, proposal?.repairKind].some(value => value !== undefined && value !== 'selector_replacement'))
        pending.push('unsupported_repair_kind');
    if (proposal !== undefined && [
        ['proposalId', 'proposalId'], ['proposedAt', 'proposedAt'], ['projectId', 'projectId'],
        ['contractVersion', 'schemaVersion'], ['repairKind', 'repairKind'],
    ].some(([requestKey, proposalKey]) => Object.hasOwn(request, requestKey)
        && (request as unknown as ObjectValue)[requestKey] !== proposal![proposalKey]))
        pending.push('candidate_not_governed');
    // Candidate analysis may supply identity-conflict evidence even when a
    // historical witness is unavailable. It cannot override a pending refusal.
    const source = sources![0];
    const a = enumeratePhysicalEndpointSlots(snapshot.candidateModel).filter(value => value.flow.id === source.flow.id && value.flow.roleId === source.flow.roleId && value.stepPosition === source.stepPosition
        && value.step.stepIndex === source.step.stepIndex && value.source.id === source.source.id
        && value.target.id === source.target.id && value.element.id === source.element.id);
    counts.a = a.length;
    if (!a.length)
        return finish('candidate_not_found');
    if (!candidateSchemaValid)
        return finish('candidate_not_governed');
    const authority = snapshot.candidateAuthority, claimed = request.candidate;
    const authorityValid = authority && authority.projectId === request.projectId && snapshot.candidateModel.app.name === request.projectId
        && authority.modelRowId === snapshot.candidateModelRowId && claimed.modelRowId === snapshot.candidateModelRowId
        && authority.modelVersion === snapshot.candidateModel.app.modelVersion && claimed.modelVersion === authority.modelVersion
        && claimed.modelContentHash === canonicalJsonSha256(snapshot.candidateModel)
        && claimed.observationRunId === authority.observationRunId && claimed.supportSealHash === authority.supportSealHash
        && same(claimed.characterizationPolicy, authority.characterizationPolicy) && same(claimed.supportingObservationIds, authority.supportingObservationIds);
    const b = a.flatMap(strategies).filter(value => authorityValid && value.step.action === 'click' && value.step.grounding === 'observed'
        && value.strategy.type === 'data-test' && safe(value) && value.strategy.value !== source.strategy.value);
    counts.b = b.length;
    if (!b.length)
        return finish('candidate_not_governed');
    // Bind each complete governed endpoint to all of its physical B positions.
    // Declarations must agree, but cannot select or deduplicate C members.
    const requestMembers = b.filter(value => same(request.candidate, endpoint(request, snapshot, value)));
    if (!requestMembers.length)
        return finish('candidate_not_governed');
    if (proposal !== undefined) {
        const proposalMembers = b.filter(value => same(proposal.candidate, endpoint(request, snapshot, value)));
        if (!same(proposal.source, request.source) || proposal.projectId !== request.projectId
            || !proposalMembers.length
            || !same(requestMembers.map(physicalCandidateIdentity), proposalMembers.map(physicalCandidateIdentity)))
            return finish('candidate_not_governed');
    }
    const c = b.filter(value => completeSemantics(request, snapshot, source, value, definition!));
    counts.c = c.length;
    if (!c.length)
        return finish('candidate_semantics_unproven');
    const candidateSetHash = canonicalJsonSha256(c.map(physicalCandidateIdentity));
    if (proposal !== undefined && (proposal.enumeratorVersion !== REPAIR_ENUMERATOR_VERSION
        || proposal.derivedSuccessorCount !== c.length || proposal.candidateSetHash !== candidateSetHash))
        return finish('candidate_semantics_unproven');
    if (c.length > 1)
        return finish('candidate_ambiguous');
    const candidate = endpoint(request, snapshot, c[0]);
    const proposalIdentity = proposal?.proposalId ?? request.proposalId
        ?? generatedRepairProposalIdentity({ projectId: request.projectId, source: request.source, candidate }, candidateSetHash);
    if (!same(request.candidate, candidate) || (proposal !== undefined
        && (!same(proposal.source, request.source) || !same(proposal.candidate, candidate) || proposal.projectId !== request.projectId)))
        return finish('candidate_not_governed', proposalIdentity);
    if (request.source.modelRowId === candidate.modelRowId || request.source.modelContentHash === candidate.modelContentHash
        || request.source.supportSealHash === candidate.supportSealHash)
        return finish('candidate_semantics_unproven', proposalIdentity);
    const sourceFields = sourceBoundedFields(definition!);
    if (!sourceFields)
        return finish('candidate_semantics_unproven', proposalIdentity);
    const boundedSemantics = { ...sourceFields, authenticationExpectationIdentityHash: snapshot.authentication!.identityHash };
    if (proposal !== undefined && !same(proposal.boundedSemantics, boundedSemantics))
        return finish('candidate_semantics_unproven', proposalIdentity);
    if (hasProposal && proposal === undefined)
        return finish('unsupported_contract_version', proposalIdentity);
    const body = { schemaVersion: REPAIR_PROPOSAL_SCHEMA, proposalId: proposalIdentity,
        proposalHash: '0'.repeat(64), repairKind: 'selector_replacement', projectId: request.projectId,
        relationKind: 'human_approved_semantic_successor', source: clone(request.source), candidate: clone(request.candidate), boundedSemantics,
        enumeratorVersion: REPAIR_ENUMERATOR_VERSION, candidateSetHash, derivedSuccessorCount: 1,
        producer: 'deterministic_bounded_correspondence', authorityState: 'proposed_non_authoritative',
        proposedAt: proposal === undefined ? request.proposedAt : proposal.proposedAt };
    try {
        body.proposalHash = repairAuthorityHash('repair_proposals', body);
    }
    catch {
        return finish('integrity_mismatch', proposalIdentity);
    }
    return finish(undefined, proposalIdentity, body, physicalCandidateIdentity(c[0]));
}
