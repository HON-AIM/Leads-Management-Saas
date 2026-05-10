import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import type { Client } from '@/types'

const ROUTING_MODES = [
  { label: 'Round Robin', value: 'round_robin' },
  { label: 'Weighted', value: 'weighted' },
  { label: 'Priority', value: 'priority' },
  { label: 'Exclusive', value: 'exclusive' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]

interface RoutingSettingsProps {
  client: Client
}

export function RoutingSettings({ client }: RoutingSettingsProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [routingMode, setRoutingMode] = useState(client.routingMode)
  const [weight, setWeight] = useState(client.weight)
  const [priority, setPriority] = useState(client.priority)
  const [allowedStates, setAllowedStates] = useState<string[]>(client.allowedStates || [])
  const [fallbackGroup, setFallbackGroup] = useState(client.fallbackGroup || '')

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put(`/clients/${client._id}`, data)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Routing updated', description: 'Routing settings saved' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to update routing' }),
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/clients/${client._id}/pause`, { reason: '' })
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: client.isPaused ? 'Resumed' : 'Paused', description: `Buyer ${client.isPaused ? 'resumed' : 'paused'} successfully` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to toggle pause' }),
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/clients/${client._id}/resume`)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Resumed', description: 'Buyer resumed successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to resume buyer' }),
  })

  const toggleState = (state: string) => {
    setAllowedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    )
  }

  const handleSave = () => {
    updateMutation.mutate({ routingMode, weight, priority, allowedStates, fallbackGroup })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Routing Settings</h3>
        <div className="flex gap-2">
          {client.isPaused ? (
            <Button variant="outline" size="sm" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
              Resume
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
              Pause
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Routing Mode</Label>
          <Select
            value={routingMode}
            onChange={(e) => setRoutingMode(e.target.value as any)}
            options={ROUTING_MODES}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fallback Group</Label>
          <Input value={fallbackGroup} onChange={(e) => setFallbackGroup(e.target.value)} placeholder="Optional group name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Weight</Label>
          <Input type="number" min={1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <Input type="number" min={0} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Allowed States ({allowedStates.length} selected)</Label>
        <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto border rounded-lg p-2">
          {US_STATES.map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => toggleState(state)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                allowedStates.includes(state)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:border-foreground'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Leave empty to allow all states</p>
      </div>

      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        Save Routing
      </Button>
    </div>
  )
}
