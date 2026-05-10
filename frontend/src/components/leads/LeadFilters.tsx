import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_OPTIONS, DELIVERY_STATUS_OPTIONS } from '@/types/lead'
import type { LeadFilters as Filters } from '@/types/lead'

interface LeadFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  onReset: () => void
}

export function LeadFilters({ filters, onChange, onReset }: LeadFiltersProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  const hasFilters =
    filters.search || filters.status || filters.source || filters.state ||
    filters.buyer || filters.campaign || filters.deliveryStatus ||
    filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Input
          placeholder="Search name or email..."
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value })}
        />
        <Select
          placeholder="Status"
          value={filters.status || ''}
          onChange={(e) => update({ status: e.target.value })}
          options={STATUS_OPTIONS.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
        />
        <Select
          placeholder="Delivery"
          value={filters.deliveryStatus || ''}
          onChange={(e) => update({ deliveryStatus: e.target.value })}
          options={DELIVERY_STATUS_OPTIONS.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
        />
        <Input
          placeholder="Source"
          value={filters.source || ''}
          onChange={(e) => update({ source: e.target.value })}
        />
        <Input
          placeholder="State"
          value={filters.state || ''}
          onChange={(e) => update({ state: e.target.value })}
        />
        <Input
          placeholder="Campaign"
          value={filters.campaign || ''}
          onChange={(e) => update({ campaign: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="space-y-1 col-span-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
        </div>
        <div className="space-y-1 col-span-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </div>
        <div className="flex items-end col-span-2 sm:col-span-2 lg:col-span-4">
          <Input
            placeholder="Buyer name"
            value={filters.buyer || ''}
            onChange={(e) => update({ buyer: e.target.value })}
          />
        </div>
        {hasFilters && (
          <div className="flex items-end justify-end col-span-2 sm:col-span-4 lg:col-span-6">
            <Button variant="ghost" size="sm" onClick={onReset}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
