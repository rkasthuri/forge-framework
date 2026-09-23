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
import type { StorageOperationalReadinessResponse, StorageReadinessStatus } from '../../api/types'

const STATUS_STYLE: Record<StorageReadinessStatus, string> = {
  READY: 'border-pass/40 text-pass', BLOCKED: 'border-fail/40 text-fail',
  UNKNOWN: 'border-unknown/40 text-unknown', NOT_APPLICABLE: 'border-border text-muted',
}

function ExactTime({ value }: { value: string }) {
  return <time dateTime={value} title={value}>{new Date(value).toLocaleString()}</time>
}

export function StorageOperationalReadiness({ readModel }: { readModel: StorageOperationalReadinessResponse }) {
  const dimensions = Object.values(readModel.dimensions)
  return <div className="space-y-6" data-testid="storage-operational-readiness">
    <header>
      <p className="text-xs uppercase tracking-[0.18em] text-brand">Storage Operational Readiness</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold text-primary">Selected workspace assessment</h2><span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_STYLE[readModel.aggregate.status]}`}>{readModel.aggregate.status}</span></div>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-secondary">A source-bound composition of existing storage evidence. It does not migrate, repair, schedule, or perform live cutover.</p>
      <p className="mt-2 text-xs text-muted">Assessed <ExactTime value={readModel.assessedAt} /> · {readModel.aggregate.explanation}</p>
    </header>

    <section aria-labelledby="storage-authority" className="rounded-lg border border-border bg-surface p-4">
      <h3 id="storage-authority" className="text-lg font-semibold text-primary">Selected authority</h3>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded border border-border bg-elevated p-3"><dt className="text-muted">Project and workspace</dt><dd className="mt-1 break-all text-secondary">{readModel.selectedProject ?? 'Not selected'}<br />{readModel.resolvedWorkspace ?? 'Not resolved'}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="text-muted">Canonical storage</dt><dd className="mt-1 break-all text-secondary">{readModel.storage.backend}<br />{readModel.storage.canonicalDatabasePath ?? 'Not resolved'}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="text-muted">Migration and sidecars</dt><dd className="mt-1 text-secondary">{readModel.storage.migration.current ?? 'Unrecognized'} ({readModel.storage.migration.count})<br />WAL: {readModel.storage.sidecars.wal} · SHM: {readModel.storage.sidecars.shm}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="text-muted">Evidence binding</dt><dd className="mt-1 break-all text-secondary">{readModel.sourceBinding.state} · {readModel.sourceBinding.authorityClassification ?? 'No approved checkpoint'}<br />{readModel.sourceBinding.evidenceId ?? 'No certification evidence'}<br />Merge: {readModel.sourceBinding.mergeCommit ?? 'unknown'}<br />Frozen checkpoint: <span className="text-xs text-muted">{readModel.sourceBinding.frozenCheckpointSha256 ?? 'unknown'}</span><br />Manifest: <span className="text-xs text-muted">{readModel.sourceBinding.evidenceSha256 ?? 'unknown'}</span><br />Capture source: <span className="text-xs text-muted">{readModel.sourceBinding.captureProductSourceSha}/{readModel.sourceBinding.captureProductSourceSnapshotSha256}</span></dd></div>
      </dl>
    </section>

    <section aria-labelledby="storage-evidence-detail" className="rounded-lg border border-border bg-surface p-4">
      <h3 id="storage-evidence-detail" className="text-lg font-semibold text-primary">Bound evidence detail</h3>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-border bg-elevated p-3"><dt className="font-medium text-primary">Preservation</dt><dd className="mt-1 text-secondary">Boundary: {readModel.preservationEvidence.sourceBoundary}<br />Quiescence: {readModel.preservationEvidence.quiescence}<br />Stability: {readModel.preservationEvidence.sourceStability}<br />Authoritative mutation: {String(readModel.preservationEvidence.authoritativeContentMutation)}<br />Raw: {readModel.preservationEvidence.rawPreservation} · logical: {readModel.preservationEvidence.logicalSnapshot}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="font-medium text-primary">SQLite integrity</dt><dd className="mt-1 text-secondary">quick_check: {readModel.integrityEvidence.quickCheck ?? 'unknown'}<br />integrity_check: {readModel.integrityEvidence.integrityCheck ?? 'unknown'}<br />Foreign-key rows: {readModel.integrityEvidence.foreignKeyViolationCount ?? 'unknown'}<br />Reopen stable: {String(readModel.integrityEvidence.reopenReadStable)}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="font-medium text-primary">Disposable upgrade</dt><dd className="mt-1 text-secondary">{readModel.upgradeEvidence.sourceMigration ?? 'unknown'} → {readModel.upgradeEvidence.targetMigration ?? 'unknown'}<br />Independent passes: {readModel.upgradeEvidence.independentPasses}<br />Rollback/refusal: {readModel.upgradeEvidence.rollbackAndRefusal}</dd></div>
        <div className="rounded border border-border bg-elevated p-3"><dt className="font-medium text-primary">Historical Product reads</dt><dd className="mt-1 text-secondary">Result context: {readModel.productReadEvidence.resultContext}<br />App Models: {readModel.productReadEvidence.appModelHistory}<br />Observations: {readModel.productReadEvidence.observationHistory}<br />Evidence Workspace: {readModel.productReadEvidence.evidenceWorkspaceProjectContext}/{readModel.productReadEvidence.evidenceWorkspaceResultContext}</dd></div>
      </dl>
    </section>

    <section aria-labelledby="storage-dimensions">
      <h3 id="storage-dimensions" className="text-xl font-semibold text-primary">Readiness dimensions</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">{dimensions.map(item => <article key={item.id} className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-primary">{item.label}</h4><p className="mt-1 text-xs text-muted">{item.classification}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>{item.status.replace('_', ' ')}</span></div>
        <p className="mt-3 text-sm leading-6 text-secondary">{item.explanation}</p>
        {item.blockers.length > 0 && <p className="mt-3 text-sm text-fail"><strong>Blocks:</strong> {item.blockers.join('; ')}</p>}
        {item.limitations.length > 0 && <p className="mt-3 text-sm text-unknown"><strong>Limitations:</strong> {item.limitations.join('; ')}</p>}
        {item.evidence.length > 0 && <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">Evidence identity</summary>{item.evidence.map(ref => <p key={`${ref.owner}-${ref.identity}`} className="mt-1 break-all">{ref.owner}: {ref.identity}</p>)}</details>}
      </article>)}</div>
    </section>

    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold text-primary">Historical truth and next action</h3>
      <p className="mt-2 text-sm text-secondary"><strong>Historical invalidity:</strong> {readModel.historicalState.invalidClassification ?? 'Not asserted'} — {readModel.historicalState.explanation}</p>
      <p className="mt-2 text-sm text-secondary"><strong>Repair lineage:</strong> {readModel.historicalState.repairContext ?? 'Unknown'}</p>
      <p className="mt-3 rounded border border-border bg-elevated p-3 text-sm text-secondary"><strong className="text-primary">Safest non-mutating next action:</strong> {readModel.safeNextAction}</p>
    </section>
  </div>
}
