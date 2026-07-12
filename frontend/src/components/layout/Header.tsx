import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useLocation } from 'react-router-dom'
import { Menu, LogOut, Settings, User } from 'lucide-react'

const ROUTE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/leads': 'Leads',
  '/buyers': 'Buyers',
  '/delivery': 'Delivery',
  '/settings': 'Settings',
}

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, logout } = useAuth()
  const isMobile = useIsMobile()
  const location = useLocation()

  const currentRoute = ROUTE_NAMES[location.pathname] || 'Dashboard'

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.trim() || user.email?.[0]?.toUpperCase() || 'U'
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 lg:px-6 bg-[#0a0f1e]/80 backdrop-blur-xl">
      {isMobile && (
        <Button variant="ghost" size="icon-sm" onClick={onMenuToggle} className="-ml-1 h-7 w-7">
          <Menu size={15} />
        </Button>
      )}

      <div className="flex flex-1 items-center">
        <h1 className="text-[13px] font-semibold text-white/90">{currentRoute}</h1>
      </div>

      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-white/[0.08] text-[10px] font-medium text-slate-200">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-[12px] font-medium text-slate-300 sm:block">
                {user?.firstName || user?.email}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="end">
            <div className="px-2.5 py-2">
              <p className="text-[12px] font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => (window.location.href = '/settings')}
              className="gap-2 text-[12px]"
            >
              <User size={13} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => (window.location.href = '/settings')}
              className="gap-2 text-[12px]"
            >
              <Settings size={13} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="gap-2 text-[12px] text-red-400 focus:text-red-400"
            >
              <LogOut size={13} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
