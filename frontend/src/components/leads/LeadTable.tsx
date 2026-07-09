import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STATUS_STYLES, DELIVERY_STYLES } from '@/types/lead'
import { formatDate, truncate } from '@/lib/utils'
import type { Lead, SortConfig, LeadsResponse } from '@/types/lead'

interface LeadTableProps {
  data: LeadsResponse | undefined
  isLoading: boolean
  sort: SortConfig
  onSort: (sort: SortConfig) => void
  selected: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onPageChange: (page: number) => void
  onLeadClick: (lead: Lead) => void
}

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'state', label: 'State', sortable: true },
  { key: 'source', label: 'Source', sortable: true },
  { key: 'campaign', label: 'Campaign', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'deliveryStatus', label: 'Delivery', sortable: true },
  { key: 'assignedTo', label: 'Assignment', sortable: false },
  { key: 'createdAt', label: 'Created', sortable: true },
]

export function LeadTable({
  data,
  isLoading,
  sort,
  onSort,
  selected,
  onSelectionChange,
  onPageChange,
  onLeadClick,
}: LeadTableProps) {
  const leads = data?.leads || []
  const pagination = data?.pagination
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l._id))
  const someSelected = leads.some((l) => selected.has(l._id))

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected)
      leads.forEach((l) => next.delete(l._id))
      onSelectionChange(next)
    } else {
      const next = new Set(selected)
      leads.forEach((l) => next.add(l._id))
      onSelectionChange(next)
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelectionChange(next)
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.key !== column) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-30"><path d="m6 9 6-6 6 6"/><path d="m6 15 6 6 6-6"/></svg>
      )
    }
    if (sort.direction === 'asc') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="m6 15 6-6 6 6"/></svg>
      )
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="m6 9 6 6 6-6"/></svg>
    )
  }

  const handleSort = (key: string) => {
    if (key === sort.key) {
      onSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSort({ key, direction: 'asc' })
    }
  }

  const getRoutingBadges = (lead: Lead) => {
    const badges: Array<{ label: string; className: string }> = []

    if (lead.isDuplicate) {
      badges.push({ label: 'Duplicate', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' })
    } else if (lead.assignmentStatus === 'assigned' || lead.assignedTo) {
      badges.push({ label: 'Assigned', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' })
    } else if (lead.assignmentStatus === 'pending' || lead.status === 'pending') {
      badges.push({ label: 'Pending', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' })
    } else {
      badges.push({ label: 'Unassigned', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' })
    }

    if (lead.routingMethod) {
      const label = lead.routingMethod.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
      badges.push({ label, className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' })
    }

    if (lead.ingestionStatus === 'ping_pending') {
      badges.push({ label: 'Ping Pending', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' })
    }

    return badges
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`text-left font-medium px-3 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-20 text-center text-sm text-muted-foreground">
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-20 text-center text-sm text-muted-foreground">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead: Lead) => (
                <tr
                  key={lead._id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onLeadClick(lead)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(lead._id)}
                      onChange={() => toggleOne(lead._id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                  </td>
                  <td className="px-3 py-3 font-medium">{truncate(lead.name, 28)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-3 py-3">{lead.state}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{lead.source}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{lead.campaign || '-'}</td>
                  <td className="px-3 py-3">
                    <Badge className={STATUS_STYLES[lead.status] || ''}>{lead.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={DELIVERY_STYLES[lead.deliveryStatus] || ''}>{lead.deliveryStatus}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">
                        {lead.assignedTo ? truncate(lead.assignedTo.name, 24) : 'Unassigned'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {getRoutingBadges(lead).map((badge) => (
                          <Badge key={`${lead._id}-${badge.label}`} className={badge.className}>{badge.label}</Badge>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - pagination.page) <= 2 || p === 1 || p === pagination.pages)
              .map((p, idx, arr) => (
                <span key={p} className="inline-flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-xs text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={p === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[32px]"
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </Button>
                </span>
              ))}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
