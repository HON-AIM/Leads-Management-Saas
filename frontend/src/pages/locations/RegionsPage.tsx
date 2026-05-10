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
import { REGION_STATUS_OPTIONS } from '@/types/location'
import type { IRegion, RegionFormData, ICountry } from '@/types/location'

export function RegionsPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<IRegion | null>(null)

  const [form, setForm] = useState<RegionFormData>({ name: '', code: '', countryId: '', status: 'active' })

  const { data: regionsData, isLoading: regionsLoading } = useQuery<{ success: boolean; regions: IRegion[] }>({
    queryKey: QUERY_KEYS.REGIONS,
    queryFn: async () => {
      const { data } = await api.get('/locations/regions')
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

  const regions = regionsData?.regions || []
  const countries = countriesData?.countries || []

  const createMutation = useMutation({
    mutationFn: async (formData: RegionFormData) => {
      const { data } = await api.post('/locations/regions', formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Region created successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REGIONS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATION_STATS })
      closeForm()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to create region' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: RegionFormData }) => {
      const { data } = await api.put(`/locations/regions/${id}`, formData)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Updated', description: 'Region updated successfully' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REGIONS })
      closeForm()
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to update region' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/locations/regions/${id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Region deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.REGIONS })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATION_STATS })
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete region' }),
  })

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', code: '', countryId: countryFilter || '', status: 'active' })
    setShowForm(true)
  }

  const openEdit = (item: IRegion) => {
    setEditItem(item)
    setForm({ name: item.name, code: item.code, countryId: item.countryId, status: item.status })
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

  const filtered = regions.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())
    const matchesCountry = !countryFilter || r.countryId === countryFilter
    return matchesSearch && matchesCountry
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search regions..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          options={[{ label: 'All Countries', value: '' }, ...countries.map((c) => ({ label: c.name, value: c._id }))]}
          placeholder="Filter by country"
          className="max-w-[200px]"
        />
        <div className="ml-auto">
          <Button onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Region
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {regionsLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : !filtered.length ? (
            <div className="p-4 text-sm text-muted-foreground">No regions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Territories</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((region) => (
                    <tr key={region._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{region.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{region.code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{region.countryName}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${region.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {region.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{region.totalTerritories}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(region.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(region)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 dark:text-red-400"
                          onClick={() => { if (confirm(`Delete region "${region.name}"?`)) deleteMutation.mutate(region._id) }}
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
              <h2 className="text-lg font-semibold mb-4">{editItem ? 'Edit Region' : 'Add Region'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Country</label>
                  <Select
                    value={form.countryId}
                    onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                    options={countries.map((c) => ({ label: c.name, value: c._id }))}
                    placeholder="Select country"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. California" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Code</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CA" maxLength={5} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} options={[...REGION_STATUS_OPTIONS]} />
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
