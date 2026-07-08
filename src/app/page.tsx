'use client'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useRouter } from '@/lib/router'
import { LoginPage } from '@/components/login-page'
import { AppShell } from '@/components/app-shell'
import { DashboardPage } from '@/components/pages/dashboard'
import { BloodUnitsPage } from '@/components/pages/blood-units'
import { NetworkRequestsPage } from '@/components/pages/network-requests'
import { InternalRequestsPage } from '@/components/pages/internal-requests'
import { StorageUnitsPage } from '@/components/pages/storage-units'
import { DonorsPage } from '@/components/pages/donors'
import { AlertsPage } from '@/components/pages/alerts'
import { ReportsPage } from '@/components/pages/reports'
import { AuditLogsPage } from '@/components/pages/audit-logs'
import { FacilitiesPage } from '@/components/pages/facilities'
import { UsersPage } from '@/components/pages/users'
import { Loader2 } from 'lucide-react'

function PageRouter() {
  const { route } = useRouter()
  switch (route.page) {
    case 'dashboard': return <DashboardPage />
    case 'blood-units': return <BloodUnitsPage />
    case 'network-requests': return <NetworkRequestsPage />
    case 'internal-requests': return <InternalRequestsPage />
    case 'storage': return <StorageUnitsPage />
    case 'donors': return <DonorsPage />
    case 'alerts': return <AlertsPage />
    case 'reports': return <ReportsPage />
    case 'audit-logs': return <AuditLogsPage />
    case 'facilities': return <FacilitiesPage />
    case 'users': return <UsersPage />
    default: return <DashboardPage />
  }
}

function AppContent() {
  const { user, loading } = useAuth()
  const { route } = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
          <div className="text-sm text-slate-500">Loading BBMS Ghana...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <AppShell currentPage={route.page}>
      <PageRouter />
    </AppShell>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
