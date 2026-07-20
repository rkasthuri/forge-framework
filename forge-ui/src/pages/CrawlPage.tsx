/**
 * FORGE — Autonomous Quality Engineering
 * Framework for Observed, Reasoned, and
 * Grounded Evaluation
 *
 * Copyright (c) 2026 AnvilQ Technologies LLC
 * Author: Raj Kasthuri
 *
 * Proprietary and confidential.
 * Unauthorized copying, distribution, or
 * modification of this software is strictly
 * prohibited.
 */

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Play, CheckCircle2, XCircle, ArrowUpDown, ShieldCheck } from 'lucide-react'
import { useCrawl, useCrawlStatus, useAuthenticate } from '../hooks/useApi'
import { apiClient } from '../api/client'
import { ProjectSelector } from '../components/shared/ProjectSelector'
import { MissionTimeline } from '../components/shared/MissionTimeline'
import { CrawlDiagnostics } from '../components/shared/CrawlDiagnostics'

type SortKey = 'urlPattern' | 'elements'

/** Sortable table header cell. */
function SortableTh({ label, col, sortKey, sortAsc, onSort }: {
  label: string
  col: SortKey
  sortKey: SortKey
  sortAsc: boolean
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th className="py-2 pr-3">
      <button onClick={() => onSort(col)} className="flex items-center gap-1 hover:text-secondary">
        {label}
        <ArrowUpDown size={11} className={active ? 'text-brand' : 'opacity-40'} />
      </button>
    </th>
  )
}

