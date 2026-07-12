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

import { useSearchParams } from 'react-router-dom'

/**
 * The currently-selected project, read from the `?project=` URL param.
 *
 * Navigation state (not React state) so the selection survives page unmount
 * and tab switches — see TD-UI-022 follow-up. Returns null when no project is
 * selected (bare route, e.g. the Onboard tab where a project is established).
 */
export function useCurrentProject(): string | null {
  const [searchParams] = useSearchParams()
  return searchParams.get('project') ?? null
}
