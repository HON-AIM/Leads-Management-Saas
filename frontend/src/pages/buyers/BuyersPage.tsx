import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { BuyerDrawer } from '@/components/buyers/BuyerDrawer'
import { STATUS_STYLES } from '@/types/buyer'
import type { Buyer, BuyerFormData } from '@/types/buyer'
import { Search, Plus, Pencil, Trash2, Building2 } from 'lucide-react'

export function BuyersPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [search, setSearch] = useState('')
  const [drawerBuyer, setDrawerBuyer] = useState<Buyer | 'new' | null>(null)

  const { data, isLoading } = useQuery<{ success: boolean; data: Buyer[] }>({
    queryKey: QUERY_KEYS.BUYERS,
    queryFn: async () => {
      const { data } = await api.get('/buyers', { params: { limit: 200 } })
      return data
    },
  })

  const buyers = data?.data || []

  const createMutation = useMutation({
    mutationFn: async (form: BuyerFormData) => {
      const { data } = await api.post('/buyers', form)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Buyer created' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUYERS })
      setDrawerBuyer(null)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to create buyer' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: BuyerFormData }) => {
      const { data } = await api.put(`/buyers/${id}`, form)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Saved', description: 'Buyer updated' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUYERS })
      setDrawerBuyer(null)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to update buyer' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/buyers/${id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Buyer removed' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUYERS })
      setDrawerBuyer(null)
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete buyer' }),
  })

  const filtered = buyers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase()) ||
    b.allowedStates.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Buyers</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{buyers.length} total</p>
        </div>
        <Button onClick={() => setDrawerBuyer('new')} size="sm">
          <Plus size={14} className="mr-1.5" />
          Add Buyer
        </Button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or state..."
          className="w-full rounded-lg border border-white/[0.08] bg-[#0c1021] pl-9 pr-3 py-2 text-[13px] text-white/90 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-colors"
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c1021] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left font-medium px-6 py-2.5">Buyer</th>
                <th className="text-left font-medium px-6 py-2.5">Status</th>
                <th className="text-left font-medium px-6 py-2.5">Weight</th>
                <th className="text-left font-medium px-6 py-2.5">Daily Cap</th>
                <th className="text-left font-medium px-6 py-2.5">Leads Today</th>
                <th className="text-left font-medium px-6 py-2.5">States</th>
                <th className="text-left font-medium px-6 py-2.5">Priority</th>
                <th className="text-right font-medium px-6 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td className="px-6 py-3"><div className="h-4 w-28 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-14 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-20 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.03] rounded" /></td>
                      <td className="px-6 py-3"><div className="h-4 w-14 skeleton bg-white/[0.03] rounded" /></td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 size={24} className="text-white/10" />
                      <p className="text-[13px] text-muted-foreground">
                        {search ? 'No buyers match your search' : 'No buyers yet'}
                      </p>
                      {!search && (
                        <Button variant="outline" size="sm" className="mt-1" onClick={() => setDrawerBuyer('new')}>
                          Add your first buyer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((b) => (
                <tr
                  key={b._id}
                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => setDrawerBuyer(b)}
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-white/90">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.email}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[b.status] || STATUS_STYLES.inactive}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-white/60">{b.weight}</td>
                  <td className="px-6 py-3 text-white/60">{b.dailyCap || '—'}</td>
                  <td className="px-6 py-3 text-white/60">{b.dailyLeadsReceived}</td>
                  <td className="px-6 py-3">
                    <p className="text-[12px] text-white/40 max-w-[140px] truncate" title={b.allowedStates.join(', ')}>
                      {b.allowedStates.length > 0 ? b.allowedStates.join(', ') : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-3 text-white/60">{b.priority}</td>
                  <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => setDrawerBuyer(b)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${b.name}"?`)) deleteMutation.mutate(b._id)
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BuyerDrawer
        buyer={drawerBuyer === 'new' ? null : drawerBuyer}
        isNew={drawerBuyer === 'new'}
        onClose={() => setDrawerBuyer(null)}
        onSave={(form) => {
          if (drawerBuyer === 'new') {
            createMutation.mutate(form)
          } else if (drawerBuyer) {
            updateMutation.mutate({ id: drawerBuyer._id, form })
          }
        }}
        onDelete={drawerBuyer && drawerBuyer !== 'new' ? () => {
          if (confirm(`Delete "${drawerBuyer.name}"?`)) deleteMutation.mutate(drawerBuyer._id)
        } : undefined}
        isPending={isPending}
      />
    </div>
  )
}
