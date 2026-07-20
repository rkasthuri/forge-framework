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

/**
 * TD-UI-064 — renders the engine's TD-148 login-surface observations. The UI RENDERS the
 * engine's text verbatim (values, mechanism, observationBoundary, note); it never AUTHORS
 * text about an observation. UI owns only labels, layout, hierarchy, order.
 *
 * Scope is the login-surface-observation slice: the panel title is specific to it, so the
 * component renders those entries only. Colour is fully neutral — these observations are
 * complete, not insufficient; FORGE is declining to conclude, not failing to (Aiden ruling).
 * No collapse / tooltip / truncation / show-more: nothing is hidden. The four headings —
 * signal name, value, "How observed", "Observation boundary" — must read on their own.
 */
import type { CrawlDiagnostic, LoginSurfaceSignal } from '../../api/types'

/** UI label for each signal (UI owns labels; the value/mechanism/boundary stay verbatim). */
const SIGNAL_LABEL: Record<string, string> = {
  'password-field': 'Password field',
  'app-shape':      'App shape',
  'landing-url':    'Landing URL',
}

/** One observation, as lab-note-style card: bold signal anchor, large value, then the
 *  engine's mechanism and boundary strings verbatim under bold heading anchors. */
function ObservationCard({ obs }: { obs: LoginSurfaceSignal }) {
  const isUrl = obs.signal === 'landing-url'
  return (
    <div>
      <div className="text-sm font-semibold text-primary">{SIGNAL_LABEL[obs.signal] ?? obs.signal}</div>
      <div className={`mt-1 text-base text-primary ${isUrl ? 'font-mono break-all' : ''}`}>{obs.observation}</div>

      <div className="mt-3 text-xs font-semibold text-secondary">How observed</div>
      <div className="mt-1 text-sm text-secondary">{obs.mechanism}</div>

      <div className="mt-3 text-xs font-semibold text-secondary">Observation boundary</div>
      <div className="mt-1 text-xs text-muted">{obs.observationBoundary}</div>
    </div>
  )
}

export function CrawlDiagnostics({ diagnostics }: { diagnostics: CrawlDiagnostic[] }) {
  // Login-surface-observation slice only — the panel title is specific to it.
  const surfaces = diagnostics.filter(d => d.reason === 'login-surface-observation')
  if (surfaces.length === 0) return null   // clean crawl / no observation → render nothing (no positive empty state)

  // The note is a single engine-authored constant shared across entries — render it once.
  const note = surfaces.find(d => d.loginSurfaceObservation?.note)?.loginSurfaceObservation?.note

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold text-primary">Observed During Failed Authentication</h3>

      <div className="mt-4 space-y-6">
        {surfaces.map((d, i) =>
          d.loginSurfaceObservation
            ? d.loginSurfaceObservation.observations.map((o, j) => <ObservationCard key={`${i}-${j}`} obs={o} />)
            // Honest degrade: a login-surface entry without the structured payload (e.g. a
            // pre-rename model). Show the engine's flat detail verbatim; never fabricate.
            : <div key={i} className="text-sm text-secondary">{d.detail}</div>,
        )}
      </div>

      {note && <p className="mt-6 text-sm text-secondary">{note}</p>}
    </section>
  )
}
