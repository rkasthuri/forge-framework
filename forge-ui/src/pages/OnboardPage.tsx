import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, CheckCircle2, ArrowRight } from 'lucide-react'
import { useOnboard } from '../hooks/useApi'
import { deriveAppName } from '../lib/deriveAppName'
import { ConfidenceBadge } from '../components/shared/ConfidenceBadge'
import type { DetectionField } from '../api/types'

function DetectionRow({ label, field }: { label: string; field: DetectionField }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <span className="text-secondary">{label}</span>
      <span className="flex items-center gap-3">
        <span className="font-mono text-primary">{field.value || '—'}</span>
        <ConfidenceBadge confidence={field.confidence} />
      </span>
    </div>
  )
}

export function OnboardPage() {
  const navigate = useNavigate()
  const onboard = useOnboard()

  const [url, setUrl] = useState('')
  const [appName, setAppName] = useState('')
  const [appNameTouched, setAppNameTouched] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [dryRun, setDryRun] = useState(false)

  // Auto-derive appName from the URL until the user edits it directly.
  function onUrlChange(v: string) {
    setUrl(v)
    if (!appNameTouched) setAppName(deriveAppName(v))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onboard.mutate({ url, appName, username: username || undefined, password: password || undefined, dryRun })
  }

  const result = onboard.data
  const inputCls =
    'w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-brand focus:outline-none'

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      {/* LEFT — form */}
      <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-primary">Connect a New App</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Detect its type, auth, and crawl strategy.</p>

        <label className="mb-1 block text-sm text-secondary">App URL *</label>
        <input className={inputCls} placeholder="https://..." value={url} onChange={e => onUrlChange(e.target.value)} />

        <label className="mb-1 mt-4 block text-sm text-secondary">App Name *</label>
        <input
          className={inputCls}
          placeholder="my-app"
          value={appName}
          onChange={e => { setAppName(e.target.value); setAppNameTouched(true) }}
        />
        <p className="mt-1 text-xs text-muted">Auto-derived from the URL if left blank.</p>

        <div className="mt-4 rounded-md border border-border p-3">
          <div className="mb-2 text-sm text-secondary">Credentials (optional)</div>
          <input className={`${inputCls} mb-2`} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
          Dry run (preview only — don&apos;t save the project)
        </label>

        <button
          type="submit"
          disabled={onboard.isPending || !url || !appName}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-primary)' }}
        >
          {onboard.isPending
            ? (<><Loader2 size={16} className="animate-spin" /> Detecting…</>)
            : (<><Search size={16} /> Detect &amp; Onboard</>)}
        </button>

        {onboard.isPending && (
          <p className="mt-3 text-xs text-muted">
            This runs a full bootstrap + crawl — it can take 1–3 minutes.
          </p>
        )}
        {onboard.isError && (
          <p className="mt-3 text-sm text-fail">{(onboard.error as Error).message}</p>
        )}
      </form>

      {/* RIGHT — detection results */}
      {result && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-primary">Detection Results</h2>
          <div className="mt-3">
            <DetectionRow label="App Type"  field={result.detection.appType} />
            <DetectionRow label="Auth Type" field={result.detection.authType} />
            <DetectionRow label="Strategy"  field={result.detection.crawlStrategy} />
            <DetectionRow label="App Name"  field={result.detection.appName} />
          </div>

          {!result.dryRun ? (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm text-pass">
                <CheckCircle2 size={16} /> Project created — ready to crawl.
              </div>
              <button
                onClick={() => navigate('/crawl')}
                className="mt-3 flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-primary hover:bg-hover"
              >
                Go to Crawl tab <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Dry run — nothing was saved.</p>
          )}
        </div>
      )}
    </div>
  )
}
