import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import { TERRITORY_STATUS_OPTIONS } from '@/types/location'
import type { ITerritory, TerritoryFormData, ICountry, IRegion } from '@/types/location'

export function TerritoriesPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ITerritory | null>(null)

  const [form, setForm] = useState<TerritoryFormData>({
    name: '', code: '', regionId: '', status: 'active', priority: 0,
  })

  const { data: territoriesData, isLoading } = useQuery<{ success: boolean; territories: ITerritory[] }>({
    queryKey: QUERY_KEYS.TERRITORIES,
    queryFn: async () => {
      const { data } = await api.get('/locations/territories')
      return data
    },
  })

  const { data: countriesData } = useQuery<{ success: boolean; countries: ICountry[] }>({
    queryKey: QUERY_KEYS.COUNTRIES,
    queryFn: async () => {
      const { data } = await api.get('/locations/countries')
      return data
    },
  })

  const { data: regionsData } = useQuery<{ success: boolean; regions: IRegion[] }>({
    queryKey: QUERY_KEYS.REGIONS,
    queryFn: async () => {
      const { data } = await api.get('/locations/regions')
      return data
    },
  })

  const territories = territoriesData?.territories || []
  const countries = countriesData?.countries || []
  const regions = regionsData?.regions || []

  const filteredRegions = regions.filter((r) => !countryFilter || r.countryId === countryFilter)

  const createMutation = useMutation({
    mutationFn: async (formData: TerritoryFormData) => {
      const { data } = await api.post('/locations/territories', formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Territory created successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TERRITORIES })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATION_STATS })
      closeForm()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to create territory' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: TerritoryFormData }) => {
      const { data } = await api.put(`/locations/territories/${id}`, formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Updated', description: 'Territory updated successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TERRITORIES })
      closeForm()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to update territory' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/locations/territories/${id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Territory deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TERRITORIES })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATION_STATS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete territory' }),
  })

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', code: '', regionId: regionFilter || '', status: 'active', priority: 0 })
    setShowForm(true)
  }

  const openEdit = (item: ITerritory) => {
    setEditItem(item)
    setForm({
      name: item.name, code: item.code, regionId: item.regionId,
      status: item.status, priority: item.priority,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditItem(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editItem) {
      updateMutation.mutate({ id: editItem._id, formData: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const filtered = territories.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
    const matchesRegion = !regionFilter || t.regionId === regionFilter
    const matchesCountry = !countryFilter || t.countryId === countryFilter
    return matchesSearch && matchesRegion && matchesCountry
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="Search territories..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setRegionFilter('') }}
          options={[{ label: 'All Countries', value: '' }, ...countries.map((c) => ({ label: c.name, value: c._id }))]}
          placeholder="Filter by country"
          className="max-w-[200px]"
        />
        <Select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          options={[{ label: 'All Regions', value: '' }, ...filteredRegions.map((r) => ({ label: r.name, value: r._id }))]}
          placeholder="Filter by region"
          className="max-w-[200px]"
        />
        <div className="ml-auto">
          <Button onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Territory
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Territories ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : !filtered.length ? (
            <div className="p-4 text-sm text-muted-foreground">No territories found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 font-medium">Region</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Driver</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((territory) => (
                    <tr key={territory._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{territory.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{territory.code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{territory.countryName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{territory.regionName}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${territory.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {territory.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{territory.priority}</td>
                      <td className="px-4 py-3 text-muted-foreground">{territory.assignedDriver || '--'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(territory.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(territory)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 dark:text-red-400"
                          onClick={() => { if (confirm(`Delete territory "${territory.name}"?`)) deleteMutation.mutate(territory._id) }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeForm}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md border-l bg-background shadow-xl overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">{editItem ? 'Edit Territory' : 'Add Territory'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Country</label>
                  <Select
                    value={countryFilter || (editItem ? editItem.countryId : '')}
                    onChange={(e) => { setCountryFilter(e.target.value); setForm({ ...form, regionId: '' }) }}
                    options={[{ label: 'Select country', value: '' }, ...countries.map((c) => ({ label: c.name, value: c._id }))]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Region</label>
                  <Select
                    value={form.regionId}
                    onChange={(e) => setForm({ ...form, regionId: e.target.value })}
                    options={[{ label: 'Select region', value: '' }, ...filteredRegions.map((r) => ({ label: r.name, value: r._id }))]}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Downtown LA" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Code</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. DTLA" maxLength={10} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} options={[...TERRITORY_STATUS_OPTIONS]} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Assigned Driver</label>
                  <Input value={form.assignedDriver || ''} onChange={(e) => setForm({ ...form, assignedDriver: e.target.value })} placeholder="Optional driver name/ID" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editItem ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
