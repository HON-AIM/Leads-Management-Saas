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
import type { Client } from '@/types'

interface BuyerFormProps {
  client?: Client
  onClose: () => void
}

const STEPS = ['Basic Info', 'Caps & Filters', 'Delivery']

export function BuyerForm({ client, onClose }: BuyerFormProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const isEdit = !!client
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    state: client?.state || '',
    leadCap: client?.leadCap ?? 100,
    dailyCap: client?.dailyCap ?? 0,
    monthlyCap: client?.monthlyCap ?? 0,
    priority: client?.priority ?? 0,
    pricePerLead: (client as any)?.pricePerLead ?? 0,
    minBid: (client as any)?.minBid ?? 0,
    allowedStates: client?.allowedStates || [] as string[],
    provider: client?.delivery?.provider || 'none',
    webhookUrl: client?.delivery?.config?.webhookUrl || '',
    apiKey: client?.delivery?.config?.apiKey || '',
    locationId: client?.delivery?.config?.locationId || '',
  })

  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  const toggleState = (st: string) => {
    update({
      allowedStates: form.allowedStates.includes(st)
        ? form.allowedStates.filter((s) => s !== st)
        : [...form.allowedStates, st],
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        state: form.state.toUpperCase(),
        country: 'US',
        leadCap: form.leadCap,
        dailyCap: form.dailyCap,
        monthlyCap: form.monthlyCap,
        priority: form.priority,
        allowedStates: form.allowedStates,
        pricePerLead: form.pricePerLead,
        minBid: form.minBid,
        delivery: {
          provider: form.provider,
          config: {
            webhookUrl: form.webhookUrl,
            apiKey: form.apiKey,
            locationId: form.locationId,
          },
        },
      }
      if (isEdit) {
        const res = await api.put(`/clients/${client._id}`, payload)
        return res.data
      }
      const res = await api.post('/clients', payload)
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: isEdit ? 'Buyer updated' : 'Buyer created', description: 'Buyer saved successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
      onClose()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to save buyer' }),
  })

  const canProceed = () => {
    if (step === 0) return form.name && form.email && form.state
    if (step === 1) return form.leadCap > 0
    return true
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit Buyer' : 'Add Buyer'}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Buyers receive leads — routing is set on campaigns</p>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Buyer name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Home State *</Label>
            <Select
              value={form.state}
              onChange={(e) => update({ state: e.target.value })}
              options={US_STATE_CODES.map((s) => ({ label: s, value: s }))}
              placeholder="Select state"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Input type="number" min={0} value={form.priority} onChange={(e) => update({ priority: Number(e.target.value) })} />
            <p className="text-[10px] text-muted-foreground">Lower = higher priority in priority routing</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Total Cap *</Label>
              <Input type="number" min={1} value={form.leadCap} onChange={(e) => update({ leadCap: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Daily Cap</Label>
              <Input type="number" min={0} value={form.dailyCap} onChange={(e) => update({ dailyCap: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monthly Cap</Label>
              <Input type="number" min={0} value={form.monthlyCap} onChange={(e) => update({ monthlyCap: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Price Per Lead ($)</Label>
              <Input type="number" min={0} step={0.01} value={form.pricePerLead} onChange={(e) => update({ pricePerLead: Number(e.target.value) })} />
              <p className="text-[10px] text-muted-foreground">Revenue when this buyer receives a lead</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Bid ($)</Label>
              <Input type="number" min={0} step={0.01} value={form.minBid} onChange={(e) => update({ minBid: Number(e.target.value) })} />
              <p className="text-[10px] text-muted-foreground">Minimum bid for ping-post auctions</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Accepted States ({form.allowedStates.length || 'all'})</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Leave empty to accept leads from any state</p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto border rounded-lg p-2">
              {US_STATE_CODES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleState(st)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    form.allowedStates.includes(st)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input text-muted-foreground'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Delivery Method</Label>
            <Select
              value={form.provider}
              onChange={(e) => update({ provider: e.target.value as any })}
              options={[
                { label: 'None (portal only)', value: 'none' },
                { label: 'Webhook', value: 'webhook' },
                { label: 'Go High Level', value: 'ghl' },
                { label: 'Email', value: 'email' },
              ]}
            />
          </div>
          {form.provider === 'webhook' && (
            <div className="space-y-1">
              <Label className="text-xs">Webhook URL</Label>
              <Input value={form.webhookUrl} onChange={(e) => update({ webhookUrl: e.target.value })} placeholder="https://..." />
            </div>
          )}
          {form.provider === 'ghl' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => update({ apiKey: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location ID</Label>
                <Input value={form.locationId} onChange={(e) => update({ locationId: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Previous</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button>
          ) : (
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Buyer' : 'Create Buyer'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
