import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_OPTIONS, PROVIDER_OPTIONS } from '@/types/delivery'
import type { DeliveryFilters as Filters } from '@/types/delivery'
import { X } from 'lucide-react'

interface DeliveryFiltersProps {
  filters: Filters
  buyers: { _id: string; name: string }[]
  onChange: (filters: Filters) => void
  onReset: () => void
}

export function DeliveryFilters({ filters, buyers, onChange, onReset }: DeliveryFiltersProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  const hasFilters = filters.status || filters.provider || filters.buyerId || filters.dateFrom || filters.dateTo

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        placeholder="All Statuses"
        value={filters.status}
        onChange={(e) => update({ status: e.target.value })}
        options={STATUS_OPTIONS}
      />
      <Select
        placeholder="All Providers"
        value={filters.provider}
        onChange={(e) => update({ provider: e.target.value })}
        options={PROVIDER_OPTIONS}
      />
      <Select
        placeholder="All Buyers"
        value={filters.buyerId}
        onChange={(e) => update({ buyerId: e.target.value })}
        options={[
          { label: 'All Buyers', value: '' },
          ...buyers.map((b) => ({ label: b.name, value: b._id })),
        ]}
      />
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => update({ dateFrom: e.target.value })}
        className="flex h-9 rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-[12px] text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) => update({ dateTo: e.target.value })}
        className="flex h-9 rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-[12px] text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-white/70">
          <X size={12} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
