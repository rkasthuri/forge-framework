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
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { evaluateGovernedRepair, enumeratePhysicalEndpointSlots, physicalCandidateIdentity, REPAIR_REFUSAL_PRECEDENCE, firstRepairRefusal, type RepairProposalRequest, type RepairEvaluationSnapshot, type RepairRefusalCode } from '../src/core/healing/GovernedRepairEligibility'
import { canonicalJsonSha256 } from '../src/core/storage/JsonAppModelMigrationPlanner'
import { materializeCanonicalTestSet } from '../src/core/test-design/TestDefinitionContract'
import { validateAppModelObject } from '../src/core/onboarding/ModelValidator'
import { assertSourceEndpointAuthority } from '../src/core/storage/RepairSourceAuthority'
const load=(name:string):any=>JSON.parse(readFileSync(path.join(__dirname,'../fixtures/m5-contract/positive',name+'.json'),'utf8'))
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v))
type Scenario={request:RepairProposalRequest;snapshot:RepairEvaluationSnapshot}
function fixture():Scenario {
  const proposal=load('proposal'),set=load('source-test-set'),direct=load('direct-materialization'),a=load('repair-revision-link').sourceDefinitionAuthority
  const authority=(e:any)=>({schemaVersion:'forge-test-definition-authority/v2' as const,authorityClass:'canonical_v2' as const,
    projectId:proposal.projectId,modelRowId:e.modelRowId,modelVersion:e.modelVersion,observationRunId:e.observationRunId,
    supportSealHash:e.supportSealHash,characterizationPolicy:e.characterizationPolicy,supportingObservationIds:e.supportingObservationIds,supportingGapIds:[],
    subjectSupport:set.definitions[0].canonicalSubjects.map((id:string,index:number)=>({canonicalSubjectId:id,supportingObservationIds:[e.supportingObservationIds[index]],supportingGapIds:[]}))})
  const s=set.canonicalSupport,m=materializeCanonicalTestSet(set)
  return {request:{projectId:proposal.projectId,sourceDefinitionAuthority:a,source:proposal.source,candidate:proposal.candidate,proposedAt:proposal.proposedAt,proposalId:proposal.proposalId},
    snapshot:{sourceModel:load('source-model'),candidateModel:load('candidate-model'),sourceModelRowId:41,candidateModelRowId:52,
      sourceAuthority:authority(proposal.source),candidateAuthority:authority(proposal.candidate),sourceRoutes:direct.sourceRoutes,candidateRoutes:direct.candidateRoutes,authentication:direct.authenticationExpectation,
      sourceRows:[{id:a.testSetRowId,project_id:set.projectId,test_set_id:set.testSetId,revision:set.revision,schema_version:3,
        model_row_id:s.modelRowId,model_version:s.modelVersion,source_observation_id:null,observation_run_id:s.observationRunId,support_seal_hash:s.supportSealHash,
        characterization_policy_id:s.characterizationPolicy.id,characterization_policy_version:s.characterizationPolicy.version,generation_id:set.generationId,
        generated_at:set.generatedAt,outcome:set.outcome,definition_count:set.definitions.length,payload_json:m.json,content_hash:m.fingerprint}],
      witnesses:[{project_id:set.projectId,execution_id:'historically-accepted',item_ordinal:0,item_definition_id:a.definitionId,
        test_set_row_id:a.testSetRowId,test_set_id:set.testSetId,test_set_revision:set.revision,test_set_content_hash:m.fingerprint,definition_schema_version:3,definition_id:a.definitionId}]}}
}
// Semantic fixtures must declare the updated governed bytes to reach Stage C.
// Mismatch tests mutate the declaration after this prerequisite setup.
function sync(s:Scenario):void {
  const m=s.snapshot.candidateModel,e=s.request.candidate;
  e.modelContentHash=canonicalJsonSha256(m);
  const flow=m.flows?.find(f=>f.id===e.flowId),source=m.pages?.find(p=>p.id===e.sourceSubjectId),target=m.pages?.find(p=>p.id===e.targetSubjectId);
  const element=source?.elements.find(x=>x.id===e.elementId);
  for(const [key,value] of [['flowContentHash',flow],['sourceSubjectContentHash',source],['targetSubjectContentHash',target],['elementContentHash',element]] as const)
    if(value)e[key]=canonicalJsonSha256(value);
}
function refuse(s:Scenario,code:RepairRefusalCode):void {const r=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(r.kind,'refused',JSON.stringify(r));if(r.kind==='refused')assert.equal(r.code,code,JSON.stringify(r))}
function modelCase(name:string,code:RepairRefusalCode,mutate:(m:any,s:Scenario)=>void):void {test(name,()=>{const s=fixture();mutate(s.snapshot.candidateModel,s);sync(s);refuse(s,code)})}
function caseOf(name:string,code:RepairRefusalCode,mutate:(s:Scenario)=>void):void {test(name,()=>{const s=fixture();mutate(s);refuse(s,code)})}
test('exact frozen fixture constructs the exact non-authoritative proposal',()=>{const s=fixture();const r=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(r.kind,'eligible',JSON.stringify(r));if(r.kind==='eligible'){assert.deepEqual(r.proposal,load('proposal'));assert.deepEqual(r.counts,{a:1,b:1,c:1})}})
caseOf('Stage 0 corrupt source bytes','integrity_mismatch',s=>{s.request.source.modelContentHash='f'.repeat(64)})
caseOf('Stage 0 source historical witness absent','historical_authority_mismatch',s=>{s.snapshot.witnesses=[]})
caseOf('Stage 0 wrong contract','unsupported_contract_version',s=>{s.request.contractVersion='v9'})
caseOf('Stage 0 unsupported kind','unsupported_repair_kind',s=>{s.request.repairKind='autonomous'})
caseOf('Stage 0 source endpoint hash corruption','integrity_mismatch',s=>{s.request.source.flowContentHash='f'.repeat(64)})
caseOf('Stage 0 source Product fingerprint corruption','integrity_mismatch',s=>{s.snapshot.sourceRows[0].content_hash='f'.repeat(64)})
caseOf('Stage 0 Definition hash corruption','integrity_mismatch',s=>{s.request.sourceDefinitionAuthority.definitionContentHash='f'.repeat(64)})
caseOf('Stage 0 source support mismatch','historical_authority_mismatch',s=>{s.snapshot.sourceAuthority!.supportSealHash='f'.repeat(64)})
modelCase('Stage A no flow endpoint','candidate_not_found',m=>{m.flows=[]})
modelCase('Stage A wrong source reference','candidate_not_found',m=>{m.flows[0].steps[1].pageId='missing'})
modelCase('Stage A wrong target reference','candidate_not_found',m=>{m.flows[0].steps[1].targetPageId='missing'})
modelCase('Stage A wrong step position','candidate_not_found',m=>{m.flows[0].steps.reverse()})
modelCase('Stage A wrong element reference','candidate_not_found',m=>{m.flows[0].steps[1].elementId='missing'})
modelCase('Stage A wrong role','candidate_not_found',m=>{m.flows[0].roleId='different'})
test('physical duplicate locations remain separate without deduplication',()=>{const s=fixture();s.snapshot.candidateModel.flows!.push(clone(s.snapshot.candidateModel.flows![0]));sync(s);const slots=enumeratePhysicalEndpointSlots(s.snapshot.candidateModel);assert.equal(slots.length,2);assert.deepEqual(slots.map(x=>x.flowPosition),[0,1]);refuse(s,'candidate_ambiguous')})
modelCase('Stage B non-click','candidate_not_governed',m=>{m.flows[0].steps[1].action='navigate'})
modelCase('Stage B non-observed','candidate_not_governed',m=>{m.flows[0].steps[1].grounding='inferred'})
modelCase('Stage B no strategies','candidate_not_governed',m=>{m.pages[0].elements[0].strategies=[]})
modelCase('Stage B non-data-test','candidate_not_governed',m=>{m.pages[0].elements[0].strategies[0].type='css'})
modelCase('Stage B empty value','candidate_not_governed',m=>{m.pages[0].elements[0].strategies[0].value=''})
modelCase('Stage B secret selector','candidate_not_governed',m=>{m.pages[0].elements[0].strategies[0].value='checkout-secret'})
modelCase('Stage B unchanged selector','candidate_not_governed',m=>{m.pages[0].elements[0].strategies[0].value='checkout-old'})
for(const key of ['modelRowId','modelVersion','modelContentHash','supportSealHash','observationRunId'] as const) caseOf('Stage B wrong '+key,'candidate_not_governed',s=>{s.request.candidate[key]=key==='modelRowId'?99:key.endsWith('Hash')?'f'.repeat(64):'wrong'})
caseOf('Stage B wrong policy','candidate_not_governed',s=>{s.request.candidate.characterizationPolicy={id:'wrong',version:'1'}})
caseOf('Stage B wrong observations','candidate_not_governed',s=>{s.request.candidate.supportingObservationIds=['unrelated']})
modelCase('identical selectors in distinct strategy positions are ambiguous','candidate_ambiguous',m=>{m.pages[0].elements[0].strategies.push(clone(m.pages[0].elements[0].strategies[0]))})
modelCase('two eligible different data-test strategies are ambiguous','candidate_ambiguous',m=>{m.pages[0].elements[0].strategies.push({type:'data-test',value:'another-checkout',confidence:1})})
modelCase('Stage C route drift','candidate_semantics_unproven',m=>{m.pages[0].urlPattern='/different'})
modelCase('Stage C source semantics drift','candidate_semantics_unproven',m=>{m.pages[0].displayName='Different'})
modelCase('Stage C target semantics drift','candidate_semantics_unproven',m=>{m.pages[1].displayName='Different'})
modelCase('Stage C element semantics drift','candidate_semantics_unproven',m=>{m.pages[0].elements[0].label='Different'})
modelCase('Stage C unrelated selector drift','candidate_semantics_unproven',m=>{m.pages[0].elements[0].strategies.push({type:'css',value:'.different',confidence:1})})
modelCase('Stage C unrelated flow-step drift','candidate_semantics_unproven',m=>{m.flows[0].steps[0].description='Different'})
modelCase('Stage C app-area drift','candidate_semantics_unproven',m=>{m.pages[0].module.name='Different'})
caseOf('Stage C auth drift','candidate_semantics_unproven',s=>{s.snapshot.authentication={...s.snapshot.authentication!,state:'not_required',mechanism:null}})
caseOf('Stage C route authority unavailable','candidate_semantics_unproven',s=>{s.snapshot.candidateRoutes=null})
caseOf('Stage C production normalization refusal','candidate_semantics_unproven',s=>{s.snapshot.authentication={...s.snapshot.authentication!,state:'unknown',mechanism:null}})
for(const [key,value,code] of [['enumeratorVersion','wrong','candidate_semantics_unproven'],['derivedSuccessorCount',2,'candidate_semantics_unproven'],['candidateSetHash','f'.repeat(64),'candidate_semantics_unproven']] as const) caseOf('proposal wrong '+key,code,s=>{s.request.proposal=load('proposal');s.request.proposal![key]=value;const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)})
caseOf('proposal binds a different endpoint','candidate_not_governed',s=>{s.request.proposal=load('proposal');s.request.proposal!.candidate.selector.value='other';const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)})
for(const nested of ['top','source','selector','definition','proposal'])caseOf('unknown '+nested+' field refuses',nested==='proposal'?'unsupported_contract_version':'integrity_mismatch',s=>{const obj=nested==='top'?s.request:nested==='source'?s.request.source:nested==='selector'?s.request.source.selector:nested==='definition'?s.request.sourceDefinitionAuthority:(s.request.proposal=load('proposal'));(obj as any).unknown='forbidden'})
caseOf('non-enumerable field refuses before projection','integrity_mismatch',s=>{Object.defineProperty(s.request.source,'hidden',{value:1})})
test('exact proposal supplied to evaluator re-verifies identically',()=>{const s=fixture();s.request.proposal=load('proposal');const a=evaluateGovernedRepair(s.request,s.snapshot),b=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(a.kind,'eligible',JSON.stringify(a));assert.deepEqual(a,b)})
for(let i=0;i<REPAIR_REFUSAL_PRECEDENCE.length;i++)test('precedence resolver '+REPAIR_REFUSAL_PRECEDENCE[i],()=>{assert.equal(firstRepairRefusal([...REPAIR_REFUSAL_PRECEDENCE.slice(i)].reverse()),REPAIR_REFUSAL_PRECEDENCE[i])})
caseOf('integrity masks historical/version/kind/candidate failures','integrity_mismatch',s=>{s.request.source.flowContentHash='f'.repeat(64);s.snapshot.witnesses=[];s.request.contractVersion='v9';s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]})
caseOf('historical masks version/kind/candidate failures','historical_authority_mismatch',s=>{s.snapshot.witnesses=[];s.request.contractVersion='v9';s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]})
caseOf('version masks kind/candidate failures','unsupported_contract_version',s=>{s.request.contractVersion='v9';s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]})
caseOf('kind masks candidate failures','unsupported_repair_kind',s=>{s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]})

