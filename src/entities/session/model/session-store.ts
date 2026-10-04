import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Credentials } from '@/shared/api'
import { syncAcrossTabs } from '@/shared/lib'

interface SessionState {
  credentials: Credentials | null
  login: (credentials: Credentials) => void
  logout: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      credentials: null,
      login: (credentials) => set({ credentials }),
      logout: () => set({ credentials: null }),
    }),
    {
      name: 'greenchat-session',
      version: 1,
      partialize: (state) => ({ credentials: state.credentials }),
      migrate: (persisted) => persisted as Pick<SessionState, 'credentials'>,
    },
  ),
)

export const selectIsAuthorized = (state: SessionState): boolean => state.credentials !== null

syncAcrossTabs(useSessionStore)
