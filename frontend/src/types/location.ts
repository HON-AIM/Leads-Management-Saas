export interface ICountry {
  _id: string
  name: string
  code: string
  status: 'active' | 'inactive'
  totalRegions: number
  totalTerritories: number
  createdAt: string
  updatedAt: string
}

export interface IRegion {
  _id: string
  name: string
  code: string
  countryId: string
  countryName: string
  status: 'active' | 'inactive'
  totalTerritories: number
  createdAt: string
  updatedAt: string
}

export interface ITerritory {
  _id: string
  name: string
  code: string
  regionId: string
  regionName: string
  countryId: string
  countryName: string
  status: 'active' | 'inactive'
  deliveryZone?: {
    type: 'polygon' | 'circle' | 'radius'
    coordinates: number[][][] | number[]
    center?: number[]
    radius?: number
  }
  assignedDriver?: string
  priority: number
  createdAt: string
  updatedAt: string
}

export interface ILeadLocation {
  _id: string
  leadId: string
  originalAddress: string
  normalizedAddress?: string
  coordinates?: {
    lat: number
    lng: number
  }
  country?: string
  state?: string
  city?: string
  zipCode?: string
  confidence: number
  status: 'pending' | 'normalized' | 'ambiguous' | 'failed'
  normalizedAt?: string
  createdAt: string
}

export interface AmbiguousLead {
  _id: string
  originalAddress: string
  suggestions: Array<{
    address: string
    lat: number
    lng: number
    confidence: number
  }>
  status: 'pending' | 'accepted' | 'edited' | 'rejected'
  createdAt: string
}

export interface NormalizationResult {
  _id: string
  runId: string
  totalProcessed: number
  normalized: number
  ambiguous: number
  failed: number
  startedAt: string
  completedAt?: string
  status: 'running' | 'completed' | 'failed'
}

export interface GeoAnalytics {
  summary: {
    totalCountries: number
    totalRegions: number
    totalTerritories: number
    totalLeadsWithLocation: number
    totalAmbiguousLeads: number
    avgConfidence: number
  }
  topCountries: Array<{
    name: string
    leads: number
    percentage: number
  }>
  topRegions: Array<{
    name: string
    country: string
    leads: number
  }>
  normalizationQuality: Array<{
    range: string
    count: number
  }>
}

export interface CountryFormData {
  name: string
  code: string
  status: 'active' | 'inactive'
}

export interface RegionFormData {
  name: string
  code: string
  countryId: string
  status: 'active' | 'inactive'
}

export interface TerritoryFormData {
  name: string
  code: string
  regionId: string
  status: 'active' | 'inactive'
  priority: number
  deliveryZone?: {
    type: 'polygon' | 'circle' | 'radius'
    coordinates: number[][][] | number[]
    center?: number[]
    radius?: number
  }
  assignedDriver?: string
}

export const COUNTRY_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const

export const REGION_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const

export const TERRITORY_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const

export const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
