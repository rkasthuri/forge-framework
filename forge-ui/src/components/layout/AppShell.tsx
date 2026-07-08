import { Outlet } from 'react-router-dom'
import { Header } from './Header'

/**
 * AppShell — fixed header (48px), main content fills the middle, status bar at
 * the bottom (FORGE version + DB status). Routed pages render in <Outlet/>.
 */
export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-canvas text-primary">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
      <footer className="flex h-6 items-center justify-between border-t border-border bg-surface px-4 text-[11px] text-muted">
        <span>FORGE™ v1.0.0 — Autonomous Quality Engineering</span>
        <span>DB: local</span>
      </footer>
    </div>
  )
}