export function CrawlPage() {
  const [searchParams] = useSearchParams()
  const appName = searchParams.get('project')

  const crawl = useCrawl()
  const authenticate = useAuthenticate()
  const [jobId, setJobId] = useState<string | null>(null)
  const [force, setForce] = useState(false)
  const [aiBudget, setAiBudget] = useState(150)

  const { data: status } = useCrawlStatus(jobId)

  // TD-UI-022 — mount-time resume: reconnect to an in-flight crawl for this app (below)
  // (runs on mount and on selectedApp change; no-op when no app is selected).
  // 200 → adopt the jobId (useCrawlStatus reconnects); 404 → ready state, no change.
  useEffect(() => {
    if (!appName) return
    let cancelled = false
    apiClient.get<{ jobId: string }>(`/api/v1/projects/${appName}/crawl/active`)
      .then(active => { if (!cancelled && active?.jobId) setJobId(active.jobId) })
      .catch(() => { /* 404 — no active crawl; render the ready state (unchanged) */ })
    return () => { cancelled = true }
  }, [appName])

  // Page table sorting (URL / Elements — depth is not available; audit ruling).
  const [sortKey, setSortKey] = useState<SortKey>('urlPattern')
  const [sortAsc, setSortAsc] = useState(true)
  const sortedPages = useMemo(() => {
    const rows = [...(status?.pages ?? [])].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv))
    })
    return sortAsc ? rows : rows.reverse()
  }, [status?.pages, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function startCrawl() {
    if (!appName) return
    setJobId(null)
    crawl.mutate({ appName, force, aiBudget }, { onSuccess: d => setJobId(d.jobId) })
  }

  const running = crawl.isPending || status?.status === 'running'
  const complete = status?.complete && status.status === 'completed'
  const failed = status?.status === 'failed'
  // ADR-013 — CredentialSlotError recovery: offer [Run Authenticated Bootstrap].
  const slotError = failed && !!status?.error?.includes('Authenticated bootstrap required')

  // Issue #2 — env-var credential hint when the engine logs an unauthenticated run.
  const envPrefix = (appName ?? '').toUpperCase().replace(/-/g, '_')
  const unauthenticated = status?.lines.some(l => l.includes('will run UNAUTHENTICATED')) ?? false

  // No project selected — offer a picker (appName arrives as ?project=<name>).
  if (!appName) {
    return <ProjectSelector title="Crawl" subtitle="Select a project to crawl." basePath="/crawl" />
  }

  return (
    <div className="h-full p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-2">

        {/* LEFT — Mission Timeline + controls */}
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-primary">Crawl — {appName}</h2>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={startCrawl}
              disabled={running}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running ? 'Crawling…' : 'Start Crawl'}
            </button>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={force} disabled={running}
                onChange={e => setForce(e.target.checked)} />
              Force re-crawl
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary">
              AI Budget
              <input type="number" min={0} value={aiBudget} disabled={running}
                onChange={e => setAiBudget(Number(e.target.value))}
                className="w-20 rounded-md border border-border bg-elevated px-2 py-1 text-sm text-primary" />
            </label>
          </div>

          {/* Status line */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            {running && (
              <><Loader2 size={14} className="animate-spin text-brand" />
                <span className="text-secondary">Discovering pages… ({status?.pagesFound ?? 0} found)</span></>
            )}
            {complete && (
              <><CheckCircle2 size={14} className="text-pass" />
                <span className="text-pass">Crawl complete — {status?.pagesFound} pages</span></>
            )}
            {failed && (
              <><XCircle size={14} className="text-fail" />
                <span className="text-fail">Crawl failed: {status?.error ?? 'unknown error'}</span></>
            )}
          </div>

          {/* ADR-013 — authenticated-bootstrap recovery (CredentialSlotError) */}
          {slotError && (
            <div className="mt-3">
              <button
                onClick={() => authenticate.mutate(appName, {
                  onSuccess: d => { if (d.jobId) setJobId(d.jobId); else startCrawl() },
                })}
                disabled={authenticate.isPending}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--brand-primary)' }}
              >
                {authenticate.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Run Authenticated Bootstrap
              </button>
              {authenticate.isError && (
                <p className="mt-2 text-sm text-fail">{(authenticate.error as Error).message}</p>
              )}
            </div>
          )}

          {/* Strategy (Issue #3) — user-friendly label, engine term in tooltip */}
          {status?.strategy && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-secondary">Strategy:</span>
              <span
                className="text-sm font-medium text-primary"
                title={status.strategyRaw ? `engine: ${status.strategyRaw}` : undefined}
              >
                {status.strategy}
              </span>
            </div>
          )}

          {/* Unauthenticated warning (Issue #2) */}
          {unauthenticated && (
            <div className="mt-3 rounded border border-flaky bg-elevated p-3 text-xs text-flaky">
              ⚠️ No credentials set. Set <code className="font-mono">{envPrefix}_USERNAME</code> and{' '}
              <code className="font-mono">{envPrefix}_PASSWORD</code> environment variables for
              authenticated crawls. (Or configure in Settings — TD-UI-009.)
            </div>
          )}

          {/* Mission Timeline — live log lines (LogBuffer, 1s poll) */}
          <div className="mt-4">
            <MissionTimeline
              lines={status?.lines ?? []}
              running={running}
              placeholder={jobId ? 'Starting…' : 'Press Start Crawl to begin.'}
            />
          </div>
        </div>

        {/* RIGHT — Page table (populates after completion) */}
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold text-primary">
            {complete ? `${status?.pagesFound} pages discovered` : 'Pages'}
          </h3>
          {!complete ? (
            <p className="mt-2 text-sm text-muted">
              The page table populates when the crawl completes.
            </p>
          ) : sortedPages.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No pages discovered.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-border">
                    <SortableTh label="URL" col="urlPattern" sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} />
                    <th className="py-2 pr-3">Module</th>
                    <SortableTh label="Elements" col="elements" sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} />
                    <th className="py-2">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPages.map(p => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-2 pr-3 font-mono text-xs text-primary" title={p.url}>{p.urlPattern}</td>
                      <td className="py-2 pr-3 text-secondary">
                        {p.module}
                        {p.moduleConfidence && (
                          <span className="ml-1 text-xs text-muted">({p.moduleConfidence})</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-secondary">{p.elements}</td>
                      <td className="py-2 text-xs text-muted">{p.roles.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* TD-UI-064 — login-surface observations, full-width below the grid, post-completion.
          Empty (clean crawl / no observation) → the component renders nothing. */}
      {complete && (
        <div className="mx-auto mt-6 max-w-6xl">
          <CrawlDiagnostics diagnostics={status?.crawlDiagnostics ?? []} />
        </div>
      )}
    </div>
  )
}
