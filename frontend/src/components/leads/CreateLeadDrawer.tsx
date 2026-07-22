import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { X, UserPlus } from 'lucide-react'

interface CreateLeadDrawerProps {
  open: boolean
  onClose: () => void
}

interface Campaign {
  _id: string
  name: string
  status: string
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export function CreateLeadDrawer({ open, onClose }: CreateLeadDrawerProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('')
  const [source, setSource] = useState('manual')
  const [campaignId, setCampaignId] = useState('')

  const { data: campaignsData } = useQuery<{ data: Campaign[] }>({
    queryKey: [...QUERY_KEYS.CAMPAIGNS, 'all'],
    queryFn: async () => {
      const { data } = await api.get('/campaigns', { params: { limit: 200 } })
      return data
    },
    enabled: open,
  })

  const campaigns = campaignsData?.data || []

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await api.post('/leads', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      addNotification({ type: 'success', title: 'Lead created' })
      resetForm()
      onClose()
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: err.response?.data?.message || 'Failed to create lead' })
    },
  })

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setState('')
    setSource('manual')
    setCampaignId('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload: Record<string, any> = { name: name.trim(), source }
    if (email.trim()) payload.email = email.trim()
    if (phone.trim()) payload.phone = phone.trim()
    if (state) payload.state = state
    if (campaignId) payload.campaignId = campaignId
    createMutation.mutate(payload)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg border-l border-white/[0.08] bg-[#0e1428] shadow-drawer animate-slide-in-right">
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <UserPlus size={15} className="text-blue-400" />
              </div>
              <h2 className="text-[14px] font-semibold text-white">Add Lead</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <Field label="Name" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="field-input"
                required
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="field-input"
              />
            </Field>

            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="field-input"
              />
            </Field>

            <Field label="State">
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="field-input"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s} className="bg-[#0e1428]">{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="field-input"
              >
                <option value="manual" className="bg-[#0e1428]">Manual</option>
                <option value="form" className="bg-[#0e1428]">Form</option>
                <option value="import" className="bg-[#0e1428]">Import</option>
                <option value="api" className="bg-[#0e1428]">API</option>
                <option value="referral" className="bg-[#0e1428]">Referral</option>
              </select>
            </Field>

            <Field label="Campaign">
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="field-input"
              >
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c._id} value={c._id} className="bg-[#0e1428]">{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: #151d33;
          padding: 0.375rem 0.75rem;
          font-size: 13px;
          color: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        }
        .field-input::placeholder {
          color: rgba(255,255,255,0.3);
        }
      `}</style>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
