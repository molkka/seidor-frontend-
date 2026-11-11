import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePlanningYearStore } from './planningYearStore'

export interface User {
  id: string | number
  nom: string
  email: string
  role: string
  email_verified?: boolean
  consultant_id?: number | null
  permissions?: string[]
  a_google?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  updateUser: (patch: Partial<User>) => void
  clearSession: () => void
  logout: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      clearSession: () => {
        usePlanningYearStore.getState().clearYear()
        set({ token: null, user: null })
      },
      logout: async (): Promise<boolean> => {
        const token = get().token
        let revoked = false
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/logout`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
          })
          revoked = response.ok || response.status === 401
        } catch { /* Local access is cleared even if the server cannot be reached. */ }
        get().clearSession()
        return revoked
      },
    }),
    { name: 'planning-auth' }
  )
)
