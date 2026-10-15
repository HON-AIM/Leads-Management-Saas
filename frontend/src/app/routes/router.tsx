import { lazy, Suspense } from 'react'
import type React from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { PublicRoute } from '@/components/guards/PublicRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { Loader2 } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

function lazyRetry<T extends { default: React.ComponentType<any> }>(factory: () => Promise<T>) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      const key = 'chunk-reload-at'
      const last = Number(sessionStorage.getItem(key) || 0)
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(key, String(Date.now()))
        window.location.reload()
        return new Promise<T>(() => {})
      }
      throw err
    }
  })
}

const LandingPage = lazyRetry(() => import('@/pages/marketing/LandingPage'))
const LoginPage = lazyRetry(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazyRetry(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordPage = lazyRetry(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
)
const AcceptInvitePage = lazyRetry(() =>
  import('@/pages/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage }))
)
const DashboardPage = lazyRetry(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const LeadsPage = lazyRetry(() => import('@/pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })))
const BuyersPage = lazyRetry(() => import('@/pages/buyers/BuyersPage').then((m) => ({ default: m.BuyersPage })))
const CampaignsPage = lazyRetry(() =>
  import('@/pages/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage }))
)
const CampaignWorkspacePage = lazyRetry(() =>
  import('@/pages/campaigns/CampaignWorkspacePage').then((m) => ({ default: m.CampaignWorkspacePage }))
)
const DeliveryPage = lazyRetry(() =>
  import('@/pages/delivery/DeliveryPage').then((m) => ({ default: m.DeliveryPage }))
)
const ReportsPage = lazyRetry(() =>
  import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)
const SettingsPage = lazyRetry(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const TeamPage = lazyRetry(() => import('@/pages/team/TeamPage').then((m) => ({ default: m.TeamPage })))
const SuppliersPage = lazyRetry(() =>
  import('@/pages/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage }))
)

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-dark">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Page>
            <LandingPage />
          </Page>
        }
      />
      <Route path={ROUTES.LOGIN} element={<Page><PublicRoute><LoginPage /></PublicRoute></Page>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<Page><PublicRoute><ForgotPasswordPage /></PublicRoute></Page>} />
      <Route path={ROUTES.RESET_PASSWORD} element={<Page><PublicRoute><ResetPasswordPage /></PublicRoute></Page>} />
      <Route path={ROUTES.ACCEPT_INVITE} element={<Page><AcceptInvitePage /></Page>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<Page><ErrorBoundary componentName="Dashboard"><DashboardPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.LEADS} element={<Page><ErrorBoundary componentName="Leads"><LeadsPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.BUYERS} element={<Page><ErrorBoundary componentName="Buyers"><BuyersPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.CAMPAIGNS} element={<Page><ErrorBoundary componentName="Campaigns"><CampaignsPage /></ErrorBoundary></Page>} />
        <Route path="/campaigns/:id" element={<Page><ErrorBoundary componentName="Campaign Workspace"><CampaignWorkspacePage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.DELIVERY} element={<Page><ErrorBoundary componentName="Delivery"><DeliveryPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.REPORTS} element={<Page><ErrorBoundary componentName="Reports"><ReportsPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.SETTINGS} element={<Page><ErrorBoundary componentName="Settings"><SettingsPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.TEAM} element={<Page><ErrorBoundary componentName="Team"><TeamPage /></ErrorBoundary></Page>} />
        <Route path={ROUTES.SUPPLIERS} element={<Page><ErrorBoundary componentName="Suppliers"><SuppliersPage /></ErrorBoundary></Page>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}