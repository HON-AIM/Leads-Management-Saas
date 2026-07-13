export interface FieldDefinition {
  _id: string
  campaignId: string
  fieldName: string
  description: string
  type: 'String' | 'Number' | 'Boolean' | 'Phone' | 'Email' | 'List' | 'Date'
  isStandard: boolean
  isRequired: boolean
  visibleInPortal: boolean
  listOptions: string[]
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface FieldDefinitionFormData {
  fieldName: string
  description: string
  type: FieldDefinition['type']
  isRequired: boolean
  visibleInPortal: boolean
  listOptions: string[]
}
