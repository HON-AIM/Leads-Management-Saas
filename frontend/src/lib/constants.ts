export const API_BASE_URL = '/api'

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  BUYERS: '/buyers',
  CAMPAIGNS: '/campaigns',
  DELIVERY: '/delivery',
  SETTINGS: '/settings',
  TEAM: '/team',
  SUPPLIERS: '/suppliers',
  CALLS: '/calls',
} as const

export const QUERY_KEYS = {
  STATS: ['stats'],
  LEADS: ['leads'],
  BUYERS: ['buyers'],
  BUYER_DISTRIBUTION: ['buyer-distribution'],
  CAMPAIGNS: ['campaigns'],
  DELIVERY_LOGS: ['delivery-logs'],
  DELIVERY_STATS: ['delivery-stats'],
  DELIVERY_TRENDS: ['delivery-trends'],
  SUPPLIERS: ['suppliers'],
  CLIENTS: ['clients'],
  SESSIONS: ['sessions'],
  SETTINGS: ['settings'],
  API_KEY: ['api-key'],
  VARIABLES: ['variables'],
  VARIABLE_CATEGORIES: ['variable-categories'],
  VARIABLE_DOCS: ['variable-docs'],
} as const

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
} as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Leads', href: ROUTES.LEADS, icon: 'Users' },
  { label: 'Campaigns', href: ROUTES.CAMPAIGNS, icon: 'Campaign' },
  { label: 'Buyers', href: ROUTES.BUYERS, icon: 'Building2' },
  { label: 'Delivery', href: ROUTES.DELIVERY, icon: 'Truck' },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: 'Settings' },
] as const