modelCase('Stage C changed role preconditions','candidate_semantics_unproven',m=>{m.roles[0].authFlow='oauth'})
modelCase('Stage C unestablished authentication','candidate_semantics_unproven',m=>{m.roles[0].authOutcome='failed'})
modelCase('Stage C role authorization drift','candidate_semantics_unproven',m=>{m.roles[0].restrictedPageIds=['checkout-html']})
for(const field of ['preconditionIdentityHash','oracleIdentityHash','authenticationExpectationIdentityHash'])caseOf('proposal '+field+' mismatch','candidate_semantics_unproven',s=>{
  s.request.proposal=load('proposal');s.request.proposal!.boundedSemantics[field]='f'.repeat(64)
  const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)
})
for(const [name,mutate] of [
  ['source pages',(m:any)=>m.pages.push(clone(m.pages[0]))],
  ['target pages',(m:any)=>m.pages.push(clone(m.pages[1]))],
] as const)modelCase('duplicate physical '+name+' stay ambiguous','candidate_ambiguous',mutate)
caseOf('proposal malformed audit object refuses before hashing','unsupported_contract_version',s=>{s.request.proposal=load('proposal');s.request.proposal!.enumeratorVersion={unknown:'hidden'}})
caseOf('unknown nested candidate policy refuses','integrity_mismatch',s=>{s.request.candidate.characterizationPolicy.unknown=1})
caseOf('symbol authority field refuses','integrity_mismatch',s=>{s.request.source[Symbol('unknown') as any]=1})
caseOf('getter authority field refuses without invoking it','integrity_mismatch',s=>{Object.defineProperty(s.request.source,'selector',{enumerable:true,get(){throw Error('must not invoke')}})})
caseOf('invalid proposedAt masks missing candidates','integrity_mismatch',s=>{s.request.proposedAt='invalid';s.snapshot.candidateModel.flows=[]})
caseOf('unknown candidate authority cannot be hidden by unsupported kind','integrity_mismatch',s=>{s.request.candidate.unknown=1;s.request.repairKind='wrong'})
caseOf('source exact historical row identity mismatch','historical_authority_mismatch',s=>{s.snapshot.sourceRows[0].id=999})
caseOf('source execution witness contradicts valid source','historical_authority_mismatch',s=>{s.snapshot.witnesses[0].test_set_content_hash='f'.repeat(64)})
caseOf('source well-formed independent witness from another project','historical_authority_mismatch',s=>{s.snapshot.witnesses[0].project_id='other'})
caseOf('source self-consistent rehashed corruption cannot replace independent witness','historical_authority_mismatch',s=>{
  const row=s.snapshot.sourceRows[0],set=JSON.parse(row.payload_json);set.generatedAt='2026-09-02T12:00:00.000Z'
  const m=materializeCanonicalTestSet(set);Object.assign(row,{payload_json:m.json,content_hash:m.fingerprint,generated_at:set.generatedAt})
  s.request.sourceDefinitionAuthority.testSetContentHash=m.fingerprint
})
test('multiple exact independent witnesses are allowed',()=>{const s=fixture();s.snapshot.witnesses.push({...s.snapshot.witnesses[0],execution_id:'another-execution'});assert.equal(evaluateGovernedRepair(s.request,s.snapshot).kind,'eligible')})
modelCase('Stage A absence masks bad governed strategy and semantics','candidate_not_found',m=>{m.flows[0].steps[1].targetPageId='missing';m.pages[0].elements[0].strategies=[];m.pages[0].displayName='drift'})
modelCase('Stage B absence masks semantic drift and duplicate slots','candidate_not_governed',m=>{m.pages[0].elements[0].strategies=[];m.pages[0].displayName='drift';m.flows.push(clone(m.flows[0]))})
modelCase('Stage C semantic failure masks physical multiplicity','candidate_semantics_unproven',m=>{m.pages[0].displayName='drift';m.flows.push(clone(m.flows[0]))})
caseOf('proposal mismatch masks enumerator mismatch','candidate_not_governed',s=>{s.request.proposal=load('proposal');s.request.proposal!.candidate.selector.value='other';s.request.proposal!.candidateSetHash='f'.repeat(64);const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)})
test('without explicit identity proposal construction is deterministic',()=>{const s=fixture();delete s.request.proposalId;const a=evaluateGovernedRepair(s.request,s.snapshot),b=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(a.kind,'eligible');assert.deepEqual(a,b)})

