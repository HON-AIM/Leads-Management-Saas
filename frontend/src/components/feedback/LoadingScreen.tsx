import { cn } from '@/lib/utils'

export function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen ? 'fixed inset-0 bg-[#0a0f1e]' : 'h-40'
    )}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.08]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <p className="text-[12px] text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
