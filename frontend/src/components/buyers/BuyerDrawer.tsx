import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { US_STATES } from '@/types/buyer'
import type { Buyer, BuyerFormData } from '@/types/buyer'
import { PayloadTab } from '@/components/buyers/PayloadTab'
import { X, Trash2 } from 'lucide-react'

interface BuyerDrawerProps {
  buyer: Buyer | null
  isNew: boolean
  onClose: () => void
  onSave: (form: BuyerFormData) => void
  onDelete?: () => void
  isPending: boolean
}

function toForm(buyer: Buyer | null): BuyerFormData {
  return {
    name: buyer?.name || '',
    email: buyer?.email || '',
    phone: buyer?.phone || '',
    weight: buyer?.weight ?? 1,
    priority: buyer?.priority ?? 0,
    allowedStates: buyer?.allowedStates || [],
    leadCap: buyer?.leadCap ?? 0,
    dailyCap: buyer?.dailyCap ?? 0,
    monthlyCap: buyer?.monthlyCap ?? 0,
    delivery: {
      provider: buyer?.delivery?.provider || 'none',
      url: buyer?.delivery?.url || '',
      apiKey: buyer?.delivery?.apiKey || '',
      locationId: buyer?.delivery?.locationId || '',
    },
  }
}

export function BuyerDrawer({ buyer, isNew, onClose, onSave, onDelete, isPending }: BuyerDrawerProps) {
  const [form, setForm] = useState<BuyerFormData>(toForm(buyer))
  const [stateSearch, setStateSearch] = useState('')
  const [showStates, setShowStates] = useState(false)
  const [tab, setTab] = useState<'details' | 'payload'>('details')

  useEffect(() => {
    setForm(toForm(buyer))
    setStateSearch('')
    setShowStates(false)
    setTab('details')
  }, [buyer, isNew])

  const update = (patch: Partial<BuyerFormData>) => setForm((prev) => ({ ...prev, ...patch }))
  const updateDelivery = (patch: Partial<BuyerFormData['delivery']>) =>
    setForm((prev) => ({ ...prev, delivery: { ...prev.delivery, ...patch } }))

  const toggleState = (st: string) => {
    update({
      allowedStates: form.allowedStates.includes(st)
        ? form.allowedStates.filter((s) => s !== st)
        : [...form.allowedStates, st],
    })
  }

  const open = buyer !== null || isNew
  const title = isNew ? 'New Buyer' : buyer?.name || 'Edit Buyer'
  const filteredStates = US_STATES.filter(
    (st) => st.toLowerCase().includes(stateSearch.toLowerCase()) && !form.allowedStates.includes(st)
  )

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg border-l border-white/[0.08] bg-[#0e1428] shadow-drawer animate-slide-in-right">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-white truncate">{title}</h2>
              {!isNew && buyer && (
                <p className="text-[11px] text-muted-foreground truncate">{buyer.email}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              {!isNew && onDelete && (
                <button
                  onClick={onDelete}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {!isNew && (
            <div className="flex border-b border-white/[0.08]">
              {(['details', 'payload'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-muted-foreground hover:text-white/70'
                  }`}
                >
                  {t === 'details' ? 'Details' : 'Payload'}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {tab === 'details' && (
              <>
            <Section title="Basic Info">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Buyer name" className="text-white" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="buyer@example.com" className="text-white" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="Optional" className="text-white" />
              </Field>
            </Section>

            <Section title="Delivery">
              <Field label="Provider">
                <div className="flex gap-1.5">
                  {(['none', 'webhook', 'ghl'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateDelivery({ provider: p })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all capitalize ${
                        form.delivery.provider === p
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                          : 'border-white/[0.10] text-muted-foreground hover:border-white/[0.14] hover:text-white/70'
                      }`}
                    >
                      {p === 'none' ? 'None' : p === 'ghl' ? 'GHL' : 'Webhook'}
                    </button>
                  ))}
                </div>
              </Field>
              {form.delivery.provider === 'webhook' && (
                <Field label="Webhook URL">
                  <Input value={form.delivery.url} onChange={(e) => updateDelivery({ url: e.target.value })} placeholder="https://..." className="font-mono text-[12px] text-white" />
                </Field>
              )}
              {form.delivery.provider === 'ghl' && (
                <>
                  <Field label="Location ID">
                    <Input value={form.delivery.locationId} onChange={(e) => updateDelivery({ locationId: e.target.value })} placeholder="GHL location ID" className="text-white" />
                  </Field>
                  <Field label="API Key">
                    <Input value={form.delivery.apiKey} onChange={(e) => updateDelivery({ apiKey: e.target.value })} placeholder="GHL API key" type="password" className="text-white" />
                  </Field>
                </>
              )}
            </Section>

            <Section title="States">
              {form.allowedStates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.allowedStates.map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-400 px-2 py-0.5 text-[11px] font-medium"
                    >
                      {st}
                      <button onClick={() => toggleState(st)} className="hover:text-blue-300 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  value={stateSearch}
                  onChange={(e) => { setStateSearch(e.target.value); setShowStates(true) }}
                  onFocus={() => setShowStates(true)}
                  placeholder="Type to add states..."
                  className="w-full rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {showStates && stateSearch && filteredStates.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated">
                    {filteredStates.slice(0, 12).map((st) => (
                      <button
                        key={st}
                        onClick={() => { toggleState(st); setStateSearch(''); setShowStates(false) }}
                        className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-white/[0.06] text-white/80 transition-colors"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
                {showStates && stateSearch && filteredStates.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated px-3 py-2 text-[11px] text-muted-foreground">
                    No matches
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {form.allowedStates.length === 0 ? 'No states selected — buyer accepts all' : `${form.allowedStates.length} state(s) selected`}
              </p>
            </Section>

            <Section title="Caps">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Total Cap">
                  <Input type="number" min={0} value={form.leadCap} onChange={(e) => update({ leadCap: Number(e.target.value) })} className="text-white" />
                </Field>
                <Field label="Daily Cap">
                  <Input type="number" min={0} value={form.dailyCap} onChange={(e) => update({ dailyCap: Number(e.target.value) })} className="text-white" />
                </Field>
                <Field label="Monthly Cap">
                  <Input type="number" min={0} value={form.monthlyCap} onChange={(e) => update({ monthlyCap: Number(e.target.value) })} className="text-white" />
                </Field>
              </div>
              <p className="text-[10px] text-muted-foreground/70">0 = unlimited</p>
            </Section>

            <Section title="Routing">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight">
                  <Input type="number" min={1} value={form.weight} onChange={(e) => update({ weight: Number(e.target.value) })} className="text-white" />
                </Field>
                <Field label="Priority">
                  <Input type="number" min={0} value={form.priority} onChange={(e) => update({ priority: Number(e.target.value) })} className="text-white" />
                </Field>
              </div>
            </Section>
              </>
            )}

            {tab === 'payload' && !isNew && buyer && (
              <PayloadTab buyerId={buyer._id} />
            )}
          </div>

          <div className="border-t border-white/[0.08] px-6 py-4 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => onSave(form)}
              disabled={isPending || !form.name.trim() || !form.email.trim()}
            >
              {isPending ? 'Saving...' : isNew ? 'Create Buyer' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
