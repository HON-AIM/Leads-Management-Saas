interface AnalyticsErrorAlertProps {
  message?: string | null
  title?: string
}

export function AnalyticsErrorAlert({ message, title = 'Unable to load analytics' }: AnalyticsErrorAlertProps) {
  if (!message) return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      <p className="font-medium">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  )
}
