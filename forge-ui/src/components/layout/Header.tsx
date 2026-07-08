import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, Sun, Moon, Plus } from 'lucide-react'

const TABS = [
  { to: '/onboard', label: 'Onboard' },
  { to: '/crawl', label: 'Crawl' },
  { to: '/tests', label: 'Tests' },
  { to: '/run', label: 'Run' },
  { to: '/results', label: 'Results' },
  { to: '/insights', label: 'Insights' },
  { to: '/settings', label: 'Settings' },
]

interface Project { appName: string }

/** Header: logo · tab nav · project switcher · theme toggle. Height 48px. */
export function Header() {
  const [projects, setProjects] = useState<Project[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [light, setLight] = useState(false)

  useEffect(() => {
    // GET /api/v1/projects (501 in the foundation → empty state).
    fetch('/api/v1/projects')
      .then(r => (r.ok ? r.json() : null))
      .then(res => setProjects(res?.data?.projects ?? []))
      .catch(() => setProjects([]))
  }, [])

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
            to={t.to}
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
              <div key={p.appName} className="cursor-pointer px-3 py-2 text-sm text-primary hover:bg-hover">
                {p.appName}
              </div>
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
