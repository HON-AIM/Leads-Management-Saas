import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_OPTIONS, PROVIDER_OPTIONS } from '@/types/delivery'
import type { DeliveryFilters as Filters } from '@/types/delivery'

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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Select
          placeholder="Status"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          options={STATUS_OPTIONS}
        />
        <Select
          placeholder="Provider"
          value={filters.provider}
          onChange={(e) => update({ provider: e.target.value })}
          options={PROVIDER_OPTIONS}
        />
        <Select
          placeholder="Buyer"
          value={filters.buyerId}
          onChange={(e) => update({ buyerId: e.target.value })}
          options={[
            { label: 'All Buyers', value: '' },
            ...buyers.map((b) => ({ label: b.name, value: b._id })),
          ]}
        />
        <Input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} />
        <Input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} />
        {hasFilters && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={onReset}>Clear</Button>
          </div>
        )}
      </div>
    </div>
  )
}
