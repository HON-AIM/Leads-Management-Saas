import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  LayoutDashboard, Megaphone, Users, Building2,
  FileText, Settings, ChevronLeft, ChevronRight, Shield,
  Package, HelpCircle, ExternalLink, MessageSquare,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  adminOnly?: boolean
  disabled?: boolean
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: 'Dashboard', href: '/dashboard' },
  { icon: <Megaphone size={16} />, label: 'Campaigns', href: '/campaigns' },
  { icon: <Users size={16} />, label: 'Leads', href: '/leads' },
  { icon: <Building2 size={16} />, label: 'Buyers', href: '/buyers' },
  { icon: <Package size={16} />, label: 'Suppliers', href: '/suppliers' },
  { icon: <FileText size={16} />, label: 'Delivery', href: '/delivery' },
  { icon: <Settings size={16} />, label: 'Settings', href: '/settings' },
  { icon: <Shield size={16} />, label: 'Team', href: '/team', adminOnly: true },
]

const UTILITY_ITEMS = [
  { icon: <HelpCircle size={15} />, label: 'Help & Support', href: '#', external: true },
  { icon: <MessageSquare size={15} />, label: 'Feedback', href: 'https://github.com/anomalyco/opencode/issues', external: true },
]

const SIDEBAR_EXPANDED_W = 208
const SIDEBAR_COLLAPSED_W = 56

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const isActive = !item.disabled && (location.pathname === item.href || location.pathname.startsWith(item.href + '/'))

  if (item.disabled) {
    return (
      <span
        className={cn(
          'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 cursor-not-allowed',
          collapsed && 'justify-center px-0',
          'text-[hsl(215,20%,48%)] opacity-50'
        )}
        title={collapsed ? item.label : undefined}
      >
        <span className="shrink-0 text-[hsl(215,20%,48%)]">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[7px] font-bold text-white">
            !
          </span>
        )}
      </span>
    )
  }

  return (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-white/[0.08] text-white'
          : 'text-[hsl(215,20%,68%)] hover:bg-white/[0.04] hover:text-slate-200'
      )}
      title={collapsed ? item.label : undefined}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-r bg-blue-500" />
      )}
      <span className={cn('shrink-0 transition-colors duration-150', isActive && 'text-blue-400')}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function OnboardingWidget({ collapsed }: { collapsed: boolean }) {
  const { data } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const [campaigns, buyers, leads, suppliers] = await Promise.all([
        api.get('/campaigns', { params: { limit: 1 } }),
        api.get('/buyers', { params: { limit: 1 } }),
        api.get('/leads', { params: { limit: 1 } }),
        api.get('/suppliers', { params: { limit: 1 } }),
      ])
      return {
        hasCampaign: (campaigns.data?.data || []).length > 0,
        hasBuyer: (buyers.data?.data || []).length > 0,
        hasLead: (leads.data?.data || []).length > 0,
        hasSupplier: (suppliers.data?.data || []).length > 0,
      }
    },
    staleTime: 60_000,
  })

  if (!data) return null

  const steps = [
    { label: 'Create a campaign', done: data.hasCampaign },
    { label: 'Add a buyer', done: data.hasBuyer },
    { label: 'Receive a lead', done: data.hasLead },
    { label: 'Connect a supplier', done: data.hasSupplier },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <div className={cn(
      'rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-2',
      collapsed && 'px-0 py-2'
    )}>
      {!collapsed && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Setup</span>
          <span className="text-[10px] text-white/30">{completedCount}/{steps.length}</span>
        </div>
      )}
      <div className={cn('space-y-1', collapsed && 'flex flex-col items-center gap-1')}>
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 rounded px-1.5 py-1',
              collapsed && 'justify-center p-0',
              step.done && 'opacity-40'
            )}
            title={collapsed ? step.label : undefined}
          >
            <div className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] font-bold',
              step.done
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-white/[0.12] text-white/30'
            )}>
              {step.done ? '✓' : i + 1}
            </div>
            {!collapsed && (
              <span className={cn('text-[11px]', step.done ? 'text-white/30 line-through' : 'text-white/50')}>
                {step.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const isMobile = useIsMobile()
  const isCollapsed = collapsed && !isMobile
  const { isAdmin } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(true)

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <>
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-[#0a0f1e] transition-[width] duration-200 ease-in-out',
          'border-r border-white/[0.08]',
          isCollapsed ? `${SIDEBAR_COLLAPSED_W}px` : `${SIDEBAR_EXPANDED_W}px`,
          isMobile && collapsed && '-translate-x-full',
          isMobile && !collapsed && 'translate-x-0 w-[220px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-14 shrink-0 items-center border-b border-white/[0.08] px-4',
          isCollapsed && 'justify-center px-0'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white tracking-wider">
                LF
              </div>
              <span className="text-[13px] font-semibold text-white tracking-tight">
                LeadFlowX
              </span>
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">
              LF
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3 space-y-3">
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={isCollapsed} />
            ))}
          </div>

          {/* Onboarding widget */}
          {!isCollapsed && showOnboarding && (
            <OnboardingWidget collapsed={isCollapsed} />
          )}
        </nav>

        {/* Bottom: utility row + collapse toggle */}
        <div className="shrink-0 border-t border-white/[0.08]">
          {/* Utility icons row */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 px-3 py-2">
              {UTILITY_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                  title={item.label}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          )}

          {/* Collapse toggle */}
          <div className="p-2">
            <button
              onClick={onToggle}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium',
                'text-[hsl(215,20%,68%)] hover:bg-white/[0.04] hover:text-slate-200 transition-colors duration-150',
                isCollapsed && 'justify-center px-0'
              )}
            >
              {isCollapsed ? (
                <ChevronRight size={14} />
              ) : (
                <>
                  <ChevronLeft size={14} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
