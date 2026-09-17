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
import React from 'react'
import {ApiError} from '../../api/client'
import {repairWorkflowClient,type RepairContext,type RepairView} from '../../api/repairWorkflowClient'

const LABELS:Record<string,string>={approve:'Approve repair',reject:'Reject repair',promote:'Promote approved repair',materialize:'Create repaired revision',repair_rerun:'Run governed repair',compare:'Evaluate repair outcome',resolve_bounded_repair:'Resolve bounded repair',close_unsuccessful:'Close unsuccessful repair',record_inconclusive:'Record manual follow-up',cancel_execution:'Cancel rerun',observe_execution:'Refresh execution'}
const HUMAN=new Set(['approve','reject','resolve_bounded_repair','close_unsuccessful','record_inconclusive'])
const readable=(value:string)=>value.replaceAll('_',' ')
const button='rounded border border-brand px-3 py-2 text-sm font-medium text-brand disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand'

export function RepairWorkflowPanel({project,resultId,entryId,onClose}:{project:string;resultId?:string;entryId?:string;onClose:()=>void}) {
  const [context,setContext]=React.useState<RepairContext|null>(null),[current,setCurrent]=React.useState<RepairView|null>(null)
  const [selected,setSelected]=React.useState<string|null>(null),[actor,setActor]=React.useState('')
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState<unknown>(null),request=React.useRef(0)
  const refresh=React.useCallback(async(requestedEntryId?:string)=>{
    const version=++request.current;setBusy(true);setError(null)
    try {
      const exactEntry=requestedEntryId??entryId
      if(exactEntry&&!resultId) {
        const next=await repairWorkflowClient.read(project,exactEntry)
        if(next.entry.projectId!==project)throw Error('Repair entry belongs to another project.')
        if(version===request.current){setContext(null);setCurrent(next);setSelected(exactEntry)}
        return
      }
      if(!resultId)throw Error('Exact repair identity is unavailable.')
      const loaded=await repairWorkflowClient.context(project,resultId)
      const target=exactEntry??selected??(loaded.kind==='existing'&&loaded.entries.length===1?loaded.entries[0].entryId:null)
      const next=target?await repairWorkflowClient.read(project,target):null
      if(next&&next.entry.originalEvidence.resultId!==resultId)throw Error('Repair entry belongs to another Result.')
      if(version===request.current){setContext(loaded);setCurrent(next)}
    } catch(cause) {if(version===request.current){setError(cause);setCurrent(null)}}
    finally {if(version===request.current)setBusy(false)}
  },[project,resultId,entryId,selected])
  React.useEffect(()=>{setContext(null);setCurrent(null);void refresh();return()=>{request.current++}},[refresh])
  React.useEffect(()=>{
    if(!current?.execution||current.execution.terminal)return
    let active=true,running=false
    const executionId=current.execution.executionId,entryId=current.entry.entryId
    const timer=setInterval(async()=>{if(running)return;running=true;try{await repairWorkflowClient.status(project,executionId);if(active)await refresh(entryId)}catch(cause){if(active)setError(cause)}finally{running=false}},1500)
    return()=>{active=false;clearInterval(timer)}
  },[project,current?.execution?.executionId,current?.execution?.terminal,current?.entry.entryId,refresh])
  async function run(action:string) {
    setBusy(true);setError(null)
    try {
      if(action==='prepare'){await repairWorkflowClient.prepare(project);await refresh();return}
      if(action==='create'&&context?.kind==='eligible') {
        if(!resultId)throw Error('Original Result identity is unavailable.')
        const created=await repairWorkflowClient.create(project,resultId,context.candidateModelRowId);setSelected(created.entryId);await refresh(created.entryId);return
      }
      if(!current)return
      if(action==='repair_rerun') {await repairWorkflowClient.start(project,current);await refresh(current.entry.entryId)}
      else if(action==='observe_execution'){await repairWorkflowClient.status(project,current.execution!.executionId);await refresh(current.entry.entryId)}
      else if(action==='cancel_execution'){await repairWorkflowClient.cancel(project,current.execution!.executionId);await refresh(current.entry.entryId)}
      else setCurrent(await repairWorkflowClient.command(project,current.entry.entryId,action,HUMAN.has(action)?actor:undefined))
    } catch(cause){setError(cause)}finally{setBusy(false)}
  }
  const proposal=current?.proposal??(context?.kind==='eligible'?context.proposal:null)
  const upgrade=error instanceof ApiError&&error.code==='REPAIR_WORKSPACE_UPGRADE_REQUIRED'
  return <section aria-labelledby="repair-heading" className="space-y-4 rounded-lg border border-brand/50 bg-surface p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="repair-heading" className="text-xl font-semibold text-primary">Governed selector repair</h2><p className="mt-1 text-sm text-secondary">Review one bounded repair for the selected failed Result. Every approval and final disposition is an explicit local human decision.</p></div><button className={button} onClick={onClose}>Close repair view</button></div>
    <p className="break-all text-xs text-secondary">Original Result: {resultId??current?.entry.originalEvidence.resultId??'Reading exact repair entry…'}</p>
    {error!==null&&<div role="alert" className="rounded border border-fail/50 p-3 text-sm text-fail">{error instanceof Error?error.message:'Repair evidence is unavailable.'}{upgrade&&<div className="mt-2"><p>Prepare this selected workspace using the guarded Product schema upgrade. This does not approve a repair.</p><button className={button} disabled={busy} onClick={()=>void run('prepare')}>Prepare repair workspace</button></div>}</div>}
    {busy&&<p role="status" aria-live="polite" className="text-sm text-secondary">Reading or recording canonical repair evidence…</p>}
    {context?.kind==='existing'&&context.entries.length>1&&<div className="space-y-2"><p>Select existing repair work:</p>{context.entries.map(e=><button key={e.entryId} className={button} onClick={()=>setSelected(e.entryId)}>Review {e.request.source.selector.value} → {e.request.candidate.selector.value}</button>)}</div>}
    {proposal&&<div className="grid gap-3 sm:grid-cols-2">{(['source','candidate'] as const).map(side=><div key={side} className="rounded border border-border bg-elevated p-3"><h3 className="font-semibold text-primary">{side==='source'?'Original selector':'Proposed selector'}</h3><p className="my-2 break-all font-mono text-sm text-primary">{proposal[side].selector.value}</p><p className="text-xs text-secondary">App Model {proposal[side].modelVersion} · row {proposal[side].modelRowId}</p><p className="mt-1 text-xs text-secondary">{proposal[side].sourceSubjectId} → {proposal[side].targetSubjectId}</p></div>)}</div>}
    {context?.kind==='eligible'&&!current&&<div><p className="mb-3 text-sm text-secondary">Bounded evidence identifies {context.counts.c} eligible correspondence. This proposal carries no human approval.</p><button className={button} disabled={busy} onClick={()=>void run('create')}>Create repair proposal</button></div>}
    {current&&<>
      {current.operationReadiness.state==='refused'&&<p role="status" className="rounded border border-flaky/50 p-3 text-sm text-secondary">New operations unavailable: {readable(current.operationReadiness.code??'candidate unavailable')}. Existing historical evidence remains visible.</p>}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Human proposal decision</dt><dd className="text-primary">{current.decision?`${readable(current.decision.decision)} by ${current.decision.decidedBy.actorId}`:'Awaiting explicit review'}</dd></div>
        <div><dt className="text-muted">Repaired revision</dt><dd className="text-primary">{current.origin?`Revision ${current.origin.resultingDefinitionAuthority.testSetRevision}`:'Not materialized'}</dd></div>
        <div><dt className="text-muted">Rerun overall Result</dt><dd data-testid="repair-overall-result" className="text-primary">{current.execution?.result?readable(current.execution.result.status):current.execution?'No Result observed':'Not run'}</dd></div>
        <div><dt className="text-muted">Bounded selector effectiveness</dt><dd data-testid="repair-effectiveness" className="text-primary">{current.comparison?.state??(current.execution&&!current.execution.terminal?'Execution pending — no committed comparison':'Not evaluated')}</dd></div>
        <div><dt className="text-muted">Final human disposition</dt><dd data-testid="repair-disposition" className="text-primary">{current.disposition?readable(current.disposition.state):'Not recorded'}</dd></div>
      </dl>
      {current.comparison&&<p className="text-sm text-secondary">{readable(current.comparison.reason)}. Bounded selector effectiveness does not override the overall test Result.</p>}
      {current.nextActions.some(a=>HUMAN.has(a))&&<label className="block text-sm text-primary">Local human operator<input className="mt-1 block w-full max-w-sm rounded border border-border bg-elevated p-2" value={actor} onChange={e=>setActor(e.target.value)} placeholder="Your operator identifier" autoComplete="off" /><span className="mt-1 block text-xs text-secondary">Your explicit action records this trusted-local human declaration.</span></label>}
      <div className="flex flex-wrap gap-2">{current.nextActions.map(action=><button key={action} className={button} disabled={busy||(HUMAN.has(action)&&!actor.trim())} onClick={()=>void run(action)}>{LABELS[action]??readable(action)}</button>)}<button className={button} disabled={busy} onClick={()=>void refresh(current.entry.entryId)}>Refresh repair history</button></div>
      <details className="rounded border border-border p-3"><summary className="cursor-pointer font-semibold text-primary">Canonical repair history and provenance</summary><ol className="mt-3 space-y-2 break-all text-xs text-secondary"><li>Original Result: {current.entry.originalEvidence.resultId}</li><li>Proposal: {current.entry.proposalId}</li><li>Decision: {current.decision?.decisionId??'Not recorded'}</li><li>Supersession: {current.supersession?.authorityId??'Not promoted'}</li><li>Repair origin: {current.origin?.repairOriginId??'Not materialized'}</li><li>Rerun: {current.execution?.executionId??'Not accepted'}</li><li>Comparison: {current.comparison?.comparisonId??'Not committed'}</li><li>Disposition: {current.disposition?.dispositionId??'Not recorded'}</li></ol></details>
    </>}
    {!current&&<button className={button} disabled={busy} onClick={()=>void refresh()}>Refresh repair context</button>}
  </section>
}
