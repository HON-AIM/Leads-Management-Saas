import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const iconMap = {
  success: <CheckCircle size={16} className="text-emerald-500" />,
  error: <XCircle size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  info: <Info size={16} className="text-blue-500" />,
}

const borderMap = {
  success: 'border-l-emerald-500/50',
  error: 'border-l-red-500/50',
  warning: 'border-l-amber-500/50',
  info: 'border-l-blue-500/50',
}

export function NotificationCenter() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[360px]">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={cn(
            'flex items-start gap-2.5 rounded-lg border bg-[#0c1021] p-3 shadow-elevated animate-fade-up border-l-[3px]',
            'dark:border-white/[0.06]',
            borderMap[notif.type]
          )}
        >
          <div className="mt-0.5 shrink-0">
            {iconMap[notif.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white">{notif.title}</p>
            {notif.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notif.description}</p>
            )}
          </div>
          <button
            onClick={() => removeNotification(notif.id)}
            className="shrink-0 text-muted-foreground hover:text-white transition-colors p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
