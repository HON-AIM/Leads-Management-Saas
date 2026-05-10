import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { useNotifications } from '@/hooks/useNotifications'
import type { Lead } from '@/types/lead'

interface BulkActionsProps {
  selected: Set<string>
  leads: Lead[]
  onClear: () => void
}

export function BulkActions({ selected, leads, onClear }: BulkActionsProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const count = selected.size

  const selectedLeads = leads.filter((l) => selected.has(l._id))

  const assignMutation = useMutation({
    mutationFn: async () => {
      await api.post('/leads/bulk/assign', { leadIds: Array.from(selected) })
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Assigned', description: `${count} lead(s) queued for routing` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      onClear()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to assign leads' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.post('/leads/bulk/delete', { leadIds: Array.from(selected) })
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: `${count} lead(s) deleted` })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LEADS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STATS })
      onClear()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete leads' }),
  })

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'State', 'Source', 'Campaign', 'Status', 'Delivery Status', 'Assigned To', 'Created']
    const rows = selectedLeads.map((l) => [
      escapeCsv(l.name),
      escapeCsv(l.email),
      escapeCsv(l.phone || ''),
      escapeCsv(l.state),
      escapeCsv(l.source),
      escapeCsv(l.campaign || ''),
      l.status,
      l.deliveryStatus,
      escapeCsv(l.assignedTo?.name || ''),
      l.createdAt,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addNotification({ type: 'success', title: 'Exported', description: `${count} lead(s) exported to CSV` })
  }

  if (count === 0) return null

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
            Assign
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}
