import { formatNumber, formatPercentage } from '@/lib/utils'
import type { Campaign } from '@/types/campaign'

interface CampaignAnalyticsProps {
  campaign: Campaign
}

export function CampaignAnalytics({ campaign }: CampaignAnalyticsProps) {
  const convRate = campaign.totalLeads > 0
    ? (campaign.convertedLeads / campaign.totalLeads) * 100
    : 0
  const assignRate = campaign.totalLeads > 0
    ? (campaign.assignedLeads / campaign.totalLeads) * 100
    : 0
  const unassignedRate = campaign.totalLeads > 0
    ? ((campaign.totalLeads - campaign.assignedLeads) / campaign.totalLeads) * 100
    : 0

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Campaign Analytics</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-semibold mt-1">{formatNumber(campaign.totalLeads)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Assigned</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600 dark:text-blue-400">{formatNumber(campaign.assignedLeads)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Converted</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{formatNumber(campaign.convertedLeads)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Conversion Rate</p>
          <p className="text-2xl font-semibold mt-1">{formatPercentage(convRate)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Assignment Rate</span>
            <span className="font-medium">{formatPercentage(assignRate)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(assignRate, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-medium">{formatPercentage(convRate)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(convRate, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Unassigned</span>
            <span className="font-medium">{formatPercentage(unassignedRate)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(unassignedRate, 100)}%` }} />
          </div>
        </div>
      </div>

      {campaign.startDate && (
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
          <div>
            <span>Start: </span>
            <span className="text-foreground">{new Date(campaign.startDate).toLocaleDateString()}</span>
          </div>
          {campaign.endDate && (
            <div>
              <span>End: </span>
              <span className="text-foreground">{new Date(campaign.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
