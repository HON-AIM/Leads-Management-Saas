import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import { getStatusStyle, CAMPAIGN_STATUS_COLOR, type SemanticKey } from '@/lib/statusColors'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
  onToggle: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
}

export function CampaignCard({ campaign, onToggle, onDelete }: CampaignCardProps) {
  const navigate = useNavigate()
  const statusColor = getStatusStyle(CAMPAIGN_STATUS_COLOR[campaign.status] ?? 'neutral')

  const routingLabel: Record<string, string> = {
    round_robin: 'Round Robin',
    weighted: 'Weighted',
    priority: 'Priority',
    exclusive: 'Exclusive',
  }

  return (
    <div
      className="group rounded-xl border border-white/[0.08] bg-[#0e1428] p-5 transition-all duration-200 hover:border-white/[0.14] hover:shadow-card-hover cursor-pointer"
      onClick={() => navigate(`/campaigns/${campaign._id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-white truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{campaign.description}</p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px] mb-4">
        <div>
          <p className="text-muted-foreground/80 mb-0.5">Source</p>
          <p className="font-medium text-white/80 capitalize">{campaign.source || 'webhook'}</p>
        </div>
        <div>
          <p className="text-muted-foreground/80 mb-0.5">Routing</p>
          <p className="font-medium text-white/80">{routingLabel[campaign.routingMode] || campaign.routingMode}</p>
        </div>
        <div>
          <p className="text-muted-foreground/80 mb-0.5">Buyers</p>
          <p className="font-medium text-white/80">{campaign.assignedBuyers.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground/80 mb-0.5">Leads Today</p>
          <p className="font-medium text-white/80">{campaign.leadsToday ?? 0}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <span className="text-[10px] text-muted-foreground/75">
          {campaign.lastActivityAt ? `Last active ${formatDate(campaign.lastActivityAt)}` : 'No activity yet'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            className="text-[10px] text-muted-foreground hover:text-white/70 transition-colors px-1.5 py-0.5 rounded"
            onClick={(e) => { e.stopPropagation(); onToggle(campaign) }}
          >
            {campaign.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-red-500/10"
            onClick={(e) => { e.stopPropagation(); onDelete(campaign) }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
