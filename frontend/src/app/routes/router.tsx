import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { PublicRoute } from '@/components/guards/PublicRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { LandingPage } from '@/pages/marketing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { LeadsPage } from '@/pages/leads/LeadsPage'
import { BuyersPage } from '@/pages/buyers/BuyersPage'
import { CampaignsPage } from '@/pages/campaigns/CampaignsPage'
import { CampaignWorkspacePage } from '@/pages/campaigns/CampaignWorkspacePage'
import { DeliveryPage } from '@/pages/delivery/DeliveryPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TeamPage } from '@/pages/team/TeamPage'
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage'
import { ComingSoonPage } from '@/pages/calls/ComingSoonPage'
import { ROUTES } from '@/lib/constants'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path={ROUTES.RESET_PASSWORD} element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<ErrorBoundary componentName="Dashboard"><DashboardPage /></ErrorBoundary>} />
        <Route path={ROUTES.LEADS} element={<ErrorBoundary componentName="Leads"><LeadsPage /></ErrorBoundary>} />
        <Route path={ROUTES.BUYERS} element={<ErrorBoundary componentName="Buyers"><BuyersPage /></ErrorBoundary>} />
        <Route path={ROUTES.CAMPAIGNS} element={<ErrorBoundary componentName="Campaigns"><CampaignsPage /></ErrorBoundary>} />
        <Route path="/campaigns/:id" element={<ErrorBoundary componentName="Campaign Workspace"><CampaignWorkspacePage /></ErrorBoundary>} />
        <Route path={ROUTES.DELIVERY} element={<ErrorBoundary componentName="Delivery"><DeliveryPage /></ErrorBoundary>} />
        <Route path={ROUTES.SETTINGS} element={<ErrorBoundary componentName="Settings"><SettingsPage /></ErrorBoundary>} />
        <Route path={ROUTES.TEAM} element={<ErrorBoundary componentName="Team"><TeamPage /></ErrorBoundary>} />
        <Route path={ROUTES.SUPPLIERS} element={<ErrorBoundary componentName="Suppliers"><SuppliersPage /></ErrorBoundary>} />
        <Route path={ROUTES.CALLS} element={<ErrorBoundary componentName="Calls"><ComingSoonPage title="Calls" /></ErrorBoundary>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
