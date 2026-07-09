import { QueryClient } from '@tanstack/react-query'

// Shared React Query client — provided at the app root, used by the hooks.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
