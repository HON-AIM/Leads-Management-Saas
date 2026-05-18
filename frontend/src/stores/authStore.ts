import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest, Session } from '@/types/auth'
import api from '@/lib/api'
import { ROUTES } from '@/lib/constants'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  lastRole: string | null
  login: (credentials: LoginRequest) => Promise<User>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  forgotPassword: (data: ForgotPasswordRequest) => Promise<void>
  resetPassword: (data: ResetPasswordRequest) => Promise<void>
  getSessions: () => Promise<Session[]>
  deleteSession: (sessionId: string) => Promise<void>
  getRedirectPath: (role?: string) => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,
      lastRole: null,

      login: async (credentials) => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials)
        set({ user: data.user, loading: false, lastRole: data.user.role })
        return data.user
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore
        }
        set({ user: null })
        window.location.href = ROUTES.LOGIN
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get('/auth/profile')
          set({ user: data, loading: false, initialized: true, lastRole: data.role })
        } catch {
          set({ user: null, loading: false, initialized: true })
        }
      },

      setUser: (user) => set({ user }),

      forgotPassword: async (data) => {
        await api.post('/auth/forgot-password', data)
      },

      resetPassword: async (data) => {
        await api.post('/auth/reset-password', data)
      },

      getSessions: async () => {
        const { data } = await api.get('/auth/sessions')
        return data.sessions || data
      },

      deleteSession: async (sessionId) => {
        await api.delete(`/auth/sessions/${sessionId}`)
      },

      getRedirectPath: (role) => {
        const r = role || get().user?.role
        if (!r) return ROUTES.DASHBOARD
        const map: Record<string, string> = {
          super_admin: ROUTES.DASHBOARD,
          tenant_admin: ROUTES.DASHBOARD,
          buyer: ROUTES.BUYER,
          viewer: ROUTES.DASHBOARD,
        }
        return map[r] || ROUTES.DASHBOARD
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ lastRole: state.lastRole }),
    }
  )
)
