import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useIsMobile } from '@/hooks/useMediaQuery'

const EXPANDED = 208
const COLLAPSED = 56

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isMobile = useIsMobile()

  const effectiveCollapsed = isMobile ? !sidebarOpen : sidebarCollapsed

  return (
    <div className="flex min-h-screen bg-[#070b16]">
      <Sidebar
        collapsed={effectiveCollapsed}
        onToggle={() => {
          if (isMobile) {
            setSidebarOpen(!sidebarOpen)
          } else {
            setSidebarCollapsed(!sidebarCollapsed)
          }
        }}
      />

      <div
        className="flex flex-1 flex-col transition-[margin-left] duration-200 min-w-0"
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? COLLAPSED : EXPANDED,
        }}
      >
        <Header
          onMenuToggle={() => {
            if (isMobile) {
              setSidebarOpen(!sidebarOpen)
            } else {
              setSidebarCollapsed(!sidebarCollapsed)
            }
          }}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
