import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useIsSidebarCollapsed } from '@/hooks/useMediaQuery'
import { OwnershipAIWidget } from '@/components/ownership/OwnershipAIWidget'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCollapsed = useIsSidebarCollapsed()

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar
        collapsed={!isCollapsed ? false : !sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className={`flex flex-1 flex-col transition-all duration-300 ${!isCollapsed ? 'lg:ml-60' : 'ml-0'}`}>
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-6 animate-fade-in">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <OwnershipAIWidget />
    </div>
  )
}
