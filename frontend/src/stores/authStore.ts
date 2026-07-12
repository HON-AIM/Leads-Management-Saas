import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, AuthResponse } from '@/types/auth'
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
        const { user, accessToken, refreshToken } = data.data
        if (accessToken) localStorage.setItem('accessToken', accessToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        set({ user, loading: false, lastRole: user.role })
        return user
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        delete api.defaults.headers.common['Authorization']
        set({ user: null })
        window.location.href = ROUTES.LOGIN
      },

      checkAuth: async () => {
        const storedToken = localStorage.getItem('accessToken')
        if (storedToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        }
        try {
          const { data } = await api.get('/auth/me')
          const newAccessToken = localStorage.getItem('accessToken')
          if (newAccessToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
          }
          set({ user: data.data.user, loading: false, initialized: true, lastRole: data.data.user.role })
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          delete api.defaults.headers.common['Authorization']
          set({ user: null, loading: false, initialized: true })
        }
      },

      setUser: (user) => set({ user }),

      getRedirectPath: (role) => {
        const r = role || get().user?.role
        if (!r) return ROUTES.DASHBOARD
        return ROUTES.DASHBOARD
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ lastRole: state.lastRole }),
    }
  )
)
