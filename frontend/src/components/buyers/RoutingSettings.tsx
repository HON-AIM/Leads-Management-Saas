import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { US_STATE_CODES } from '@/lib/us-states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useNotifications } from '@/hooks/useNotifications'
import {
  RULE_OPERATORS, LEAD_FIELDS, REQUIRED_FIELD_OPTIONS,
  type BuyerRoutingRules, type CustomFilterRule,
} from '@/types/routingRules'
import type { Client } from '@/types'

interface RoutingSettingsProps {
  client: Client
}

const emptyRules = (client: Client): BuyerRoutingRules => ({
  allowedZips: client.routingRules?.allowedZips || [],
  blockedZips: client.routingRules?.blockedZips || [],
  requiredFields: client.routingRules?.requiredFields || ['email'],
  allowedSources: client.routingRules?.allowedSources || [],
  blockedSources: client.routingRules?.blockedSources || [],
  minQualityScore: client.routingRules?.minQualityScore ?? 0,
  customFilters: client.routingRules?.customFilters || [],
})

export function RoutingSettings({ client }: RoutingSettingsProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [priority, setPriority] = useState(client.priority ?? 0)
  const [allowedStates, setAllowedStates] = useState<string[]>(client.allowedStates || [])
  const [isFallbackBuyer, setIsFallbackBuyer] = useState(client.isFallbackBuyer ?? false)
  const [rules, setRules] = useState<BuyerRoutingRules>(emptyRules(client))
  const [allowedZipsText, setAllowedZipsText] = useState((client.routingRules?.allowedZips || []).join(', '))
  const [blockedZipsText, setBlockedZipsText] = useState((client.routingRules?.blockedZips || []).join(', '))
  const [testResult, setTestResult] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        priority,
        allowedStates,
        isFallbackBuyer,
        routingRules: {
          ...rules,
          allowedZips: allowedZipsText.split(/[,\s]+/).map((z) => z.trim()).filter(Boolean),
          blockedZips: blockedZipsText.split(/[,\s]+/).map((z) => z.trim()).filter(Boolean),
        },
      }
      const res = await api.put(`/routing/buyers/${client._id}/rules`, payload)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Rules saved', description: 'Buyer routing rules updated' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to save rules' }),
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const endpoint = client.isPaused ? 'resume' : 'pause'
      return api.post(`/clients/${client._id}/${endpoint}`, { reason: '' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
    },
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/routing/evaluate', {
        lead: {
          state: client.state,
          zip: allowedZipsText.split(',')[0]?.trim() || '90210',
          email: 'test@example.com',
          phone: '+15551234567',
          source: 'webhook',
        },
      })
      return data
    },
    onSuccess: (data) => {
      const match = data.eligibleBuyers?.find((b: any) => b.id === client._id)
      setTestResult(match
        ? `✓ This buyer would receive the test lead`
        : `✗ This buyer would NOT match (${data.reason || 'see audit'})`)
    },
  })

  const toggleState = (st: string) => {
    setAllowedStates((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st])
  }

  const toggleRequired = (field: string) => {
    setRules((r) => ({
      ...r,
      requiredFields: r.requiredFields?.includes(field)
        ? r.requiredFields.filter((f) => f !== field)
        : [...(r.requiredFields || []), field],
    }))
  }

  const addCustomFilter = () => {
    setRules((r) => ({
      ...r,
      customFilters: [...(r.customFilters || []), { field: 'state', operator: 'eq', value: '' }],
    }))
  }

  const updateFilter = (idx: number, patch: Partial<CustomFilterRule>) => {
    setRules((r) => {
      const filters = [...(r.customFilters || [])]
      filters[idx] = { ...filters[idx], ...patch }
      return { ...r, customFilters: filters }
    })
  }

  const removeFilter = (idx: number) => {
    setRules((r) => ({
      ...r,
      customFilters: (r.customFilters || []).filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Routing Rules</h3>
          <p className="text-xs text-muted-foreground">
            Lead Distro-style filters: geo → quality → caps → schedule
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
          {client.isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      {/* Geo */}
      <div className="space-y-2 border rounded-lg p-3">
        <p className="text-xs font-medium">1. Geographic Filters</p>
        <div className="space-y-1">
          <Label className="text-xs">Accepted States ({allowedStates.length || 'all'})</Label>
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
            {US_STATE_CODES.map((st) => (
              <button key={st} type="button" onClick={() => toggleState(st)}
                className={`text-xs px-2 py-0.5 rounded-full border ${allowedStates.includes(st) ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground'}`}>
                {st}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Allowed Zip Codes</Label>
            <Input value={allowedZipsText} onChange={(e) => setAllowedZipsText(e.target.value)} placeholder="90210, 90211" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Blocked Zip Codes</Label>
            <Input value={blockedZipsText} onChange={(e) => setBlockedZipsText(e.target.value)} placeholder="00000" className="text-xs" />
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-2 border rounded-lg p-3">
        <p className="text-xs font-medium">2. Quality & Field Rules</p>
        <div className="space-y-1">
          <Label className="text-xs">Required Fields</Label>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_FIELD_OPTIONS.map((f) => (
              <button key={f} type="button" onClick={() => toggleRequired(f)}
                className={`text-xs px-2 py-0.5 rounded-full border capitalize ${rules.requiredFields?.includes(f) ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min Quality Score (0-100)</Label>
          <Input type="number" min={0} max={100} value={rules.minQualityScore ?? 0}
            onChange={(e) => setRules((r) => ({ ...r, minQualityScore: Number(e.target.value) }))} className="h-8 text-xs w-24" />
        </div>
      </div>

      {/* Custom filters */}
      <div className="space-y-2 border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">3. Custom Field Rules</p>
          <Button variant="outline" size="sm" onClick={addCustomFilter}>+ Add Rule</Button>
        </div>
        {(rules.customFilters || []).length === 0 && (
          <p className="text-xs text-muted-foreground">No custom rules. Example: metadata.vertical equals "insurance"</p>
        )}
        {(rules.customFilters || []).map((filter, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1 items-center">
            <div className="col-span-4">
              <Select value={filter.field} onChange={(e) => updateFilter(idx, { field: e.target.value })}
                options={LEAD_FIELDS.map((f) => ({ label: f.label, value: f.value }))} className="h-7 text-xs" />
            </div>
            <div className="col-span-3">
              <Select value={filter.operator} onChange={(e) => updateFilter(idx, { operator: e.target.value as any })}
                options={RULE_OPERATORS.map((o) => ({ label: o.label, value: o.value }))} className="h-7 text-xs" />
            </div>
            <div className="col-span-4">
              {!['exists', 'not_exists'].includes(filter.operator) && (
                <Input value={String(filter.value ?? '')} onChange={(e) => updateFilter(idx, { value: e.target.value })}
                  placeholder="value" className="h-7 text-xs" />
              )}
            </div>
            <button onClick={() => removeFilter(idx)} className="col-span-1 text-xs text-muted-foreground hover:text-destructive">✕</button>
          </div>
        ))}
      </div>

      {/* Priority & fallback */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Priority (lower = first)</Label>
          <Input type="number" min={0} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="h-8" />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <input type="checkbox" id="fallback" checked={isFallbackBuyer}
            onChange={(e) => setIsFallbackBuyer(e.target.checked)} className="h-4 w-4" />
          <Label htmlFor="fallback" className="text-xs">Fallback buyer (accepts unmatched leads)</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          Save Routing Rules
        </Button>
        <Button variant="outline" size="sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
          Test Rules
        </Button>
      </div>

      {testResult && <p className="text-xs rounded-lg border px-3 py-2 bg-muted/50">{testResult}</p>}
    </div>
  )
}
