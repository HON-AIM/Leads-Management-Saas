export interface OwnershipInfo {
  assignedBuyerId: string | null
  assignedBuyerName: string | null
  assignedBuyerEmail: string | null
  assignedBuyerGhlUserId: string | null
  assignmentStatus: 'pending' | 'assigned' | 'reassigned' | 'unassigned' | 'failed'
  assignedAt: string | null
  reassignedAt: string | null
  reassignmentCount: number
  routingMethod: RoutingMethod
  routingPriority: number
  sourcePlatform: string
  destinationPlatform: string | null
  routingVersion: string
  ownershipMetadata: OwnershipMetadata
  externalReferences: ExternalReferences
  deliveryMetadata: DeliveryMetadata
}

export interface OwnershipMetadata {
  currentOwnerType: 'buyer' | 'system' | 'unassigned'
  currentOwnerId: string | null
  ownershipLocked: boolean
  ownershipTransferredAt: string | null
  originalOwnerId: string | null
  originalOwnerName: string | null
}

export interface ExternalReferences {
  facebookLeadId: string | null
  ghlContactId: string | null
  ghlOpportunityId: string | null
  externalCRMLeadId: string | null
}

export interface DeliveryMetadata {
  lastDeliveryAttempt: string | null
  deliveryAttempts: number
  deliveryStatus: 'pending' | 'delivering' | 'delivered' | 'failed' | 'skipped'
  lastDeliveryResult: string | null
  lastSyncStatus: string | null
  lastSyncAt: string | null
}

export type RoutingMethod =
  | 'round_robin'
  | 'weighted'
  | 'priority'
  | 'exclusive'
  | 'state_based'
  | 'fallback'
  | 'manual_reassign'
  | 'api'

export type RoutingEventType =
  | 'assigned'
  | 'reassigned'
  | 'routing_failed'
  | 'delivery_failed'
  | 'delivery_retried'
  | 'delivered'
  | 'ownership_transferred'
  | 'ownership_locked'
  | 'ownership_unlocked'
  | 'crm_synced'
  | 'crm_sync_failed'
  | 'unassigned'

export interface RoutingEvent {
  _id: string
  leadId: string
  eventType: RoutingEventType
  fromOwnerId: string | null
  fromOwnerName: string | null
  toBuyerId: string | null
  toBuyerName: string | null
  toBuyerEmail: string | null
  toBuyerGhlUserId: string | null
  routingMethod: RoutingMethod
  routingReason: string
  routingPriority: number
  campaignId: string | null
  campaignName: string | null
  supplierId: string | null
  sourcePlatform: string
  destinationPlatform: string | null
  leadState: string | null
  leadCountry: string | null
  leadEmail: string | null
  systemNotes: string | null
  performedBy: string
  performedByUserId: string | null
  metadata: Record<string, unknown> | null
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface RoutingHistoryResponse {
  success: boolean
  history: RoutingEvent[]
  summary: RoutingSummary
}

export interface RoutingSummary {
  totalEvents: number
  assignments: number
  reassignments: number
  failures: number
  firstAssignedAt: string | null
  latestAssignedAt: string | null
  buyers: string[]
}

export interface OwnershipResponse {
  success: boolean
  ownership: OwnershipInfo
  audit: AuditEvent[]
}

export interface CrmSyncLog {
  _id: string
  leadId: { _id: string; name: string; email: string } | string
  tenantId: string
  buyerId: string | null
  platform: 'GHL' | 'facebook' | 'webhook' | 'email' | 'custom_crm' | 'api'
  syncType: string
  externalId: string | null
  externalUrl: string | null
  requestPayload: Record<string, unknown> | null
  responsePayload: Record<string, unknown> | null
  success: boolean
  errorMessage: string | null
  errorCode: string | null
  statusCode: number | null
  duration: number | null
  retryCount: number
  maxRetries: number
  nextRetryAt: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncLogsResponse {
  success: boolean
  logs: CrmSyncLog[]
}

export interface AuditEvent {
  _id: string
  leadId: string
  tenantId: string
  eventType: AuditEventType
  previousOwnerId: string | null
  previousOwnerName: string | null
  newOwnerId: string | null
  newOwnerName: string | null
  newOwnerEmail: string | null
  routingMethod: RoutingMethod
  routingReason: string
  campaignId: string | null
  campaignName: string | null
  sourcePlatform: string
  performedBy: string
  performedByUserId: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  updatedAt: string
}

export type AuditEventType =
  | 'ownership_assigned'
  | 'ownership_transferred'
  | 'ownership_locked'
  | 'ownership_unlocked'
  | 'reassigned'
  | 'manual_override'

export interface AuditResponse {
  success: boolean
  audit: AuditEvent[]
}

export interface ReassignmentRequest {
  buyerId: string
  reason?: string
  ghlApiKey?: string
  webhookUrl?: string
  syncPlatform?: string
}

export interface ReassignmentResponse {
  success: boolean
  leadId: string
  previousBuyerId: string | null
  previousBuyerName: string | null
  newBuyerId: string
  newBuyerName: string
  reassignedAt: string
}

export interface DeliveryStage {
  stage: string
  label: string
  status: 'pending' | 'completed' | 'failed' | 'skipped'
  timestamp: string | null
  duration: number | null
  payload: Record<string, unknown> | null
  error: string | null
}

export const ROUTING_METHOD_STYLES: Record<string, string> = {
  round_robin: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  weighted: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  priority: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  exclusive: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  state_based: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400',
  fallback: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  manual_reassign: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  api: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export const EVENT_TYPE_STYLES: Record<string, string> = {
  assigned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  reassigned: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  routing_failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  delivery_failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  delivery_retried: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  ownership_transferred: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  ownership_locked: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  ownership_unlocked: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  crm_synced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  crm_sync_failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  unassigned: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  reassigned: 'Reassigned',
  routing_failed: 'Routing Failed',
  delivery_failed: 'Delivery Failed',
  delivery_retried: 'Delivery Retry',
  delivered: 'Delivered',
  ownership_transferred: 'Ownership Transferred',
  ownership_locked: 'Ownership Locked',
  ownership_unlocked: 'Ownership Unlocked',
  crm_synced: 'CRM Synced',
  crm_sync_failed: 'CRM Sync Failed',
  unassigned: 'Unassigned',
}

export const ROUTING_METHOD_LABELS: Record<string, string> = {
  round_robin: 'Round Robin',
  weighted: 'Weighted',
  priority: 'Priority',
  exclusive: 'Exclusive',
  state_based: 'State-Based',
  fallback: 'Fallback',
  manual_reassign: 'Manual Reassign',
  api: 'API',
}
