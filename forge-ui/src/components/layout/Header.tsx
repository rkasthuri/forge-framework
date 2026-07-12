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

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Sun, Moon, Plus } from 'lucide-react'
import { useProjects } from '../../hooks/useApi'
import { useCurrentProject } from '../../hooks/useCurrentProject'
import { buildProjectRoute } from '../../utils/buildProjectRoute'
import type { Project } from '../../api/types'

// `scoped` tabs carry the selected project through the `?project=` param so the
// selection survives tab switches (TD-UI-022 follow-up). Onboard is unscoped —
// it's where a project is established, so it stays param-less.
const TABS = [
  { to: '/onboard', label: 'Onboard', scoped: false },
  { to: '/crawl', label: 'Crawl', scoped: true },
  { to: '/tests', label: 'Tests', scoped: true },
  { to: '/run', label: 'Run', scoped: true },
  { to: '/results', label: 'Results', scoped: true },
  { to: '/insights', label: 'Insights', scoped: true },
  { to: '/settings', label: 'Settings', scoped: true },
]

/** Header: logo · tab nav · project switcher · theme toggle. Height 48px. */
export function Header() {
  const navigate = useNavigate()
  const { data } = useProjects()   // reactive — invalidated after onboarding
  const projects = data?.projects ?? []
  const currentProject = useCurrentProject()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [light, setLight] = useState(false)

  // Fix #14 — selecting a real project routes to the Onboard tab keyed by name,
  // which shows that project's existing detection instead of the blank form.
  function selectProject(p: Project) {
    setSwitcherOpen(false)
    navigate(`/onboard?project=${p.appName}`)
  }

  function toggleTheme() {
    const next = !light
    setLight(next)
    document.documentElement.classList.toggle('light', next)
  }

  return (
    <header className="flex h-12 items-center gap-4 border-b border-border bg-surface px-4">
      {/* Logo */}
      <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--brand-primary)' }}>
        <span>🔨</span><span>FORGE™</span>
      </div>

      {/* Tab navigation */}
      <nav className="flex flex-1 items-center gap-1">
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.scoped ? buildProjectRoute(t.to, currentProject) : t.to}
            className={({ isActive }) =>
              `border-b-2 px-3 py-3 text-sm transition-colors ${
                isActive
                  ? 'border-brand text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {/* Project switcher */}
      <div className="relative">
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-primary hover:bg-hover"
        >
          {projects[0]?.appName ?? 'No project'}
          <ChevronDown size={14} />
        </button>
        {switcherOpen && (
          <div className="absolute right-0 mt-1 w-56 rounded-md border border-border bg-elevated py-1 shadow-lg">
            {projects.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted">No projects yet</div>
            )}
            {projects.map(p => (
              <button
                key={p.appName}
                onClick={() => (p.workspacePath ? selectProject(p) : null)}
                className={`w-full rounded px-3 py-2 text-left text-sm ${
                  p.workspacePath
                    ? 'cursor-pointer text-primary hover:bg-hover'
                    : 'cursor-not-allowed text-muted opacity-40'
                }`}
              >
                {p.appName}
                {!p.workspacePath && (
                  <span className="ml-2 text-xs text-muted">(not yet crawled)</span>
                )}
              </button>
            ))}
            <NavLink
              to="/onboard"
              onClick={() => setSwitcherOpen(false)}
              className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm text-secondary hover:text-primary"
            >
              <Plus size={14} /> Add new project
            </NavLink>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="text-secondary hover:text-primary" title="Toggle theme">
        {light ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </header>
  )
}
