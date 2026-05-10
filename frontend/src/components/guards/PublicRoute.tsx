import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth()

  if (!initialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
