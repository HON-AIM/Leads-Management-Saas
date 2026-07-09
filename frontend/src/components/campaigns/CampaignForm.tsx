import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ROUTING_MODES, SOURCE_OPTIONS } from '@/types/campaign'
import type { Campaign, CampaignFormData } from '@/types/campaign'
import type { Client } from '@/types'

interface CampaignFormProps {
  campaign?: Campaign
  onSave: (data: CampaignFormData) => void
  onClose: () => void
  isPending: boolean
}

const STEPS = ['Campaign', 'Sources & Routing', 'Buyers', 'Review']

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
    costPerLead: campaign?.costPerLead ?? 0,
    pingTimeoutMs: campaign?.pingTimeoutMs ?? 3000,
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

  const availableBuyers = buyers.filter((b) => !form.assignedBuyers.find((ab) => ab.buyerId === b._id))
  const selectedMode = ROUTING_MODES.find((m) => m.value === form.routingMode)

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return form.sources.length > 0
    if (step === 2) return form.assignedBuyers.length > 0
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Routing is configured here — buyers are destinations only</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
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
          <div className="space-y-1">
            <Label className="text-xs">Campaign Name *</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Texas Insurance Leads" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="What leads does this campaign handle?"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Lead Sources *</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Incoming leads matching these sources route through this campaign</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => toggleSource(src)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                    form.sources.includes(src)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:border-foreground'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Routing Mode</Label>
            <Select
              value={form.routingMode}
              onChange={(e) => update({ routingMode: e.target.value as CampaignFormData['routingMode'] })}
              options={ROUTING_MODES.map((m) => ({ label: m.label, value: m.value }))}
            />
            {selectedMode && (
              <p className="text-[11px] text-muted-foreground mt-1">{selectedMode.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cost Per Lead ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.costPerLead}
                onChange={(e) => update({ costPerLead: Number(e.target.value) })}
              />
              <p className="text-[10px] text-muted-foreground">Acquisition cost for P&L tracking</p>
            </div>
            {form.routingMode === 'ping_post' && (
              <div className="space-y-1">
                <Label className="text-xs">Ping Timeout (ms)</Label>
                <Input
                  type="number"
                  min={500}
                  max={30000}
                  step={500}
                  value={form.pingTimeoutMs}
                  onChange={(e) => update({ pingTimeoutMs: Number(e.target.value) })}
                />
                <p className="text-[10px] text-muted-foreground">Auction window for buyer bids</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Buyers *</Label>
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
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">Add at least one buyer to this campaign</p>
          ) : (
            <div className="space-y-2">
              {form.assignedBuyers.map((ab, idx) => {
                const buyer = buyers.find((b) => b._id === ab.buyerId)
                return (
                  <div key={ab.buyerId} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium">{buyer?.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{buyer?.state}</span>
                    {form.routingMode === 'weighted' && (
                      <Input
                        type="number"
                        min={1}
                        value={ab.weight}
                        onChange={(e) => setBuyerWeight(ab.buyerId, Number(e.target.value))}
                        className="w-14 h-7 text-xs"
                        title="Weight"
                      />
                    )}
                    <button onClick={() => removeBuyer(ab.buyerId)} className="text-muted-foreground hover:text-destructive text-sm">✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {form.routingMode === 'exclusive' && form.assignedBuyers.length > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Exclusive mode sends all leads to the first buyer in the list.</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ReviewField label="Campaign" value={form.name} />
          <ReviewField label="Sources" value={form.sources.join(', ')} />
          <ReviewField label="Routing" value={selectedMode?.label || form.routingMode} />
          <ReviewField label="Buyers" value={`${form.assignedBuyers.length} assigned`} />
          <ReviewField label="Cost/Lead" value={`$${form.costPerLead}`} />
          {form.routingMode === 'ping_post' && (
            <ReviewField label="Ping Timeout" value={`${form.pingTimeoutMs}ms`} />
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Previous</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button>
          ) : (
            <Button size="sm" onClick={() => onSave(form)} disabled={isPending || !canProceed()}>
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create Campaign'}
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
