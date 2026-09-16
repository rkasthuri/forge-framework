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
import {apiClient} from './client'
type RecordValue=Record<string,any>
export interface RepairEntry extends RecordValue {entryId:string;projectId:string;originalEvidence:{resultId:string;executionId:string};request:{source:RecordValue;candidate:RecordValue};proposalId:string}
export interface RepairView extends RecordValue {entry:RepairEntry;proposal:RecordValue;originalResult:RecordValue;decision:RecordValue|null;supersession:RecordValue|null;origin:RecordValue|null;execution:RecordValue|null;comparison:RecordValue|null;disposition:RecordValue|null;nextActions:string[];executionIntentKey:string;operationReadiness:{state:string;code:string|null}}
export type RepairContext={kind:'existing';entries:RepairEntry[]}|{kind:'eligible';candidateModelRowId:number;proposal:RecordValue;counts:{a:number;b:number;c:number};originalResult:RecordValue}
function record(v:unknown):RecordValue {if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Repair evidence response is malformed.');return v as RecordValue}
function entry(v:unknown):RepairEntry {
  const e=record(v);if(typeof e.entryId!=='string'||typeof e.projectId!=='string'||typeof record(e.originalEvidence).resultId!=='string'||typeof e.proposalId!=='string')throw Error('Repair entry identity is unavailable.')
  for(const endpoint of [record(e.request).source,e.request.candidate])if(typeof record(record(endpoint).selector).value!=='string'||typeof endpoint.modelVersion!=='string')throw Error('Repair selector evidence is unavailable.')
  return e as RepairEntry
}
function view(v:unknown):RepairView {
  const value=record(v);entry(value.entry);record(value.proposal);record(value.originalResult);record(value.operationReadiness)
  if(value.integrity!=='valid'||!Array.isArray(value.nextActions)||value.nextActions.some((a:unknown)=>typeof a!=='string')||typeof value.executionIntentKey!=='string')throw Error('Repair authority is unavailable.')
  for(const key of ['decision','supersession','origin','execution','comparison','disposition'])if(value[key]!==null)record(value[key])
  return value as RepairView
}
const base=(project:string)=>'/api/v1/projects/'+encodeURIComponent(project)
export const repairWorkflowClient={
  async context(project:string,resultId:string):Promise<RepairContext> {
    const value=record(await apiClient.get(base(project)+'/results/'+encodeURIComponent(resultId)+'/repair'))
    if(value.kind==='existing'&&Array.isArray(value.entries))return {kind:'existing',entries:value.entries.map(entry)}
    if(value.kind==='eligible'&&Number.isSafeInteger(value.candidateModelRowId)){record(value.proposal);record(value.counts);record(value.originalResult);return value as RepairContext}
    throw Error('Repair eligibility response is malformed.')
  },
  async read(project:string,entryId:string) {return view(await apiClient.get(base(project)+'/repairs/'+encodeURIComponent(entryId)))},
  async create(project:string,resultId:string,candidateModelRowId:number) {
    const value=record(await apiClient.post(base(project)+'/results/'+encodeURIComponent(resultId)+'/repair',{candidateModelRowId}));return entry(value.entry)
  },
  async command(project:string,entryId:string,action:string,actorId?:string) {
    return view(await apiClient.post(base(project)+'/repairs/'+encodeURIComponent(entryId)+'/commands',{action,...(actorId?{actorId}:{})}))
  },
  prepare(project:string) {return apiClient.post(base(project)+'/repair-workspace/prepare',{})},
  start(project:string,current:RepairView) {return apiClient.post(base(project)+'/execution/start',{executionIntentKey:current.executionIntentKey,selection:{kind:'repair_rerun',repairEntryId:current.entry.entryId}})},
  status(project:string,executionId:string) {return apiClient.get(base(project)+'/execution/'+encodeURIComponent(executionId)+'/status')},
  cancel(project:string,executionId:string) {return apiClient.post(base(project)+'/execution/'+encodeURIComponent(executionId)+'/cancel',{})},
}
