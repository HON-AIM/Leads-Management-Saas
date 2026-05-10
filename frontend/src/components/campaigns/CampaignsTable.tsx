import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Campaign } from '@/types/campaign'

interface CampaignsTableProps {
  campaigns: Campaign[]
  isLoading: boolean
  onEdit: (campaign: Campaign) => void
  onToggle: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
}

export function CampaignsTable({ campaigns, isLoading, onEdit, onToggle, onDelete }: CampaignsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left font-medium px-4 py-3">Name</th>
            <th className="text-left font-medium px-4 py-3">Status</th>
            <th className="text-left font-medium px-4 py-3">Routing</th>
            <th className="text-left font-medium px-4 py-3">Sources</th>
            <th className="text-left font-medium px-4 py-3">Buyers</th>
            <th className="text-left font-medium px-4 py-3">Leads</th>
            <th className="text-left font-medium px-4 py-3">Conversion</th>
            <th className="text-left font-medium px-4 py-3">Created</th>
            <th className="text-right font-medium px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9} className="px-4 py-20 text-center text-sm text-muted-foreground">Loading campaigns...</td>
            </tr>
          ) : campaigns.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-20 text-center text-sm text-muted-foreground">No campaigns yet</td>
            </tr>
          ) : (
            campaigns.map((c) => {
              const convRate = c.totalLeads > 0 ? ((c.convertedLeads / c.totalLeads) * 100).toFixed(1) : '0.0'
              return (
                <tr key={c._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onEdit(c)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusStyles[c.status] || ''}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{c.routingMode.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.sources.slice(0, 3).map((s) => (
                        <Badge key={s} className="bg-secondary text-secondary-foreground text-[10px]">{s}</Badge>
                      ))}
                      {c.sources.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{c.sources.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.assignedBuyers.length} buyer(s)</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-[80px]">
                        {c.totalLeads > 0 && (
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min((c.assignedLeads / c.totalLeads) * 100, 100)}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatNumber(c.totalLeads)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">{convRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onToggle(c)} title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                        {c.status === 'active' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(c)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
