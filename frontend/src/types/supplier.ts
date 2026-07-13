export interface Supplier {
  _id: string
  name: string
  description?: string
  type: 'webhook' | 'manual' | 'api' | 'csv'
  status: 'active' | 'paused' | 'inactive'
  supplierKey: string
  allowedCampaignIds: string[]
  totalLeadsReceived: number
  lastLeadAt?: string
  tenantId: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierFormData {
  name: string
  description: string
  type: Supplier['type']
}