test('duplicate elements remain separate in A/B and fail complete page semantics',()=>{const s=fixture();s.snapshot.candidateModel.pages![0].elements.push(clone(s.snapshot.candidateModel.pages![0].elements[0]));sync(s);const r=evaluateGovernedRepair(s.request,s.snapshot);assert.deepEqual(r,{kind:'refused',code:'candidate_semantics_unproven',counts:{a:2,b:2,c:0}})})

test('source-only rebound enforces fixed component schemas without trusting its caller',()=>{
  const s=fixture()
  assertSourceEndpointAuthority(s.request.projectId,s.request.sourceDefinitionAuthority,s.request.source,{source:s.snapshot.sourceRows,witnesses:s.snapshot.witnesses})
  for(const target of ['endpoint','selector','definition'] as const){
    const hostile=fixture()
    const object=target==='endpoint'?hostile.request.source:target==='selector'?hostile.request.source.selector:hostile.request.sourceDefinitionAuthority
    object.unknown='forbidden'
    assert.throws(()=>assertSourceEndpointAuthority(hostile.request.projectId,hostile.request.sourceDefinitionAuthority,hostile.request.source,
      {source:hostile.snapshot.sourceRows,witnesses:hostile.snapshot.witnesses}),/Stage A/)
  }
})

caseOf('request version cannot override an unsupported proposal schema','unsupported_contract_version',s=>{
  s.request.contractVersion='forge.m5.transition-correspondence-proposal/v1'
  s.request.proposal=load('proposal');s.request.proposal!.schemaVersion='forge.m5.transition-correspondence-proposal/v9'
  const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)
})
caseOf('request kind cannot override an unsupported proposal repair kind','unsupported_repair_kind',s=>{
  s.request.repairKind='selector_replacement'
  s.request.proposal=load('proposal');s.request.proposal!.repairKind='autonomous'
  const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)
})

