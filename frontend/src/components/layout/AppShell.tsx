import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useIsSidebarCollapsed } from '@/hooks/useMediaQuery'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCollapsed = useIsSidebarCollapsed()

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={!isCollapsed ? false : !sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className={`flex flex-1 flex-col transition-all duration-300 ${!isCollapsed ? 'ml-60' : 'ml-0'}`}>
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
