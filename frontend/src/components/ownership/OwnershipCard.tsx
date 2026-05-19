import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { OwnershipInfo } from '@/types/ownership'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  assigned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  reassigned: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  unassigned: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export function OwnershipCard({ ownership }: { ownership: OwnershipInfo }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ownership</CardTitle>
          <Badge className={cn(statusStyles[ownership.assignmentStatus])}>
            {ownership.assignmentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {ownership.assignedBuyerName?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {ownership.assignedBuyerName || 'Unassigned'}
            </p>
            {ownership.assignedBuyerEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {ownership.assignedBuyerEmail}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Routing Method</span>
            <p className="font-medium mt-0.5 capitalize">{ownership.routingMethod.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reassignments</span>
            <p className="font-medium mt-0.5">{ownership.reassignmentCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Assigned At</span>
            <p className="font-medium mt-0.5">
              {ownership.assignedAt
                ? new Date(ownership.assignedAt).toLocaleDateString()
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Source</span>
            <p className="font-medium mt-0.5 capitalize">{ownership.sourcePlatform}</p>
          </div>
        </div>

        {ownership.ownershipMetadata && (
          <div className="border-t pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ownership Locked</span>
              <span className={ownership.ownershipMetadata.ownershipLocked ? 'text-rose-500 dark:text-rose-400 font-medium' : 'text-emerald-500 dark:text-emerald-400 font-medium'}>
                {ownership.ownershipMetadata.ownershipLocked ? 'Yes' : 'No'}
              </span>
            </div>
            {ownership.ownershipMetadata.originalOwnerName && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Original Owner</span>
                <span className="font-medium">{ownership.ownershipMetadata.originalOwnerName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