caseOf('WORK P2-1 candidate flow hash must not be substituted','candidate_not_governed',s=>{s.request.candidate.flowContentHash='f'.repeat(64)})
caseOf('WORK P2-3 internally contradictory source row is integrity failure','integrity_mismatch',s=>{s.snapshot.sourceRows[0].model_version='wrong-row-version'})

const endpointChanges:[string, any][]=[["modelRowId",999],["modelVersion","9.0.0"],["modelContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["observationRunId","other-run"],["supportSealHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["characterizationPolicy",{"id":"other-policy","version":"1"}],["supportingObservationIds",["other-observation"]],["flowId","other-flow"],["flowContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["stepIndex",99],["action","navigate"],["grounding","inferred"],["sourceSubjectId","other-source"],["sourceSubjectContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["elementId","other-element"],["elementContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],["selector.kind","css"],["selector.value","other-selector"],["targetSubjectId","other-target"],["targetSubjectContentHash","ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"]]
for(const [field,value] of endpointChanges)caseOf('P2-1 complete candidate comparison: '+field,'candidate_not_governed',s=>{
  const keys=field.split('.'),target=keys.length===1?s.request.candidate:s.request.candidate[keys[0]]
  target[keys[keys.length-1]]=clone(value)
})
for(const [name,value] of [['false',false],['zero',0],['empty string',''],['null',null],['array',[]],['malformed object',{}]] as const){
  caseOf('P2-2 present '+name+' is unsupported contract','unsupported_contract_version',s=>{(s.request as any).proposal=value})
  caseOf('P2-2 historical failure masks present '+name,'historical_authority_mismatch',s=>{(s.request as any).proposal=value;s.snapshot.witnesses=[];s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]})
  caseOf('P2-2 internal integrity masks present '+name,'integrity_mismatch',s=>{(s.request as any).proposal=value;s.snapshot.sourceRows[0].definition_count=99;s.snapshot.witnesses=[]})
}
const internalRowChanges:[string,any][]=[
  ['project_id','other-project'],['test_set_id','other-set'],['revision',99],['schema_version',2],['model_row_id',99],
  ['model_version','wrong'],['source_observation_id','unexpected'],['observation_run_id','wrong'],['support_seal_hash','f'.repeat(64)],
  ['characterization_policy_id','wrong'],['characterization_policy_version','wrong'],['generation_id','wrong'],
  ['generated_at','2026-09-04T12:00:00.000Z'],['outcome','refused'],['definition_count',99],
  ['payload_json','{broken'],['content_hash','f'.repeat(64)]
]
for(const [field,value] of internalRowChanges)caseOf('P2-3 internal '+field+' masks missing history','integrity_mismatch',s=>{
  s.snapshot.sourceRows[0][field]=value;s.snapshot.witnesses=[]
})
for(const stage of ['A','B','C'])caseOf('P2-3 internal source corruption masks candidate Stage '+stage,'integrity_mismatch',s=>{
  s.snapshot.sourceRows[0].model_version='contradictory'
  if(stage==='A')s.snapshot.candidateModel.flows=[]
  if(stage==='B')s.snapshot.candidateModel.pages![0].elements[0].strategies=[]
  if(stage==='C')s.snapshot.candidateModel.pages![0].displayName='drift'
  sync(s)
})
caseOf('P2-3 nominated Definition absent is internal integrity','integrity_mismatch',s=>{s.request.sourceDefinitionAuthority.definitionId='missing-definition';s.snapshot.witnesses=[]})
caseOf('P2-3 internally valid claimed revision mismatch is historical','historical_authority_mismatch',s=>{s.request.sourceDefinitionAuthority.testSetRevision=99})
caseOf('precedence: schema-invalid proposal masks unsupported kind and absent candidate','unsupported_contract_version',s=>{
  (s.request as any).proposal=false;s.request.repairKind='wrong';s.snapshot.candidateModel.flows=[]
})
test('NOVA: contract-valid unresolved references exclude the slot',()=>{
  const s=fixture();s.snapshot.candidateModel.flows![0].steps[1].targetPageId='unresolved'
  assert.equal(validateAppModelObject(s.snapshot.candidateModel).valid,true)
  sync(s);const r=evaluateGovernedRepair(s.request,s.snapshot)
  assert.deepEqual(r,{kind:'refused',code:'candidate_not_found',counts:{a:0,b:0,c:0}})
})
test('NOVA: production-invalid malformed reference is Stage 0 integrity',()=>{
  const s=fixture();(s.snapshot.candidateModel.flows![0].steps[1] as any).pageId={id:'cart-html'}
  assert.equal(validateAppModelObject(s.snapshot.candidateModel).valid,false)
  sync(s);s.snapshot.witnesses=[];s.request.contractVersion='wrong'
  refuse(s,'integrity_mismatch')
})
test('NOVA: candidate element position need not equal source physical position in A',()=>{
  const s=fixture();const unrelated=clone(s.snapshot.candidateModel.pages![0].elements[0]);unrelated.id='unrelated-element'
  s.snapshot.candidateModel.pages![0].elements.unshift(unrelated);sync(s)
  const slots=enumeratePhysicalEndpointSlots(s.snapshot.candidateModel)
  assert.equal(slots.length,1);assert.equal(slots[0].elementPosition,1)
  const r=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(r.counts.a,1);assert.equal(r.counts.b,1)
  // Extra page content fails complete semantics; position is not an A predicate.
  assert.equal(r.kind,'refused');if(r.kind==='refused')assert.equal(r.code,'candidate_semantics_unproven')
})

test('NOVA: distinct physical elements in duplicate page slots remain complete ambiguous candidates',()=>{
  const s=fixture();s.snapshot.candidateModel.pages!.push(clone(s.snapshot.candidateModel.pages![0]));sync(s)
  const slots=enumeratePhysicalEndpointSlots(s.snapshot.candidateModel)
  assert.equal(slots.length,2);assert.notEqual(slots[0].element,slots[1].element)
  assert.notEqual(slots[0].sourcePagePosition,slots[1].sourcePagePosition)
  assert.deepEqual(evaluateGovernedRepair(s.request,s.snapshot),{kind:'refused',code:'candidate_ambiguous',counts:{a:2,b:2,c:2}})
})
for(const field of ['proposalId','proposedAt'] as const){
  caseOf('LATEST B request '+field+' cannot be overridden','candidate_not_governed',s=>{
    s.request.proposal=load('proposal');s.request[field]=field==='proposalId'?'transition-proposal-other':'2026-09-02T12:00:00.000Z'
  })
  caseOf('LATEST B metadata '+field+' mismatch follows source integrity','integrity_mismatch',s=>{
    s.request.proposal=load('proposal');s.request[field]=field==='proposalId'?'transition-proposal-other':'2026-09-02T12:00:00.000Z';s.snapshot.sourceRows[0].content_hash='f'.repeat(64)
  })
  caseOf('LATEST B metadata '+field+' mismatch follows source history','historical_authority_mismatch',s=>{
    s.request.proposal=load('proposal');s.request[field]=field==='proposalId'?'transition-proposal-other':'2026-09-02T12:00:00.000Z';s.snapshot.witnesses=[]
  })
  caseOf('LATEST B metadata '+field+' mismatch follows unsupported contract','unsupported_contract_version',s=>{
    s.request.proposal=load('proposal');s.request[field]=field==='proposalId'?'transition-proposal-other':'2026-09-02T12:00:00.000Z';s.request.contractVersion='wrong'
  })
  caseOf('LATEST B metadata '+field+' mismatch follows unsupported kind','unsupported_repair_kind',s=>{
    s.request.proposal=load('proposal');s.request[field]=field==='proposalId'?'transition-proposal-other':'2026-09-02T12:00:00.000Z';s.request.repairKind='wrong'
  })
}
caseOf('LATEST B proposal project mismatch refuses','candidate_not_governed',s=>{
  s.request.proposal=load('proposal');s.request.proposal!.projectId='other-project';const {proposalHash,...body}=s.request.proposal!;s.request.proposal!.proposalHash=canonicalJsonSha256(body)
})
caseOf('LATEST B request kind cannot be replaced by supplied proposal','unsupported_repair_kind',s=>{s.request.proposal=load('proposal');s.request.repairKind='wrong'})
caseOf('LATEST B duplicated candidate endpoint cannot be replaced','candidate_not_governed',s=>{s.request.proposal=load('proposal');s.request.candidate.flowContentHash='f'.repeat(64)})
for(const field of ['enumeratorVersion','candidateSetHash','derivedSuccessorCount'])caseOf('LATEST B undeclared request '+field+' is rejected, never stripped','integrity_mismatch',s=>{
  s.request.proposal=load('proposal');(s.request as any)[field]=s.request.proposal![field]
})
test('LATEST B absent request ID derives from exact supplied proposal',()=>{
  const s=fixture();s.request.proposal=load('proposal');delete s.request.proposalId
  const r=evaluateGovernedRepair(s.request,s.snapshot);assert.equal(r.kind,'eligible');if(r.kind==='eligible')assert.deepEqual(r.proposal,s.request.proposal)
})
const latestFailures:Record<string,(s:Scenario)=>void>={
  integrity_mismatch:s=>{s.snapshot.sourceRows[0].content_hash='f'.repeat(64)},
  historical_authority_mismatch:s=>{s.snapshot.witnesses=[]},
  unsupported_contract_version:s=>{s.request.contractVersion='wrong'},
  unsupported_repair_kind:s=>{s.request.repairKind='wrong'},
  candidate_not_found:s=>{s.snapshot.candidateModel.flows=[]},
  candidate_not_governed:s=>{s.snapshot.candidateModel.pages![0].elements[0].strategies=[]},
  candidate_semantics_unproven:s=>{s.snapshot.candidateModel.pages![0].displayName='semantic-drift'},
  candidate_ambiguous:s=>{s.snapshot.candidateModel.flows!.push(clone(s.snapshot.candidateModel.flows![0]))},
}
const latestOrder=REPAIR_REFUSAL_PRECEDENCE.filter(code=>code!=='stale_authority')
for(let higher=0;higher<latestOrder.length;higher++)for(let lower=higher+1;lower<latestOrder.length;lower++)
  test('LATEST full behavioral precedence '+latestOrder[higher]+' > '+latestOrder[lower],()=>{
    const s=fixture();latestFailures[latestOrder[lower]](s);latestFailures[latestOrder[higher]](s);sync(s)
    assert.equal(validateAppModelObject(s.snapshot.candidateModel).valid,true)
    refuse(s,latestOrder[higher])
  })
const witnessSemanticCases: [string,(s:Scenario)=>void][] = [
  ['route',s=>{s.snapshot.candidateModel.pages![0].urlPattern='/drift'}],
  ['auth',s=>{s.snapshot.authentication={...s.snapshot.authentication!,state:'unknown',mechanism:null}}],
  ['precondition',s=>{s.snapshot.candidateModel.roles[0].authFlow='oauth'}],
  ['app-area',s=>{s.snapshot.candidateModel.pages![0].module.name='drift'}],
  ['oracle',s=>{s.snapshot.candidateModel.pages![1].displayName='drift'}],
  ['unrelated selector',s=>{s.snapshot.candidateModel.pages![0].elements[0].strategies.push({type:'css',value:'.drift',confidence:1})}],
  ['unrelated step',s=>{s.snapshot.candidateModel.flows![0].steps[0].description='drift'}],
  ['C=0',s=>{s.snapshot.candidateRoutes=null}],
  ['C=2 flows',s=>{s.snapshot.candidateModel.flows!.push(clone(s.snapshot.candidateModel.flows![0]))}],
  ['duplicate physical positions',s=>{s.snapshot.candidateModel.pages![0].elements[0].strategies.push(clone(s.snapshot.candidateModel.pages![0].elements[0].strategies[0]))}],
];
for(const [name,mutate] of witnessSemanticCases)for(const mismatch of [false,true])test('WITNESS P2-2 '+name+' declared '+(mismatch?'nonmember':'member'),()=>{
  const s=fixture();mutate(s);sync(s);
  if(mismatch)s.request.candidate.selector.value='never-enumerated';
  refuse(s,mismatch?'candidate_not_governed':name==='C=2 flows'||name==='duplicate physical positions'?'candidate_ambiguous':'candidate_semantics_unproven');
});
for(const field of ['enumeratorVersion','derivedSuccessorCount','candidateSetHash','exact'])for(const mismatch of [false,true])test('WITNESS P2-3 C=2 '+field+' candidate '+(mismatch?'nonmember':'member'),()=>{
  const s=fixture();s.snapshot.candidateModel.flows!.push(clone(s.snapshot.candidateModel.flows![0]));sync(s);
  const identities=enumeratePhysicalEndpointSlots(s.snapshot.candidateModel).flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>physicalCandidateIdentity({...slot,strategy,strategyPosition})));
  const proposal=load('proposal');proposal.candidate=clone(s.request.candidate);proposal.derivedSuccessorCount=2;proposal.candidateSetHash=canonicalJsonSha256(identities);
  if(field==='enumeratorVersion')proposal.enumeratorVersion='wrong';
  if(field==='derivedSuccessorCount')proposal.derivedSuccessorCount=3;
  if(field==='candidateSetHash')proposal.candidateSetHash='f'.repeat(64);
  if(mismatch)s.request.candidate.selector.value='never-enumerated';
  const {proposalHash,...body}=proposal;proposal.proposalHash=canonicalJsonSha256(body);s.request.proposal=proposal;
  refuse(s,mismatch?'candidate_not_governed':field==='exact'?'candidate_ambiguous':'candidate_semantics_unproven');
});

const bhrCases = [
  ...[0,1,2].flatMap(c=>['XY','XX','ZX','XZ','ZZ','YX'].map(pair=>({c,pair,variant:'standard'}))),
  {c:0,pair:'XY',variant:'same-selector'},
  {c:2,pair:'XX',variant:'physical-duplicates'},
  {c:2,pair:'XY',variant:'wrong-enumerator'},
];
for(const {c,pair,variant} of bhrCases)test('BHR-01 pure '+pair+' C='+c+' '+variant,()=>{
  const s=fixture(),model=s.snapshot.candidateModel;
  const distinctFlows=c===1||variant==='same-selector';
  if(distinctFlows){model.flows!.push(clone(model.flows![0]));model.flows![1].displayName='Different governed flow';}
  else model.pages![0].elements[0].strategies.push({...clone(model.pages![0].elements[0].strategies[0]),value:variant==='physical-duplicates'?'checkout-new':'second-checkout'});
  if(c===0)s.snapshot.candidateRoutes=null;
  sync(s);assert.equal(validateAppModelObject(model).valid,true);
  const x=clone(s.request.candidate),y=clone(x),z=clone(x);
  if(distinctFlows)y.flowContentHash=canonicalJsonSha256(model.flows![1]);else y.selector.value='second-checkout';
  z.selector.value='not-in-stage-b';
  const baseline=evaluateGovernedRepair(s.request,s.snapshot);
  assert.equal(baseline.counts.b,2);assert.equal(baseline.counts.c,c);
  if(c===1)assert.equal(baseline.kind,'eligible');else {assert.equal(baseline.kind,'refused');if(baseline.kind==='refused')assert.equal(baseline.code,c===0?'candidate_semantics_unproven':'candidate_ambiguous');}
  const candidates:{[key:string]:any}={X:x,Y:y,Z:z};
  s.request.candidate=clone(candidates[pair[0]]);
  const proposal=load('proposal');proposal.candidate=clone(candidates[pair[1]]);
  const members=enumeratePhysicalEndpointSlots(model).flatMap(slot=>slot.element.strategies.map((strategy:any,strategyPosition:number)=>({...slot,strategy,strategyPosition})));
  const complete=c===1?members.filter(value=>value.flowPosition===0):members;
  proposal.derivedSuccessorCount=complete.length;proposal.candidateSetHash=canonicalJsonSha256(complete.map(physicalCandidateIdentity));
  if(variant==='wrong-enumerator')proposal.enumeratorVersion='wrong';
  const {proposalHash,...body}=proposal;proposal.proposalHash=canonicalJsonSha256(body);s.request.proposal=proposal;
  if(variant==='same-selector'||c===1){assert.deepEqual(x.selector,y.selector);assert.equal(x.elementId,y.elementId);assert.notEqual(x.flowContentHash,y.flowContentHash);}
  const before=clone(s.request),result=evaluateGovernedRepair(s.request,s.snapshot);assert.deepEqual(s.request,before);
  if(pair==='XX'&&c===1){assert.equal(result.kind,'eligible');if(result.kind==='eligible')assert.deepEqual(result.proposal,proposal);}
  else {assert.equal(result.kind,'refused');if(result.kind==='refused')assert.equal(result.code,pair==='XX'?(c===0?'candidate_semantics_unproven':'candidate_ambiguous'):'candidate_not_governed');}
});
