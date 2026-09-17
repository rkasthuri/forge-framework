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

import { apiClient } from './client'
import { decodeCanonicalEvidenceWorkspace, type CanonicalEvidenceWorkspace } from './evidenceWorkspaceContract'

export async function fetchCanonicalEvidenceWorkspace(projectId: string, query: URLSearchParams): Promise<CanonicalEvidenceWorkspace> {
  const raw = await apiClient.get<unknown>(`/api/v1/projects/${encodeURIComponent(projectId)}/evidence-workspace?${query.toString()}`)
  return decodeCanonicalEvidenceWorkspace(raw)
}
