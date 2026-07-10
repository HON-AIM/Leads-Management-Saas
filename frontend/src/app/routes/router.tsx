import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/guards/ProtectedRoute'
import { PublicRoute } from '@/components/guards/PublicRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LandingPage } from '@/pages/marketing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { LeadsPage } from '@/pages/leads/LeadsPage'
import { BuyersPage } from '@/pages/buyers/BuyersPage'
import { CampaignsPage } from '@/pages/campaigns/CampaignsPage'
import { DeliveryPage } from '@/pages/delivery/DeliveryPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ROUTES } from '@/lib/constants'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path={ROUTES.RESET_PASSWORD} element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.LEADS} element={<LeadsPage />} />
        <Route path={ROUTES.BUYERS} element={<BuyersPage />} />
        <Route path={ROUTES.CAMPAIGNS} element={<CampaignsPage />} />
        <Route path={ROUTES.DELIVERY} element={<DeliveryPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
