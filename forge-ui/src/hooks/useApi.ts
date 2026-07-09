import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { OnboardRequest, OnboardResponse, Project } from '../api/types'

/** GET /api/v1/projects — the project switcher + lists consume this. */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get<{ projects: Project[] }>('/api/v1/projects'),
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
