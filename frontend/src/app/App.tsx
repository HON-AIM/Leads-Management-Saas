import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { NotificationCenter } from '@/components/feedback/NotificationCenter'
import { AppProviders } from '@/app/AppProviders'
import { AppRouter } from '@/app/routes/router'

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
        <NotificationCenter />
      </AppProviders>
    </ErrorBoundary>
  )
}
