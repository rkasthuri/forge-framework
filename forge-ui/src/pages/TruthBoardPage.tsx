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
import { AlertTriangle, Ban, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { EvidenceWorkspaceBlock } from '../api/evidenceWorkspaceContract'
import { ApiError } from '../api/client'
import { ProjectSelector } from '../components/shared/ProjectSelector'
import { useEvidenceWorkspace } from '../hooks/useEvidenceWorkspace'

export function canonicalEvidenceWorkspaceQuery(params: URLSearchParams): URLSearchParams | null {
  const context = params.get('context') ?? 'project'
  const supplied = [...params.keys()].sort()
  const exactKeys = (allowed: string[]) => supplied.every(key => allowed.includes(key))
  const query = new URLSearchParams({ context })
  if (context === 'project') return exactKeys(['project', 'context']) ? query : null
  if (context === 'result') {
    if (!exactKeys(['project', 'context', 'execution', 'run', 'item', 'result'])) return null
    for (const key of ['execution', 'run', 'item', 'result']) {
      const value = params.get(key)
      if (!value) return null
      query.set(key, value)
    }
    return query
  }
  if (context === 'repair') {
    if (!exactKeys(['project', 'context', 'repair'])) return null
    const repair = params.get('repair')
    if (!repair) return null
    query.set('repair', repair)
    return query
  }
  return null
}

const availabilityClass: Record<EvidenceWorkspaceBlock['availability'], string> = {
  available: 'border-pass/40 text-pass', no_evidence: 'border-border text-muted', partial: 'border-flaky/50 text-flaky',
  unavailable: 'border-fail/40 text-fail', refused: 'border-fail/40 text-fail', blocked: 'border-fail/40 text-fail',
  stale: 'border-flaky/50 text-flaky', unknown: 'border-flaky/50 text-flaky', not_evaluated: 'border-border text-muted',
}

export function EvidenceWorkspaceBlockView({ block }: { block: EvidenceWorkspaceBlock }) {
  return <article data-testid={`evidence-block-${block.kind}`} className={`rounded-lg border bg-surface p-4 ${block.role === 'primary' ? 'border-brand/50 ring-1 ring-brand/30' : 'border-border'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{block.kind.replaceAll('_', ' ')}</p><h2 className="mt-1 text-lg font-semibold text-primary">{block.title}</h2></div>
      <div className="flex gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${availabilityClass[block.availability]}`}>{block.availability.replaceAll('_', ' ')}</span><span className="rounded-full border border-border px-2 py-0.5 text-xs text-secondary">integrity: {block.integrity.replaceAll('_', ' ')}</span></div>
    </div>
    {block.claims.length > 0 && <dl className="mt-4 grid gap-3 sm:grid-cols-2">{block.claims.map(item => <div key={item.claimId} className="rounded border border-border bg-elevated p-3"><dt className="text-xs uppercase text-muted">{item.label}</dt><dd className="mt-1 break-words text-sm font-medium text-primary">{item.value === null ? 'Not recorded' : String(item.value)}</dd><dd className="mt-1 text-xs text-muted">Owner: {item.owner}</dd></div>)}</dl>}
    {[...block.blockers, ...block.unknowns, ...block.limitations].length > 0 && <ul className="mt-4 space-y-2 text-sm text-secondary">{block.blockers.map(value => <li key={`blocker-${value}`} className="flex gap-2"><Ban size={16} className="mt-0.5 shrink-0 text-fail" />{value}</li>)}{block.unknowns.map(value => <li key={`unknown-${value}`} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-flaky" />{value}</li>)}{block.limitations.map(value => <li key={`limit-${value}`} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-muted" />{value}</li>)}</ul>}
    {(block.references.length > 0 || block.actions.length > 0) && <div className="mt-4 flex flex-wrap gap-2">{block.references.map((link, index) => link.resolution === 'resolved' && link.href ? <span key={`${link.reference.kind}-${index}`} className="inline-flex flex-col"><a href={link.href} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs font-medium text-brand hover:bg-hover">{link.label ?? `Inspect ${link.reference.kind.replaceAll('_', ' ')}`} <ExternalLink size={13} /></a>{link.reference.kind === 'readiness_evidence' && <span className="mt-1 px-1 text-xs text-muted">Integrity: {link.reference.integrity.replaceAll('_', ' ')} · Freshness: {link.reference.freshness.replaceAll('_', ' ')}</span>}</span> : <span key={`${link.reference.kind}-${index}`} className="rounded border border-fail/40 px-3 py-1.5 text-xs text-fail">Unresolved: {link.reason}</span>)}{block.actions.map(action => <a key={action.actionId} href={action.href} className="rounded bg-brand px-3 py-1.5 text-xs font-medium text-white">{action.label}</a>)}</div>}
  </article>
}

export function TruthBoardPage() {
  const [params] = useSearchParams()
  const project = params.get('project')
  const query = canonicalEvidenceWorkspaceQuery(params)
  const workspace = useEvidenceWorkspace(project, query)
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="evidence-workspace">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Canonical composition view</p><h1 className="mt-1 text-2xl font-semibold text-primary">Evidence Workspace</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Inspect exact canonical evidence, explicit gaps, and owner-supplied next actions for one project context.</p></header>
    {!project && <section className="rounded-lg border border-border bg-surface"><ProjectSelector title="Evidence Workspace" subtitle="Select a project to inspect its canonical evidence." basePath="/truth-board" /></section>}
    {project && !query && <section role="alert" className="rounded-lg border border-fail/40 bg-surface p-5"><h2 className="font-semibold text-primary">Context refused</h2><p className="mt-2 text-sm text-secondary">The requested Evidence Workspace context is incomplete or conflicting. No evidence was substituted.</p></section>}
    {project && query && (workspace.isLoading ? <div role="status" className="flex items-center gap-2 text-secondary"><Loader2 className="animate-spin" size={18} /> Assembling canonical evidence…</div>
      : workspace.isError ? <section role="alert" className="rounded-lg border border-fail/40 bg-surface p-5"><h2 className="font-semibold text-primary">Evidence Workspace unavailable</h2><p className="mt-2 text-sm text-secondary">{workspace.error instanceof ApiError ? workspace.error.message : 'The canonical workspace response could not be validated.'}</p></section>
      : workspace.data && <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-elevated p-3 text-xs text-secondary"><span>Context: <strong className="text-primary">{workspace.data.context.kind}</strong></span><span className="inline-flex items-center gap-1"><ShieldCheck size={14} className="text-pass" /> Server-composed from canonical owners</span></div>
        {workspace.data.sourceFailures.length > 0 && <section role="alert" className="rounded-lg border border-fail/40 bg-surface p-4"><h2 className="font-semibold text-primary">Source failures</h2><ul className="mt-2 space-y-1 text-sm text-secondary">{workspace.data.sourceFailures.map(failure => <li key={`${failure.source}:${failure.code}`}>{failure.source}: {failure.message}</li>)}</ul></section>}
        <div className="grid gap-4 lg:grid-cols-2">{workspace.data.blocks.map(block => <EvidenceWorkspaceBlockView key={block.blockId} block={block} />)}</div>
      </>)}
  </div>
}
