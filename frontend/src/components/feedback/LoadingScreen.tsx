import { cn } from '@/lib/utils'

export function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen ? 'fixed inset-0 bg-background' : 'h-40'
    )}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
