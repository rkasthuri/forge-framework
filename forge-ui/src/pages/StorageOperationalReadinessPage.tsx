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

import { ApplicationWorkspace } from '../components/application-workspace/ApplicationWorkspace'
import { StorageOperationalReadiness } from '../components/application-workspace/StorageOperationalReadiness'
import { useCurrentProject } from '../hooks/useCurrentProject'
import { useStorageOperationalReadiness } from '../hooks/useApi'

function State({ title, explanation, alert = false }: { title: string; explanation: string; alert?: boolean }) {
  return <section className="rounded-lg border border-border bg-surface p-8 text-center" role={alert ? 'alert' : 'status'}><h2 className="text-lg font-semibold text-primary">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-secondary">{explanation}</p></section>
}

export function StorageOperationalReadinessPage() {
  const project = useCurrentProject()
  const query = useStorageOperationalReadiness(project)
  return <ApplicationWorkspace>
    {!project && <State title="No application selected" explanation="Select a registered project to assess its canonical storage source." />}
    {project && query.isPending && <State title="Storage Operational Readiness" explanation="Inspecting the selected storage source without creating artifacts…" />}
    {project && query.isError && <State alert title="Storage readiness unavailable" explanation={query.error instanceof Error ? query.error.message : 'The source evidence could not be composed safely.'} />}
    {query.data && <StorageOperationalReadiness readModel={query.data} />}
  </ApplicationWorkspace>
}
