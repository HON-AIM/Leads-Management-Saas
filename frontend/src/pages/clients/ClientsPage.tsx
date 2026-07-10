import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { BuyersTable } from '@/components/buyers/BuyersTable'
import { BuyerForm } from '@/components/buyers/BuyerForm'
import { CapManagement } from '@/components/buyers/CapManagement'
import { RoutingSettings } from '@/components/buyers/RoutingSettings'
import { WebhookTester } from '@/components/buyers/WebhookTester'
import { PerformanceMetrics } from '@/components/buyers/PerformanceMetrics'
import { formatNumber, formatPercentage } from '@/lib/utils'
import type { Client, BuyerStats } from '@/types'

function computeStats(client: Client): BuyerStats {
  const totalLeads = client.leadsReceived
  const deliveredLeads = Math.round(totalLeads * (client.deliveryRate ?? 0.8) * (client.deliveryRate != null ? 1 : 0.8))
  const failedLeads = totalLeads - deliveredLeads
  return {
    totalLeads,
    deliveredLeads,
    failedLeads,
    deliveryRate: client.deliveryRate ?? (totalLeads > 0 ? deliveredLeads / totalLeads * 100 : 100),
    dailyUsage: client.dailyLeadsReceived,
    monthlyUsage: client.monthlyLeadsReceived,
    dailyCap: client.dailyCap,
    monthlyCap: client.monthlyCap,
    leadCap: client.leadCap,
  }
}

export function ClientsPage() {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [stateFilter, setStateFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [detailTab, setDetailTab] = useState('overview')

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: QUERY_KEYS.CLIENTS,
    queryFn: async () => {
      const { data } = await api.get('/clients')
      return data.clients || data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`)
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Buyer has been deleted' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENTS })
      setSelectedClient(null)
    },
    onError: () => addNotification({ type: 'error', title: 'Error', description: 'Failed to delete buyer' }),
  })

  const list = clients || []
  const activeBuyers = list.filter((c) => c.status === 'active' && !c.isPaused)
  const avgDeliveryRate = list.length > 0
    ? list.reduce((sum, c) => sum + (c.deliveryRate ?? 80), 0) / list.length
    : 0
  const totalLeadsReceived = list.reduce((sum, c) => sum + c.leadsReceived, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-[0_16px_50px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Buyer operations</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Buyers</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Manage buyer destinations, delivery health, and caps with the same clarity as the routing engine.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Add Buyer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-100 bg-gradient-to-br from-blue-500/10 to-indigo-600/10">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Buyers</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(list.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{formatNumber(activeBuyers.length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg Delivery Rate</p>
            <p className="mt-1 text-2xl font-semibold">{formatPercentage(avgDeliveryRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(totalLeadsReceived)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">All Buyers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <BuyersTable
            clients={list}
            isLoading={isLoading}
            stateFilter={stateFilter}
            onStateFilterChange={setStateFilter}
            onEdit={setSelectedClient}
            onDelete={(client) => {
              if (confirm(`Delete buyer "${client.name}"?`)) {
                deleteMutation.mutate(client._id)
              }
            }}
          />
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setSelectedClient(null)}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-background shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedClient.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedClient.email} · {selectedClient.state}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedClient.isPaused && (
                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Paused</Badge>
                  )}
                  <Badge className={
                    selectedClient.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : selectedClient.status === 'full'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }>
                    {selectedClient.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </Button>
                </div>
              </div>

              <div className="flex border-b">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'caps', label: 'Caps' },
                  { key: 'filters', label: 'Routing Rules' },
                  { key: 'webhook', label: 'Webhook' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      detailTab === tab.key
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {detailTab === 'overview' && (
                  <PerformanceMetrics stats={computeStats(selectedClient)} />
                )}
                {detailTab === 'caps' && <CapManagement client={selectedClient} />}
                {detailTab === 'filters' && <RoutingSettings client={selectedClient} />}
                {detailTab === 'webhook' && <WebhookTester client={selectedClient} />}
              </div>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowCreate(false)}>
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l bg-background shadow-xl overflow-y-auto">
            <div className="p-6">
              <BuyerForm onClose={() => setShowCreate(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
