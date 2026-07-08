import { createContext, useContext, type ReactNode } from 'react'

/**
 * AuthContext — Phase 1: always local/owner. Phase 2: replace with JWT auth.
 * Nova-approved cloud-readiness stub.
 */
export interface User {
  id: string
  name: string
  role: 'owner' | 'admin' | 'viewer'
  tenantId: string
}

export const LOCAL_USER: User = {
  id: 'local',
  name: 'Local User',
  role: 'owner',
  tenantId: 'local',
}

export const AuthContext = createContext<User>(LOCAL_USER)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={LOCAL_USER}>{children}</AuthContext.Provider>
}
