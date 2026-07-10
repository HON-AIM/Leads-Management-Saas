import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password']

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const initialized = useAuthStore((s) => s.initialized)
  const location = useLocation()

  useEffect(() => {
    if (initialized) return
    const isPublic = PUBLIC_PATHS.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/')
    )
    if (!isPublic) {
      checkAuth()
    } else {
      useAuthStore.setState({ loading: false, initialized: true })
    }
  }, [checkAuth, initialized, location.pathname])

  return <>{children}</>
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer>
          <AuthInitializer>
            {children}
          </AuthInitializer>
        </ThemeInitializer>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
