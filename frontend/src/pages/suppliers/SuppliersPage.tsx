import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { getStatusStyle, SUPPLIER_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import type { Supplier, SupplierFormData } from '@/types/supplier'
import { Search, Plus, Pencil, Trash2, Package, Copy, Check, X } from 'lucide-react'

export function SuppliersPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierFormData>({ name: '', description: '', type: 'webhook' })
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ success: boolean; data: Supplier[] }>({
    queryKey: QUERY_KEYS.SUPPLIERS,
    queryFn: async () => {
      const { data } = await api.get('/suppliers', { params: { limit: 200 } })
      return data
    },
  })

  const suppliers = data?.data || []

  const createMutation = useMutation({
    mutationFn: async (f: SupplierFormData) => {
      const { data } = await api.post('/suppliers', f)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Supplier created' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
      setCreating(false)
      setForm({ name: '', description: '', type: 'webhook' })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to create supplier' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: SupplierFormData }) => {
      const { data } = await api.put(`/suppliers/${id}`, f)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Saved', description: 'Supplier updated' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
      setEditing(null)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to update supplier' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/suppliers/${id}`) },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Supplier removed' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLIERS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete supplier' }),
  })

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function startEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, description: s.description || '', type: s.type })
  }

  const showForm = creating || editing

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">Suppliers</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{suppliers.length} total</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setCreating(true); setForm({ name: '', description: '', type: 'webhook' }) }} size="sm" variant="cta">
            <Plus size={14} className="mr-1.5" />
            Add Supplier
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-white">{editing ? 'Edit Supplier' : 'New Supplier'}</h3>
            <button onClick={() => { setCreating(false); setEditing(null) }} className="text-muted-foreground hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                placeholder="e.g. Google Ads Leads"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Supplier['type'] })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
              >
                <option value="webhook">Webhook</option>
                <option value="manual">Manual</option>
                <option value="api">API</option>
                <option value="csv">CSV Import</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null) }}>Cancel</Button>
            <Button
              variant="cta"
              size="sm"
              disabled={!form.name.trim() || isPending}
              onClick={() => {
                if (editing) updateMutation.mutate({ id: editing._id, f: form })
                else createMutation.mutate(form)
              }}
            >
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full rounded-lg border border-white/[0.08] bg-[#0e1428] pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-colors"
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left font-medium px-6 py-2.5">Supplier</th>
                <th className="text-left font-medium px-6 py-2.5">Type</th>
                <th className="text-left font-medium px-6 py-2.5">Status</th>
                <th className="text-left font-medium px-6 py-2.5">Supplier Key</th>
                <th className="text-left font-medium px-6 py-2.5">Leads</th>
                <th className="text-left font-medium px-6 py-2.5">Last Lead</th>
                <th className="text-right font-medium px-6 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.06]">
                    <td className="px-6 py-3"><div className="h-4 w-32 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-16 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-14 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-24 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-8 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-16 skeleton bg-white/[0.05] rounded" /></td>
                    <td className="px-6 py-3"><div className="h-4 w-14 skeleton bg-white/[0.05] rounded" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={24} className="text-white/20" />
                      <p className="text-[13px] text-muted-foreground">
                        {search ? 'No suppliers match your search' : 'No suppliers yet'}
                      </p>
                      {!search && !showForm && (
                        <Button variant="cta" size="sm" className="mt-1" onClick={() => setCreating(true)}>
                          Add your first supplier
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s._id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-white/90">{s.name}</p>
                    {s.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{s.description}</p>}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-white/[0.06] text-white/60">
                      {s.type}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getStatusStyle(SUPPLIER_STATUS_COLOR[s.status] ?? 'neutral')}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => copyKey(s.supplierKey)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-mono text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
                      title="Click to copy"
                    >
                      <span className="max-w-[120px] truncate">{s.supplierKey.slice(0, 16)}...</span>
                      {copiedKey === s.supplierKey ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-white/75">{s.totalLeadsReceived}</td>
                  <td className="px-6 py-3 text-[12px] text-white/50">
                    {s.lastLeadAt ? new Date(s.lastLeadAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => startEdit(s)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete supplier "${s.name}"?`)) deleteMutation.mutate(s._id)
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
    </div>
  )
}
