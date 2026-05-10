import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { BuyerActivity } from '@/types/buyer'

export function BuyerNotifications() {
  const { data, isLoading } = useQuery<{ success: boolean; activities: BuyerActivity[] }>({
    queryKey: ['buyer-activities'],
    queryFn: async () => {
      const { data } = await api.get('/buyer/activities')
      return data
    },
    refetchInterval: 30000,
  })

  const activities = data?.activities || []

  const typeIcon = (type: string) => {
    if (type.includes('assigned') || type.includes('delivered')) {
      return <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
    }
    if (type.includes('failed')) {
      return <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
    }
    return <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((a) => (
        <div key={a._id} className="flex gap-3 rounded-xl border bg-card p-3">
          {typeIcon(a.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm">{a.message}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
