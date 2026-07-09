import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Client } from '@/types'
import type { ICountry } from '@/types/location'

interface BuyersTableProps {
  clients: Client[]
  isLoading: boolean
  stateFilter: string
  onStateFilterChange: (state: string) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  full: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export function BuyersTable({ clients, isLoading, stateFilter, onStateFilterChange, onEdit, onDelete }: BuyersTableProps) {
  const { data: countriesData } = useQuery<ICountry[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get('/locations/countries')
      return data.countries || data
    },
  })
  const countries = countriesData || []
  const [countryFilter, setCountryFilter] = useState('')

  const filtered = clients.filter((c) => {
    if (stateFilter && stateFilter !== 'All' && c.state !== stateFilter) return false
    if (countryFilter && c.country !== countryFilter) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <span className="text-xs text-muted-foreground">Country:</span>
        <Select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          options={[
            { label: 'All Countries', value: '' },
            ...countries.map((c) => ({ label: `${c.name} (${c.code})`, value: c.code })),
          ]}
          className="w-40"
        />
        <span className="text-xs text-muted-foreground">State:</span>
        <Input
          value={stateFilter === 'All' ? '' : stateFilter}
          onChange={(e) => onStateFilterChange(e.target.value.toUpperCase() || 'All')}
          placeholder="Filter state..."
          className="w-24 h-7 text-xs"
        />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} buyer(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Name</th>
              <th className="text-left font-medium px-4 py-3">State</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Priority</th>
              <th className="text-left font-medium px-4 py-3">Cap Usage</th>
              <th className="text-left font-medium px-4 py-3">Daily</th>
              <th className="text-left font-medium px-4 py-3">Monthly</th>
              <th className="text-left font-medium px-4 py-3">Delivery Rate</th>
              <th className="text-left font-medium px-4 py-3">Last Assigned</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-20 text-center text-sm text-muted-foreground">Loading buyers...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-20 text-center text-sm text-muted-foreground">No buyers found</td>
              </tr>
            ) : (
              filtered.map((client) => {
                const capPct = client.leadCap > 0 ? (client.leadsReceived / client.leadCap) * 100 : 0
                const dailyPct = client.dailyCap > 0 ? (client.dailyLeadsReceived / client.dailyCap) * 100 : 0
                const monthlyPct = client.monthlyCap > 0 ? (client.monthlyLeadsReceived / client.monthlyCap) * 100 : 0
                const barColor = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

                return (
                  <tr key={client._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{client.country || 'US'}</span>
                      <span className="mx-1">-</span>
                      <span>{client.state}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge className={statusStyles[client.status] || ''}>{client.status}</Badge>
                        {client.isPaused && (
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">paused</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">P{client.priority ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(capPct)}`} style={{ width: `${Math.min(capPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatNumber(client.leadsReceived)}/{formatNumber(client.leadCap)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(dailyPct)}`} style={{ width: `${Math.min(dailyPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatNumber(client.dailyLeadsReceived)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(monthlyPct)}`} style={{ width: `${Math.min(monthlyPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatNumber(client.monthlyLeadsReceived)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.deliveryRate != null ? (
                        <span className={`text-xs font-medium ${
                          client.deliveryRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                          client.deliveryRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {client.deliveryRate.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {client.lastAssignedAt ? formatDate(client.lastAssignedAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(client)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(client)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
