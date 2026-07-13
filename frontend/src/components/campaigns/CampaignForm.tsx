import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ROUTING_MODES, SOURCE_OPTIONS } from '@/types/campaign'
import type { Campaign, CampaignFormData } from '@/types/campaign'
import type { Buyer } from '@/types/buyer'

interface CampaignFormProps {
  campaign?: Campaign
  onSave: (data: CampaignFormData) => void
  onClose: () => void
  isPending: boolean
}

const STEPS = ['Name', 'Source & Webhook', 'Routing', 'Buyers', 'Finish']

export function CampaignForm({ campaign, onSave, onClose, isPending }: CampaignFormProps) {
  const isEdit = !!campaign
  const [step, setStep] = useState(0)

  const [form, setForm] = useState<CampaignFormData>({
    name: campaign?.name || '',
    description: campaign?.description || '',
    source: campaign?.source || 'webhook',
    webhookUrl: campaign?.webhookUrl || '',
    routingMode: campaign?.routingMode || 'round_robin',
    assignedBuyers: campaign?.assignedBuyers?.map((b) => ({
      buyerId: typeof b.buyerId === 'object' ? b.buyerId._id : b.buyerId,
      weight: b.weight,
      priority: b.priority ?? 0,
    })) || [],
    costPerLead: campaign?.costPerLead ?? 0,
    dedupWindowHours: campaign?.dedupWindowHours ?? 720,
  })

  const update = (patch: Partial<CampaignFormData>) => setForm((prev) => ({ ...prev, ...patch }))

  const { data: buyersData } = useQuery({
    queryKey: QUERY_KEYS.BUYERS,
    queryFn: async () => {
      const { data } = await api.get('/buyers')
      return data.data ?? data.buyers ?? data ?? []
    },
  })
  const buyers: Buyer[] = Array.isArray(buyersData) ? buyersData : []

  const addBuyer = (buyerId: string) => {
    if (!form.assignedBuyers.find((b) => b.buyerId === buyerId)) {
      update({ assignedBuyers: [...form.assignedBuyers, { buyerId, weight: 1, priority: 0 }] })
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

  const setBuyerPriority = (buyerId: string, priority: number) => {
    update({
      assignedBuyers: form.assignedBuyers.map((b) => b.buyerId === buyerId ? { ...b, priority } : b),
    })
  }

  const availableBuyers = buyers.filter((b) => b.status === 'active' && !form.assignedBuyers.find((ab) => ab.buyerId === b._id))
  const selectedMode = ROUTING_MODES.find((m) => m.value === form.routingMode)

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return true
    if (step === 2) return true
    if (step === 3) return form.assignedBuyers.length > 0
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure how leads flow through this campaign</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-white/80 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-white/[0.08]'}`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'text-white font-medium' : 'text-muted-foreground'}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* Step 1: Campaign Name */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Texas Insurance Leads"
              className="text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={2}
              className="flex w-full rounded-lg border border-white/[0.08] bg-transparent px-3 py-2 text-[13px] text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-muted-foreground/50 transition-colors"
              placeholder="What leads does this campaign handle?"
            />
          </div>
        </div>
      )}

      {/* Step 2: Source & Webhook */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lead Source</Label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => update({ source: src })}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                    form.source === src
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-transparent text-muted-foreground border-white/[0.08] hover:border-white/[0.14] hover:text-white/80'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Webhook URL</Label>
            <p className="text-[11px] text-muted-foreground/80 mb-1">POST endpoint for incoming leads (optional)</p>
            <Input
              value={form.webhookUrl}
              onChange={(e) => update({ webhookUrl: e.target.value })}
              placeholder="https://your-domain.com/api/leads"
              className="font-mono text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* Step 3: Routing Method */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Routing Method</Label>
            <div className="space-y-2">
              {ROUTING_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => update({ routingMode: mode.value })}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    form.routingMode === mode.value
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-white/[0.08] hover:border-white/[0.14]'
                  }`}
                >
                  <p className={`text-sm font-medium ${form.routingMode === mode.value ? 'text-blue-400' : 'text-white'}`}>
                    {mode.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cost Per Lead ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.costPerLead}
                onChange={(e) => update({ costPerLead: Number(e.target.value) })}
                className="text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dedup Window (hours)</Label>
              <Input
                type="number"
                min={1}
                value={form.dedupWindowHours}
                onChange={(e) => update({ dedupWindowHours: Number(e.target.value) })}
                className="text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Assign Buyers */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Assign Buyers *</Label>
            {availableBuyers.length > 0 && (
              <select
                className="text-xs border border-white/[0.15] rounded-lg px-3 py-2 bg-[#151d33] text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                style={{ colorScheme: 'dark' }}
                value=""
                onChange={(e) => { if (e.target.value) { addBuyer(e.target.value); e.target.value = '' } }}
              >
                <option value="" className="bg-[#151d33] text-white/60">Add buyer...</option>
                {availableBuyers.map((b) => (
                  <option key={b._id} value={b._id} className="bg-[#151d33] text-white">{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {form.assignedBuyers.length === 0 ? (
            <div className="text-center py-10 rounded-lg border border-dashed border-white/[0.12]">
              <p className="text-sm text-muted-foreground">Add at least one buyer to this campaign</p>
            </div>
          ) : (
            <div className="space-y-2">
              {form.assignedBuyers.map((ab, idx) => {
                const buyer = buyers.find((b) => b._id === ab.buyerId)
                return (
                  <div key={ab.buyerId} className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                    <span className="flex-1 text-sm font-medium text-white">{buyer?.name || 'Unknown'}</span>
                    {form.routingMode === 'weighted' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">W:</span>
                        <Input
                          type="number"
                          min={1}
                          value={ab.weight}
                          onChange={(e) => setBuyerWeight(ab.buyerId, Number(e.target.value))}
                          className="w-14 h-7 text-xs text-white"
                        />
                      </div>
                    )}
                    {form.routingMode === 'priority' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">P:</span>
                        <Input
                          type="number"
                          min={0}
                          value={ab.priority}
                          onChange={(e) => setBuyerPriority(ab.buyerId, Number(e.target.value))}
                          className="w-14 h-7 text-xs text-white"
                        />
                      </div>
                    )}
                    <button onClick={() => removeBuyer(ab.buyerId)} className="text-muted-foreground hover:text-red-400 text-sm transition-colors">✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {form.routingMode === 'exclusive' && form.assignedBuyers.length > 1 && (
            <p className="text-xs text-amber-400">Exclusive mode sends all leads to the first buyer in the list.</p>
          )}
        </div>
      )}

      {/* Step 5: Review & Finish */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.08] divide-y divide-white/[0.06]">
            <ReviewRow label="Campaign Name" value={form.name} />
            <ReviewRow label="Source" value={form.source} />
            <ReviewRow label="Webhook URL" value={form.webhookUrl || 'Not set'} />
            <ReviewRow label="Routing" value={selectedMode?.label || form.routingMode} />
            <ReviewRow label="Buyers" value={`${form.assignedBuyers.length} assigned`} />
            <ReviewRow label="Cost/Lead" value={`$${form.costPerLead}`} />
            <ReviewRow label="Dedup Window" value={`${form.dedupWindowHours}h`} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
        <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button>
          ) : (
            <Button size="sm" onClick={() => onSave(form)} disabled={isPending || !canProceed()}>
              {isPending ? 'Saving...' : isEdit ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-white capitalize">{value}</p>
    </div>
  )
}
