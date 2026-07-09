import type { Envelope } from './types'

/**
 * Typed fetch wrapper. Unwraps the server envelope (returns `data`); throws
 * with the envelope's `error` message on non-2xx. Vite proxies /api to the
 * Express control-plane (:3000).
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as Envelope<T> | { error?: string } | null
  if (!res.ok) {
    throw new Error((json as { error?: string })?.error ?? `HTTP ${res.status}`)
  }
  return (json as Envelope<T>).data
}

export const apiClient = {
  get:  <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put:  <T>(path: string, body: unknown) => request<T>('PUT', path, body),
}
