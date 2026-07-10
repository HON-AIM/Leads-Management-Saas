import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  LayoutDashboard, Megaphone, Users, Building2,
  FileText, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: 'Dashboard', href: '/dashboard' },
  { icon: <Megaphone size={16} />, label: 'Campaigns', href: '/campaigns' },
  { icon: <Users size={16} />, label: 'Leads', href: '/leads' },
  { icon: <Building2 size={16} />, label: 'Buyers', href: '/buyers' },
  { icon: <FileText size={16} />, label: 'Delivery', href: '/delivery' },
  { icon: <Settings size={16} />, label: 'Settings', href: '/settings' },
]

const SIDEBAR_EXPANDED_W = 208
const SIDEBAR_COLLAPSED_W = 56

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')

  return (
    <NavLink
      to={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-white/[0.06] text-white'
          : 'text-[hsl(215,16%,57%)] hover:bg-white/[0.03] hover:text-slate-300'
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

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const isMobile = useIsMobile()
  const isCollapsed = collapsed && !isMobile

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
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-[#070b16] transition-[width] duration-200 ease-in-out',
          'border-r border-white/[0.05]',
          isCollapsed ? `${SIDEBAR_COLLAPSED_W}px` : `${SIDEBAR_EXPANDED_W}px`,
          isMobile && collapsed && '-translate-x-full',
          isMobile && !collapsed && 'translate-x-0 w-[220px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-14 shrink-0 items-center border-b border-white/[0.05] px-4',
          isCollapsed && 'justify-center px-0'
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white tracking-wider">
                LD
              </div>
              <span className="text-[13px] font-semibold text-white tracking-tight">
                Lead Distro
              </span>
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">
              LD
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={isCollapsed} />
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-white/[0.05] p-2">
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium',
              'text-[hsl(215,16%,57%)] hover:bg-white/[0.03] hover:text-slate-300 transition-colors duration-150',
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
      </aside>
    </>
  )
}
