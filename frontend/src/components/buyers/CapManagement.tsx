import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'
import { formatNumber } from '@/lib/utils'
import type { Client } from '@/types'

interface CapManagementProps {
  client: Client
}

export function CapManagement({ client }: CapManagementProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [leadCap, setLeadCap] = useState(client.leadCap)
  const [dailyCap, setDailyCap] = useState(client.dailyCap)
  const [monthlyCap, setMonthlyCap] = useState(client.monthlyCap)

  const totalPct = client.leadCap > 0 ? (client.leadsReceived / client.leadCap) * 100 : 0
  const dailyPct = client.dailyCap > 0 ? (client.dailyLeadsReceived / client.dailyCap) * 100 : 0
  const monthlyPct = client.monthlyCap > 0 ? (client.monthlyLeadsReceived / client.monthlyCap) * 100 : 0

  const barColor = (pct: number) =>
    pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  const updateMutation = useMutation({
    mutationFn: async (data: { leadCap: number; dailyCap: number; monthlyCap: number }) => {
      const res = await api.put(`/clients/${client._id}`, data)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Caps updated', description: 'Cap limits have been saved' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to update caps' }),
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/clients/${client._id}/reset`)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Cap reset', description: 'Lead count has been reset to 0' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to reset caps' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Cap Management</h3>
        <Button variant="outline" size="sm" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
          Reset Count
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Lead Cap</span>
            <span className="font-medium">{formatNumber(client.leadsReceived)} / {formatNumber(client.leadCap)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(totalPct)}`} style={{ width: `${Math.min(totalPct, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Daily Cap</span>
            <span className="font-medium">{formatNumber(client.dailyLeadsReceived)} / {formatNumber(client.dailyCap)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(dailyPct)}`} style={{ width: `${Math.min(dailyPct, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly Cap</span>
            <span className="font-medium">{formatNumber(client.monthlyLeadsReceived)} / {formatNumber(client.monthlyCap)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(monthlyPct)}`} style={{ width: `${Math.min(monthlyPct, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="space-y-1">
          <Label className="text-xs">Lead Cap</Label>
          <Input type="number" min={0} value={leadCap} onChange={(e) => setLeadCap(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Daily Cap</Label>
          <Input type="number" min={0} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Monthly Cap</Label>
          <Input type="number" min={0} value={monthlyCap} onChange={(e) => setMonthlyCap(Number(e.target.value))} />
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => updateMutation.mutate({ leadCap, dailyCap, monthlyCap })}
        disabled={updateMutation.isPending}
      >
        Save Caps
      </Button>
    </div>
  )
}
