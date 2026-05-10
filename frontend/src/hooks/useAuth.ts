import { useAuthStore } from '@/stores/authStore'
import type { UserRole, LoginRequest } from '@/types/auth'

export function useAuth() {
  const store = useAuthStore()

  return {
    user: store.user,
    loading: store.loading,
    initialized: store.initialized,
    isAuthenticated: !!store.user,
    isAdmin: store.user?.role === 'admin',
    isBuyer: store.user?.role === 'buyer',
    isViewer: store.user?.role === 'viewer',
    hasRole: (...roles: UserRole[]) => !!store.user && roles.includes(store.user.role),
    login: (credentials: LoginRequest) => store.login(credentials),
    logout: store.logout,
    checkAuth: store.checkAuth,
    forgotPassword: store.forgotPassword,
    resetPassword: store.resetPassword,
    getSessions: store.getSessions,
    deleteSession: store.deleteSession,
    getRedirectPath: store.getRedirectPath,
  }
}
