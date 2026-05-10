import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { BuyerStats } from '@/components/buyer/BuyerStats'
import { BuyerLeads } from '@/components/buyer/BuyerLeads'
import { BuyerNotifications } from '@/components/buyer/BuyerNotifications'
import { useAuth } from '@/hooks/useAuth'
import type { BuyerStatsResponse, BuyerProfile, CapUsage } from '@/types/buyer'

type Tab = 'leads' | 'stats' | 'notifications'

export function BuyerPortal() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('leads')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const { data: profileData, isLoading: profileLoading } = useQuery<{ success: boolean; buyer: BuyerProfile }>({
    queryKey: ['buyer-profile'],
    queryFn: async () => {
      const { data } = await api.get('/buyer/me')
      return data
    },
  })

  const { data: statsData, isLoading: statsLoading } = useQuery<BuyerStatsResponse>({
    queryKey: ['buyer-stats'],
    queryFn: async () => {
      const { data } = await api.get('/buyer/stats')
      return data
    },
    refetchInterval: 60000,
  })

  const { data: capData, isLoading: capLoading } = useQuery<{ success: boolean; usage: CapUsage }>({
    queryKey: ['buyer-cap'],
    queryFn: async () => {
      const { data } = await api.get('/buyer/cap-usage')
      return data
    },
    refetchInterval: 60000,
  })

  const buyer = profileData?.buyer

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'leads', label: 'My Leads', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { key: 'stats', label: 'Stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { key: 'notifications', label: 'Activity', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
      <div className="flex items-center justify-between pt-6 pb-2">
        <div>
          <h1 className="text-lg font-semibold">{greeting}, {user?.firstName || buyer?.name || 'Buyer'}</h1>
          <p className="text-sm text-muted-foreground">{buyer?.name || 'Loading...'}</p>
        </div>
        <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">
          Sign out
        </button>
      </div>

      {buyer && (
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{buyer.state} · {buyer.routingMode?.replace(/_/g, ' ')}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            buyer.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
            buyer.status === 'full' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {buyer.status}
          </span>
        </div>
      )}

      {tab === 'stats' && (
        <BuyerStats
          stats={statsData?.stats || null}
          usage={capData?.usage || null}
          isLoading={statsLoading || capLoading}
        />
      )}

      {tab === 'leads' && <BuyerLeads />}

      {tab === 'notifications' && <BuyerNotifications />}

      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
