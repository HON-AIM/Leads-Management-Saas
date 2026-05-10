import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useNotifications } from '@/hooks/useNotifications'
import type { ReportType } from '@/types'

const REPORT_TYPES: ReportType[] = [
  {
    key: 'leads',
    label: 'Lead Report',
    description: 'All leads with source, status, and assignment details',
    icon: 'Users',
  },
  {
    key: 'deliveries',
    label: 'Delivery Report',
    description: 'Delivery attempts, status, provider, and response data',
    icon: 'Delivery',
  },
  {
    key: 'buyers',
    label: 'Buyer Report',
    description: 'Buyer performance, cap utilization, and delivery rates',
    icon: 'Building2',
  },
  {
    key: 'sources',
    label: 'Source Report',
    description: 'Lead source breakdown with conversion metrics',
    icon: 'BarChart3',
  },
  {
    key: 'campaigns',
    label: 'Campaign Report',
    description: 'Campaign performance, routing, and source mapping',
    icon: 'Campaign',
  },
  {
    key: 'summary',
    label: 'Executive Summary',
    description: 'High-level overview of all key metrics',
    icon: 'LayoutDashboard',
  },
]

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All Time', value: 'all' },
]

const ICONS: Record<string, React.ReactNode> = {
  Users: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Delivery: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  Building2: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  ),
  BarChart3: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  Campaign: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="9" y1="11" x2="15" y2="11"/>
    </svg>
  ),
  LayoutDashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
}

export function ExportableReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const { addNotification } = useNotifications()

  const exportMutation = useMutation({
    mutationFn: async ({ type, format }: { type: string; format: 'json' | 'csv' }) => {
      if (format === 'csv') {
        const response = await api.get(`/analytics/reports/export?type=${type}&period=${selectedPeriod}`, {
          responseType: 'blob',
        })
        const url = URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${type}-report-${selectedPeriod}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        return { type, format }
      }
      const { data } = await api.get(`/analytics/reports/${type}?period=${selectedPeriod}`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}-report-${selectedPeriod}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return { type, format }
    },
    onSuccess: (result) => {
      addNotification({
        type: 'success',
        title: 'Report Exported',
        description: `${result.type} report downloaded as ${result.format}`,
      })
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        description: 'Failed to generate report. Please try again.',
      })
    },
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Exportable Reports</CardTitle>
            <CardDescription>Download reports as CSV or JSON</CardDescription>
          </div>
          <Select
            options={PERIOD_OPTIONS}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-8 w-[130px] text-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => (
            <div
              key={report.key}
              className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  {ICONS[report.icon]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{report.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => exportMutation.mutate({ type: report.key, format: 'csv' })}
                  disabled={exportMutation.isPending}
                >
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => exportMutation.mutate({ type: report.key, format: 'json' })}
                  disabled={exportMutation.isPending}
                >
                  JSON
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
