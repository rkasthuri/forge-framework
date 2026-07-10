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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type {
  OnboardRequest, OnboardResponse, Project, Detection, CrawlRequest, CrawlStatus,
} from '../api/types'

/** GET /api/v1/projects — the project switcher + lists consume this. */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ projects: Project[] }>('/api/v1/projects'),
  })
}

/** GET /api/v1/projects/:appName — Fix #14: one saved project's detection. */
export function useProject(appName: string | null) {
  return useQuery({
    queryKey: ['project', appName],
    queryFn: () =>
      apiClient.get<{ project: Project; detection: Detection }>(
        `/api/v1/projects/${appName}`,
      ),
    enabled: !!appName,
  })
}

/** GET /api/v1/validate?url= — format + reachability pre-check. */
export function useValidateUrl() {
  return useMutation({
    mutationFn: (url: string) =>
      apiClient.get<{ reachable: boolean; message: string }>(
        `/api/v1/validate?url=${encodeURIComponent(url)}`,
      ),
  })
}

/** POST /api/v1/crawl — start a crawl (TD-UI-002); returns { jobId } (202). */
export function useCrawl() {
  return useMutation({
    mutationFn: (body: CrawlRequest) =>
      apiClient.post<{ jobId: string }>('/api/v1/crawl', body),
  })
}

/** POST /api/v1/projects/:appName/authenticate — ADR-013 authenticated bootstrap. */
export function useAuthenticate() {
  return useMutation({
    mutationFn: (appName: string) =>
      apiClient.post<{ jobId?: string; noop?: boolean }>(
        `/api/v1/projects/${appName}/authenticate`, {},
      ),
  })
}

/** GET /api/v1/crawl/:jobId/status — polls every 1s until the crawl completes. */
export function useCrawlStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['crawl-status', jobId],
    queryFn: () => apiClient.get<CrawlStatus>(`/api/v1/crawl/${jobId}/status`),
    enabled: !!jobId,
    refetchInterval: query => (query.state.data?.complete ? false : 1000),
  })
}

/** POST /api/v1/projects — onboard; invalidates the projects list on success. */
export function useOnboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: OnboardRequest) =>
      apiClient.post<OnboardResponse>('/api/v1/projects', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
