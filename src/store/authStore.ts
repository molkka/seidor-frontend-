import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePlanningYearStore } from './planningYearStore'

export interface User {
  id: string
  nom: string
  email: string
  role: string
  a_google?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  updateUser: (patch: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),
      logout: () => {
        usePlanningYearStore.getState().clearYear()
        set({ token: null, user: null })
      },
    }),
    { name: 'planning-auth' }
  )
)
