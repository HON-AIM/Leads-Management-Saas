import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STATUS_STYLES, DELIVERY_STYLES } from '@/types/lead'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types/lead'

interface BuyerLeadDetailProps {
  lead: Lead | null
  onClose: () => void
}

export function BuyerLeadDetail({ lead, onClose }: BuyerLeadDetailProps) {
  if (!lead) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border bg-background shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom">
        <div className="sticky top-0 bg-background border-b flex items-center justify-between px-5 py-3">
          <h2 className="text-sm font-semibold">Lead Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-base font-semibold">{lead.name}</p>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
            {lead.phone && <p className="text-sm text-muted-foreground">{lead.phone}</p>}
          </div>

          <div className="flex gap-2">
            <Badge className={STATUS_STYLES[lead.status] || ''}>{lead.status}</Badge>
            <Badge className={DELIVERY_STYLES[lead.deliveryStatus] || ''}>{lead.deliveryStatus}</Badge>
            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{lead.ingestionStatus}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="State" value={lead.state} />
            <Field label="Source" value={lead.source} />
            <Field label="Campaign" value={lead.campaign || '-'} />
            <Field label="Assigned To" value={lead.assignedTo?.name || '-'} />
          </div>

          {lead.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted rounded-lg p-3">{lead.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <Field label="Created" value={formatDate(lead.createdAt)} />
            <Field label="Updated" value={formatDate(lead.updatedAt)} />
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
