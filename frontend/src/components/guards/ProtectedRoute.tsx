import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth'
import { ROUTES } from '@/lib/constants'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuth()

  if (!initialized || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-[12px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}
