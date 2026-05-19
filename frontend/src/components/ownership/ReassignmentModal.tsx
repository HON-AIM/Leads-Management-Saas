import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import type { Client } from '@/types'

interface ReassignmentModalProps {
  leadId: string
  leadName: string
  currentBuyerName: string | null
  onClose: () => void
  onSuccess: () => void
}

export function ReassignmentModal({ leadId, leadName, currentBuyerName, onClose, onSuccess }: ReassignmentModalProps) {
  const [buyerId, setBuyerId] = useState('')
  const [reason, setReason] = useState('')
  const [syncCrm, setSyncCrm] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: buyersData } = useQuery({
    queryKey: QUERY_KEYS.CLIENTS,
    queryFn: async () => {
      const { data } = await api.get('/clients')
      return data as Client[]
    },
  })

  const buyers = buyersData?.filter((b: Client) =>
    b.status !== 'inactive' && b._id !== currentBuyerName
  ) || []

  const mutation = useMutation({
    mutationFn: async () => {
      if (!buyerId) throw new Error('Please select a buyer')
      const payload: Record<string, unknown> = { buyerId, reason }
      if (syncCrm) payload.syncPlatform = 'GHL'
      const { data } = await api.post(`/leads/${leadId}/reassign`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      onSuccess()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Reassign Lead</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg border bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Ownership history will be preserved.
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Lead</p>
            <p className="font-medium">{leadName}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Current Buyer</p>
            <p className="font-medium">{currentBuyerName || 'Unassigned'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New Buyer *</label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" className="text-muted-foreground">Select a buyer...</option>
              {buyers.map((b: Client) => (
                <option key={b._id} value={b._id}>{b.name} — {b.state} ({b.country})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this lead being reassigned?"
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncCrm}
              onChange={(e) => setSyncCrm(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm">Push CRM update on reassignment</span>
          </label>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!buyerId || mutation.isPending}
          >
            {mutation.isPending ? 'Reassigning...' : 'Reassign Lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}
