import { useAuthStore } from '@/stores/authStore'
import type { UserRole, LoginRequest } from '@/types/auth'

export function useAuth() {
  const store = useAuthStore()

  return {
    user: store.user,
    loading: store.loading,
    initialized: store.initialized,
    isAuthenticated: !!store.user,
    isAdmin: store.user?.role === 'super_admin' || store.user?.role === 'admin',
    isMember: store.user?.role === 'member',
    isManager: store.user?.role === 'manager',
    isViewer: store.user?.role === 'viewer',
    canEdit: store.user?.role === 'super_admin' || store.user?.role === 'admin' || store.user?.role === 'member',
    hasRole: (...roles: UserRole[]) => !!store.user && roles.includes(store.user.role),
    login: (credentials: LoginRequest) => store.login(credentials),
    logout: store.logout,
    checkAuth: store.checkAuth,
    getRedirectPath: store.getRedirectPath,
  }
}
