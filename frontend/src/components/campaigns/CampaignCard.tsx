import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/campaign'

interface CampaignCardProps {
  campaign: Campaign
  onClick: (campaign: Campaign) => void
  onToggle: (campaign: Campaign) => void
}

export function CampaignCard({ campaign, onClick, onToggle }: CampaignCardProps) {
  const statusColor = campaign.status === 'active'
    ? 'text-emerald-400 bg-emerald-500/10'
    : 'text-white/30 bg-white/[0.04]'

  const routingLabel: Record<string, string> = {
    round_robin: 'Round Robin',
    weighted: 'Weighted',
    priority: 'Priority',
    exclusive: 'Exclusive',
  }

  return (
    <div
      className="group rounded-xl border border-white/[0.06] bg-[#0c1021] p-5 transition-all duration-200 hover:border-white/[0.1] hover:shadow-card-hover cursor-pointer"
      onClick={() => onClick(campaign)}
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
          <p className="text-muted-foreground/60 mb-0.5">Source</p>
          <p className="font-medium text-white/70 capitalize">{campaign.source || 'webhook'}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60 mb-0.5">Routing</p>
          <p className="font-medium text-white/70">{routingLabel[campaign.routingMode] || campaign.routingMode}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60 mb-0.5">Buyers</p>
          <p className="font-medium text-white/70">{campaign.assignedBuyers.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60 mb-0.5">Leads Today</p>
          <p className="font-medium text-white/70">{campaign.leadsToday ?? 0}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <span className="text-[10px] text-muted-foreground/60">
          {campaign.lastActivityAt ? `Last active ${formatDate(campaign.lastActivityAt)}` : 'No activity yet'}
        </span>
        <button
          className="text-[10px] text-muted-foreground hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => { e.stopPropagation(); onToggle(campaign) }}
        >
          {campaign.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  )
}
