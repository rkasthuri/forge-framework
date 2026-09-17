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

import { useQuery } from '@tanstack/react-query'
import { fetchCanonicalEvidenceWorkspace } from '../api/evidenceWorkspaceClient'

export function useEvidenceWorkspace(projectId: string | null, query: URLSearchParams | null) {
  const encoded = query?.toString() ?? null
  return useQuery({
    queryKey: ['canonical-evidence-workspace', projectId, encoded],
    queryFn: () => fetchCanonicalEvidenceWorkspace(projectId!, new URLSearchParams(encoded!)),
    enabled: !!projectId && !!encoded,
    retry: false,
  })
}
