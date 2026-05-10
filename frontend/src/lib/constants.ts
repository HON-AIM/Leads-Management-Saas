export const API_BASE_URL = '/api'

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ANALYTICS: '/analytics',
  LEADS: '/leads',
  ADD_LEAD: '/leads/add',
  CLIENTS: '/clients',
  CAMPAIGNS: '/campaigns',
  DELIVERY: '/delivery',
  BUYER: '/buyer',
  SETTINGS: '/settings',
  SESSIONS: '/settings/sessions',
  LOCATIONS: '/locations',
} as const

export const QUERY_KEYS = {
  STATS: ['stats'],
  LEADS: ['leads'],
  CLIENTS: ['clients'],
  ACTIVITIES: ['activities'],
  PROFILE: ['profile'],
  SESSIONS: ['sessions'],
  AI_SESSIONS: ['ai-sessions'],
  BUYER_DISTRIBUTION: ['buyer-distribution'],
  SOURCE_ANALYTICS: ['source-analytics'],
  FAILED_DELIVERIES: ['failed-deliveries'],
  CAMPAIGNS: ['campaigns'],
  DELIVERY_LOGS: ['delivery-logs'],
  DELIVERY_STATS: ['delivery-stats'],
  DELIVERY_TRENDS: ['delivery-trends'],
  SYSTEM_HEALTH: ['system-health'],
  TRENDS: ['trends'],
  TREND_SUMMARY: ['trend-summary'],
  SOURCE_BREAKDOWN: ['source-breakdown'],
  BUYER_PERFORMANCE: ['buyer-performance'],
  DELIVERY_RATES: ['delivery-rates'],
  CAMPAIGN_ANALYTICS: ['campaign-analytics'],
  HEATMAP: ['heatmap'],
  REPORTS: ['reports'],
  COUNTRIES: ['countries'],
  REGIONS: ['regions'],
  TERRITORIES: ['territories'],
  LOCATION_STATS: ['location-stats'],
  LOCATION_ANALYTICS: ['location-analytics'],
  NORMALIZATION_RUNS: ['normalization-runs'],
  AMBIGUOUS_LEADS: ['ambiguous-leads'],
} as const

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  buyer: 2,
  viewer: 1,
} as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Leads', href: ROUTES.LEADS, icon: 'Users' },
  { label: 'Add Lead', href: ROUTES.ADD_LEAD, icon: 'UserPlus' },
  { label: 'Campaigns', href: ROUTES.CAMPAIGNS, icon: 'Campaign' },
  { label: 'Buyers', href: ROUTES.CLIENTS, icon: 'Building2' },
  { label: 'Delivery', href: ROUTES.DELIVERY, icon: 'Delivery' },
  { label: 'Locations', href: ROUTES.LOCATIONS, icon: 'MapPin' },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: 'Settings' },
] as const
