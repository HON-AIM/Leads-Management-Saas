import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { PublicRoute } from '@/components/guards/PublicRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { BuyerPortal } from '@/pages/buyer/BuyerPortal'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { LeadsPage } from '@/pages/leads/LeadsPage'
import { AddLeadPage } from '@/pages/leads/AddLeadPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { CampaignsPage } from '@/pages/campaigns/CampaignsPage'
import { DeliveryPage } from '@/pages/delivery/DeliveryPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { LocationManagementPage } from '@/pages/locations/LocationManagementPage'
import { OwnershipPage } from '@/pages/ownership/OwnershipPage'
import { RoutingHistoryPage } from '@/pages/ownership/RoutingHistoryPage'
import { SyncMonitorPage } from '@/pages/ownership/SyncMonitorPage'
import { AuditDashboardPage } from '@/pages/ownership/AuditDashboardPage'
import { ReassignmentsPage } from '@/pages/ownership/ReassignmentsPage'
import { ROUTES } from '@/lib/constants'

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path={ROUTES.RESET_PASSWORD} element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
        <Route path={ROUTES.LEADS} element={<LeadsPage />} />
        <Route path={ROUTES.ADD_LEAD} element={<AddLeadPage />} />
        <Route path={ROUTES.CLIENTS} element={<ClientsPage />} />
        <Route path={ROUTES.CAMPAIGNS} element={<CampaignsPage />} />
        <Route path={ROUTES.DELIVERY} element={<DeliveryPage />} />
        <Route path={ROUTES.LOCATIONS} element={<LocationManagementPage />} />
        <Route path={ROUTES.OWNERSHIP} element={<OwnershipPage />} />
        <Route path={ROUTES.ROUTING_HISTORY} element={<RoutingHistoryPage />} />
        <Route path={ROUTES.SYNC_LOGS} element={<SyncMonitorPage />} />
        <Route path={ROUTES.AUDIT} element={<AuditDashboardPage />} />
        <Route path={ROUTES.REASSIGNMENTS} element={<ReassignmentsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      <Route path={ROUTES.BUYER} element={<ProtectedRoute><BuyerPortal /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}
