import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ROUTING_MODES, SOURCE_OPTIONS } from '@/types/campaign'
import type { Campaign, CampaignFormData } from '@/types/campaign'
import type { Client } from '@/types'

interface CampaignFormProps {
  campaign?: Campaign
  onSave: (data: CampaignFormData) => void
  onClose: () => void
  isPending: boolean
}

const STEPS = ['Basic Info', 'Sources', 'Routing & Buyers', 'Review']

export function CampaignForm({ campaign, onSave, onClose, isPending }: CampaignFormProps) {
  const isEdit = !!campaign
  const [step, setStep] = useState(0)

  const [form, setForm] = useState<CampaignFormData>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    startDate: campaign?.startDate ? campaign.startDate.slice(0, 10) : '',
    endDate: campaign?.endDate ? campaign.endDate.slice(0, 10) : '',
    routingMode: campaign?.routingMode || 'round_robin',
    sources: campaign?.sources || [],
    assignedBuyers: campaign?.assignedBuyers?.map((b) => ({ buyerId: b.buyerId._id, weight: b.weight })) || [],
    stateRouting: campaign?.stateRouting?.map((r) => ({ state: r.state, buyerId: r.buyerId._id, priority: r.priority })) || [],
  })

  const update = (patch: Partial<CampaignFormData>) => setForm((prev) => ({ ...prev, ...patch }))

  const { data: clientsData } = useQuery<Client[]>({
    queryKey: QUERY_KEYS.CLIENTS,
    queryFn: async () => {
      const { data } = await api.get('/clients')
      return data.clients || data
    },
  })
  const buyers = clientsData || []

  const toggleSource = (src: string) => {
    update({
      sources: form.sources.includes(src)
        ? form.sources.filter((s) => s !== src)
        : [...form.sources, src],
    })
  }

  const addBuyer = (buyerId: string) => {
    if (!form.assignedBuyers.find((b) => b.buyerId === buyerId)) {
      update({ assignedBuyers: [...form.assignedBuyers, { buyerId, weight: 1 }] })
    }
  }

  const removeBuyer = (buyerId: string) => {
    update({ assignedBuyers: form.assignedBuyers.filter((b) => b.buyerId !== buyerId) })
  }

  const setBuyerWeight = (buyerId: string, weight: number) => {
    update({
      assignedBuyers: form.assignedBuyers.map((b) => b.buyerId === buyerId ? { ...b, weight } : b),
    })
  }

  const addStateRoute = () => {
    update({ stateRouting: [...form.stateRouting, { country: 'US', state: '', buyerId: '', priority: 0 }] })
  }

  const updateStateRoute = (idx: number, patch: Partial<{ country: string; state: string; buyerId: string; priority: number }>) => {
    const next = [...form.stateRouting]
    next[idx] = { ...next[idx], ...patch }
    update({ stateRouting: next })
  }

  const removeStateRoute = (idx: number) => {
    update({ stateRouting: form.stateRouting.filter((_, i) => i !== idx) })
  }

  const availableBuyers = buyers.filter(
    (b) => !form.assignedBuyers.find((ab) => ab.buyerId === b._id)
  )

  const hasInvalidStateRoutes = form.stateRouting.some((r) => !r.state || !r.buyerId)

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return form.sources.length > 0
    if (step === 2) {
      if (form.stateRouting.length > 0 && hasInvalidStateRoutes) return false
    }
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </Button>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Basic Information</h3>
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Campaign name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => update({ endDate: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Source Mapping</h3>
          <p className="text-xs text-muted-foreground">Select which lead sources belong to this campaign</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => toggleSource(src)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  form.sources.includes(src)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-input hover:border-foreground'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
          {form.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {form.sources.map((s) => (
                <Badge key={s} className="bg-primary/10 text-primary border border-primary/20">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Routing & Buyers</h3>
          <div className="space-y-1">
            <Label className="text-xs">Routing Mode</Label>
            <Select
              value={form.routingMode}
              onChange={(e) => update({ routingMode: e.target.value as any })}
              options={ROUTING_MODES.map((m) => ({ label: m.label, value: m.value }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Assigned Buyers</Label>
              {availableBuyers.length > 0 && (
                <select
                  className="text-xs border rounded px-2 py-1 bg-background"
                  onChange={(e) => { if (e.target.value) { addBuyer(e.target.value); e.target.value = '' } }}
                >
                  <option value="">Add buyer...</option>
                  {availableBuyers.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} ({b.state})</option>
                  ))}
                </select>
              )}
            </div>
            {form.assignedBuyers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No buyers assigned yet</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {form.assignedBuyers.map((ab) => {
                  const buyer = buyers.find((b) => b._id === ab.buyerId)
                  return (
                    <div key={ab.buyerId} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="flex-1 text-sm font-medium">{buyer?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{buyer?.state}</span>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Wt:</Label>
                        <Input
                          type="number"
                          min={1}
                          value={ab.weight}
                          onChange={(e) => setBuyerWeight(ab.buyerId, Number(e.target.value))}
                          className="w-14 h-7 text-xs"
                        />
                      </div>
                      <button onClick={() => removeBuyer(ab.buyerId)} className="text-muted-foreground hover:text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {form.routingMode === 'state_based' && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">State Routing Rules</Label>
                <Button variant="outline" size="sm" onClick={addStateRoute}>Add Rule</Button>
              </div>
              {form.stateRouting.length === 0 && (
                <p className="text-xs text-muted-foreground">No state routing rules. All states will use the above buyer assignment.</p>
              )}
              {form.stateRouting.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Country</Label>
                      <Input
                        value={rule.country}
                        onChange={(e) => updateStateRoute(idx, { country: e.target.value.toUpperCase() })}
                        placeholder="US"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">State</Label>
                      <Input
                        value={rule.state}
                        onChange={(e) => updateStateRoute(idx, { state: e.target.value.toUpperCase() })}
                        placeholder="CA"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Buyer</Label>
                      <select
                        value={rule.buyerId}
                        onChange={(e) => updateStateRoute(idx, { buyerId: e.target.value })}
                        className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="">Select...</option>
                        {buyers.map((b) => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Priority</Label>
                      <Input
                        type="number"
                        min={0}
                        value={rule.priority}
                        onChange={(e) => updateStateRoute(idx, { priority: Number(e.target.value) })}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeStateRoute(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Review</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReviewField label="Name" value={form.name} />
            <ReviewField label="Sources" value={form.sources.join(', ') || 'None'} />
            <ReviewField label="Routing Mode" value={form.routingMode.replace(/_/g, ' ')} />
            <ReviewField label="Buyers" value={`${form.assignedBuyers.length} assigned`} />
            <ReviewField label="State Routes" value={`${form.stateRouting.length} rule(s)`} />
            {form.startDate && <ReviewField label="Start Date" value={form.startDate} />}
            {form.endDate && <ReviewField label="End Date" value={form.endDate} />}
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
            <Button size="sm" onClick={() => onSave(form)} disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Update Campaign' : 'Create Campaign'}
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
      <p className="font-medium">{value}</p>
    </div>
  )
}
