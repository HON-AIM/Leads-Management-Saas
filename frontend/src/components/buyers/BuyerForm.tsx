import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useNotifications } from '@/hooks/useNotifications'
import type { Client } from '@/types'
import type { ICountry, IRegion } from '@/types/location'

interface BuyerFormProps {
  client?: Client
  onClose: () => void
}

const ROUTING_MODES = [
  { label: 'Round Robin', value: 'round_robin' },
  { label: 'Weighted', value: 'weighted' },
  { label: 'Priority', value: 'priority' },
  { label: 'Exclusive', value: 'exclusive' },
]

const STEPS = ['Basic Info', 'Cap Settings', 'Routing Config', 'Delivery & Schedule', 'Review']

export function BuyerForm({ client, onClose }: BuyerFormProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const isEdit = !!client
  const [step, setStep] = useState(0)

  const { data: countriesData } = useQuery<ICountry[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get('/locations/countries')
      return data.countries || data
    },
  })
  const countries = countriesData || []
  const selectedCountry = countries.find((c) => c.code === (form.country || 'US'))

  const { data: regionsData } = useQuery<IRegion[]>({
    queryKey: ['regions', form.country || 'US'],
    queryFn: async () => {
      const { data } = await api.get(`/locations/regions?countryCode=${form.country || 'US'}`)
      return data.regions || data
    },
    enabled: !!form.country,
  })
  const regions = regionsData || []

  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    country: client?.country || 'US',
    state: client?.state || '',
    leadCap: client?.leadCap ?? 100,
    dailyCap: client?.dailyCap ?? 0,
    monthlyCap: client?.monthlyCap ?? 0,
    routingMode: client?.routingMode || 'round_robin',
    weight: client?.weight ?? 1,
    priority: client?.priority ?? 0,
    allowedStates: client?.allowedStates || [],
    allowedCountries: client?.allowedCountries || [],
    fallbackGroup: client?.fallbackGroup || '',
    provider: client?.delivery?.provider || 'none',
    webhookUrl: client?.delivery?.config?.webhookUrl || '',
    apiKey: client?.delivery?.config?.apiKey || '',
    locationId: client?.delivery?.config?.locationId || '',
    customHeaders: client?.delivery?.config?.customHeaders
      ? JSON.stringify(client.delivery.config.customHeaders, null, 2)
      : '',
    scheduleEnabled: client?.schedule?.enabled || false,
    timezone: client?.schedule?.timezone || 'America/New_York',
    scheduleDays: client?.schedule?.days || [],
    startTime: client?.schedule?.startTime || '09:00',
    endTime: client?.schedule?.endTime || '17:00',
  })

  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  const toggleState = (state: string) => {
    update({
      allowedStates: form.allowedStates.includes(state)
        ? form.allowedStates.filter((s) => s !== state)
        : [...form.allowedStates, state],
    })
  }

  const toggleCountry = (code: string) => {
    update({
      allowedCountries: form.allowedCountries.includes(code)
        ? form.allowedCountries.filter((c) => c !== code)
        : [...form.allowedCountries, code],
    })
  }

  const toggleDay = (day: number) => {
    update({
      scheduleDays: form.scheduleDays.includes(day)
        ? form.scheduleDays.filter((d) => d !== day)
        : [...form.scheduleDays, day],
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        delivery: {
          provider: form.provider,
          config: {
            webhookUrl: form.webhookUrl,
            apiKey: form.apiKey,
            locationId: form.locationId,
            customHeaders: form.customHeaders ? tryParseJSON(form.customHeaders) : {},
          },
        },
        schedule: {
          enabled: form.scheduleEnabled,
          timezone: form.timezone,
          days: form.scheduleDays,
          startTime: form.startTime,
          endTime: form.endTime,
        },
      }
      delete (payload as any).webhookUrl
      delete (payload as any).apiKey
      delete (payload as any).locationId
      delete (payload as any).customHeaders
      delete (payload as any).scheduleEnabled
      delete (payload as any).scheduleDays

      if (isEdit) {
        const res = await api.put(`/clients/${client._id}`, { ...payload, country: form.country })
        return res.data
      }
      const res = await api.post('/clients', { ...payload, country: form.country })
      return res.data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: isEdit ? 'Buyer updated' : 'Buyer created', description: `Buyer has been ${isEdit ? 'updated' : 'created'} successfully` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
      onClose()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: `Failed to ${isEdit ? 'update' : 'create'} buyer` }),
  })

  const canProceed = () => {
    if (step === 0) return form.name && form.email && form.country && form.state
    if (step === 1) return form.leadCap > 0
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit Buyer' : 'Create Buyer'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </Button>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {s}
            </p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Basic Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Buyer name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="buyer@example.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Country *</Label>
              <Select
                value={form.country}
                onChange={(e) => update({ country: e.target.value, state: '', allowedStates: [] })}
                options={countries.map((c) => ({ label: `${c.name} (${c.code})`, value: c.code }))}
                placeholder="Select country"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State/Region {form.country ? '*' : ''}</Label>
              <Select
                value={form.state}
                onChange={(e) => update({ state: e.target.value })}
                placeholder={form.country ? 'Select state/region' : 'Pick a country first'}
                options={regions.map((r) => ({ label: `${r.name} (${r.code})`, value: r.code }))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Street, city, zip" />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Cap Settings</h3>
          <p className="text-xs text-muted-foreground">Define lead limits for this buyer. Set to 0 for unlimited.</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Total Lead Cap *</Label>
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
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Routing Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Routing Mode</Label>
              <Select value={form.routingMode} onChange={(e) => update({ routingMode: e.target.value as any })} options={ROUTING_MODES} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fallback Group</Label>
              <Input value={form.fallbackGroup} onChange={(e) => update({ fallbackGroup: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight</Label>
              <Input type="number" min={1} value={form.weight} onChange={(e) => update({ weight: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Input type="number" min={0} value={form.priority} onChange={(e) => update({ priority: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Allowed Countries ({form.allowedCountries.length} selected)</Label>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border rounded-lg p-2">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCountry(c.code)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    form.allowedCountries.includes(c.code)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:border-foreground'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to use buyer's own country</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Allowed States/Regions ({form.allowedStates.length} selected)</Label>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto border rounded-lg p-2">
              {regions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No regions loaded for this country</p>
              ) : (
                regions.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => toggleState(r.code)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      form.allowedStates.includes(r.code)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:border-foreground'
                    }`}
                  >
                    {r.code}
                  </button>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to allow all states/regions</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Delivery & Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <Select
                value={form.provider}
                onChange={(e) => update({ provider: e.target.value as any })}
                options={[
                  { label: 'None', value: 'none' },
                  { label: 'Webhook', value: 'webhook' },
                  { label: 'GHL', value: 'ghl' },
                  { label: 'Email', value: 'email' },
                ]}
              />
            </div>
            {form.provider === 'webhook' && (
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Webhook URL</Label>
                <Input value={form.webhookUrl} onChange={(e) => update({ webhookUrl: e.target.value })} placeholder="https://hook.example.com/endpoint" />
              </div>
            )}
            {form.provider === 'ghl' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">API Key</Label>
                  <Input type="password" value={form.apiKey} onChange={(e) => update({ apiKey: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location ID</Label>
                  <Input value={form.locationId} onChange={(e) => update({ locationId: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Custom Headers (JSON)</Label>
                  <textarea
                    value={form.customHeaders}
                    onChange={(e) => update({ customHeaders: e.target.value })}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule-enabled"
                checked={form.scheduleEnabled}
                onChange={(e) => update({ scheduleEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="schedule-enabled" className="text-xs">Enable schedule</Label>
            </div>
            {form.scheduleEnabled && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Active Days</Label>
                  <div className="flex gap-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          form.scheduleDays.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-input'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => update({ startTime: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => update({ endTime: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Timezone</Label>
                  <Input value={form.timezone} onChange={(e) => update({ timezone: e.target.value })} placeholder="America/New_York" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Review</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReviewField label="Name" value={form.name} />
            <ReviewField label="Email" value={form.email} />
            <ReviewField label="Country" value={form.country} />
            <ReviewField label="State" value={form.state} />
            <ReviewField label="Phone" value={form.phone || '-'} />
            <ReviewField label="Lead Cap" value={String(form.leadCap)} />
            <ReviewField label="Daily Cap" value={form.dailyCap ? String(form.dailyCap) : 'Unlimited'} />
            <ReviewField label="Monthly Cap" value={form.monthlyCap ? String(form.monthlyCap) : 'Unlimited'} />
            <ReviewField label="Routing Mode" value={form.routingMode.replace(/_/g, ' ')} />
            <ReviewField label="Weight / Priority" value={`${form.weight} / ${form.priority}`} />
            <ReviewField label="Fallback Group" value={form.fallbackGroup || '-'} />
            <ReviewField label="Delivery Provider" value={form.provider} />
            <ReviewField label="Schedule" value={form.scheduleEnabled ? `${form.scheduleDays.length} day(s), ${form.startTime}-${form.endTime}` : 'Disabled'} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={!canProceed()}>
              Next
            </Button>
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

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  )
}

function tryParseJSON(str: string) {
  try { return JSON.parse(str) } catch { return {} }
}
